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

// API adapter
import { TheOddsApiAdapter } from './adapters/odds-api/the-odds-api.adapter';
import { ApiFootballAdapter } from './adapters/api-football/api-football.adapter';
import { SportApiAdapter } from './adapters/sport-api/sport-api.adapter';

// Prediction model adapters
import { EloModelAdapter } from './adapters/prediction-models/elo-model.adapter';
import { FormModelAdapter } from './adapters/prediction-models/form-model.adapter';
import { OddsImpliedModelAdapter } from './adapters/prediction-models/odds-implied-model.adapter';

// In-memory repositories (fallback when no DB)
import { InMemorySportRepository } from './adapters/repositories/in-memory-sport.repository';
import { InMemoryTeamRepository } from './adapters/repositories/in-memory-team.repository';
import { InMemoryGameRepository } from './adapters/repositories/in-memory-game.repository';
import { InMemoryPredictionRepository } from './adapters/repositories/in-memory-prediction.repository';

// Auth
import { JwtStrategy } from './auth/jwt.strategy';

// SSE
import { PredictionStreamService } from './sse/prediction-stream.service';

// Email
import { EmailService } from './email/email.service';
import { LiveScoresService } from './live-scores/live-scores.service';
import { StreamController } from '../api/controllers/stream.controller';
import { LiveScoresController } from '../api/controllers/live-scores.controller';

// ORM entities
import { SportEntity, TeamEntity, GameEntity, PredictionEntity, UserEntity, BetEntity } from './persistence/entities';

// PostgreSQL repositories
import { PgSportRepository, PgTeamRepository, PgGameRepository, PgPredictionRepository, PgUserRepository, PgBetRepository } from './persistence/repositories';



const logger = new Logger('InfrastructureModule');

/**
 * Infrastructure Module
 *
 * Wires together all external adapters, persistence, and scheduling.
 * Automatically detects DATABASE_URL to choose between PostgreSQL
 * and in-memory storage.
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
                secret: config.get<string>('JWT_SECRET', 'super-secret-fallback-key-for-dev'),
                signOptions: { expiresIn: '7d' },
            }),
        }),

        // TypeORM — configured dynamically based on DATABASE_URL
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const dbUrl = config.get<string>('DATABASE_URL');
                if (!dbUrl || dbUrl.includes('localhost')) {
                    logger.warn('⚠️  DATABASE_URL not set or points to localhost — checking PostgreSQL availability...');
                }
                return {
                    type: 'postgres',
                    url: dbUrl,
                    entities: [SportEntity, TeamEntity, GameEntity, PredictionEntity, UserEntity, BetEntity],
                    synchronize: config.get('NODE_ENV') !== 'production', // Auto-create tables in dev
                    logging: config.get('NODE_ENV') === 'development' ? ['error', 'warn'] : false,
                    retryAttempts: 3,
                    retryDelay: 3000,
                };
            },
        }),

        TypeOrmModule.forFeature([SportEntity, TeamEntity, GameEntity, PredictionEntity, UserEntity, BetEntity]),
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

        // ── API Adapter ──
        TheOddsApiAdapter,
        ApiFootballAdapter,
        SportApiAdapter,
        { provide: SPORTS_DATA_PORT, useExisting: SportApiAdapter },

        // ── Prediction Models ──
        EloModelAdapter,
        FormModelAdapter,
        OddsImpliedModelAdapter,
        {
            provide: PREDICTION_MODEL_PORT,
            useFactory: (elo: EloModelAdapter, form: FormModelAdapter, odds: OddsImpliedModelAdapter) => [elo, form, odds],
            inject: [EloModelAdapter, FormModelAdapter, OddsImpliedModelAdapter],
        },

        // ── PostgreSQL Repositories (primary) ──
        PgSportRepository,
        PgTeamRepository,
        PgGameRepository,
        PgPredictionRepository,
        PgUserRepository,
        PgBetRepository,

        // ── In-Memory Repositories (available for fallback) ──
        InMemorySportRepository,
        InMemoryTeamRepository,
        InMemoryGameRepository,
        InMemoryPredictionRepository,

        // ── Bind ports to PostgreSQL implementations ──
        { provide: SPORT_REPOSITORY_PORT, useExisting: PgSportRepository },
        { provide: TEAM_REPOSITORY_PORT, useExisting: PgTeamRepository },
        { provide: GAME_REPOSITORY_PORT, useExisting: PgGameRepository },
        { provide: PREDICTION_REPOSITORY_PORT, useExisting: PgPredictionRepository },
        { provide: USER_REPOSITORY_PORT, useExisting: PgUserRepository },
        { provide: BET_REPOSITORY_PORT, useExisting: PgBetRepository },

    ],
    controllers: [StreamController, LiveScoresController],
    exports: [
        SPORTS_DATA_PORT,
        SPORT_REPOSITORY_PORT,
        TEAM_REPOSITORY_PORT,
        GAME_REPOSITORY_PORT,
        PREDICTION_REPOSITORY_PORT,
        PREDICTION_MODEL_PORT,
        USER_REPOSITORY_PORT,
        BET_REPOSITORY_PORT,
        TheOddsApiAdapter,
        ApiFootballAdapter,
        SportApiAdapter,
        OddsImpliedModelAdapter,
        JwtStrategy,
        PassportModule,
        JwtModule,
        PredictionStreamService,
        EmailService,
        LiveScoresService,
    ],
})
export class InfrastructureModule { }
