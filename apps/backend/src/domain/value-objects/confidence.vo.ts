import { ConfidenceLevel } from '@sports-prediction-engine/shared-types';

/**
 * Value Object: Confidence
 *
 * Represents a prediction confidence score (0.0–1.0) and derives
 * the confidence level bucket (HIGH / MEDIUM / LOW).
 */
export class Confidence {
    private constructor(private readonly _value: number) { }

    static create(value: number): Confidence {
        if (value < 0 || value > 1) {
            throw new Error(
                `Confidence must be between 0.0 and 1.0, got ${value}`
            );
        }
        return new Confidence(Math.round(value * 10000) / 10000);
    }

    /**
     * Create confidence from a probability set, using margin-aware scoring.
     * This produces more meaningful confidence than just using max probability.
     * 
     * A 51%/49% split should be LOW confidence even though max=51%.
     * A 75%/15%/10% split should be HIGH confidence.
     * 
     * Formula: blend of max probability (60%) and margin over second-best (40%).
     */
    static fromProbabilities(maxProb: number, secondProb: number): Confidence {
        const margin = maxProb - secondProb;
        // Margin ranges from 0 (dead heat) to ~1 (total dominance)
        // Blend: 60% raw max + 40% margin-boosted score
        const marginScore = Math.min(1, 0.5 + margin); // 0.5 base + margin
        const blended = (maxProb * 0.6) + (marginScore * 0.4);
        return Confidence.create(Math.min(1, Math.max(0, blended)));
    }

    get value(): number {
        return this._value;
    }

    get percentage(): number {
        return Math.round(this._value * 100);
    }

    /** 
     * Derive the confidence level bucket 
     * For real-world sports, >60% is highly confident, 
     * >50% is medium confidence (an edge), and <50% is low (toss up or under).
     */
    get level(): ConfidenceLevel {
        if (this._value >= 0.60) return ConfidenceLevel.HIGH;
        if (this._value >= 0.50) return ConfidenceLevel.MEDIUM;
        return ConfidenceLevel.LOW;
    }

    get isHigh(): boolean {
        return this.level === ConfidenceLevel.HIGH;
    }

    get isMedium(): boolean {
        return this.level === ConfidenceLevel.MEDIUM;
    }

    get isLow(): boolean {
        return this.level === ConfidenceLevel.LOW;
    }

    equals(other: Confidence): boolean {
        return this._value === other._value;
    }

    toString(): string {
        return `${this.percentage}% (${this.level})`;
    }
}
