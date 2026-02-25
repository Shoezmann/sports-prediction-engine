import { Module } from '@nestjs/common';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import {
    SyncSportsUseCase,
    SyncGamesUseCase,
    GeneratePredictionsUseCase,
    UpdateResultsUseCase,
    GetAccuracyUseCase,
} from './use-cases';
import { PredictionScheduler } from '../infrastructure/scheduling/prediction.scheduler';

/**
 * Application Module
 *
 * Registers all use cases, imports infrastructure adapters,
 * and schedules automated pipeline runs.
 */
@Module({
    imports: [InfrastructureModule],
    providers: [
        SyncSportsUseCase,
        SyncGamesUseCase,
        GeneratePredictionsUseCase,
        UpdateResultsUseCase,
        GetAccuracyUseCase,
        PredictionScheduler,
    ],
    exports: [
        SyncSportsUseCase,
        SyncGamesUseCase,
        GeneratePredictionsUseCase,
        UpdateResultsUseCase,
        GetAccuracyUseCase,
    ],
})
export class ApplicationModule { }
