import { PredictionOutcome } from '@sports-prediction-engine/shared-types';
import { Confidence, ProbabilitySet } from '../value-objects';
import { Game } from './game.entity';

/**
 * Breakdown of how each individual prediction model voted.
 */
export interface ModelBreakdown {
    elo: ProbabilitySet;
    form: ProbabilitySet;
    oddsImplied: ProbabilitySet;
}

/**
 * Domain Entity: Prediction
 *
 * Represents a prediction for a single game, including the ensemble
 * probability distribution, confidence score, and per-model breakdown.
 */
export class Prediction {
    constructor(
        public readonly id: string,
        public readonly game: Game,
        public readonly predictedOutcome: PredictionOutcome,
        public readonly confidence: Confidence,
        public readonly probabilities: ProbabilitySet,
        public readonly modelBreakdown: ModelBreakdown,
        public readonly createdAt: Date,
        public readonly actualOutcome?: PredictionOutcome,
        public readonly isCorrect?: boolean,
        public readonly expectedValue?: number,
        public readonly recommendedStake?: number,
        public readonly odds?: number,
    ) { }

    static create(props: {
        id: string;
        game: Game;
        probabilities: ProbabilitySet;
        modelBreakdown: ModelBreakdown;
        createdAt?: Date;
        expectedValue?: number;
        recommendedStake?: number;
        odds?: number;
    }): Prediction {
        const predictedOutcome = Prediction.derivePredictedOutcome(
            props.probabilities,
        );
        const confidence = Prediction.deriveConfidence(props.probabilities);

        return new Prediction(
            props.id,
            props.game,
            predictedOutcome,
            confidence,
            props.probabilities,
            props.modelBreakdown,
            props.createdAt ?? new Date(),
            undefined, // actualOutcome
            undefined, // isCorrect
            props.expectedValue,
            props.recommendedStake,
            props.odds
        );
    }

    /**
     * Derive the predicted outcome from the probability distribution.
     * Picks the outcome with the highest probability.
     */
    private static derivePredictedOutcome(
        probabilities: ProbabilitySet,
    ): PredictionOutcome {
        const homeWin = probabilities.homeWin.value;
        const awayWin = probabilities.awayWin.value;
        const draw = probabilities.draw?.value ?? 0;

        if (homeWin >= awayWin && homeWin >= draw) {
            return PredictionOutcome.HOME_WIN;
        }
        if (awayWin >= homeWin && awayWin >= draw) {
            return PredictionOutcome.AWAY_WIN;
        }
        return PredictionOutcome.DRAW;
    }

    /**
     * Derive confidence from the probability distribution.
     * Uses margin-aware scoring: factors in both the max probability
     * and the gap between the top-2 outcomes for more meaningful confidence.
     */
    private static deriveConfidence(probabilities: ProbabilitySet): Confidence {
        const probs = [
            probabilities.homeWin.value,
            probabilities.awayWin.value,
            probabilities.draw?.value ?? 0,
        ].sort((a, b) => b - a);

        return Confidence.fromProbabilities(probs[0], probs[1]);
    }

    /** Whether this prediction has been resolved with an actual outcome */
    get isResolved(): boolean {
        return this.actualOutcome !== undefined && this.actualOutcome !== PredictionOutcome.PENDING;
    }

    /** Whether the prediction is still pending (game not completed) */
    get isPending(): boolean {
        return !this.isResolved;
    }

    /** The sport key from the associated game */
    get sportKey(): string {
        return this.game.sportKey;
    }

    /**
     * Mark the prediction with the actual game result.
     * Returns a new Prediction with the outcome and correctness set.
     */
    markResult(actualOutcome: PredictionOutcome): Prediction {
        const isCorrect = this.predictedOutcome === actualOutcome;
        return new Prediction(
            this.id,
            this.game,
            this.predictedOutcome,
            this.confidence,
            this.probabilities,
            this.modelBreakdown,
            this.createdAt,
            actualOutcome,
            isCorrect,
            this.expectedValue,
            this.recommendedStake,
            this.odds
        );
    }

    equals(other: Prediction): boolean {
        return this.id === other.id;
    }

    toString(): string {
        const result = this.isResolved
            ? ` → ${this.isCorrect ? '✅' : '❌'}`
            : '';
        return `${this.game} | ${this.predictedOutcome} (${this.confidence})${result}`;
    }
}
