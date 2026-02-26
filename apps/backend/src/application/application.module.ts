import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import {
    SyncSportsUseCase,
    SyncGamesUseCase,
    GeneratePredictionsUseCase,
    UpdateResultsUseCase,
    GetAccuracyUseCase,
    GetPendingPredictionsUseCase,
    HistoricalBackfillUseCase,
    LoginUseCase,
    RegisterUseCase,
    PlaceBetUseCase,
    GetUserBetsUseCase,
} from './use-cases';
import { PredictionScheduler } from '../infrastructure/scheduling/prediction.scheduler';

/**
 * Application Module
 *
 * Registers all use cases, imports infrastructure adapters,
 * and schedules automated pipeline runs.
 */
@Module({
    imports: [
        InfrastructureModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('JWT_SECRET', 'super-secret-fallback-key-for-dev'),
                signOptions: { expiresIn: '7d' },
            }),
        }),
    ],
    providers: [
        SyncSportsUseCase,
        SyncGamesUseCase,
        GeneratePredictionsUseCase,
        UpdateResultsUseCase,
        HistoricalBackfillUseCase,
        GetAccuracyUseCase,
        GetPendingPredictionsUseCase,
        LoginUseCase,
        RegisterUseCase,
        PlaceBetUseCase,
        GetUserBetsUseCase,
        PredictionScheduler,
    ],
    exports: [
        SyncSportsUseCase,
        SyncGamesUseCase,
        GeneratePredictionsUseCase,
        UpdateResultsUseCase,
        HistoricalBackfillUseCase,
        GetAccuracyUseCase,
        GetPendingPredictionsUseCase,
        LoginUseCase,
        RegisterUseCase,
        PlaceBetUseCase,
        GetUserBetsUseCase,
    ],
})
export class ApplicationModule { }
