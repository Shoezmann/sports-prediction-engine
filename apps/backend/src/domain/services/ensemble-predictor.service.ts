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
        elo: 0.25,
        form: 0.25,
        oddsImplied: 0.30,
        ml: 0.20,
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
        customWeights?: Record<string, number>
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

        const activeWeights = customWeights ?? this.weights;

        // Calculate normalized weights for available models
        const totalWeight = supportedModels.reduce(
            (sum, m) => sum + (activeWeights[m.getName()] ?? 0),
            0,
        );

        // Weighted average of probabilities
        let homeWin = 0;
        let awayWin = 0;
        let draw = 0;

        for (const model of supportedModels) {
            const name = model.getName();
            const result = modelResults.get(name)!;
            const normalizedWeight = (activeWeights[name] ?? 0) / totalWeight;

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
            ml: modelResults.get('ml'),
        };

        return { probabilities, breakdown };
    }
}
