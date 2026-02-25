/**
 * Confidence level buckets derived from the numeric confidence value.
 */
export enum ConfidenceLevel {
    /** Confidence ≥ 70% */
    HIGH = 'high',

    /** Confidence 55–69% */
    MEDIUM = 'medium',

    /** Confidence < 55% */
    LOW = 'low',
}
