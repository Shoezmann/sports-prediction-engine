import { Module } from '@nestjs/common';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { MLTrainingController } from '../api/controllers/api.controllers';
import { GoalsPredictor } from '../domain/services/goals-predictor.service';
import { TrainModelsUseCase } from './use-cases/train-models.use-case';

/**
 * Application Module
 *
 * Registers all use cases, imports infrastructure adapters,
 * and schedules automated pipeline runs.
 */
@Module({
    imports: [InfrastructureModule],
    providers: [
        GoalsPredictor,
        TrainModelsUseCase,
    ],
    exports: [
        GoalsPredictor,
        TrainModelsUseCase,
    ],
    controllers: [MLTrainingController],
})
export class ApplicationModule { }
