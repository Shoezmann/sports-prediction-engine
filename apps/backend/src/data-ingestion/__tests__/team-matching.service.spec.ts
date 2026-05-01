import { describe, it, expect, beforeEach } from 'vitest';
import {
  TeamMatchingService,
  MatchCandidate,
  MatchResult,
} from '../team-matching.service';

describe('TeamMatchingService', () => {
  let service: TeamMatchingService;

  beforeEach(() => {
    service = new TeamMatchingService();
  });

  describe('normalizeTeamName', () => {
    it('should normalize exact team names', () => {
      expect(service.normalizeTeamName('Manchester City')).toBe(
        'Manchester City',
      );
      expect(service.normalizeTeamName('Real Madrid')).toBe('Real Madrid');
    });

    it('should resolve aliases to canonical names', () => {
      expect(service.normalizeTeamName('Man City')).toBe('Manchester City');
      expect(service.normalizeTeamName('Man United')).toBe('Manchester United');
      expect(service.normalizeTeamName('FC Barcelona')).toBe('FC Barcelona');
      expect(service.normalizeTeamName('Barcelona')).toBe('FC Barcelona');
      expect(service.normalizeTeamName('PSG')).toBe('Paris Saint-Germain');
    });

    it('should handle PSL team names', () => {
      expect(service.normalizeTeamName('Mamelodi Sundowns FC')).toBe(
        'Mamelodi Sundowns',
      );
      expect(service.normalizeTeamName('Orlando Pirates')).toBe(
        'Orlando Pirates',
      );
      expect(service.normalizeTeamName('Kaizer Chiefs')).toBe('Kaizer Chiefs');
    });

    it('should handle empty strings', () => {
      expect(service.normalizeTeamName('')).toBe('');
    });

    it('should fuzzy normalize unknown names', () => {
      const result = service.normalizeTeamName('Unknown Team FC');
      expect(result).toBe('unknown team');
    });
  });

  describe('matchTeam', () => {
    it('should return matched with 100% confidence for exact match', () => {
      const result = service.matchTeam('Manchester City', 'Manchester City');
      expect(result.matched).toBe(true);
      expect(result.confidence).toBe(1.0);
    });

    it('should return matched for alias match', () => {
      const result = service.matchTeam('Man City', 'Manchester City');
      expect(result.matched).toBe(true);
      expect(result.confidence).toBe(1.0);
    });

    it('should return matched with high confidence for fuzzy match', () => {
      const result = service.matchTeam('Tottenham Hotspur', 'Tottenham');
      expect(result.matched).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.85);
    });

    it('should return unmatched for completely different teams', () => {
      const result = service.matchTeam('Manchester City', 'Liverpool');
      expect(result.matched).toBe(false);
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('findBestMatch', () => {
    const candidates: MatchCandidate[] = [
      {
        gameId: 'game-1',
        homeTeam: 'Manchester City',
        awayTeam: 'Manchester United',
        commenceTime: new Date('2024-03-15T15:00:00Z'),
        sportKey: 'soccer_epl',
      },
      {
        gameId: 'game-2',
        homeTeam: 'Liverpool',
        awayTeam: 'Chelsea',
        commenceTime: new Date('2024-03-15T20:00:00Z'),
        sportKey: 'soccer_epl',
      },
    ];

    it('should find exact match for same day', () => {
      const matchResult: MatchResult = {
        homeTeam: 'Man City',
        awayTeam: 'Man United',
        homeScore: 2,
        awayScore: 1,
        date: new Date('2024-03-15'),
        source: 'test',
      };

      const result = service.findBestMatch(matchResult, candidates, {
        maxDaysDiff: 1,
        minConfidence: 0.7,
      });

      expect(result.candidate).not.toBeNull();
      expect(result.candidate?.gameId).toBe('game-1');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should not match if date is too far', () => {
      const matchResult: MatchResult = {
        homeTeam: 'Man City',
        awayTeam: 'Man United',
        homeScore: 2,
        awayScore: 1,
        date: new Date('2024-03-20'), // 5 days later
        source: 'test',
      };

      const result = service.findBestMatch(matchResult, candidates, {
        maxDaysDiff: 1,
        minConfidence: 0.7,
      });

      expect(result.candidate).toBeNull();
    });

    it('should not match wrong teams', () => {
      const matchResult: MatchResult = {
        homeTeam: 'Arsenal',
        awayTeam: 'Tottenham',
        homeScore: 1,
        awayScore: 0,
        date: new Date('2024-03-15'),
        source: 'test',
      };

      const result = service.findBestMatch(matchResult, candidates, {
        maxDaysDiff: 1,
        minConfidence: 0.7,
      });

      expect(result.candidate).toBeNull();
    });

    it('should return null for empty candidates', () => {
      const matchResult: MatchResult = {
        homeTeam: 'Man City',
        awayTeam: 'Man United',
        homeScore: 2,
        awayScore: 1,
        date: new Date('2024-03-15'),
        source: 'test',
      };

      const result = service.findBestMatch(matchResult, [], {
        maxDaysDiff: 1,
        minConfidence: 0.7,
      });

      expect(result.candidate).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });

  describe('Team name edge cases', () => {
    it('should handle teams with special characters', () => {
      expect(service.normalizeTeamName('Stade Rennais')).toBe('Stade Rennais');
      expect(service.normalizeTeamName('São Paulo')).toBe('São Paulo');
    });

    it('should handle case insensitive matching', () => {
      const result = service.matchTeam('MAN CITY', 'man city');
      expect(result.matched).toBe(true);
    });

    it('should handle partial team name matches', () => {
      const result = service.matchTeam('Wolves', 'Wolverhampton Wanderers');
      expect(result.matched).toBe(true);
    });
  });
});
