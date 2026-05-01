import { Injectable, Logger } from '@nestjs/common';
import { SportCategory } from '@sports-prediction-engine/shared-types';
import type { PredictionModelPort } from '../../../domain/ports/output';
import { ProbabilitySet } from '../../../domain/value-objects';
import { Game } from '../../../domain/entities';
import { MLTrainingService } from '../../ml/ml-training.service';
import * as path from 'path';
import * as fs from 'fs';

/**
 * ML/XGBoost Prediction Model Adapter
 *
 * Wraps the MLTrainingService to integrate trained XGBoost models
 * into the ensemble prediction pipeline.
 *
 * Only produces predictions for THREE_WAY (soccer) sports that have
 * trained model files on disk. Falls back to a neutral distribution
 * for other sports to avoid polluting the ensemble.
 */
@Injectable()
export class MlModelAdapter implements PredictionModelPort {
    private readonly logger = new Logger(MlModelAdapter.name);
    private readonly modelDir: string;

    constructor(
        private readonly mlService: MLTrainingService,
    ) {
        this.modelDir = path.join(process.cwd(), 'apps/backend/models');
    }

    getName(): string {
        return 'ml';
    }

    supportsCategory(category: SportCategory): boolean {
        // ML models are only trained for soccer (THREE_WAY) currently
        // Could expand to other sports when more historical data is available
        return category === SportCategory.THREE_WAY;
    }

    async predict(
        game: Game,
        category: SportCategory,
    ): Promise<ProbabilitySet> {
        try {
            const sportKey = game.sportKey;

            // Check if we have trained models for this sport
            if (!this.hasTrainedModel(sportKey)) {
                this.logger.debug(`No trained ML model for ${sportKey}, returning neutral probabilities`);
                return this.neutralProbs(category);
            }

            // Get best available odds for this game to include as market features
            const odds = await this.getGameOdds(game);

            // Generate ML prediction
            const result = await this.mlService.predictMatch(game, sportKey, odds);

            if (!result) {
                this.logger.debug(`ML prediction returned null for ${sportKey}: ${game.homeTeam.name} vs ${game.awayTeam.name}`);
                return this.neutralProbs(category);
            }

            const { probabilities } = result;

            this.logger.log(
                `ML prediction for ${sportKey}: ${game.homeTeam.name} ${(probabilities.homeWin.value * 100).toFixed(0)}% | ` +
                `D ${((probabilities.draw?.value ?? 0) * 100).toFixed(0)}% | ` +
                `${game.awayTeam.name} ${(probabilities.awayWin.value * 100).toFixed(0)}%`,
            );

            return probabilities;
        } catch (error) {
            this.logger.warn(`ML model error for ${game.sportKey}: ${error.message}`);
            return this.neutralProbs(category);
        }
    }

    /**
     * Check if a trained model file exists for this sport.
     */
    private hasTrainedModel(sportKey: string): boolean {
        const modelPath = path.join(this.modelDir, `${sportKey}_outcome.json`);
        return fs.existsSync(modelPath);
    }

    /**
     * Return a neutral probability distribution to avoid
     * polluting the ensemble when ML is unavailable.
     * Home advantage is handled by the ELO model — this returns
     * a flat distribution to avoid double-counting venue bias.
     */
    private neutralProbs(category: SportCategory): ProbabilitySet {
        if (category === SportCategory.THREE_WAY) {
            // Neutral baseline: ~33% each — home advantage comes from ELO model
            return ProbabilitySet.threeWay(0.34, 0.33, 0.33);
        }
        // TWO_WAY sports: even split — ELO handles home advantage
        return ProbabilitySet.twoWay(0.50, 0.50);
    }

    /**
     * Get best available odds for a game to include as market features.
     * This is a simplified version — the full odds fetching is done
     * by GeneratePredictionsUseCase before ML is called.
     */
    private async getGameOdds(game: Game): Promise<{ home?: number; draw?: number; away?: number }> {
        // Odds are cached by the odds-implied model during the prediction pipeline.
        // For ML, we use placeholder values — the model will fall back to
        // neutral market features if actual odds aren't available.
        // A more complete implementation would pass odds through from the use case.
        return {};
    }
}
