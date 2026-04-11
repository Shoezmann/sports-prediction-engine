import { describe, it, expect } from 'vitest';
import { Game } from '../game.entity';
import { Team } from '../team.entity';
import { SportCategory, PredictionOutcome } from '@sports-prediction-engine/shared-types';

describe('Game Entity', () => {
    const createTeams = () => ({
        home: Team.create({ id: 'home', name: 'Home', sportKey: 'test' }),
        away: Team.create({ id: 'away', name: 'Away', sportKey: 'test' }),
    });

    describe('create', () => {
        it('should create an upcoming game', () => {
            const { home, away } = createTeams();
            const future = new Date();
            future.setHours(future.getHours() + 24);

            const game = Game.create({
                id: 'game-1',
                externalId: 'ext-1',
                sportKey: 'soccer_epl',
                sportCategory: SportCategory.THREE_WAY,
                homeTeam: home,
                awayTeam: away,
                commenceTime: future,
            });

            expect(game.isUpcoming).toBe(true);
            expect(game.completed).toBe(false);
        });
    });

    describe('isToday', () => {
        it('should return true for games scheduled today', () => {
            const { home, away } = createTeams();
            const today = new Date();
            // Set to noon today to avoid edge cases near midnight
            today.setHours(12, 0, 0, 0);

            const game = Game.create({
                id: 'g1',
                externalId: 'e1',
                sportKey: 'test',
                sportCategory: SportCategory.TWO_WAY,
                homeTeam: home,
                awayTeam: away,
                commenceTime: today,
            });

            expect(game.isToday).toBe(true);
        });

        it('should return false for games scheduled tomorrow', () => {
            const { home, away } = createTeams();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const game = Game.create({
                id: 'g2',
                externalId: 'e2',
                sportKey: 'test',
                sportCategory: SportCategory.TWO_WAY,
                homeTeam: home,
                awayTeam: away,
                commenceTime: tomorrow,
            });

            expect(game.isToday).toBe(false);
        });
    });

    describe('supportsDraws', () => {
        it('should return true for THREE_WAY sports', () => {
            const { home, away } = createTeams();
            const game = Game.create({
                id: 'g',
                externalId: 'e',
                sportKey: 'test',
                sportCategory: SportCategory.THREE_WAY,
                homeTeam: home,
                awayTeam: away,
                commenceTime: new Date(),
            });

            expect(game.supportsDraws).toBe(true);
        });

        it('should return false for TWO_WAY sports', () => {
            const { home, away } = createTeams();
            const game = Game.create({
                id: 'g',
                externalId: 'e',
                sportKey: 'test',
                sportCategory: SportCategory.TWO_WAY,
                homeTeam: home,
                awayTeam: away,
                commenceTime: new Date(),
            });

            expect(game.supportsDraws).toBe(false);
        });
    });

    describe('getOutcome', () => {
        it('should return HOME_WIN when home score is higher', () => {
            const { home, away } = createTeams();
            const game = new Game(
                'g1', 'e1', 'test', SportCategory.THREE_WAY,
                home, away, new Date(), true, 3, 1
            );

            expect(game.getOutcome()).toBe(PredictionOutcome.HOME_WIN);
        });

        it('should return AWAY_WIN when away score is higher', () => {
            const { home, away } = createTeams();
            const game = new Game(
                'g2', 'e2', 'test', SportCategory.THREE_WAY,
                home, away, new Date(), true, 1, 2
            );

            expect(game.getOutcome()).toBe(PredictionOutcome.AWAY_WIN);
        });

        it('should return DRAW when scores are equal', () => {
            const { home, away } = createTeams();
            const game = new Game(
                'g3', 'e3', 'test', SportCategory.THREE_WAY,
                home, away, new Date(), true, 2, 2
            );

            expect(game.getOutcome()).toBe(PredictionOutcome.DRAW);
        });

        it('should return PENDING for incomplete game', () => {
            const { home, away } = createTeams();
            const game = Game.create({
                id: 'g4',
                externalId: 'e4',
                sportKey: 'test',
                sportCategory: SportCategory.THREE_WAY,
                homeTeam: home,
                awayTeam: away,
                commenceTime: new Date(),
                completed: false,
            });

            expect(game.getOutcome()).toBe(PredictionOutcome.PENDING);
        });
    });

    describe('getHomeEloScore', () => {
        it('should return 1.0 for home win', () => {
            const { home, away } = createTeams();
            const game = new Game(
                'g1', 'e1', 'test', SportCategory.THREE_WAY,
                home, away, new Date(), true, 2, 0
            );

            expect(game.getHomeEloScore()).toBe(1.0);
        });

        it('should return 0.5 for draw', () => {
            const { home, away } = createTeams();
            const game = new Game(
                'g2', 'e2', 'test', SportCategory.THREE_WAY,
                home, away, new Date(), true, 1, 1
            );

            expect(game.getHomeEloScore()).toBe(0.5);
        });

        it('should return 0.0 for home loss', () => {
            const { home, away } = createTeams();
            const game = new Game(
                'g3', 'e3', 'test', SportCategory.THREE_WAY,
                home, away, new Date(), true, 0, 1
            );

            expect(game.getHomeEloScore()).toBe(0.0);
        });

        it('should return undefined for pending game', () => {
            const { home, away } = createTeams();
            const game = Game.create({
                id: 'g4',
                externalId: 'e4',
                sportKey: 'test',
                sportCategory: SportCategory.THREE_WAY,
                homeTeam: home,
                awayTeam: away,
                commenceTime: new Date(),
            });

            expect(game.getHomeEloScore()).toBeUndefined();
        });
    });

    describe('withResult', () => {
        it('should return a new completed game with scores', () => {
            const { home, away } = createTeams();
            const future = new Date();
            future.setHours(future.getHours() + 24);

            const game = Game.create({
                id: 'g1',
                externalId: 'e1',
                sportKey: 'test',
                sportCategory: SportCategory.THREE_WAY,
                homeTeam: home,
                awayTeam: away,
                commenceTime: future,
            });

            const completed = game.withResult(3, 1);

            expect(completed.completed).toBe(true);
            expect(completed.homeScore).toBe(3);
            expect(completed.awayScore).toBe(1);
            expect(completed).not.toBe(game);
        });
    });

    describe('equality', () => {
        it('should compare by id', () => {
            const { home, away } = createTeams();
            const game1 = Game.create({
                id: 'same-id',
                externalId: 'e1',
                sportKey: 'test',
                sportCategory: SportCategory.TWO_WAY,
                homeTeam: home,
                awayTeam: away,
                commenceTime: new Date(),
            });
            const game2 = Game.create({
                id: 'same-id',
                externalId: 'e2',
                sportKey: 'test',
                sportCategory: SportCategory.TWO_WAY,
                homeTeam: away,
                awayTeam: home,
                commenceTime: new Date(),
            });

            expect(game1.equals(game2)).toBe(true);
        });
    });
});
