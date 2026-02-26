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
