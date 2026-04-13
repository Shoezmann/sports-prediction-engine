import { Module } from '@nestjs/common';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { MLTrainingController } from '../api/controllers/api.controllers';
import { GoalsPredictor } from '../domain/services/goals-predictor.service';
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
} from './use-cases';
import { PredictionScheduler } from '../infrastructure/scheduling/prediction.scheduler';

/**
 * Application Module
 *
 * Registers all use cases, imports infrastructure adapters,
 * and schedules automated pipeline runs.
 * Note: JwtModule is registered in InfrastructureModule — not duplicated here.
 */
@Module({
    imports: [InfrastructureModule],
    providers: [
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
        GetResolvedPredictionsUseCase,
        GoalsPredictor,
        LoginUseCase,
        RegisterUseCase,
        PlaceBetUseCase,
        GetUserBetsUseCase,
        TrainModelsUseCase,
    ],
    controllers: [MLTrainingController],
})
export class ApplicationModule { }
