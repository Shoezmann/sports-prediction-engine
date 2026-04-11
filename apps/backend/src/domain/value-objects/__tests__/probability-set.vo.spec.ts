import { describe, it, expect } from 'vitest';
import { ProbabilitySet } from '../probability-set.vo';
import { SportCategory } from '@sports-prediction-engine/shared-types';

describe('ProbabilitySet VO', () => {
    describe('threeWay', () => {
        it('should create valid three-way probabilities', () => {
            const ps = ProbabilitySet.threeWay(0.4, 0.3, 0.3);
            expect(ps.homeWin.value).toBe(0.4);
            expect(ps.draw!.value).toBe(0.3);
            expect(ps.awayWin.value).toBe(0.3);
        });

        it('should throw if probabilities do not sum to 1', () => {
            expect(() => ProbabilitySet.threeWay(0.5, 0.5, 0.5)).toThrow(
                'must sum to 1.0'
            );
        });

        it('should allow small rounding tolerance', () => {
            expect(() => ProbabilitySet.threeWay(0.3333, 0.3333, 0.3334)).not.toThrow();
        });
    });

    describe('twoWay', () => {
        it('should create valid two-way probabilities', () => {
            const ps = ProbabilitySet.twoWay(0.6, 0.4);
            expect(ps.homeWin.value).toBe(0.6);
            expect(ps.awayWin.value).toBe(0.4);
            expect(ps.hasDrawProbability).toBe(false);
        });

        it('should throw if probabilities do not sum to 1', () => {
            expect(() => ProbabilitySet.twoWay(0.7, 0.7)).toThrow();
        });
    });

    describe('headToHead', () => {
        it('should create valid head-to-head probabilities', () => {
            const ps = ProbabilitySet.headToHead(0.55, 0.45);
            expect(ps.homeWin.value).toBe(0.55);
            expect(ps.awayWin.value).toBe(0.45);
            expect(ps.category).toBe(SportCategory.HEAD_TO_HEAD);
        });
    });

    describe('forCategory', () => {
        it('should create three-way for THREE_WAY category', () => {
            const ps = ProbabilitySet.forCategory(
                SportCategory.THREE_WAY,
                0.45,
                0.30,
                0.25
            );
            expect(ps.category).toBe(SportCategory.THREE_WAY);
            expect(ps.hasDrawProbability).toBe(true);
        });

        it('should create two-way for TWO_WAY category', () => {
            const ps = ProbabilitySet.forCategory(
                SportCategory.TWO_WAY,
                0.55,
                0.45
            );
            expect(ps.category).toBe(SportCategory.TWO_WAY);
            expect(ps.hasDrawProbability).toBe(false);
        });

        it('should create head-to-head for HEAD_TO_HEAD category', () => {
            const ps = ProbabilitySet.forCategory(
                SportCategory.HEAD_TO_HEAD,
                0.6,
                0.4
            );
            expect(ps.category).toBe(SportCategory.HEAD_TO_HEAD);
        });
    });

    describe('maxProbability', () => {
        it('should return the highest probability in the set', () => {
            const ps = ProbabilitySet.threeWay(0.3, 0.45, 0.25);
            expect(ps.maxProbability.value).toBe(0.45);
        });
    });

    describe('toPlain', () => {
        it('should serialize to plain object with draw for three-way', () => {
            const ps = ProbabilitySet.threeWay(0.4, 0.35, 0.25);
            const plain = ps.toPlain();
            expect(plain).toEqual({ homeWin: 0.4, awayWin: 0.25, draw: 0.35 });
        });

        it('should serialize without draw for two-way', () => {
            const ps = ProbabilitySet.twoWay(0.6, 0.4);
            const plain = ps.toPlain();
            expect(plain).toEqual({ homeWin: 0.6, awayWin: 0.4 });
            expect(plain).not.toHaveProperty('draw');
        });
    });
});
