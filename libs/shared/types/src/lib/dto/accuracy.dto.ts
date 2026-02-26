import { SportGroup } from '../enums';

/**
 * Accuracy statistics for predictions.
 * Can be filtered by sport, group, confidence level, and time period.
 */
export interface AccuracyDto {
    /** Total number of resolved predictions */
    totalPredictions: number;

    /** Number of pending predictions (games not yet completed) */
    pendingPredictions: number;

    /** Number of correct predictions */
    correctPredictions: number;

    /** Overall accuracy (0.0 – 1.0) */
    accuracy: number;

    /** Breakdown by confidence level */
    byConfidenceLevel: {
        high: AccuracyBucketDto;
        medium: AccuracyBucketDto;
        low: AccuracyBucketDto;
    };

    /** Accuracy per prediction model */
    byModel: {
        elo: number;
        form: number;
        oddsImplied: number;
        ensemble: number;
    };

    /** Accuracy per sport key (e.g., 'soccer_epl': { ... }) */
    bySport: Record<string, AccuracyBucketDto>;

    /** Accuracy per sport group (e.g., 'Soccer': { ... }) */
    bySportGroup: Partial<Record<SportGroup, AccuracyBucketDto>>;

    /** Rolling 7-day accuracy */
    last7Days: number;

    /** Rolling 30-day accuracy */
    last30Days: number;
}

/**
 * A single accuracy bucket with total, correct, and derived accuracy.
 */
export interface AccuracyBucketDto {
    total: number;
    correct: number;
    accuracy: number;
}
