import { Injectable, Logger } from '@nestjs/common';
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
    homeScore: number | null;
    awayScore: number | null;
    status: string;
    minute: number | null;
    commenceTime: string;
    updatedAt: number;
}

/** Sports that don't use cumulative scoring */
const NON_SCORING_SPORTS = new Set(['tennis', 'mma', 'mma_mixed_martial_arts', 'boxing']);

/**
 * Live Scores Scraper
 *
 * On-demand fetching of live scores from FlashScore + SportAPI fallback.
 * No background polling — fetches only when called.
 */
@Injectable()
export class LiveScoresScraper {
    private readonly logger = new Logger(LiveScoresScraper.name);

    private readonly BASE_URL = 'https://flashscore4.p.rapidapi.com/api/flashscore/v2';
    private readonly RAPID_HOST = 'flashscore4.p.rapidapi.com';

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Fetch live scores on-demand.
     * Tries FlashScore first, falls back to SportAPI.
     */
    async getLiveScores(): Promise<LiveScoreData[]> {
        const apiKey = this.configService.get<string>('SCRAPER_RAPIDAPI_KEY');
        if (!apiKey || apiKey.includes('your_')) {
            return this.fallbackToSportAPI();
        }

        try {
            const scores = await this.scrapeFlashScoreV2(apiKey);
            if (scores.length > 0) {
                this.logger.debug(`Scraped ${scores.length} live matches from FlashScore v2`);
                return scores;
            }
        } catch (error) {
            this.logger.debug('FlashScore scrape failed, trying fallback');
        }

        return this.fallbackToSportAPI();
    }

    /**
     * Scrape FlashScore v2 API for live matches
     */
    private async scrapeFlashScoreV2(apiKey: string): Promise<LiveScoreData[]> {
        const scores: LiveScoreData[] = [];

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

                const isStarted = status.is_started || false;
                const isFinished = status.is_finished || false;
                const isFinishedOrStarted = isStarted || isFinished;
                if (!isFinishedOrStarted) continue;

                // Determine status and minute
                let mappedStatus = 'LIVE';
                let minute: number | null = null;

                if (isFinished || status.stage === 'Finished') {
                    mappedStatus = 'FT';
                    minute = 90;
                } else if (status.stage === 'Halftime' || status.stage === 'HT' || status.live_time === 'Half Time') {
                    mappedStatus = 'HT';
                    minute = 45;
                } else if (status.is_in_progress) {
                    mappedStatus = status.stage?.includes('2nd') ? '2H' : '1H';
                    minute = status.stage?.includes('2nd') ? 60 : 20;
                }

                const isScoring = !NON_SCORING_SPORTS.has('soccer');
                const hs = isScoring ? (score.home ?? null) : null;
                const as_ = isScoring ? (score.away ?? null) : null;

                scores.push({
                    id: m.match_id || `${homeTeam.name}-${awayTeam.name}`,
                    sportKey: 'soccer_flashscore',
                    sportTitle: 'Football',
                    league,
                    homeTeam: homeTeam.name || 'Home',
                    awayTeam: awayTeam.name || 'Away',
                    homeScore: hs,
                    awayScore: as_,
                    status: mappedStatus,
                    minute,
                    commenceTime: new Date((m.timestamp || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
                    updatedAt: Date.now(),
                });
            }
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
                        const isScoring = !NON_SCORING_SPORTS.has('soccer');
                        const hs = isScoring ? (e.homeScore?.current ?? null) : null;
                        const as_ = isScoring ? (e.awayScore?.current ?? null) : null;
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
