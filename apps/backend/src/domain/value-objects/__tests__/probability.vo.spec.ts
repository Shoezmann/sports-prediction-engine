import { describe, it, expect } from 'vitest';
import { Probability } from '../probability.vo';

describe('Probability VO', () => {
    describe('create', () => {
        it('should create a valid probability', () => {
            const prob = Probability.create(0.75);
            expect(prob.value).toBe(0.75);
        });

        it('should round to 4 decimal places', () => {
            const prob = Probability.create(0.123456);
            expect(prob.value).toBe(0.1235);
        });

        it('should throw if value is negative', () => {
            expect(() => Probability.create(-0.1)).toThrow(
                'Probability must be between 0.0 and 1.0'
            );
        });

        it('should throw if value is greater than 1', () => {
            expect(() => Probability.create(1.1)).toThrow(
                'Probability must be between 0.0 and 1.0'
            );
        });

        it('should allow boundary values 0 and 1', () => {
            expect(() => Probability.create(0)).not.toThrow();
            expect(() => Probability.create(1)).not.toThrow();
        });
    });

    describe('static factories', () => {
        it('should create zero probability', () => {
            const prob = Probability.zero();
            expect(prob.value).toBe(0);
        });

        it('should create one probability', () => {
            const prob = Probability.one();
            expect(prob.value).toBe(1);
        });
    });

    describe('percentage', () => {
        it('should return percentage as 0-100', () => {
            const prob = Probability.create(0.6543);
            expect(prob.percentage).toBe(65);
        });
    });

    describe('comparisons', () => {
        it('should check if greater than another probability', () => {
            const a = Probability.create(0.7);
            const b = Probability.create(0.5);
            expect(a.isGreaterThan(b)).toBe(true);
            expect(b.isGreaterThan(a)).toBe(false);
        });

        it('should check equality', () => {
            const a = Probability.create(0.5);
            const b = Probability.create(0.5);
            expect(a.equals(b)).toBe(true);
        });
    });

    describe('toString', () => {
        it('should format as percentage string', () => {
            const prob = Probability.create(0.75);
            expect(prob.toString()).toBe('75%');
        });
    });
});
