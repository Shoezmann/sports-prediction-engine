import { describe, it, expect, vi } from 'vitest';
import { EnsemblePredictor } from '../ensemble-predictor.service';
import { SportCategory, PredictionOutcome } from '@sports-prediction-engine/shared-types';
import { ProbabilitySet } from '../../value-objects';
import { Game, Team, Prediction } from '../../entities';
import type { PredictionModelPort } from '../../ports/output';

describe('EnsemblePredictor Service', () => {
    const createMockModel = (
        name: string,
        supportsCategory: boolean,
        homeWin: number,
        awayWin: number,
        draw?: number
    ): PredictionModelPort => ({
        getName: () => name,
        supportsCategory: () => supportsCategory,
        predict: async () =>
            draw !== undefined
                ? ProbabilitySet.threeWay(homeWin, draw, awayWin)
                : ProbabilitySet.twoWay(homeWin, awayWin),
    });

    const createTestGame = () => {
        const homeTeam = Team.create({ id: 'home', name: 'Home', sportKey: 'test' });
        const awayTeam = Team.create({ id: 'away', name: 'Away', sportKey: 'test' });
        return Game.create({
            id: 'game-1',
            externalId: 'ext-1',
            sportKey: 'soccer_epl',
            sportTitle: 'EPL',
            sportGroup: 'Soccer',
            sportCategory: SportCategory.THREE_WAY,
            homeTeam,
            awayTeam,
            commenceTime: new Date(),
        });
    };

    describe('predict', () => {
        it('should combine predictions from all models with weights', async () => {
            const eloModel = createMockModel('elo', true, 0.5, 0.3, 0.2);
            const formModel = createMockModel('form', true, 0.4, 0.35, 0.25);
            const oddsModel = createMockModel('oddsImplied', true, 0.45, 0.3, 0.25);

            const predictor = new EnsemblePredictor([eloModel, formModel, oddsModel]);
            const game = createTestGame();

            const result = await predictor.predict(game, SportCategory.THREE_WAY);

            expect(result.probabilities.homeWin.value).toBeGreaterThan(0);
            expect(result.probabilities.awayWin.value).toBeGreaterThan(0);
            expect(result.probabilities.draw!.value).toBeGreaterThan(0);

            // Probabilities should sum to ~1
            const sum =
                result.probabilities.homeWin.value +
                result.probabilities.awayWin.value +
                result.probabilities.draw!.value;
            expect(sum).toBeCloseTo(1.0, 2);
        });

        it('should filter out models that do not support the category', async () => {
            const onlyOdds = createMockModel('oddsImplied', true, 0.6, 0.2, 0.2);
            const noSupport = createMockModel('elo', false, 0.3, 0.3, 0.4);

            const predictor = new EnsemblePredictor([noSupport, onlyOdds]);
            const game = createTestGame();

            const result = await predictor.predict(game, SportCategory.THREE_WAY);

            // Should only use oddsImplied model
            expect(result.breakdown.elo.homeWin.value).toBe(0.5); // Default fallback
            expect(result.probabilities.homeWin.value).toBeCloseTo(0.6, 1);
        });

        it('should throw if no models support the category', async () => {
            const noSupport = createMockModel('elo', false, 0.5, 0.5);
            const predictor = new EnsemblePredictor([noSupport]);
            const game = createTestGame();

            await expect(
                predictor.predict(game, SportCategory.THREE_WAY)
            ).rejects.toThrow('No prediction models support category');
        });

        it('should include model breakdown in result', async () => {
            const elo = createMockModel('elo', true, 0.5, 0.3, 0.2);
            const form = createMockModel('form', true, 0.4, 0.35, 0.25);
            const odds = createMockModel('oddsImplied', true, 0.45, 0.3, 0.25);

            const predictor = new EnsemblePredictor([elo, form, odds]);
            const game = createTestGame();

            const result = await predictor.predict(game, SportCategory.THREE_WAY);

            expect(result.breakdown.elo).toBeDefined();
            expect(result.breakdown.form).toBeDefined();
            expect(result.breakdown.oddsImplied).toBeDefined();
        });

        it('should handle two-way sports correctly', async () => {
            const elo = createMockModel('elo', true, 0.6, 0.4);
            const form = createMockModel('form', true, 0.55, 0.45);

            const predictor = new EnsemblePredictor([elo, form]);
            const homeTeam = Team.create({ id: 'home', name: 'Home', sportKey: 'test' });
            const awayTeam = Team.create({ id: 'away', name: 'Away', sportKey: 'test' });
            const game = Game.create({
                id: 'game-2',
                externalId: 'ext-2',
                sportKey: 'basketball_nba',
                sportTitle: 'NBA',
                sportGroup: 'Basketball',
                sportCategory: SportCategory.TWO_WAY,
                homeTeam,
                awayTeam,
                commenceTime: new Date(),
            });

            const result = await predictor.predict(game, SportCategory.TWO_WAY);

            expect(result.probabilities.hasDrawProbability).toBe(false);
            const sum = result.probabilities.homeWin.value + result.probabilities.awayWin.value;
            expect(sum).toBeCloseTo(1.0, 2);
        });

        it('should use custom weights when provided', async () => {
            const elo = createMockModel('elo', true, 0.8, 0.1, 0.1);
            const odds = createMockModel('oddsImplied', true, 0.2, 0.5, 0.3);

            const predictor = new EnsemblePredictor([elo, odds]);
            const game = createTestGame();

            // Give elo model 100% weight
            const result = await predictor.predict(
                game,
                SportCategory.THREE_WAY,
                { elo: 1.0, oddsImplied: 0.0, form: 0.0 }
            );

            // Result should be much closer to elo's prediction
            expect(result.probabilities.homeWin.value).toBeGreaterThan(0.5);
        });
    });
});
