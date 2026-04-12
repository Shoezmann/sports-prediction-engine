import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Cron, Interval } from '@nestjs/schedule';
import { PredictionStreamService } from '../sse/prediction-stream.service';
import { TheOddsApiAdapter } from '../adapters/odds-api/the-odds-api.adapter';
import { SportRepositoryPort } from '../../domain/ports/output';
import { GTLeaguesService } from '../gt-leagues/gt-leagues.service';
import { SPORT_REPOSITORY_PORT } from '../../domain/ports/output';

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
 * Polls The Odds API for live Esoccer scores every 30 seconds.
 * Detects first/second half based on commence time and minute elapsed.
 * Broadcasts live score updates via SSE.
 */
@Injectable()
export class LiveScoresService {
    private readonly logger = new Logger(LiveScoresService.name);
    private liveMatches: Map<string, LiveMatchData> = new Map();
    private isPolling = false;

    // Esoccer matches are typically 10-12 minutes per half
    // We use this to determine half status
    private readonly HALF_DURATION_MS = 7 * 60 * 1000; // 7 minutes per half for GT Leagues
    private readonly HALF_TIME_BUFFER_MS = 2 * 60 * 1000; // 2 min halftime buffer

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly streamService: PredictionStreamService,
        private readonly oddsApiAdapter: TheOddsApiAdapter,
        private readonly gtLeaguesService: GTLeaguesService,
    ) { }

    /**
     * Poll live scores every 30 seconds
     */
    @Interval('live-scores-poll', 30_000)
    async pollLiveScores() {
        if (this.isPolling) return;
        this.isPolling = true;

        try {
            // Focus on Esoccer sports for live data
            const esportsKeys = [
                'soccer_eseries',
                'soccer_brazil_campeonato',
                'soccer_argentina_primera_division',
                'soccer_epl',
                'soccer_spain_la_liga',
                'soccer_germany_bundesliga',
                'soccer_italy_serie_a',
                'soccer_france_ligue_one',
            ];

            const newMatches = new Map<string, LiveMatchData>();

            for (const sportKey of esportsKeys) {
                try {
                    const scores = await this.fetchScores(sportKey, 1);

                    for (const score of scores) {
                        if (!score.completed && score.homeScore !== null && score.awayScore !== null) {
                            const matchData = this.enrichWithHalfInfo(score, sportKey);
                            if (matchData) {
                                newMatches.set(matchData.externalId, matchData);
                            }
                        }
                    }
                } catch (error) {
                    // Sport not available or no live games — skip silently
                }
            }

            // Update live matches
            const changed = this.updateLiveMatches(newMatches);

            if (changed) {
                this.streamService.broadcast('live_scores', {
                    matches: Array.from(newMatches.values()),
                    count: newMatches.size,
                });
            }

            this.liveMatches = newMatches;
        } catch (error) {
            this.logger.error('Failed to poll live scores', error);
        } finally {
            this.isPolling = false;
        }
    }

    /**
     * Fetch scores from The Odds API
     */
    private async fetchScores(sportKey: string, daysFrom: number): Promise<any[]> {
        const apiKey = this.configService.get<string>('ODDS_API_KEY');
        if (!apiKey || apiKey === 'your_api_key_here') return [];

        const baseUrl = this.configService.get<string>('ODDS_API_BASE_URL', 'https://api.the-odds-api.com/v4');
        const url = `${baseUrl}/sports/${sportKey}/scores`;

        try {
            const response = await firstValueFrom(
                this.httpService.get(url, {
                    params: {
                        apiKey,
                        daysFrom: daysFrom.toString(),
                    },
                    timeout: 10_000,
                }),
            );

            return response.data || [];
        } catch {
            return [];
        }
    }

    /**
     * Determine half status and minute from score data
     */
    private enrichWithHalfInfo(score: any, sportKey: string): LiveMatchData | null {
        if (!score.completed && score.scores && score.scores.length > 0) {
            // Determine half based on commence time
            const commenceTime = new Date(score.commence_time);
            const now = new Date();
            const elapsedMs = now.getTime() - commenceTime.getTime();
            const elapsedMin = Math.floor(elapsedMs / 60000);

            let status: LiveMatchData['status'] = 'LIVE';
            let minute: number | null = null;

            if (elapsedMin < 0) return null; // Not started yet

            // For standard soccer (45 min halves)
            if (sportKey.startsWith('soccer_') && !sportKey.includes('esoccer') && !sportKey.includes('eseries')) {
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
            } else {
                // Esoccer GT Leagues (7 min halves typically)
                const halfDuration = 7;
                const htBuffer = 2;

                if (elapsedMin <= halfDuration) {
                    status = '1H';
                    minute = elapsedMin;
                } else if (elapsedMin <= halfDuration + htBuffer) {
                    status = 'HT';
                    minute = halfDuration;
                } else if (elapsedMin <= halfDuration * 2 + htBuffer) {
                    status = '2H';
                    minute = Math.min(elapsedMin - htBuffer, halfDuration * 2);
                } else {
                    status = 'FT';
                    minute = halfDuration * 2;
                }
            }

            // Extract scores
            let homeScore = 0;
            let awayScore = 0;
            for (const s of score.scores) {
                if (s.name === score.home_team) homeScore = parseInt(s.score, 10) || 0;
                if (s.name === score.away_team) awayScore = parseInt(s.score, 10) || 0;
            }

            return {
                externalId: score.id,
                sportKey: score.sport_key,
                sportTitle: score.sport_title || sportKey,
                homeTeam: score.home_team,
                awayTeam: score.away_team,
                homeScore,
                awayScore,
                status,
                minute,
                commenceTime: score.commence_time,
            };
        }

        return null;
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

        // Check for finished matches
        for (const [id] of this.liveMatches) {
            if (!newMatches.has(id)) {
                changed = true;
            }
        }

        return changed;
    }

    /**
     * Get current live matches (for API endpoint)
     */
    async getLiveMatches(): Promise<(LiveMatchData | any)[]> {
        const regularMatches = Array.from(this.liveMatches.values());
        const gtMatches = await this.gtLeaguesService.getMatches();
        return [...gtMatches, ...regularMatches];
    }
}
