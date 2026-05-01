import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AutoResultsService } from '../auto-results.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { GameEntity } from '../../infrastructure/persistence/entities/game.orm-entity';
import { PredictionEntity } from '../../infrastructure/persistence/entities/prediction.orm-entity';
import { TeamEntity } from '../../infrastructure/persistence/entities/team.orm-entity';
import { TeamMatchingService } from '../team-matching.service';

describe('AutoResultsService', () => {
  let service: AutoResultsService;
  let gameRepo: Partial<Repository<GameEntity>>;
  let predictionRepo: Partial<Repository<PredictionEntity>>;
  let teamRepo: Partial<Repository<TeamEntity>>;
  let httpService: Partial<HttpService>;
  let teamMatching: TeamMatchingService;

  beforeEach(async () => {
    gameRepo = {
      find: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    };

    predictionRepo = {
      find: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue({}),
    };

    teamRepo = {
      update: vi.fn().mockResolvedValue({}),
    };

    httpService = {
      get: vi.fn(),
    };

    teamMatching = new TeamMatchingService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoResultsService,
        { provide: getRepositoryToken(GameEntity), useValue: gameRepo },
        {
          provide: getRepositoryToken(PredictionEntity),
          useValue: predictionRepo,
        },
        { provide: getRepositoryToken(TeamEntity), useValue: teamRepo },
        { provide: HttpService, useValue: httpService },
        { provide: TeamMatchingService, useValue: teamMatching },
      ],
    }).compile();

    service = module.get<AutoResultsService>(AutoResultsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchAndResolveResults', () => {
    it('should return metrics including source conflicts and skipped', async () => {
      const result = await service.fetchAndResolveResults();

      expect(result).toHaveProperty('gamesUpdated');
      expect(result).toHaveProperty('predictionsResolved');
      expect(result).toHaveProperty('eloUpdated');
      expect(result).toHaveProperty('sourceConflicts');
      expect(result).toHaveProperty('skippedLowConfidence');
    });
  });

  describe('Team name normalization', () => {
    it('should normalize common team aliases', () => {
      const testMatch = {
        homeTeam: 'Man City',
        awayTeam: 'Man United',
        homeScore: 2,
        awayScore: 1,
        date: '2024-03-15',
        status: 'FINISHED',
      };

      const candidates = [
        {
          gameId: 'game-1',
          homeTeam: 'Manchester City',
          awayTeam: 'Manchester United',
          commenceTime: new Date('2024-03-15'),
          sportKey: 'soccer_epl',
        },
      ];

      const result = teamMatching.findBestMatch(
        {
          ...testMatch,
          homeScore: 2,
          awayScore: 1,
          date: new Date(testMatch.date),
          source: 'test',
        },
        candidates,
        { maxDaysDiff: 1, minConfidence: 0.8 },
      );

      expect(result.candidate).not.toBeNull();
    });
  });

  describe('Multi-source deduplication', () => {
    it('should handle single source matches', async () => {
      const mockGames = [
        {
          id: 'game-1',
          homeTeam: { name: 'Manchester City' },
          awayTeam: { name: 'Manchester United' },
          commenceTime: new Date('2024-03-15'),
          sportKey: 'soccer_epl',
          completed: false,
        },
      ];

      (gameRepo.find as any).mockResolvedValueOnce(mockGames);

      const mockPredictions = [
        {
          id: 'pred-1',
          gameId: 'game-1',
          predictedOutcome: 'HOME_WIN',
          isResolved: false,
        },
      ];

      (predictionRepo.find as any).mockResolvedValueOnce(mockPredictions);
    });
  });
});
