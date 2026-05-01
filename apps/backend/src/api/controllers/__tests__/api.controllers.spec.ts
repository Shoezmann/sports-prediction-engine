import { Test, TestingModule } from '@nestjs/testing';
import { 
  SportsController, 
  GamesController, 
  PredictionsController, 
  ResultsController,
  AuthController,
  BetsController,
  AccuracyController,
  LiveScoresApiController,
  MLTrainingController
} from '../api.controllers';
import { 
  SyncSportsUseCase, 
  SyncGamesUseCase, 
  GeneratePredictionsUseCase, 
  GetPendingPredictionsUseCase, 
  GetResolvedPredictionsUseCase,
  UpdateResultsUseCase,
  HistoricalBackfillUseCase,
  RegisterUseCase,
  LoginUseCase,
  PlaceBetUseCase,
  GetUserBetsUseCase,
  GetAccuracyUseCase,
  TrainModelsUseCase
} from '../../../application/use-cases';
import { LiveScoresService } from '../../../infrastructure/live-scores/live-scores.service';
import { MLTrainingService } from '../../../infrastructure/ml/ml-training.service';

describe('API Controllers', () => {
  let sportsController: SportsController;
  let gamesController: GamesController;
  let predictionsController: PredictionsController;
  let resultsController: ResultsController;
  let authController: AuthController;
  let betsController: BetsController;
  let accuracyController: AccuracyController;
  let liveScoresApiController: LiveScoresApiController;
  let mlTrainingController: MLTrainingController;
  
  let syncSportsUseCase: SyncSportsUseCase;
  let syncGamesUseCase: SyncGamesUseCase;
  let generatePredictionsUseCase: GeneratePredictionsUseCase;
  let getPendingPredictionsUseCase: GetPendingPredictionsUseCase;
  let getResolvedPredictionsUseCase: GetResolvedPredictionsUseCase;
  let updateResultsUseCase: UpdateResultsUseCase;
  let historicalBackfillUseCase: HistoricalBackfillUseCase;
  let registerUseCase: RegisterUseCase;
  let loginUseCase: LoginUseCase;
  let placeBetUseCase: PlaceBetUseCase;
  let getUserBetsUseCase: GetUserBetsUseCase;
  let getAccuracyUseCase: GetAccuracyUseCase;
  let trainModelsUseCase: TrainModelsUseCase;
  let liveScoresService: LiveScoresService;
  let mlTrainingService: MLTrainingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        SportsController, 
        GamesController, 
        PredictionsController, 
        ResultsController,
        AuthController,
        BetsController,
        AccuracyController,
        LiveScoresApiController,
        MLTrainingController
      ],
      providers: [
        {
          provide: SyncSportsUseCase,
          useValue: { execute: jest.fn().mockResolvedValue({ synced: 5 }) },
        },
        {
          provide: SyncGamesUseCase,
          useValue: { execute: jest.fn().mockResolvedValue({ synced: 10 }) },
        },
        {
          provide: GeneratePredictionsUseCase,
          useValue: { execute: jest.fn().mockResolvedValue({ generated: 20 }) },
        },
        {
          provide: GetPendingPredictionsUseCase,
          useValue: { execute: jest.fn().mockResolvedValue([{ id: 'p1' }]) },
        },
        {
          provide: GetResolvedPredictionsUseCase,
          useValue: { execute: jest.fn().mockResolvedValue([{ id: 'r1', isCorrect: true, game: { commenceTime: new Date() }, goals: { goalsCorrect: true }, btts: { bttsCorrect: true } }]) },
        },
        {
          provide: UpdateResultsUseCase,
          useValue: { execute: jest.fn().mockResolvedValue({ updated: 15 }) },
        },
        {
          provide: HistoricalBackfillUseCase,
          useValue: { execute: jest.fn().mockResolvedValue({ backfilled: 50 }) },
        },
        {
          provide: RegisterUseCase,
          useValue: { execute: jest.fn().mockResolvedValue({ id: 'u1' }) },
        },
        {
          provide: LoginUseCase,
          useValue: { execute: jest.fn().mockResolvedValue({ token: 'jwt' }) },
        },
        {
          provide: PlaceBetUseCase,
          useValue: { execute: jest.fn().mockResolvedValue({ id: 'b1' }) },
        },
        {
          provide: GetUserBetsUseCase,
          useValue: { execute: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: GetAccuracyUseCase,
          useValue: { execute: jest.fn().mockResolvedValue({ accuracy: 0.75 }) },
        },
        {
          provide: TrainModelsUseCase,
          useValue: { execute: jest.fn().mockResolvedValue({ trained: 3, failed: 0 }) },
        },
        {
          provide: LiveScoresService,
          useValue: { getLiveMatches: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: MLTrainingService,
          useValue: { healthCheck: jest.fn().mockResolvedValue(true) },
        },
      ],
    }).compile();

    sportsController = module.get<SportsController>(SportsController);
    gamesController = module.get<GamesController>(GamesController);
    predictionsController = module.get<PredictionsController>(PredictionsController);
    resultsController = module.get<ResultsController>(ResultsController);
    authController = module.get<AuthController>(AuthController);
    betsController = module.get<BetsController>(BetsController);
    accuracyController = module.get<AccuracyController>(AccuracyController);
    liveScoresApiController = module.get<LiveScoresApiController>(LiveScoresApiController);
    mlTrainingController = module.get<MLTrainingController>(MLTrainingController);

    syncSportsUseCase = module.get<SyncSportsUseCase>(SyncSportsUseCase);
    syncGamesUseCase = module.get<SyncGamesUseCase>(SyncGamesUseCase);
    generatePredictionsUseCase = module.get<GeneratePredictionsUseCase>(GeneratePredictionsUseCase);
    getPendingPredictionsUseCase = module.get<GetPendingPredictionsUseCase>(GetPendingPredictionsUseCase);
    getResolvedPredictionsUseCase = module.get<GetResolvedPredictionsUseCase>(GetResolvedPredictionsUseCase);
    updateResultsUseCase = module.get<UpdateResultsUseCase>(UpdateResultsUseCase);
    historicalBackfillUseCase = module.get<HistoricalBackfillUseCase>(HistoricalBackfillUseCase);
    registerUseCase = module.get<RegisterUseCase>(RegisterUseCase);
    loginUseCase = module.get<LoginUseCase>(LoginUseCase);
    placeBetUseCase = module.get<PlaceBetUseCase>(PlaceBetUseCase);
    getUserBetsUseCase = module.get<GetUserBetsUseCase>(GetUserBetsUseCase);
    getAccuracyUseCase = module.get<GetAccuracyUseCase>(GetAccuracyUseCase);
    trainModelsUseCase = module.get<TrainModelsUseCase>(TrainModelsUseCase);
    liveScoresService = module.get<LiveScoresService>(LiveScoresService);
    mlTrainingService = module.get<MLTrainingService>(MLTrainingService);
  });

  describe('SportsController', () => {
    it('should call syncSports.execute and return the result', async () => {
      const result = await sportsController.sync();
      expect(syncSportsUseCase.execute).toHaveBeenCalled();
      expect(result).toEqual({ synced: 5 });
    });
  });

  describe('GamesController', () => {
    it('should call syncGames.execute with sport key if provided', async () => {
      const result = await gamesController.sync('soccer_epl');
      expect(syncGamesUseCase.execute).toHaveBeenCalledWith(['soccer_epl']);
      expect(result).toEqual({ synced: 10 });
    });
  });

  describe('PredictionsController', () => {
    it('should generate predictions', async () => {
      const result = await predictionsController.generate('soccer_epl');
      expect(generatePredictionsUseCase.execute).toHaveBeenCalledWith('soccer_epl');
      expect(result).toEqual({ generated: 20 });
    });

    it('should get pending predictions', async () => {
      const result = await predictionsController.getPending('soccer_epl');
      expect(getPendingPredictionsUseCase.execute).toHaveBeenCalledWith('soccer_epl');
      expect(result).toEqual([{ id: 'p1' }]);
    });

    it('should calculate stats correctly', async () => {
      const stats = await predictionsController.getStats();
      expect(getResolvedPredictionsUseCase.execute).toHaveBeenCalled();
      expect(stats.accuracy).toBe(100);
      expect(stats.resolved).toBe(1);
    });
  });

  describe('ResultsController', () => {
    it('should update results', async () => {
      const result = await resultsController.update();
      expect(updateResultsUseCase.execute).toHaveBeenCalled();
      expect(result).toEqual({ updated: 15 });
    });

    it('should backfill historical data', async () => {
      const result = await resultsController.backfill('30');
      expect(historicalBackfillUseCase.execute).toHaveBeenCalledWith(30);
      expect(result).toEqual({ backfilled: 50 });
    });
  });

  describe('AuthController', () => {
    it('should register a user', async () => {
      const dto = { email: 'test@test.com', password: 'password', name: 'Test' };
      const result = await authController.register(dto);
      expect(registerUseCase.execute).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 'u1' });
    });

    it('should login a user', async () => {
      const dto = { email: 'test@test.com', password: 'password' };
      const result = await authController.login(dto);
      expect(loginUseCase.execute).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ token: 'jwt' });
    });
  });

  describe('BetsController', () => {
    it('should place a bet', async () => {
      const req = { user: { userId: 'u1' } };
      const dto = { predictionId: 'p1', amount: 10, odds: 2.0, predictedOutcome: 'HOME_WIN' };
      const result = await betsController.placeBet(req, dto);
      expect(placeBetUseCase.execute).toHaveBeenCalledWith('u1', dto);
      expect(result).toEqual({ id: 'b1' });
    });

    it('should get user bets', async () => {
      const req = { user: { userId: 'u1' } };
      const result = await betsController.getBets(req);
      expect(getUserBetsUseCase.execute).toHaveBeenCalledWith('u1');
      expect(result).toEqual([]);
    });
  });

  describe('AccuracyController', () => {
    it('should get accuracy', async () => {
      const result = await accuracyController.get('soccer_epl');
      expect(getAccuracyUseCase.execute).toHaveBeenCalledWith('soccer_epl');
      expect(result).toEqual({ accuracy: 0.75 });
    });
  });

  describe('LiveScoresApiController', () => {
    it('should get live scores', async () => {
      const result = await liveScoresApiController.getLiveScores();
      expect(liveScoresService.getLiveMatches).toHaveBeenCalled();
      expect(result.count.total).toBe(0);
    });
  });

  describe('MLTrainingController', () => {
    it('should trigger training', async () => {
      const result = await mlTrainingController.train('soccer_epl');
      expect(trainModelsUseCase.execute).toHaveBeenCalledWith('soccer_epl');
      expect(result.trained).toBe(3);
    });

    it('should check health', async () => {
      const result = await mlTrainingController.health();
      expect(mlTrainingService.healthCheck).toHaveBeenCalled();
      expect(result.ready).toBe(true);
    });
  });
});
