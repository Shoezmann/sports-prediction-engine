/**
 * Value Object: Probability
 *
 * Represents a probability value between 0.0 and 1.0.
 * Immutable and self-validating.
 */
export class Probability {
    private constructor(private readonly _value: number) { }

    static create(value: number): Probability {
        if (value < 0 || value > 1) {
            throw new Error(
                `Probability must be between 0.0 and 1.0, got ${value}`
            );
        }
        return new Probability(Math.round(value * 10000) / 10000);
    }

    static zero(): Probability {
        return new Probability(0);
    }

    static one(): Probability {
        return new Probability(1);
    }

    get value(): number {
        return this._value;
    }

    /** Returns the probability as a percentage (0–100) */
    get percentage(): number {
        return Math.round(this._value * 100);
    }

    /** Returns true if this probability is greater than the other */
    isGreaterThan(other: Probability): boolean {
        return this._value > other._value;
    }

    equals(other: Probability): boolean {
        return this._value === other._value;
    }

    toString(): string {
        return `${this.percentage}%`;
    }
}
