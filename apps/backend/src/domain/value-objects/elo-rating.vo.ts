/**
 * Value Object: EloRating
 *
 * Represents a team's ELO rating. Default starting rating is 1500.
 * Contains methods for expected score calculation and rating updates.
 */
export class EloRating {
    static readonly DEFAULT = 1500;
    static readonly K_FACTOR = 32;

    private constructor(private readonly _value: number) { }

    static create(value: number): EloRating {
        if (value <= 0) {
            throw new Error(`ELO rating must be positive, got ${value}`);
        }
        return new EloRating(Math.round(value * 100) / 100);
    }

    static default(): EloRating {
        return new EloRating(EloRating.DEFAULT);
    }

    get value(): number {
        return this._value;
    }

    /**
     * Calculate the expected score (probability of winning) against an opponent.
     * Uses the standard ELO expected score formula:
     *   E = 1 / (1 + 10^((opponentRating - thisRating) / 400))
     */
    expectedScoreAgainst(opponent: EloRating): number {
        const exponent = (opponent._value - this._value) / 400;
        return 1 / (1 + Math.pow(10, exponent));
    }

    /**
     * Calculate the new rating after a game result.
     * @param actualScore - 1.0 for win, 0.5 for draw, 0.0 for loss
     * @param expectedScore - The expected score from expectedScoreAgainst()
     * @param kFactor - The K-factor to use (default: 32)
     */
    updateAfterGame(
        actualScore: number,
        expectedScore: number,
        kFactor: number = EloRating.K_FACTOR,
    ): EloRating {
        const newRating = this._value + kFactor * (actualScore - expectedScore);
        return EloRating.create(Math.max(100, newRating));
    }

    /** Difference from another rating */
    diff(other: EloRating): number {
        return this._value - other._value;
    }

    isHigherThan(other: EloRating): boolean {
        return this._value > other._value;
    }

    equals(other: EloRating): boolean {
        return this._value === other._value;
    }

    toString(): string {
        return `ELO ${this._value}`;
    }
}
