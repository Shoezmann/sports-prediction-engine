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
 * Polls FlashScore and other sources for live scores every 15 seconds.
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

    // Source URLs
    private readonly FLASHSCORE_URL = 'https://www.flashscore.com/football/fixtures-today';
    private readonly SOFASCORE_URL = 'https://api.sofascore.com/api/v1/sport/football/events/live';

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
                // Accept data up to 10s stale
                allScores.push(...cached.data);
            }
        }
        return allScores;
    }

    /**
     * Poll all sources for live scores
     */
    private async poll() {
        if (this.isPolling) return;
        this.isPolling = true;

        try {
            const scores = await this.scrapeFlashScore();
            if (scores.length > 0) {
                this.cache.set('flashscore', {
                    data: scores,
                    fetchedAt: Date.now(),
                });
                this.logger.log(`Scraped ${scores.length} live matches from FlashScore`);
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
                this.cache.set('fallback', {
                    data: fallback,
                    fetchedAt: Date.now(),
                });
            } catch (fbError) {
                this.logger.error('All live score sources failed', fbError.message);
            }
        } finally {
            this.isPolling = false;
        }
    }

    /**
     * Scrape FlashScore for live matches
     * Uses their JSON API endpoint (more reliable than HTML scraping)
     */
    private async scrapeFlashScore(): Promise<LiveScoreData[]> {
        // FlashScore uses an API at api.flashscore.com
        // We'll use a public proxy since direct access requires browser cookies
        const scores: LiveScoreData[] = [];

        try {
            // FlashScore's public API via RapidAPI wrapper
            const rapidKey = this.configService.get<string>('SCRAPER_RAPIDAPI_KEY');
            if (!rapidKey) return [];

            // Using FlashScore API via RapidAPI
            const url = 'https://flashlive-sports.p.rapidapi.com/events/fixtures';
            const response = await firstValueFrom(
                this.httpService.get(url, {
                    params: {
                        tournament_stage_id: '',
                       sport_id: 1,
                        start_date: Math.floor(Date.now() / 1000) - 3600,
                        end_date: Math.floor(Date.now() / 1000) + 3600,
                        timezone: 0,
                        with_top: 1,
                    },
                    headers: {
                        'x-rapidapi-key': rapidKey,
                        'x-rapidapi-host': 'flashlive-sports.p.rapidapi.com',
                    },
                    timeout: 8000,
                }),
            );

            const data = response.data as any;
            const events = data?.RESULTS?.DATA || [];

            for (const e of events) {
                // Filter to live/in-progress matches
                if (e.STAGE_TYPE === 3 || e.STAGE_TYPE === 4) {
                    const minute = e.STAGE_TYPE === 3 ? this.parseMinute(e.STAGE_START_TIME, e.STAGE_END_TIME) : null;
                    scores.push({
                        id: e.EVENT_ID,
                        sportKey: 'soccer_flashscore',
                        sportTitle: 'Football',
                        league: e.TOURNAMENT_NAME || '',
                        homeTeam: e.HOME_PARTICIPANT_NAMES?.[0] || 'Home',
                        awayTeam: e.AWAY_PARTICIPANT_NAMES?.[0] || 'Away',
                        homeScore: parseInt(e.HOME_SCORE_CURRENT || '0'),
                        awayScore: parseInt(e.AWAY_SCORE_CURRENT || '0'),
                        status: this.mapStage(e.STAGE_TYPE),
                        minute,
                        commenceTime: new Date(e.STAGE_START_TIME * 1000).toISOString(),
                        updatedAt: Date.now(),
                    });
                }
            }
        } catch (error) {
            // RapidAPI key not configured — skip silently
            if (!this.configService.get<string>('SCRAPER_RAPIDAPI_KEY')) {
                return [];
            }
            this.logger.warn('FlashScore API error', error.message);
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

        // Poll multiple categories for live events
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

                for (const e of events) {
                    const ct = e.startTimestamp * 1000;
                    const elapsed = Math.floor((Date.now() - ct) / 60000);

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

    private mapStage(stageType: number): string {
        switch (stageType) {
            case 3: return 'LIVE';
            case 4: return 'HT';
            default: return 'LIVE';
        }
    }

    private parseMinute(start: number, end: number): number | null {
        if (!start || !end) return null;
        const elapsed = Math.floor((Date.now() / 1000 - start) / 60);
        return Math.min(Math.max(elapsed, 0), 90);
    }
}
