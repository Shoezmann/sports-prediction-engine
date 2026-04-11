import { describe, it, expect } from 'vitest';
import { Confidence } from '../confidence.vo';
import { ConfidenceLevel } from '@sports-prediction-engine/shared-types';

describe('Confidence VO', () => {
    describe('create', () => {
        it('should create valid confidence', () => {
            const conf = Confidence.create(0.75);
            expect(conf.value).toBe(0.75);
        });

        it('should throw if value is out of range', () => {
            expect(() => Confidence.create(-0.1)).toThrow();
            expect(() => Confidence.create(1.1)).toThrow();
        });

        it('should allow boundary values', () => {
            expect(() => Confidence.create(0)).not.toThrow();
            expect(() => Confidence.create(1)).not.toThrow();
        });
    });

    describe('fromProbabilities', () => {
        it('should produce higher confidence for larger margins', () => {
            const highMargin = Confidence.fromProbabilities(0.75, 0.15);
            const lowMargin = Confidence.fromProbabilities(0.51, 0.49);

            expect(highMargin.value).toBeGreaterThan(lowMargin.value);
        });

        it('should blend max probability and margin', () => {
            // maxProb = 0.7, secondProb = 0.2, margin = 0.5
            // marginScore = min(1, 0.5 + 0.5) = 1.0
            // blended = (0.7 * 0.6) + (1.0 * 0.4) = 0.42 + 0.4 = 0.82
            const conf = Confidence.fromProbabilities(0.7, 0.2);
            expect(conf.value).toBeCloseTo(0.82, 2);
        });
    });

    describe('level', () => {
        it('should return HIGH for >= 0.60', () => {
            const conf = Confidence.create(0.65);
            expect(conf.level).toBe(ConfidenceLevel.HIGH);
        });

        it('should return MEDIUM for 0.50-0.59', () => {
            const conf = Confidence.create(0.55);
            expect(conf.level).toBe(ConfidenceLevel.MEDIUM);
        });

        it('should return LOW for < 0.50', () => {
            const conf = Confidence.create(0.45);
            expect(conf.level).toBe(ConfidenceLevel.LOW);
        });
    });

    describe('convenience getters', () => {
        it('should identify high confidence', () => {
            expect(Confidence.create(0.7).isHigh).toBe(true);
            expect(Confidence.create(0.7).isMedium).toBe(false);
            expect(Confidence.create(0.7).isLow).toBe(false);
        });
    });
});
