import { Inject, Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type {
    GameRepositoryPort,
    PredictionRepositoryPort,
    PredictionModelPort,
    SportsDataPort,
    SportRepositoryPort,
} from '../../domain/ports/output';
import {
    GAME_REPOSITORY_PORT,
    PREDICTION_REPOSITORY_PORT,
    PREDICTION_MODEL_PORT,
    SPORTS_DATA_PORT,
    SPORT_REPOSITORY_PORT,
} from '../../domain/ports/output';
import { Prediction } from '../../domain/entities';
import { EnsemblePredictor } from '../../domain/services';
import { OddsImpliedModelAdapter } from '../../infrastructure/adapters/prediction-models';

/**
 * Use Case: Generate Predictions
 *
 * Generates predictions for all upcoming games that don't yet have one.
 * Uses the ensemble predictor to combine multiple model outputs.
 */
@Injectable()
export class GeneratePredictionsUseCase {
    private readonly logger = new Logger(GeneratePredictionsUseCase.name);
    private readonly ensemble: EnsemblePredictor;

    constructor(
        @Inject(GAME_REPOSITORY_PORT)
        private readonly gameRepo: GameRepositoryPort,
        @Inject(PREDICTION_REPOSITORY_PORT)
        private readonly predictionRepo: PredictionRepositoryPort,
        @Inject(PREDICTION_MODEL_PORT)
        private readonly models: PredictionModelPort[],
        @Inject(SPORTS_DATA_PORT)
        private readonly sportsData: SportsDataPort,
        @Inject(SPORT_REPOSITORY_PORT)
        private readonly sportRepo: SportRepositoryPort,
        private readonly oddsImpliedModel: OddsImpliedModelAdapter,
    ) {
        this.ensemble = new EnsemblePredictor(models);
    }

    async execute(
        sportKey?: string,
    ): Promise<{ generated: number; skipped: number }> {
        const games = await this.gameRepo.findUpcoming(sportKey);
        this.logger.log(
            `Found ${games.length} upcoming games${sportKey ? ` for ${sportKey}` : ''}`,
        );

        let generated = 0;
        let skipped = 0;

        // Pre-fetch odds for all relevant sports
        const sportKeys = [...new Set(games.map((g) => g.sportKey))];
        for (const key of sportKeys) {
            try {
                const odds = await this.sportsData.fetchOdds(key);
                this.oddsImpliedModel.setOddsData(odds);
            } catch (error) {
                this.logger.warn(`Could not fetch odds for ${key}, skipping odds model`);
            }
        }

        for (const game of games) {
            try {
                const existing = await this.predictionRepo.findByGameId(game.id);
                if (existing) {
                    skipped++;
                    continue;
                }

                const { probabilities, breakdown } = await this.ensemble.predict(
                    game,
                    game.sportCategory,
                );

                const prediction = Prediction.create({
                    id: uuidv4(),
                    game,
                    probabilities,
                    modelBreakdown: breakdown,
                });

                await this.predictionRepo.save(prediction);
                generated++;
            } catch (error) {
                this.logger.error(
                    `Failed to generate prediction for game ${game.id}`,
                    error,
                );
                skipped++;
            }
        }

        this.logger.log(
            `Predictions complete: ${generated} generated, ${skipped} skipped`,
        );

        return { generated, skipped };
    }
}
