import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DataIngestionService } from '../../data-ingestion/data-ingestion.service';
import { SofaScoreScraperService } from '../../data-ingestion/sofascore-scraper.service';
import { GeneratePredictionsUseCase } from '../../application/use-cases/generate-predictions.use-case';
import { UpdateResultsUseCase } from '../../application/use-cases/update-results.use-case';
import { GetPendingPredictionsUseCase } from '../../application/use-cases/get-pending-predictions.use-case';
import { GetAccuracyUseCase } from '../../application/use-cases/get-accuracy.use-case';
import { TrainModelsUseCase } from '../../application/use-cases/train-models.use-case';
import { PredictionStreamService } from '../sse/prediction-stream.service';
import { LiveScoresService } from '../live-scores/live-scores.service';
import { EloSeederService } from '../services/elo-seeder.service';

/**
 * Prediction Scheduler
 *
 * Self-contained prediction pipeline with SofaScore data ingestion.
 * Zero external paid API dependency.
 *
 * Cron schedule:
 *   - Every 4h:    SofaScore fixture sync + result updates
 *   - Every 5min:  Dev-mode prediction regeneration
 *   - Every 2h:    Fetch recent results from SofaScore
 *   - Weekly:      Retrain ML models (Sunday 05:00 UTC)
 *   - Every 1min:  SSE broadcast of live data
 */
@Injectable()
export class PredictionScheduler implements OnModuleInit {
    private readonly logger = new Logger(PredictionScheduler.name);
    private readonly isProd: boolean;

    constructor(
        private readonly dataIngestion: DataIngestionService,
        private readonly sofascore: SofaScoreScraperService,
        private readonly generatePredictions: GeneratePredictionsUseCase,
        private readonly updateResults: UpdateResultsUseCase,
        private readonly getPendingPredictions: GetPendingPredictionsUseCase,
        private readonly getAccuracy: GetAccuracyUseCase,
        private readonly trainModels: TrainModelsUseCase,
        private readonly streamService: PredictionStreamService,
        private readonly liveScoresService: LiveScoresService,
        private readonly configService: ConfigService,
        private readonly eloSeeder: EloSeederService,
    ) {
        this.isProd = this.configService.get<string>('NODE_ENV') === 'production';
        this.logger.log(`Scheduler initialized — isProd: ${this.isProd}`);
    }

    async onModuleInit() {
        if (this.isProd) return;
        this.logger.log('[STARTUP] Initialising prediction pipeline...');
        try {
            // 1. Seed core data (sports, teams, seed fixtures)
            const seedResult = await this.dataIngestion.seedAll();
            this.logger.log(
                `[STARTUP] Seeded: ${seedResult.sports} sports, ${seedResult.teams} teams, ${seedResult.fixtures} fixtures`,
            );

            // 2. SofaScore sync — pull next 7 days of fixtures
            try {
                const sofaResult = await this.sofascore.syncUpcomingFixtures(7);
                this.logger.log(
                    `[STARTUP] SofaScore: ${sofaResult.saved} fixtures saved across ${sofaResult.sports.length} leagues`,
                );
            } catch (err) {
                this.logger.warn(`[STARTUP] SofaScore sync failed (non-critical): ${err.message}`);
            }

            // 3. Generate predictions for all upcoming fixtures
            this.logger.log('[STARTUP] Generating predictions...');
            const predictions = await this.generatePredictions.execute();
            this.logger.log(
                `[STARTUP] Predictions: ${predictions.generated} generated, ${predictions.skipped} skipped`,
            );

            this.logger.log('[STARTUP] System ready — SofaScore scraper active, 6-model ensemble online');
        } catch (error) {
            this.logger.error('[STARTUP] Initial setup failed', error);
        }
    }

    // ─── Every 4 Hours: SofaScore fixture sync ───────────
    @Cron('0 */4 * * *', { name: 'sofascore-sync-4h' })
    async handleSofaScoreSync() {
        this.logger.log('[CRON */4h] Syncing upcoming fixtures from SofaScore...');
        try {
            const result = await this.sofascore.syncUpcomingFixtures(7);
            if (result.saved > 0) {
                this.logger.log(
                    `[CRON */4h] SofaScore: ${result.saved} fixtures saved | Leagues: ${result.sports.join(', ')}`,
                );
                // Generate predictions for newly synced games
                const predictions = await this.generatePredictions.execute();
                this.logger.log(`[CRON */4h] Predictions: ${predictions.generated} generated`);
            }
        } catch (error) {
            this.logger.error('[CRON */4h] SofaScore sync failed', error);
        }
    }

    // ─── Every 2 Hours: Fetch recent results from SofaScore ──
    @Cron('30 */2 * * *', { name: 'sofascore-results-2h' })
    async handleResultsFetch() {
        this.logger.log('[CRON */2h] Fetching recent results from SofaScore...');
        try {
            const result = await this.updateResults.execute();
            if (result.updated > 0 || result.predictionsResolved > 0) {
                this.logger.log(
                    `[CRON */2h] Results: ${result.updated} games, ${result.predictionsResolved} predictions resolved, ${result.eloUpdated} ELO updates`,
                );
            }
        } catch (error) {
            this.logger.error('[CRON */2h] Results fetch failed', error);
        }
    }

    // ─── Every 5 min (dev): regenerate predictions ───────
    @Cron('*/5 * * * *', { name: 'auto-predictions-dev' })
    async handleAutoPredictionsDev() {
        if (this.isProd) return;
        try {
            const result = await this.generatePredictions.execute();
            if (result.generated > 0) {
                this.logger.log(`[CRON */5min] Generated ${result.generated} new predictions`);
            }
        } catch (error) {
            this.logger.error('[CRON */5min] Prediction generation failed', error);
        }
    }

    // ─── Weekly: Retrain ML Models (Sunday 05:00 UTC) ────
    @Cron('0 5 * * 0', { name: 'train-models-weekly' })
    async handleTrainModels() {
        this.logger.log('[CRON Weekly] Retraining ML models...');
        try {
            const result = await this.trainModels.execute();
            this.logger.log(
                `[CRON Weekly] Training: ${result.trained} trained, ${result.failed} failed`,
            );
        } catch (error) {
            this.logger.error('[CRON Weekly] Model training failed', error);
        }
    }

    // ─── Real-Time: Broadcast Live Updates Every 60s ─────
    @Cron('*/1 * * * *', { name: 'live-broadcast' })
    async handleLiveBroadcast() {
        try {
            const predictions = await this.getPendingPredictions.execute();
            const accuracy = await this.getAccuracy.execute();
            const liveMatches = await this.liveScoresService.getLiveMatches();
            this.streamService.broadcast('predictions', {
                count: predictions.length,
                liveCount: liveMatches.length,
                predictions,
                accuracy,
                liveMatches,
            });
        } catch (error) {
            this.logger.error('[SSE] Failed to broadcast', error);
        }
    }
}
