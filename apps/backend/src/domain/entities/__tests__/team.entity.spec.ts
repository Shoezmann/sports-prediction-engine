import { describe, it, expect } from 'vitest';
import { Team } from '../team.entity';
import { EloRating } from '../../value-objects/elo-rating.vo';

describe('Team Entity', () => {
    describe('create', () => {
        it('should create a team with default ELO', () => {
            const team = Team.create({
                id: 'team-1',
                name: 'Arsenal',
                sportKey: 'soccer_epl',
            });

            expect(team.name).toBe('Arsenal');
            expect(team.eloRating.value).toBe(1500);
        });

        it('should create a team with custom ELO', () => {
            const team = Team.create({
                id: 'team-1',
                name: 'Arsenal',
                sportKey: 'soccer_epl',
                eloRating: 1650,
            });

            expect(team.eloRating.value).toBe(1650);
        });
    });

    describe('expectedScoreAgainst', () => {
        it('should return 0.5 for equal ELO teams', () => {
            const teamA = Team.create({ id: 'a', name: 'A', sportKey: 'test' });
            const teamB = Team.create({ id: 'b', name: 'B', sportKey: 'test' });

            expect(teamA.expectedScoreAgainst(teamB)).toBeCloseTo(0.5, 2);
        });

        it('should favor higher ELO team', () => {
            const strong = Team.create({ id: 's', name: 'Strong', sportKey: 'test', eloRating: 1700 });
            const weak = Team.create({ id: 'w', name: 'Weak', sportKey: 'test', eloRating: 1400 });

            expect(strong.expectedScoreAgainst(weak)).toBeGreaterThan(0.5);
            expect(weak.expectedScoreAgainst(strong)).toBeLessThan(0.5);
        });
    });

    describe('updateEloAfterGame', () => {
        it('should increase ELO after unexpected win', () => {
            const underdog = Team.create({ id: 'u', name: 'Underdog', sportKey: 'test', eloRating: 1400 });
            const favorite = Team.create({ id: 'f', name: 'Favorite', sportKey: 'test', eloRating: 1700 });

            const newUnderdog = underdog.updateEloAfterGame(1.0, favorite);

            expect(newUnderdog.eloRating.value).toBeGreaterThan(1400);
        });

        it('should return a new team instance (immutability)', () => {
            const team = Team.create({ id: 't', name: 'Team', sportKey: 'test' });
            const opponent = Team.create({ id: 'o', name: 'Opponent', sportKey: 'test' });

            const newTeam = team.updateEloAfterGame(1.0, opponent);

            expect(newTeam).not.toBe(team);
            expect(newTeam.eloRating.value).not.toBe(team.eloRating.value);
        });
    });

    describe('withUpdatedElo', () => {
        it('should create new team with updated ELO', () => {
            const team = Team.create({ id: 't', name: 'Team', sportKey: 'test' });
            const newElo = EloRating.create(1800);

            const updated = team.withUpdatedElo(newElo);

            expect(updated.eloRating.value).toBe(1800);
            expect(updated).not.toBe(team);
            expect(updated.name).toBe(team.name);
        });
    });

    describe('equality', () => {
        it('should compare by id', () => {
            const teamA = Team.create({ id: '1', name: 'A', sportKey: 'test' });
            const teamB = Team.create({ id: '1', name: 'A Different', sportKey: 'test' });

            expect(teamA.equals(teamB)).toBe(true);
        });
    });
});
