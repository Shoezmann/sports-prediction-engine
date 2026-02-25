import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import {
    SyncSportsUseCase,
    SyncGamesUseCase,
    GeneratePredictionsUseCase,
    UpdateResultsUseCase,
    GetAccuracyUseCase,
} from '../../application/use-cases';

/**
 * Sports API Controller
 *
 * Endpoints for sport synchronization and discovery.
 */
@Controller('api/sports')
export class SportsController {
    constructor(private readonly syncSports: SyncSportsUseCase) { }

    @Post('sync')
    async sync() {
        return this.syncSports.execute();
    }
}

/**
 * Games API Controller
 *
 * Endpoints for game synchronization and querying.
 */
@Controller('api/games')
export class GamesController {
    constructor(private readonly syncGames: SyncGamesUseCase) { }

    @Post('sync')
    async sync(@Query('sport') sportKey?: string) {
        const sportKeys = sportKey ? [sportKey] : undefined;
        return this.syncGames.execute(sportKeys);
    }
}

/**
 * Predictions API Controller
 *
 * Endpoints for prediction generation and retrieval.
 */
@Controller('api/predictions')
export class PredictionsController {
    constructor(
        private readonly generatePredictions: GeneratePredictionsUseCase,
    ) { }

    @Post('generate')
    async generate(@Query('sport') sportKey?: string) {
        return this.generatePredictions.execute(sportKey);
    }
}

/**
 * Results API Controller
 *
 * Endpoints for updating game results and checking prediction outcomes.
 */
@Controller('api/results')
export class ResultsController {
    constructor(private readonly updateResults: UpdateResultsUseCase) { }

    @Post('update')
    async update() {
        return this.updateResults.execute();
    }
}

/**
 * Accuracy API Controller
 *
 * Endpoints for prediction accuracy metrics.
 */
@Controller('api/accuracy')
export class AccuracyController {
    constructor(private readonly getAccuracy: GetAccuracyUseCase) { }

    @Get()
    async get(@Query('sport') sportKey?: string) {
        return this.getAccuracy.execute(sportKey);
    }
}

/**
 * Health API Controller
 *
 * Basic health check and API quota status.
 */
@Controller('api/health')
export class HealthController {
    @Get()
    health() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        };
    }
}
