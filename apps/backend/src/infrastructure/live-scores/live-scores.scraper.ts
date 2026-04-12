import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface LiveScoreData {
    id: string;
    sportKey: string;
    sportTitle: string;
    league: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    status: string;
    minute: number | null;
    commenceTime: string;
    updatedAt: number;
}

interface CachedScore {
    data: LiveScoreData[];
    fetchedAt: number;
}

/**
 * Live Scores Scraper Microservice
 *
 * Polls FlashScore v2 API every 15 seconds for live scores.
 * Caches results in-memory with 5-second TTL.
 * Falls back to SportAPI when scraper is blocked.
 */
@Injectable()
export class LiveScoresScraper implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(LiveScoresScraper.name);
    private cache: Map<string, CachedScore> = new Map();
    private pollTimer: NodeJS.Timeout | null = null;
    private isPolling = false;
    private readonly CACHE_TTL_MS = 5000;
    private readonly POLL_INTERVAL_MS = 15000;

    private readonly BASE_URL = 'https://flashscore4.p.rapidapi.com/api/flashscore/v2';
    private readonly RAPID_HOST = 'flashscore4.p.rapidapi.com';

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    onModuleInit() {
        this.startPolling();
    }

    onModuleDestroy() {
        this.stopPolling();
    }

    private startPolling() {
        this.poll(); // Immediate first poll
        this.pollTimer = setInterval(() => this.poll(), this.POLL_INTERVAL_MS);
        this.logger.log('Live scores scraper started (15s interval)');
    }

    private stopPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    /**
     * Get live scores from cache
     */
    getLiveScores(): LiveScoreData[] {
        const allScores: LiveScoreData[] = [];
        for (const [, cached] of this.cache) {
            if (Date.now() - cached.fetchedAt < this.CACHE_TTL_MS + 10000) {
                allScores.push(...cached.data);
            }
        }
        return allScores;
    }

    /**
     * Poll FlashScore v2 API for live matches
     */
    private async poll() {
        if (this.isPolling) return;
        this.isPolling = true;

        try {
            const apiKey = this.configService.get<string>('SCRAPER_RAPIDAPI_KEY');
            const scores = apiKey && !apiKey.includes('your_')
                ? await this.scrapeFlashScoreV2(apiKey)
                : [];

            if (scores.length > 0) {
                this.cache.set('flashscore_v2', {
                    data: scores,
                    fetchedAt: Date.now(),
                });
                this.logger.log(`Scraped ${scores.length} live matches from FlashScore v2`);
            } else {
                // Fallback to SportAPI
                const fallback = await this.fallbackToSportAPI();
                if (fallback.length > 0) {
                    this.cache.set('fallback', {
                        data: fallback,
                        fetchedAt: Date.now(),
                    });
                    this.logger.log(`Fallback: ${fallback.length} live matches from SportAPI`);
                }
            }
        } catch (error) {
            this.logger.warn('FlashScore scrape failed, trying fallback', error.message);
            try {
                const fallback = await this.fallbackToSportAPI();
                if (fallback.length > 0) {
                    this.cache.set('fallback', {
                        data: fallback,
                        fetchedAt: Date.now(),
                    });
                }
            } catch {
                // All sources failed
            }
        } finally {
            this.isPolling = false;
        }
    }

    /**
     * Scrape FlashScore v2 API for live matches
     * GET /api/flashscore/v2/matches/live?sport_id=1
     */
    private async scrapeFlashScoreV2(apiKey: string): Promise<LiveScoreData[]> {
        const scores: LiveScoreData[] = [];

        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.BASE_URL}/matches/live`, {
                    params: { sport_id: 1 },
                    headers: {
                        'x-rapidapi-key': apiKey,
                        'x-rapidapi-host': this.RAPID_HOST,
                    },
                    timeout: 10_000,
                }),
            );

            const tournaments = response.data as any[];
            if (!Array.isArray(tournaments)) return [];

            for (const t of tournaments) {
                const league = t.name || t.tournament_name || 'Unknown';
                const matches = t.matches || [];

                for (const m of matches) {
                    const status = m.match_status || {};
                    const homeTeam = m.home_team || {};
                    const awayTeam = m.away_team || {};
                    const score = m.scores || {};

                    const stage = status.stage || '';
                    const isInProgress = status.is_in_progress || false;
                    const isFinished = status.is_finished || false;
                    const isStarted = status.is_started || false;
                    const liveTimeStr = status.live_time;

                    // Compute minute from timestamp (FlashScore live_time is null for 2nd half)
                    const tsMs = (m.timestamp || Math.floor(Date.now() / 1000)) * 1000;
                    const elapsedMin = Math.floor((Date.now() - tsMs) / 60000);
                    const htBreak = 15;

                    let mappedStatus = 'LIVE';
                    let minute: number | null = null;

                    if (isFinished || stage === 'Finished') {
                        mappedStatus = 'FT';
                        minute = 90;
                    } else if (stage === 'Halftime' || stage === 'HT' || liveTimeStr === 'Half Time') {
                        mappedStatus = 'HT';
                        minute = 45;
                    } else if (isInProgress) {
                        if (stage.includes('1st') || elapsedMin < 45 + htBreak) {
                            mappedStatus = '1H';
                            minute = Math.min(elapsedMin, 45);
                        } else if (stage.includes('2nd') || elapsedMin >= 45 + htBreak) {
                            mappedStatus = '2H';
                            const shMin = elapsedMin - (45 + htBreak);
                            minute = Math.min(45 + shMin, 90);
                        } else if (stage.includes('Extra')) {
                            mappedStatus = 'LIVE';
                            minute = 90 + Math.max(0, elapsedMin - 105);
                        } else {
                            mappedStatus = elapsedMin > 60 ? '2H' : '1H';
                            minute = elapsedMin > 60 ? Math.min(elapsedMin - htBreak, 90) : Math.min(elapsedMin, 45);
                        }
                    } else if (isStarted) {
                        mappedStatus = elapsedMin > 60 ? '2H' : '1H';
                        minute = elapsedMin > 60 ? Math.min(elapsedMin - htBreak, 90) : Math.min(elapsedMin, 45);
                    }

                    // Only include matches that are actually live or recently finished
                    if (!isStarted && !isFinished) continue;

                    scores.push({
                        id: m.match_id || `${homeTeam.name}-${awayTeam.name}`,
                        sportKey: 'soccer_flashscore',
                        sportTitle: 'Football',
                        league,
                        homeTeam: homeTeam.name || 'Home',
                        awayTeam: awayTeam.name || 'Away',
                        homeScore: score.home ?? 0,
                        awayScore: score.away ?? 0,
                        status: mappedStatus,
                        minute,
                        commenceTime: new Date((m.timestamp || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
                        updatedAt: Date.now(),
                    });
                }
            }
        } catch (error) {
            this.logger.warn('FlashScore v2 API error', error.message);
        }

        return scores;
    }

    /**
     * Fallback to SportAPI for live data
     */
    private async fallbackToSportAPI(): Promise<LiveScoreData[]> {
        const sportApiKey = this.configService.get<string>('SPORT_API_KEY');
        if (!sportApiKey) return [];

        const baseUrl = this.configService.get<string>('SPORT_API_BASE_URL', 'https://sportapi7.p.rapidapi.com/api/v1');
        const apiHost = this.configService.get<string>('SPORT_API_HOST', 'sportapi7.p.rapidapi.com');

        const scores: LiveScoreData[] = [];

        const categories = [
            { id: 1, title: 'EPL' },
            { id: 52, title: 'PSL' },
        ];

        for (const cat of categories) {
            try {
                const url = `${baseUrl}/events/schedule`;
                const response = await firstValueFrom(
                    this.httpService.get(url, {
                        params: { categoryId: cat.id.toString() },
                        headers: {
                            'x-rapidapi-key': sportApiKey,
                            'x-rapidapi-host': apiHost,
                        },
                        timeout: 8000,
                    }),
                );

                const data = response.data as any;
                const events = data?.events || [];
                const now = Date.now();

                for (const e of events) {
                    const ct = e.startTimestamp * 1000;
                    const elapsed = Math.floor((now - ct) / 60000);

                    if (elapsed > -2 && elapsed < 120) {
                        const hs = e.homeScore?.current ?? 0;
                        const as_ = e.awayScore?.current ?? 0;
                        const statusType = e.status?.type;

                        let status = 'LIVE';
                        let minute: number | null = null;

                        if (statusType === 'finished' || statusType === 'ended') {
                            status = 'FT';
                        } else if (statusType === 'halftime' || statusType === 'break') {
                            status = 'HT';
                            minute = 45;
                        } else if (elapsed > 0) {
                            status = elapsed <= 45 ? '1H' : '2H';
                            minute = Math.min(elapsed, 90);
                        }

                        scores.push({
                            id: e.id?.toString() || `${cat.title}-${e.homeTeam?.name}`,
                            sportKey: 'soccer_sportapi',
                            sportTitle: cat.title,
                            league: cat.title,
                            homeTeam: e.homeTeam?.name || 'Home',
                            awayTeam: e.awayTeam?.name || 'Away',
                            homeScore: hs,
                            awayScore: as_,
                            status,
                            minute,
                            commenceTime: new Date(ct).toISOString(),
                            updatedAt: Date.now(),
                        });
                    }
                }
            } catch {
                // Skip silently
            }
        }

        return scores;
    }
}
