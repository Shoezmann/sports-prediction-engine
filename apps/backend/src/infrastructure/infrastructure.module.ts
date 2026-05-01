import { Module, Logger } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

// Domain port tokens
import {
  SPORTS_DATA_PORT,
  GAME_REPOSITORY_PORT,
  PREDICTION_REPOSITORY_PORT,
  SPORT_REPOSITORY_PORT,
  TEAM_REPOSITORY_PORT,
  PREDICTION_MODEL_PORT,
  USER_REPOSITORY_PORT,
  BET_REPOSITORY_PORT,
} from '../domain/ports/output';

// Own data ingestion (zero external APIs)
import { DataIngestionModule } from '../data-ingestion/data-ingestion.module';
import { SyntheticOddsAdapter } from './odds-scraper/synthetic-odds.adapter';
import { EloSeederService } from './services/elo-seeder.service';
import { MLTrainingService } from './ml/ml-training.service';

import { DirectWebScraperAdapter } from './adapters/direct-web-scraper.adapter';

// Prediction model adapters
import { EloModelAdapter } from './adapters/prediction-models/elo-model.adapter';
import { FormModelAdapter } from './adapters/prediction-models/form-model.adapter';
import { OddsImpliedModelAdapter } from './adapters/prediction-models/odds-implied-model.adapter';
import { MlModelAdapter } from './adapters/prediction-models/ml-model.adapter';
import { PoissonModelAdapter } from './adapters/prediction-models/poisson-model.adapter';
import { H2HModelAdapter } from './adapters/prediction-models/h2h-model.adapter';

// Auth
import { JwtStrategy } from './auth/jwt.strategy';

// SSE
import { PredictionStreamService } from './sse/prediction-stream.service';

// Email
import { EmailService } from './email/email.service';

// Live scores (SofaScore — zero external API dependencies)
import { LiveScoresService } from './live-scores/live-scores.service';
import { LiveScoresScraper } from './live-scores/live-scores.scraper';
import { GTLeaguesService } from './gt-leagues/gt-leagues.service';

// API Controllers
import {
  SportsController,
  GamesController,
  PredictionsController,
  ResultsController,
  AccuracyController,
  HealthController,
  AuthController,
  BetsController,
} from '../api/controllers/api.controllers';

// ORM entities
import {
  SportEntity,
  TeamEntity,
  GameEntity,
  PredictionEntity,
  UserEntity,
  BetEntity,
  MatchStatisticsEntity,
  PlayerEntity,
  CoachEntity,
} from './persistence/entities';

// PostgreSQL repositories
import {
  PgSportRepository,
  PgTeamRepository,
  PgGameRepository,
  PgPredictionRepository,
  PgUserRepository,
  PgBetRepository,
  PgMatchStatisticsRepository,
  PgPlayerRepository,
  PgCoachRepository,
} from './persistence/repositories';

// PSL Data Ingestion
import { PslDataIngestionModule } from '../data-ingestion/psl/psl-data-ingestion.module';

// Controllers
import { StreamController } from '../api/controllers/stream.controller';
import { LiveScoresController } from '../api/controllers/live-scores.controller';
import { GTLeaguesController } from '../api/controllers/gt-leagues.controller';
import {
  LiveScoresApiController,
  MLTrainingController,
} from '../api/controllers/api.controllers';

// Application use cases (all controllers need these)
import {
  SyncSportsUseCase,
  SyncGamesUseCase,
  GeneratePredictionsUseCase,
  UpdateResultsUseCase,
  GetAccuracyUseCase,
  GetPendingPredictionsUseCase,
  GetResolvedPredictionsUseCase,
  HistoricalBackfillUseCase,
  LoginUseCase,
  RegisterUseCase,
  PlaceBetUseCase,
  GetUserBetsUseCase,
  TrainModelsUseCase,
} from '../application/use-cases';

// Domain services
import { GoalsPredictor } from '../domain/services/goals-predictor.service';

const logger = new Logger('InfrastructureModule');

/**
 * Infrastructure Module
 *
 * Self-contained prediction engine with zero external API dependencies.
 * All data is seeded locally. Results are input manually via admin API.
 * Synthetic odds are generated from our own ELO/Form models.
 */
@Module({
  imports: [
    HttpModule.register({ timeout: 15_000 }),
    ScheduleModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>(
          'JWT_SECRET',
          'super-secret-fallback-key-for-dev',
        ),
        signOptions: { expiresIn: '7d' },
      }),
    }),

    // TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbUrl = config.get<string>('DATABASE_URL');
        if (!dbUrl || dbUrl.includes('localhost')) {
          logger.warn('⚠️  DATABASE_URL not set or points to localhost');
        }
        return {
          type: 'postgres',
          url: dbUrl,
          entities: [
            SportEntity,
            TeamEntity,
            GameEntity,
            PredictionEntity,
            UserEntity,
            BetEntity,
          ],
          synchronize: config.get('NODE_ENV') !== 'production',
          logging:
            config.get('NODE_ENV') === 'development'
              ? ['error', 'warn']
              : false,
          retryAttempts: 3,
          retryDelay: 3000,
        };
      },
    }),

    TypeOrmModule.forFeature([
      SportEntity,
      TeamEntity,
      GameEntity,
      PredictionEntity,
      UserEntity,
      BetEntity,
      MatchStatisticsEntity,
      PlayerEntity,
      CoachEntity,
    ]),

    // Our own data ingestion (zero external APIs)
    DataIngestionModule,

    // PSL-specific data ingestion (South African football)
    PslDataIngestionModule,
  ],
  providers: [
    // ── Auth ──
    JwtStrategy,

    // ── SSE ──
    PredictionStreamService,

    // ── Email ──
    EmailService,

    // ── Live Scores ──
    LiveScoresService,
    LiveScoresScraper,
    GTLeaguesService,

    // ── Synthetic Odds (self-owned, zero external dependency) ──
    SyntheticOddsAdapter,
    DirectWebScraperAdapter,

    // ── ELO Seeder ──
    EloSeederService,

    // ── ML Training ──
    MLTrainingService,

    // SPORTS_DATA_PORT → DirectWebScraperAdapter (our own scraper)
    { provide: SPORTS_DATA_PORT, useExisting: DirectWebScraperAdapter },

    // ── Prediction Models ──
    EloModelAdapter,
    FormModelAdapter,
    OddsImpliedModelAdapter,
    MlModelAdapter,
    PoissonModelAdapter,
    H2HModelAdapter,
    {
      provide: PREDICTION_MODEL_PORT,
      useFactory: (
        elo: EloModelAdapter,
        form: FormModelAdapter,
        odds: OddsImpliedModelAdapter,
        poisson: PoissonModelAdapter,
        h2h: H2HModelAdapter,
      ) => [elo, form, odds, poisson, h2h],
      inject: [EloModelAdapter, FormModelAdapter, OddsImpliedModelAdapter, PoissonModelAdapter, H2HModelAdapter],
    },

    // ── PostgreSQL Repositories ──
    PgSportRepository,
    PgTeamRepository,
    PgGameRepository,
    PgPredictionRepository,
    PgUserRepository,
    PgBetRepository,
    PgMatchStatisticsRepository,
    PgPlayerRepository,
    PgCoachRepository,

    // ── Port Bindings ──
    { provide: SPORT_REPOSITORY_PORT, useExisting: PgSportRepository },
    { provide: TEAM_REPOSITORY_PORT, useExisting: PgTeamRepository },
    { provide: GAME_REPOSITORY_PORT, useExisting: PgGameRepository },
    {
      provide: PREDICTION_REPOSITORY_PORT,
      useExisting: PgPredictionRepository,
    },
    { provide: USER_REPOSITORY_PORT, useExisting: PgUserRepository },
    { provide: BET_REPOSITORY_PORT, useExisting: PgBetRepository },

    // ── Application Use Cases ──
    SyncSportsUseCase,
    SyncGamesUseCase,
    GeneratePredictionsUseCase,
    UpdateResultsUseCase,
    HistoricalBackfillUseCase,
    GetAccuracyUseCase,
    GetPendingPredictionsUseCase,
    GetResolvedPredictionsUseCase,
    GoalsPredictor,
    LoginUseCase,
    RegisterUseCase,
    PlaceBetUseCase,
    GetUserBetsUseCase,
    TrainModelsUseCase,
  ],
  controllers: [
    StreamController,
    LiveScoresController,
    GTLeaguesController,
    LiveScoresApiController,
    MLTrainingController,
  ],
  exports: [
    SPORTS_DATA_PORT,
    SPORT_REPOSITORY_PORT,
    TEAM_REPOSITORY_PORT,
    GAME_REPOSITORY_PORT,
    PREDICTION_REPOSITORY_PORT,
    PREDICTION_MODEL_PORT,
    USER_REPOSITORY_PORT,
    BET_REPOSITORY_PORT,
    // Use cases needed by controllers in AppModule
    SyncSportsUseCase,
    SyncGamesUseCase,
    GeneratePredictionsUseCase,
    UpdateResultsUseCase,
    GetAccuracyUseCase,
    GetPendingPredictionsUseCase,
    GetResolvedPredictionsUseCase,
    HistoricalBackfillUseCase,
    TrainModelsUseCase,
    LoginUseCase,
    RegisterUseCase,
    PlaceBetUseCase,
    GetUserBetsUseCase,
    // Services
    MLTrainingService,
    OddsImpliedModelAdapter,
    MlModelAdapter,
    EloSeederService,
    // Auth
    JwtStrategy,
    PassportModule,
    JwtModule,
    // SSE & Email
    PredictionStreamService,
    EmailService,
    LiveScoresService,
    LiveScoresScraper,
    // Data ingestion
    DataIngestionModule,
  ],
})
export class InfrastructureModule {}
