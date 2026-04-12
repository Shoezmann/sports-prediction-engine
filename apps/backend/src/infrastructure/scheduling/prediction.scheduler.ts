import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SyncSportsUseCase } from '../../application/use-cases/sync-sports.use-case';
import { SyncGamesUseCase } from '../../application/use-cases/sync-games.use-case';
import { GeneratePredictionsUseCase } from '../../application/use-cases/generate-predictions.use-case';
import { UpdateResultsUseCase } from '../../application/use-cases/update-results.use-case';
import { HistoricalBackfillUseCase } from '../../application/use-cases/historical-backfill.use-case';
import { GetPendingPredictionsUseCase } from '../../application/use-cases/get-pending-predictions.use-case';
import { GetAccuracyUseCase } from '../../application/use-cases/get-accuracy.use-case';
import { PredictionStreamService } from '../sse/prediction-stream.service';
import { LiveScoresService } from '../live-scores/live-scores.service';

/**
 * Production-ready Prediction Pipeline Scheduler
 *
 * The pipeline runs automatically in a staggered, realistic cadence:
 *
 *   03:00 UTC daily    → Sync sports catalog (free, no quota)
 *   06:00 UTC daily    → Sync upcoming games (costs API quota)
 *   06:05 UTC daily    → Generate predictions (fetches odds, costs API quota)
 *   Every 4 hours      → Update results (fetch scores, resolve predictions, update ELO)
 *
 * The 5-minute gap between games sync and prediction generation ensures the DB
 * is committed before predictions try to read it.
 *
 * Results update every 4 hours (not 2) to conserve API quota while still
 * catching finished games within a reasonable window.
 *
 * All errors are caught and logged — a single failed step never blocks the next cycle.
 */
@Injectable()
export class PredictionScheduler {
    private readonly logger = new Logger(PredictionScheduler.name);
    private readonly isProd: boolean;

    constructor(
        private readonly syncSports: SyncSportsUseCase,
        private readonly syncGames: SyncGamesUseCase,
        private readonly generatePredictions: GeneratePredictionsUseCase,
        private readonly updateResults: UpdateResultsUseCase,
        private readonly historicalBackfill: HistoricalBackfillUseCase,
        private readonly getPendingPredictions: GetPendingPredictionsUseCase,
        private readonly getAccuracy: GetAccuracyUseCase,
        private readonly streamService: PredictionStreamService,
        private readonly liveScoresService: LiveScoresService,
        private readonly configService: ConfigService,
    ) {
        this.isProd = this.configService.get<string>('NODE_ENV') === 'production';
    }

    // ─── Daily: Sync Sports Catalog ──────────────────────────
    // Runs at 03:00 UTC — free endpoint, no API quota cost.
    // Discovers new sports/leagues and updates active status.
    @Cron('0 3 * * *', { name: 'sync-sports-daily' })
    async handleSyncSports() {
        this.logger.log('[CRON 03:00] Syncing sports catalog...');
        try {
            const result = await this.syncSports.execute();
            this.logger.log(
                `[CRON 03:00] Sports synced: ${result.total} total, ${result.active} active, ${result.new} new`,
            );
        } catch (error) {
            this.logger.error('[CRON 03:00] Sports sync failed', error);
        }
    }

    // ─── Daily: Sync Upcoming Games ──────────────────────────
    // Runs at 06:00 UTC — costs 1 API request per active sport.
    // Fetches upcoming matches for all active sports.
    @Cron('0 6 * * *', { name: 'sync-games-daily' })
    async handleSyncGames() {
        this.logger.log('[CRON 06:00] Syncing upcoming games...');
        try {
            const result = await this.syncGames.execute();
            this.logger.log(
                `[CRON 06:00] Games synced: ${result.synced} new across ${result.sports} sports`,
            );
        } catch (error) {
            this.logger.error('[CRON 06:00] Game sync failed', error);
        }
    }

    // ─── Daily: Generate Predictions ─────────────────────────
    // Runs at 06:05 UTC — costs 1 API request per sport (odds fetch).
    // 5-minute delay after game sync ensures DB commit.
    @Cron('5 6 * * *', { name: 'generate-predictions-daily' })
    async handleGeneratePredictions() {
        this.logger.log('[CRON 06:05] Generating predictions...');
        try {
            const result = await this.generatePredictions.execute();
            this.logger.log(
                `[CRON 06:05] Predictions: ${result.generated} generated, ${result.skipped} skipped`,
            );
        } catch (error) {
            this.logger.error('[CRON 06:05] Prediction generation failed', error);
        }
    }

    // ─── Every 4 Hours: Update Results ───────────────────────
    // Fetches scores for unresolved games, resolves predictions, updates ELO.
    // Costs 1 API request per sport with unresolved games.
    @Cron('0 */4 * * *', { name: 'update-results-4h' })
    async handleUpdateResults() {
        this.logger.log('[CRON */4h] Updating results...');
        try {
            const result = await this.updateResults.execute();
            this.logger.log(
                `[CRON */4h] Results: ${result.updated} games, ${result.predictionsResolved} predictions resolved, ${result.eloUpdated} ELO updates`,
            );
        } catch (error) {
            this.logger.error('[CRON */4h] Results update failed', error);
        }
    }

    // ─── Weekly: Historical Backfill (Sunday 04:00 UTC) ─────
    // Backfills results for the past 7 days to catch any missed games.
    @Cron('0 4 * * 0', { name: 'backfill-weekly' })
    async handleWeeklyBackfill() {
        this.logger.log('[CRON SUN 04:00] Running weekly backfill...');
        try {
            const result = await this.historicalBackfill.execute(7);
            this.logger.log(
                `[CRON SUN 04:00] Backfill: ${result.backfilled} games backfilled, ${result.eloUpdated} ELO updates`,
            );
        } catch (error) {
            this.logger.error('[CRON SUN 04:00] Weekly backfill failed', error);
        }
    }

    // ─── Real-Time: Broadcast Live Updates Every 60s ─────────
    // Fetches fresh predictions and broadcasts to all SSE clients.
    // This gives clients real-time updates without page refresh.
    @Interval('live-broadcast', 60_000)
    async handleLiveBroadcast() {
        // Always broadcast to connected clients

        try {
            const predictions = await this.getPendingPredictions.execute();
            const accuracy = await this.getAccuracy.execute();

            const liveMatches = await this.liveScoresService.getLiveMatches();
            this.streamService.broadcast('predictions', {
                count: predictions.length,
                liveCount: predictions.filter(p => {
                    const diff = new Date(p.game.commenceTime).getTime() - Date.now();
                    const mins = Math.floor(-diff / 60000);
                    return mins > 0 && mins < 120;
                }).length,
                predictions,
                accuracy,
                liveMatches,
            });
        } catch (error) {
            this.logger.error('[SSE] Failed to broadcast predictions', error);
        }
    }
}
