import { SportCategory } from '@sports-prediction-engine/shared-types';
import { Probability } from './probability.vo';

/**
 * Value Object: ProbabilitySet
 *
 * Represents the probability distribution for a game outcome.
 * Adapts based on sport category:
 *   - THREE_WAY: homeWin + draw + awayWin = 1.0
 *   - TWO_WAY / HEAD_TO_HEAD: homeWin + awayWin = 1.0, draw is undefined
 */
export class ProbabilitySet {
    private constructor(
        private readonly _homeWin: Probability,
        private readonly _awayWin: Probability,
        private readonly _draw: Probability | undefined,
        private readonly _category: SportCategory,
    ) { }

    /**
     * Create a three-way probability set (soccer, ice hockey).
     * All three probabilities must sum to ~1.0.
     */
    static threeWay(
        homeWin: number,
        draw: number,
        awayWin: number,
    ): ProbabilitySet {
        const sum = homeWin + draw + awayWin;
        if (Math.abs(sum - 1.0) > 0.01) {
            throw new Error(
                `Three-way probabilities must sum to 1.0, got ${sum.toFixed(4)} (h=${homeWin}, d=${draw}, a=${awayWin})`
            );
        }
        return new ProbabilitySet(
            Probability.create(homeWin),
            Probability.create(awayWin),
            Probability.create(draw),
            SportCategory.THREE_WAY,
        );
    }

    /**
     * Create a two-way probability set (basketball, american football, etc).
     * Both probabilities must sum to ~1.0.
     */
    static twoWay(homeWin: number, awayWin: number): ProbabilitySet {
        const sum = homeWin + awayWin;
        if (Math.abs(sum - 1.0) > 0.01) {
            throw new Error(
                `Two-way probabilities must sum to 1.0, got ${sum.toFixed(4)} (h=${homeWin}, a=${awayWin})`
            );
        }
        return new ProbabilitySet(
            Probability.create(homeWin),
            Probability.create(awayWin),
            undefined,
            SportCategory.TWO_WAY,
        );
    }

    /**
     * Create a head-to-head probability set (tennis, MMA, boxing).
     * Same as two-way but semantically represents individual competitors.
     */
    static headToHead(
        competitorA: number,
        competitorB: number,
    ): ProbabilitySet {
        const sum = competitorA + competitorB;
        if (Math.abs(sum - 1.0) > 0.01) {
            throw new Error(
                `Head-to-head probabilities must sum to 1.0, got ${sum.toFixed(4)} (a=${competitorA}, b=${competitorB})`
            );
        }
        return new ProbabilitySet(
            Probability.create(competitorA),
            Probability.create(competitorB),
            undefined,
            SportCategory.HEAD_TO_HEAD,
        );
    }

    /**
     * Smart factory: create based on sport category.
     */
    static forCategory(
        category: SportCategory,
        homeWin: number,
        awayWin: number,
        draw?: number,
    ): ProbabilitySet {
        switch (category) {
            case SportCategory.THREE_WAY:
                return ProbabilitySet.threeWay(homeWin, draw ?? 0, awayWin);
            case SportCategory.TWO_WAY:
                return ProbabilitySet.twoWay(homeWin, awayWin);
            case SportCategory.HEAD_TO_HEAD:
                return ProbabilitySet.headToHead(homeWin, awayWin);
            default:
                return ProbabilitySet.twoWay(homeWin, awayWin);
        }
    }

    get homeWin(): Probability {
        return this._homeWin;
    }

    get awayWin(): Probability {
        return this._awayWin;
    }

    get draw(): Probability | undefined {
        return this._draw;
    }

    get category(): SportCategory {
        return this._category;
    }

    get hasDrawProbability(): boolean {
        return this._draw !== undefined;
    }

    /** Returns the highest probability in the set */
    get maxProbability(): Probability {
        let max = this._homeWin;
        if (this._awayWin.isGreaterThan(max)) max = this._awayWin;
        if (this._draw && this._draw.isGreaterThan(max)) max = this._draw;
        return max;
    }

    /** Returns plain object for serialization */
    toPlain(): { homeWin: number; awayWin: number; draw?: number } {
        return {
            homeWin: this._homeWin.value,
            awayWin: this._awayWin.value,
            ...(this._draw !== undefined && { draw: this._draw.value }),
        };
    }

    equals(other: ProbabilitySet): boolean {
        return (
            this._homeWin.equals(other._homeWin) &&
            this._awayWin.equals(other._awayWin) &&
            (this._draw === undefined
                ? other._draw === undefined
                : other._draw !== undefined && this._draw.equals(other._draw))
        );
    }
}
