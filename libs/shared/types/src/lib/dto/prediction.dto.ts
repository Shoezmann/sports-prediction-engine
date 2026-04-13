import { ConfidenceLevel, PredictionOutcome } from '../enums';
import { GameDto } from './game.dto';

/**
 * Probability distribution for a game outcome.
 * The `draw` field is only present for THREE_WAY sports (e.g., soccer).
 */
export interface ProbabilitySetDto {
    /** Probability of home team / Competitor A winning (0.0 – 1.0) */
    homeWin: number;

    /** Probability of away team / Competitor B winning (0.0 – 1.0) */
    awayWin: number;

    /** Probability of a draw (0.0 – 1.0). Only present for THREE_WAY sports. */
    draw?: number;
}

/**
 * Per-model probability breakdown showing each model's individual predictions.
 */
export interface ModelBreakdownDto {
    elo: ProbabilitySetDto;
    form: ProbabilitySetDto;
    oddsImplied: ProbabilitySetDto;
    /** ML/XGBoost model — only populated when a trained model exists for the sport */
    ml?: ProbabilitySetDto;
}

/**
 * Goals market predictions.
 */
export interface GoalsPredictionDto {
    /** Probability of over 2.5 goals (0.0 – 1.0) */
    over2_5: number;
    /** Probability of under 2.5 goals (0.0 – 1.0) */
    under2_5: number;
    /** Expected total goals */
    expectedGoals?: number;
}

/**
 * Both Teams To Score (BTTS) prediction.
 */
export interface BttsPredictionDto {
    /** Probability both teams score (0.0 – 1.0) */
    yes: number;
    /** Probability at least one team fails to score (0.0 – 1.0) */
    no: number;
}

/**
 * A prediction for a single game with full model breakdown and confidence.
 */
export interface PredictionDto {
    /** Internal UUID */
    id: string;

    /** The game this prediction is for */
    game: GameDto;

    /** The predicted outcome */
    predictedOutcome: PredictionOutcome;

    /** Confidence score (0.0 – 1.0) */
    confidence: number;

    /** Confidence bucket (high, medium, low) */
    confidenceLevel: ConfidenceLevel;

    /** Full probability distribution from the ensemble model */
    probabilities: ProbabilitySetDto;

    /** Individual model probability breakdown */
    modelBreakdown: ModelBreakdownDto;

    /** Goals market predictions (soccer only) */
    goals?: GoalsPredictionDto;

    /** Both Teams To Score prediction (soccer only) */
    btts?: BttsPredictionDto;

    /** Expected value based on best available odds (positive = value bet) */
    expectedValue?: number;

    /** Recommended stake as fraction of bankroll (Kelly Criterion, quarter-Kelly capped at 5%) */
    recommendedStake?: number;

    /** Best available decimal odds at time of prediction */
    odds?: number;

    /** Actual outcome after the game completes */
    actualOutcome?: PredictionOutcome;

    /** Whether the prediction was correct */
    isCorrect?: boolean;

    /** When this prediction was generated (ISO 8601) */
    createdAt: string;
}
