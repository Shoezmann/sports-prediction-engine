import { SportCategory } from '@sports-prediction-engine/shared-types';
import { ProbabilitySet } from '../../value-objects';
import { Game } from '../../entities';

/**
 * Output Port: Prediction Model
 *
 * Interface for individual prediction models (ELO, form-based, odds-implied).
 * Each model produces a probability distribution for a given game.
 */
export interface PredictionModelPort {
    /** The unique name of this model (e.g., 'elo', 'form', 'oddsImplied') */
    getName(): string;

    /** Whether this model can produce predictions for the given sport category */
    supportsCategory(category: SportCategory): boolean;

    /** Generate a probability distribution for the given game */
    predict(game: Game, category: SportCategory): Promise<ProbabilitySet>;
}

export const PREDICTION_MODEL_PORT = Symbol('PredictionModelPort');
