import { Test, TestingModule } from '@nestjs/testing';
import { PlaceBetUseCase } from '../place-bet.use-case';
import { BET_REPOSITORY_PORT, PREDICTION_REPOSITORY_PORT, USER_REPOSITORY_PORT } from '../../../domain/ports/output';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BetStatus } from '@sports-prediction-engine/shared-types';

describe('PlaceBetUseCase', () => {
  let useCase: PlaceBetUseCase;
  let mockBetRepo: any;
  let mockPredictionRepo: any;
  let mockUserRepo: any;

  beforeEach(async () => {
    mockBetRepo = {
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockPredictionRepo = {
      findById: jest.fn(),
    };
    mockUserRepo = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaceBetUseCase,
        { provide: BET_REPOSITORY_PORT, useValue: mockBetRepo },
        { provide: PREDICTION_REPOSITORY_PORT, useValue: mockPredictionRepo },
        { provide: USER_REPOSITORY_PORT, useValue: mockUserRepo },
      ],
    }).compile();

    useCase = module.get<PlaceBetUseCase>(PlaceBetUseCase);
  });

  it('should place a bet successfully', async () => {
    const userId = 'u1';
    const dto = { predictionId: 'p1', bookmaker: 'Betway', customOdds: 2.5 };
    
    mockUserRepo.findById.mockResolvedValue({ id: userId });
    mockPredictionRepo.findById.mockResolvedValue({ 
      id: 'p1', 
      isResolved: false,
      odds: 2.0 
    });

    const result = await useCase.execute(userId, dto);

    expect(result).toBeDefined();
    expect(result.userId).toBe(userId);
    expect(result.predictionId).toBe('p1');
    expect(result.lockedOdds).toBe(2.5);
    expect(result.status).toBe(BetStatus.PENDING);
    expect(mockBetRepo.save).toHaveBeenCalled();
  });

  it('should use prediction odds if custom odds not provided', async () => {
    const userId = 'u1';
    const dto = { predictionId: 'p1', bookmaker: 'Betway' };
    
    mockUserRepo.findById.mockResolvedValue({ id: userId });
    mockPredictionRepo.findById.mockResolvedValue({ 
      id: 'p1', 
      isResolved: false,
      odds: 2.2 
    });

    const result = await useCase.execute(userId, dto);
    expect(result.lockedOdds).toBe(2.2);
  });

  it('should throw NotFoundException if user not found', async () => {
    mockUserRepo.findById.mockResolvedValue(null);
    
    await expect(useCase.execute('u1', { predictionId: 'p1' }))
      .rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException if prediction not found', async () => {
    mockUserRepo.findById.mockResolvedValue({ id: 'u1' });
    mockPredictionRepo.findById.mockResolvedValue(null);
    
    await expect(useCase.execute('u1', { predictionId: 'p1' }))
      .rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if prediction is already resolved', async () => {
    mockUserRepo.findById.mockResolvedValue({ id: 'u1' });
    mockPredictionRepo.findById.mockResolvedValue({ 
      id: 'p1', 
      isResolved: true 
    });
    
    await expect(useCase.execute('u1', { predictionId: 'p1' }))
      .rejects.toThrow(BadRequestException);
  });
});
