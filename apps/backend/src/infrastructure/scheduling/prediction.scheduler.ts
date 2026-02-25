import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SyncSportsUseCase } from '../../application/use-cases/sync-sports.use-case';
import { SyncGamesUseCase } from '../../application/use-cases/sync-games.use-case';
import { GeneratePredictionsUseCase } from '../../application/use-cases/generate-predictions.use-case';
import { UpdateResultsUseCase } from '../../application/use-cases/update-results.use-case';

/**
 * Scheduled Tasks
 *
 * Runs the prediction pipeline automatically:
 * - Sports sync: Once daily at 3 AM
 * - Games sync + predictions: Every 6 hours
 * - Results update: Every 2 hours (to catch finished games quickly)
 */
@Injectable()
export class PredictionScheduler {
    private readonly logger = new Logger(PredictionScheduler.name);

    constructor(
        private readonly syncSports: SyncSportsUseCase,
        private readonly syncGames: SyncGamesUseCase,
        private readonly generatePredictions: GeneratePredictionsUseCase,
        private readonly updateResults: UpdateResultsUseCase,
    ) { }

    /**
     * Sync sports catalog daily at 3 AM UTC.
     * Free endpoint — no API quota cost.
     */
    @Cron('0 3 * * *', { name: 'sync-sports' })
    async handleSyncSports() {
        this.logger.log('⏰ Scheduled: Syncing sports...');
        try {
            const result = await this.syncSports.execute();
            this.logger.log(`✅ Sports sync: ${result.total} total, ${result.active} active`);
        } catch (error) {
            this.logger.error('❌ Scheduled sports sync failed', error);
        }
    }

    /**
     * Sync games and generate predictions every 6 hours.
     * Costs 1 API request per active sport + 1 for odds per sport.
     */
    @Cron('0 */6 * * *', { name: 'sync-games-and-predict' })
    async handleSyncGamesAndPredict() {
        this.logger.log('⏰ Scheduled: Syncing games & generating predictions...');
        try {
            const games = await this.syncGames.execute();
            this.logger.log(`📥 Games synced: ${games.synced} new across ${games.sports} sports`);

            const predictions = await this.generatePredictions.execute();
            this.logger.log(`🎯 Predictions: ${predictions.generated} generated, ${predictions.skipped} skipped`);
        } catch (error) {
            this.logger.error('❌ Scheduled game sync/predict failed', error);
        }
    }

    /**
     * Update results every 2 hours.
     * Catches completed games and resolves predictions.
     */
    @Cron('0 */2 * * *', { name: 'update-results' })
    async handleUpdateResults() {
        this.logger.log('⏰ Scheduled: Updating results...');
        try {
            const result = await this.updateResults.execute();
            this.logger.log(
                `📊 Results: ${result.updated} games, ${result.predictionsResolved} predictions, ${result.eloUpdated} ELO updates`,
            );
        } catch (error) {
            this.logger.error('❌ Scheduled results update failed', error);
        }
    }
}
