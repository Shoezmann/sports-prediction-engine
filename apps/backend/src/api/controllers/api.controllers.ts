import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import {
    SyncSportsUseCase,
    SyncGamesUseCase,
    GeneratePredictionsUseCase,
    UpdateResultsUseCase,
    GetAccuracyUseCase,
    GetPendingPredictionsUseCase,
    HistoricalBackfillUseCase,
    RegisterUseCase,
    LoginUseCase,
    PlaceBetUseCase,
    GetUserBetsUseCase,
} from '../../application/use-cases';
import { RegisterDto, LoginDto, PlaceBetDto } from '@sports-prediction-engine/shared-types';

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
        private readonly getPendingPredictions: GetPendingPredictionsUseCase,
    ) { }

    @Post('generate')
    async generate(@Query('sport') sportKey?: string) {
        return this.generatePredictions.execute(sportKey);
    }

    @Get('pending')
    async getPending(@Query('sport') sportKey?: string) {
        return this.getPendingPredictions.execute(sportKey);
    }
}

/**
 * Results API Controller
 *
 * Endpoints for updating game results and checking prediction outcomes.
 */
@Controller('api/results')
export class ResultsController {
    constructor(
        private readonly updateResults: UpdateResultsUseCase,
        private readonly historicalBackfill: HistoricalBackfillUseCase
    ) { }

    @Post('update')
    async update() {
        return this.updateResults.execute();
    }

    @Post('backfill')
    async backfill(@Query('days') days?: string) {
        const daysToBackfill = days ? parseInt(days, 10) : 30;
        return this.historicalBackfill.execute(daysToBackfill);
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

/**
 * Auth API Controller
 *
 * Endpoints for user registration and authentication.
 */
@Controller('api/auth')
export class AuthController {
    constructor(
        private readonly registerUseCase: RegisterUseCase,
        private readonly loginUseCase: LoginUseCase,
    ) { }

    @Post('register')
    async register(@Body() dto: RegisterDto) {
        return this.registerUseCase.execute(dto);
    }

    @Post('login')
    async login(@Body() dto: LoginDto) {
        return this.loginUseCase.execute(dto);
    }
}

/**
 * Bets API Controller
 *
 * Endpoints for placing and retrieving bets.
 */
@Controller('api/bets')
export class BetsController {
    constructor(
        private readonly placeBetUseCase: PlaceBetUseCase,
        private readonly getUserBetsUseCase: GetUserBetsUseCase,
    ) { }

    @Post()
    async placeBet(@Query('userId') userId: string, @Body() dto: PlaceBetDto) {
        // In a real app, userId would be extracted from the JWT guard
        return this.placeBetUseCase.execute(userId, dto);
    }

    @Get()
    async getBets(@Query('userId') userId: string) {
        return this.getUserBetsUseCase.execute(userId);
    }
}
