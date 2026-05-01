import { Injectable, Inject, Logger } from '@nestjs/common';
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
 * On-demand live score fetching — no background polling.
 * All data sourced from SofaScore (free, no API keys) via LiveScoresScraper.
 *
 * Falls back to pending predictions from DB when scraping yields nothing.
 */
@Injectable()
export class LiveScoresService {
    private readonly logger = new Logger(LiveScoresService.name);

    constructor(
        private readonly scraper: LiveScoresScraper,
        @Inject(GAME_REPOSITORY_PORT)
        private readonly gameRepo: GameRepositoryPort,
        @Inject(PREDICTION_REPOSITORY_PORT)
        private readonly predictionRepo: PredictionRepositoryPort,
    ) {}

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

            const all = Array.from(seen.values());

            // Fallback: derive "live" from our own pending predictions
            if (all.length === 0) {
                this.logger.debug('No live data from scrapers — falling back to predictions');
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

    /**
     * Fallback: derive "live" matches from predictions that are in progress.
     * Shows status (1H/HT/2H) computed from kick-off time; score shown as 0-0.
     * No fake minutes — shows null if not provided by the scraper.
     */
    private async getLiveFromPredictions(): Promise<LiveMatchData[]> {
        const predictions = await this.predictionRepo.findPending();
        const now = Date.now();
        const live: LiveMatchData[] = [];

        for (const pred of predictions) {
            const commenceTime = new Date(pred.game.commenceTime).getTime();
            const elapsedMin = Math.floor((now - commenceTime) / 60_000);

            if (elapsedMin > 0 && elapsedMin < 120) {
                const { status } = computeSportMinute(pred.game.sportKey, commenceTime, now);
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
                    minute: null,
                    commenceTime: pred.game.commenceTime.toISOString(),
                });
            }
        }

        live.sort((a, b) => (a.commenceTime < b.commenceTime ? -1 : 1));
        return live;
    }
}
