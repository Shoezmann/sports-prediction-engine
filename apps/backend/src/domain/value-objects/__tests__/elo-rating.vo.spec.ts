import { describe, it, expect } from 'vitest';
import { EloRating } from '../elo-rating.vo';

describe('EloRating VO', () => {
    describe('create', () => {
        it('should create valid ELO rating', () => {
            const elo = EloRating.create(1600);
            expect(elo.value).toBe(1600);
        });

        it('should round to 2 decimal places', () => {
            const elo = EloRating.create(1500.123);
            expect(elo.value).toBe(1500.12);
        });

        it('should throw if value is zero or negative', () => {
            expect(() => EloRating.create(0)).toThrow();
            expect(() => EloRating.create(-100)).toThrow();
        });
    });

    describe('default', () => {
        it('should return default ELO of 1500', () => {
            const elo = EloRating.default();
            expect(elo.value).toBe(1500);
        });
    });

    describe('expectedScoreAgainst', () => {
        it('should return 0.5 for equal ratings', () => {
            const a = EloRating.create(1500);
            const b = EloRating.create(1500);
            expect(a.expectedScoreAgainst(b)).toBeCloseTo(0.5, 2);
        });

        it('should return > 0.5 for higher rated team', () => {
            const higher = EloRating.create(1600);
            const lower = EloRating.create(1500);
            expect(higher.expectedScoreAgainst(lower)).toBeGreaterThan(0.5);
        });

        it('should return < 0.5 for lower rated team', () => {
            const higher = EloRating.create(1600);
            const lower = EloRating.create(1500);
            expect(lower.expectedScoreAgainst(higher)).toBeLessThan(0.5);
        });

        it('should approach 1.0 for large rating differences', () => {
            const high = EloRating.create(2000);
            const low = EloRating.create(1000);
            expect(high.expectedScoreAgainst(low)).toBeGreaterThan(0.9);
        });
    });

    describe('updateAfterGame', () => {
        it('should increase rating after expected win', () => {
            const favorite = EloRating.create(1600);
            const underdog = EloRating.create(1500);
            const expected = favorite.expectedScoreAgainst(underdog);

            const newElo = favorite.updateAfterGame(1.0, expected);
            expect(newElo.value).toBeGreaterThan(1600);
        });

        it('should decrease rating after unexpected loss', () => {
            const favorite = EloRating.create(1600);
            const underdog = EloRating.create(1500);
            const expected = favorite.expectedScoreAgainst(underdog);

            const newElo = favorite.updateAfterGame(0.0, expected);
            expect(newElo.value).toBeLessThan(1600);
        });

        it('should handle draw correctly', () => {
            const elo = EloRating.create(1500);
            const opponent = EloRating.create(1500);
            const expected = elo.expectedScoreAgainst(opponent);

            const newElo = elo.updateAfterGame(0.5, expected);
            expect(newElo.value).toBe(1500); // No change when expected = actual
        });

        it('should not go below minimum floor of 100', () => {
            const low = EloRating.create(150);
            const high = EloRating.create(2000);
            const expected = low.expectedScoreAgainst(high);

            const newElo = low.updateAfterGame(0.0, expected);
            expect(newElo.value).toBeGreaterThanOrEqual(100);
        });
    });

    describe('comparisons', () => {
        it('should calculate diff correctly', () => {
            const a = EloRating.create(1600);
            const b = EloRating.create(1500);
            expect(a.diff(b)).toBe(100);
        });

        it('should check if higher than another', () => {
            const a = EloRating.create(1600);
            const b = EloRating.create(1500);
            expect(a.isHigherThan(b)).toBe(true);
            expect(b.isHigherThan(a)).toBe(false);
        });

        it('should check equality', () => {
            const a = EloRating.create(1500);
            const b = EloRating.create(1500);
            expect(a.equals(b)).toBe(true);
        });
    });

    describe('constants', () => {
        it('should have correct default and K-factor', () => {
            expect(EloRating.DEFAULT).toBe(1500);
            expect(EloRating.K_FACTOR).toBe(32);
        });
    });
});
