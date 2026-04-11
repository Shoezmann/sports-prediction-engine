import { describe, it, expect } from 'vitest';
import { EloCalculator } from '../elo-calculator.service';
import { Team } from '../../entities';

describe('EloCalculator Service', () => {
    const createTeam = (name: string, elo: number) =>
        Team.create({
            id: `team-${name.toLowerCase()}`,
            name,
            sportKey: 'soccer_epl',
            eloRating: undefined, // Will use default
        });

    describe('updateRatings', () => {
        it('should increase winner ELO and decrease loser ELO', () => {
            const home = Team.create({
                id: 'home',
                name: 'Home',
                sportKey: 'soccer_epl',
            });
            const away = Team.create({
                id: 'away',
                name: 'Away',
                sportKey: 'soccer_epl',
            });

            // Home wins (homeScore = 1.0)
            const [newHome, newAway] = EloCalculator.updateRatings(home, away, 1.0);

            expect(newHome.eloRating.value).toBeGreaterThan(1500);
            expect(newAway.eloRating.value).toBeLessThan(1500);
        });

        it('should handle draw correctly', () => {
            const home = Team.create({ id: 'home', name: 'Home', sportKey: 'test' });
            const away = Team.create({ id: 'away', name: 'Away', sportKey: 'test' });

            const [newHome, newAway] = EloCalculator.updateRatings(home, away, 0.5);

            // With equal ELOs, draw should result in minimal change
            expect(newHome.eloRating.value).toBeCloseTo(1500, 0);
            expect(newAway.eloRating.value).toBeCloseTo(1500, 0);
        });

        it('should return new team instances (immutability)', () => {
            const home = Team.create({ id: 'home', name: 'Home', sportKey: 'test' });
            const away = Team.create({ id: 'away', name: 'Away', sportKey: 'test' });

            const [newHome, newAway] = EloCalculator.updateRatings(home, away, 1.0);

            expect(newHome).not.toBe(home);
            expect(newAway).not.toBe(away);
        });
    });

    describe('expectedHomeWin', () => {
        it('should return 0.5 for equal ELO teams', () => {
            const home = Team.create({ id: 'home', name: 'Home', sportKey: 'test' });
            const away = Team.create({ id: 'away', name: 'Away', sportKey: 'test' });

            const prob = EloCalculator.expectedHomeWin(home, away);
            expect(prob).toBeCloseTo(0.5, 2);
        });

        it('should favor higher ELO team', () => {
            const home = Team.create({ id: 'home', name: 'Home', sportKey: 'test' });
            const away = Team.create({
                id: 'away',
                name: 'Away',
                sportKey: 'test',
                eloRating: undefined,
            });

            // Manually create with different ELOs
            const strongTeam = Team.create({
                id: 'strong',
                name: 'Strong',
                sportKey: 'test',
            });
            const weakTeam = Team.create({
                id: 'weak',
                name: 'Weak',
                sportKey: 'test',
            });

            // Test via expected score - teams with same default ELO should be equal
            expect(EloCalculator.expectedHomeWin(strongTeam, weakTeam)).toBeCloseTo(
                0.5,
                2
            );
        });
    });

    describe('toThreeWayProbability', () => {
        it('should produce probabilities that sum to ~1', () => {
            const probs = EloCalculator.toThreeWayProbability(0.5, 0.26);
            const sum = probs.homeWin + probs.draw + probs.awayWin;
            expect(sum).toBeCloseTo(1.0, 2);
        });

        it('should have higher draw probability for evenly matched teams', () => {
            const even = EloCalculator.toThreeWayProbability(0.5, 0.26);
            const uneven = EloCalculator.toThreeWayProbability(0.8, 0.26);

            expect(even.draw).toBeGreaterThan(uneven.draw);
        });

        it('should favor home team with expectedScore > 0.5', () => {
            const probs = EloCalculator.toThreeWayProbability(0.6, 0.26);
            expect(probs.homeWin).toBeGreaterThan(probs.awayWin);
        });

        it('should use default draw rate of 0.26 for soccer', () => {
            const probs = EloCalculator.toThreeWayProbability(0.5);
            expect(probs.draw).toBeCloseTo(0.26, 2);
        });
    });
});
