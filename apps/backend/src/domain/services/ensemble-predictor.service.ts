import { SportCategory } from '@sports-prediction-engine/shared-types';
import { ProbabilitySet } from '../value-objects';
import { Game, ModelBreakdown } from '../entities';
import { PredictionModelPort } from '../ports/output';

/**
 * Domain Service: Ensemble Predictor
 *
 * Combines predictions from multiple models into a single
 * ensemble probability distribution using weighted averaging.
 */
export class EnsemblePredictor {
    /** Default weights for each model (must sum to 1.0) */
    private static readonly DEFAULT_WEIGHTS: Record<string, number> = {
        elo: 0.3,
        form: 0.3,
        oddsImplied: 0.4,
    };

    constructor(
        private readonly models: PredictionModelPort[],
        private readonly weights: Record<string, number> = EnsemblePredictor.DEFAULT_WEIGHTS,
    ) { }

    /**
     * Generate an ensemble prediction for a game.
     * Returns the combined probability set and per-model breakdown.
     */
    async predict(
        game: Game,
        category: SportCategory,
    ): Promise<{ probabilities: ProbabilitySet; breakdown: ModelBreakdown }> {
        // Filter models that support this sport category
        const supportedModels = this.models.filter((m) =>
            m.supportsCategory(category),
        );

        if (supportedModels.length === 0) {
            throw new Error(
                `No prediction models support category: ${category}`,
            );
        }

        // Get predictions from all supported models
        const modelResults: Map<string, ProbabilitySet> = new Map();
        for (const model of supportedModels) {
            const result = await model.predict(game, category);
            modelResults.set(model.getName(), result);
        }

        // Calculate normalized weights for available models
        const totalWeight = supportedModels.reduce(
            (sum, m) => sum + (this.weights[m.getName()] ?? 0),
            0,
        );

        // Weighted average of probabilities
        let homeWin = 0;
        let awayWin = 0;
        let draw = 0;

        for (const model of supportedModels) {
            const name = model.getName();
            const result = modelResults.get(name)!;
            const normalizedWeight = (this.weights[name] ?? 0) / totalWeight;

            homeWin += result.homeWin.value * normalizedWeight;
            awayWin += result.awayWin.value * normalizedWeight;
            if (result.draw) {
                draw += result.draw.value * normalizedWeight;
            }
        }

        // Build the combined probability set
        const probabilities = ProbabilitySet.forCategory(
            category,
            homeWin,
            awayWin,
            category === SportCategory.THREE_WAY ? draw : undefined,
        );

        // Build the model breakdown
        const breakdown: ModelBreakdown = {
            elo: modelResults.get('elo') ?? ProbabilitySet.forCategory(category, 0.5, 0.5, category === SportCategory.THREE_WAY ? 0 : undefined),
            form: modelResults.get('form') ?? ProbabilitySet.forCategory(category, 0.5, 0.5, category === SportCategory.THREE_WAY ? 0 : undefined),
            oddsImplied: modelResults.get('oddsImplied') ?? ProbabilitySet.forCategory(category, 0.5, 0.5, category === SportCategory.THREE_WAY ? 0 : undefined),
        };

        return { probabilities, breakdown };
    }
}
