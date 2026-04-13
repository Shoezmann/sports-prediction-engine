import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { GameRepositoryPort, PredictionRepositoryPort } from '../../domain/ports/output';
import { GAME_REPOSITORY_PORT, PREDICTION_REPOSITORY_PORT } from '../../domain/ports/output';
import { computeSportMinute } from '../../domain/services/sport-duration.service';
import { LiveScoresScraper, LiveScoreData } from './live-scores.scraper';

export interface LiveMatchData {
    externalId: string;
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
}

/** Sports that don't use cumulative home/away scores */
const NON_SCORING_SPORTS = new Set(['tennis', 'mma', 'mma_mixed_martial_arts', 'boxing']);

/**
 * Live Scores Service
 *
 * Fetches live scores on-demand (no background polling).
 * Called only when a user explicitly loads the live page.
 */
@Injectable()
export class LiveScoresService {
    private readonly logger = new Logger(LiveScoresService.name);

    private readonly SPORT_API_CATEGORIES = [
        { id: 1, key: 'soccer_epl', title: 'Soccer - EPL' },
        { id: 2, key: 'basketball_nba', title: 'Basketball - NBA' },
        { id: 3, key: 'tennis_atp', title: 'Tennis - ATP' },
        { id: 52, key: 'soccer_south_africa_psl', title: 'Soccer - PSL' },
        { id: 23114, key: 'soccer_esoccer_gt_leagues_12', title: 'Esoccer GT Leagues' },
        { id: 16, key: 'soccer_africa_cup_of_nations', title: 'Soccer - AFCON' },
    ];

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly scraper: LiveScoresScraper,
        @Inject(GAME_REPOSITORY_PORT)
        private readonly gameRepo: GameRepositoryPort,
        @Inject(PREDICTION_REPOSITORY_PORT)
        private readonly predictionRepo: PredictionRepositoryPort,
    ) { }

    /**
     * Fetch live matches on-demand (no caching, no polling).
     */
    async getLiveMatches(): Promise<LiveMatchData[]> {
        try {
            const scraperScores = await this.scraper.getLiveScores();
            const seen = new Map<string, LiveMatchData>();

            for (const s of scraperScores) {
                const m = this.toLiveMatchData(s);
                seen.set(m.externalId, m);
            }

            // SportAPI as additional source
            const sportApiKey = this.configService.get<string>('SPORT_API_KEY');
            if (sportApiKey && !sportApiKey.includes('your_')) {
                for (const cat of this.SPORT_API_CATEGORIES) {
                    try {
                        const matches = await this.fetchSportAPILive(cat.id, sportApiKey);
                        for (const m of matches) {
                            if (!seen.has(m.externalId)) seen.set(m.externalId, m);
                        }
                    } catch { /* skip */ }
                }
            }

            const all = Array.from(seen.values());

            // Fallback: games currently in progress from our predictions
            if (all.length === 0) {
                all.push(...await this.getLiveFromPredictions());
            }

            return all;
        } catch (error) {
            this.logger.error('Failed to fetch live matches', error);
            return [];
        }
    }

    private toLiveMatchData(s: LiveScoreData): LiveMatchData {
        return {
            externalId: s.id,
            sportKey: s.sportKey,
            sportTitle: s.sportTitle,
            league: s.league,
            homeTeam: s.homeTeam,
            awayTeam: s.awayTeam,
            homeScore: s.homeScore,
            awayScore: s.awayScore,
            status: s.status,
            minute: s.minute,
            commenceTime: s.commenceTime,
        };
    }

    private async fetchSportAPILive(categoryId: number, apiKey: string): Promise<LiveMatchData[]> {
        const baseUrl = this.configService.get<string>('SPORT_API_BASE_URL', 'https://sportapi7.p.rapidapi.com/api/v1');
        const apiHost = this.configService.get<string>('SPORT_API_HOST', 'sportapi7.p.rapidapi.com');

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
                return elapsed > -5 && elapsed < 120;
            })
            .map((e: any) => {
                const ct = e.startTimestamp * 1000;
                const statusType = e.status?.type;
                const sportKey = this.getSportKey(categoryId);
                const { minute, status } = computeSportMinute(sportKey, ct, now);

                const isScoring = !NON_SCORING_SPORTS.has(sportKey.split('_')[0]);
                const hs = isScoring ? (e.homeScore?.current ?? null) : null;
                const as_ = isScoring ? (e.awayScore?.current ?? null) : null;

                let finalStatus = status;
                if (statusType === 'finished' || statusType === 'ended') finalStatus = 'FT';
                else if (statusType === 'halftime' || statusType === 'break') finalStatus = 'HT';
                else if (statusType === 'inprogress' || statusType === 'started') finalStatus = status;

                return {
                    externalId: e.id?.toString() || `${categoryId}-${e.homeTeam?.name}`,
                    sportKey,
                    sportTitle: this.getCategoryTitle(categoryId),
                    league: this.getCategoryTitle(categoryId),
                    homeTeam: e.homeTeam?.name || 'Home',
                    awayTeam: e.awayTeam?.name || 'Away',
                    homeScore: hs,
                    awayScore: as_,
                    status: finalStatus,
                    minute,
                    commenceTime: new Date(ct).toISOString(),
                };
            });
    }

    private getSportKey(categoryId: number): string {
        return this.SPORT_API_CATEGORIES.find(c => c.id === categoryId)?.key || 'unknown';
    }

    private getCategoryTitle(categoryId: number): string {
        return this.SPORT_API_CATEGORIES.find(c => c.id === categoryId)?.title || 'Unknown';
    }

    /**
     * Fallback: derive "live" matches from predictions that are in progress.
     */
    private async getLiveFromPredictions(): Promise<LiveMatchData[]> {
        const predictions = await this.predictionRepo.findPending();
        const now = Date.now();
        const live: LiveMatchData[] = [];

        for (const pred of predictions) {
            const commenceTime = new Date(pred.game.commenceTime).getTime();
            const elapsedMin = Math.floor((now - commenceTime) / 60000);

            if (elapsedMin > 0 && elapsedMin < 120) {
                const { minute, status } = computeSportMinute(pred.game.sportKey, commenceTime, now);
                const isScoring = !NON_SCORING_SPORTS.has(pred.game.sportKey.split('_')[0]);
                live.push({
                    externalId: pred.game.id,
                    sportKey: pred.game.sportKey,
                    sportTitle: pred.game.sportTitle || pred.game.sportKey,
                    league: '',
                    homeTeam: pred.game.homeTeam.name,
                    awayTeam: pred.game.awayTeam.name,
                    homeScore: isScoring ? 0 : null,
                    awayScore: isScoring ? 0 : null,
                    status,
                    minute: minute ?? Math.min(elapsedMin, 90),
                    commenceTime: pred.game.commenceTime.toISOString(),
                });
            }
        }

        live.sort((a, b) => (b.minute || 0) - (a.minute || 0));
        return live;
    }
}
