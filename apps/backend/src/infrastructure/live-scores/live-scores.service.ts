import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Interval } from '@nestjs/schedule';
import { PredictionStreamService } from '../sse/prediction-stream.service';
import { LiveScoresScraper, LiveScoreData } from './live-scores.scraper';

export interface LiveMatchData {
    externalId: string;
    sportKey: string;
    sportTitle: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    status: '1H' | '2H' | 'HT' | 'FT' | 'LIVE';
    minute: number | null;
    commenceTime: string;
}

/**
 * Live Scores Service
 *
 * Polls SportAPI for live scores every 30 seconds.
 * Broadcasts live score updates via SSE.
 */
@Injectable()
export class LiveScoresService {
    private readonly logger = new Logger(LiveScoresService.name);
    private liveMatches: Map<string, LiveMatchData> = new Map();
    private isPolling = false;

    // SportAPI categories that have live data
    private readonly SPORT_API_CATEGORIES = [
        { id: 1, key: 'soccer_epl', title: 'Soccer - EPL' },
        { id: 2, key: 'basketball_nba', title: 'Basketball - NBA' },
        { id: 3, key: 'tennis_atp', title: 'Tennis - ATP' },
        { id: 52, key: 'soccer_south_africa_psl', title: 'Soccer - PSL' },
        { id: 23114, key: 'soccer_esoccer_gt_leagues_12', title: 'Esoccer GT Leagues' },
    ];

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly streamService: PredictionStreamService,
        private readonly scraper: LiveScoresScraper,
    ) { }

    /**
     * Poll live scores every 30 seconds
     */
    @Interval('live-scores-poll', 15_000)
    async pollLiveScores() {
        if (this.isPolling) return;
        this.isPolling = true;

        try {
            // Get scores from scraper cache
            const scraperScores = this.scraper.getLiveScores();
            const newMatches = new Map<string, LiveMatchData>();

            for (const s of scraperScores) {
                newMatches.set(s.id, this.toLiveMatchData(s));
            }

            // Also check SportAPI as additional source
            const sportApiKey = this.configService.get<string>('SPORT_API_KEY');
            if (sportApiKey && !sportApiKey.includes('your_')) {
                const sportMatches = await this.fetchAllSportAPILive(sportApiKey);
                for (const m of sportMatches) {
                    // Deduplicate — prefer scraper data if same teams
                    const key = `${m.homeTeam}-${m.awayTeam}`;
                    if (!Array.from(newMatches.values()).some(nm => nm.homeTeam === m.homeTeam && nm.awayTeam === m.awayTeam)) {
                        newMatches.set(m.externalId, m);
                    }
                }
            }

            const changed = this.updateLiveMatches(newMatches);
            if (changed) {
                this.streamService.broadcast('live_scores', {
                    matches: Array.from(newMatches.values()),
                    count: newMatches.size,
                });
                this.logger.log(`📡 Live: ${newMatches.size} matches (${scraperScores.length} scraped, ${newMatches.size - scraperScores.length} SportAPI)`);
            }

            this.liveMatches = newMatches;
        } catch (error) {
            this.logger.error('Failed to poll live scores', error);
        } finally {
            this.isPolling = false;
        }
    }

    private toLiveMatchData(s: LiveScoreData): LiveMatchData {
        return {
            externalId: s.id,
            sportKey: s.sportKey,
            sportTitle: s.sportTitle,
            homeTeam: s.homeTeam,
            awayTeam: s.awayTeam,
            homeScore: s.homeScore,
            awayScore: s.awayScore,
            status: s.status as any,
            minute: s.minute,
            commenceTime: s.commenceTime,
        };
    }

    private async fetchAllSportAPILive(apiKey: string): Promise<LiveMatchData[]> {
        const allMatches: LiveMatchData[] = [];
        for (const cat of this.SPORT_API_CATEGORIES) {
            try {
                const matches = await this.fetchLiveMatches(cat.id, apiKey);
                allMatches.push(...matches);
            } catch { /* skip */ }
        }
        return allMatches;
    }

    /**
     * Fetch live matches from SportAPI
     */
    private async fetchLiveMatches(categoryId: number, apiKey: string): Promise<LiveMatchData[]> {
        const baseUrl = this.configService.get<string>('SPORT_API_BASE_URL', 'https://sportapi7.p.rapidapi.com/api/v1');
        const apiHost = this.configService.get<string>('SPORT_API_HOST', 'sportapi7.p.rapidapi.com');

        // Get upcoming/recent events for this category
        const url = `${baseUrl}/events/schedule`;
        const response = await firstValueFrom(
            this.httpService.get(url, {
                params: { categoryId: categoryId.toString() },
                headers: {
                    'x-rapidapi-key': apiKey,
                    'x-rapidapi-host': apiHost,
                },
                timeout: 10_000,
            }),
        );

        const data = response.data as any;
        if (!data?.events) return [];

        const now = Date.now();
        return data.events
            .filter((e: any) => {
                const ct = e.startTimestamp * 1000;
                const elapsed = (now - ct) / 60000;
                // Live if started within last 2 hours and has scores or is in progress
                return elapsed > -5 && elapsed < 120;
            })
            .map((e: any) => {
                const ct = e.startTimestamp * 1000;
                const elapsedMin = Math.floor((now - ct) / 60000);
                const hs = e.homeScore?.current ?? 0;
                const as_ = e.awayScore?.current ?? 0;
                const statusType = e.status?.type;

                let status: LiveMatchData['status'] = 'LIVE';
                let minute: number | null = null;

                if (statusType === 'finished' || statusType === 'ended') {
                    status = 'FT';
                    minute = 90;
                } else if (statusType === 'halftime' || statusType === 'break') {
                    status = 'HT';
                    minute = 45;
                } else if (statusType === 'inprogress' || statusType === 'started') {
                    // Determine half
                    if (elapsedMin <= 45) {
                        status = '1H';
                        minute = Math.min(elapsedMin, 45);
                    } else if (elapsedMin <= 47) {
                        status = 'HT';
                        minute = 45;
                    } else if (elapsedMin <= 90) {
                        status = '2H';
                        minute = Math.min(elapsedMin - 2, 90);
                    } else {
                        status = 'FT';
                        minute = 90;
                    }
                } else if (elapsedMin > 0 && elapsedMin < 120) {
                    // Has elapsed time but no status - infer from time
                    if (elapsedMin <= 45) {
                        status = '1H';
                        minute = elapsedMin;
                    } else if (elapsedMin <= 47) {
                        status = 'HT';
                        minute = 45;
                    } else {
                        status = '2H';
                        minute = Math.min(elapsedMin - 2, 90);
                    }
                }

                return {
                    externalId: e.id?.toString() || `${categoryId}-${e.homeTeam?.name}-${e.awayTeam?.name}`,
                    sportKey: this.getSportKey(categoryId),
                    sportTitle: this.getCategoryTitle(categoryId),
                    homeTeam: e.homeTeam?.name || 'Home',
                    awayTeam: e.awayTeam?.name || 'Away',
                    homeScore: hs,
                    awayScore: as_,
                    status,
                    minute,
                    commenceTime: new Date(ct).toISOString(),
                };
            })
            .filter((m: LiveMatchData) => m.status !== 'FT' || m.minute !== null);
    }

    private getSportKey(categoryId: number): string {
        return this.SPORT_API_CATEGORIES.find(c => c.id === categoryId)?.key || 'unknown';
    }

    private getCategoryTitle(categoryId: number): string {
        return this.SPORT_API_CATEGORIES.find(c => c.id === categoryId)?.title || 'Unknown';
    }

    /**
     * Check if live matches have changed
     */
    private updateLiveMatches(newMatches: Map<string, LiveMatchData>): boolean {
        let changed = false;

        for (const [id, match] of newMatches) {
            const existing = this.liveMatches.get(id);
            if (!existing ||
                existing.homeScore !== match.homeScore ||
                existing.awayScore !== match.awayScore ||
                existing.status !== match.status ||
                existing.minute !== match.minute) {
                changed = true;
                this.logger.log(`⚽ LIVE: ${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam} (${match.status}${match.minute ? ` ${match.minute}'` : ''})`);
            }
        }

        for (const [id] of this.liveMatches) {
            if (!newMatches.has(id)) {
                changed = true;
            }
        }

        return changed;
    }

    /**
     * Get current live matches
     */
    async getLiveMatches(): Promise<LiveMatchData[]> {
        const liveFromService = Array.from(this.liveMatches.values());
        const scraperScores = this.scraper.getLiveScores().map(s => this.toLiveMatchData(s));

        // Merge, deduplicating by home+away
        const seen = new Set<string>();
        const all = [...liveFromService, ...scraperScores].filter(m => {
            const key = `${m.homeTeam}-${m.awayTeam}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        return all;
    }
}
