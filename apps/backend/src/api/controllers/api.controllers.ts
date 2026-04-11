import { Controller, Get, Post, Param, Query, Body, ParseUUIDPipe, UseGuards, Request } from '@nestjs/common';
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
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

/**
 * Sports API Controller
 *
 * Endpoints for sport synchronization and discovery.
 */
@ApiTags('sports')
@Controller('api/sports')
export class SportsController {
    constructor(private readonly syncSports: SyncSportsUseCase) { }

    @Post('sync')
    @ApiOperation({ summary: 'Sync all available sports from The Odds API' })
    @ApiResponse({ status: 201, description: 'Sports synced successfully' })
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
@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
    constructor(
        private readonly registerUseCase: RegisterUseCase,
        private readonly loginUseCase: LoginUseCase,
    ) { }

    @Post('register')
    @ApiOperation({ summary: 'Register a new user account' })
    @ApiResponse({ status: 201, description: 'User registered successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    async register(@Body() dto: RegisterDto) {
        return this.registerUseCase.execute(dto);
    }

    @Post('login')
    @ApiOperation({ summary: 'Login and receive a JWT token' })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() dto: LoginDto) {
        return this.loginUseCase.execute(dto);
    }
}

/**
 * Bets API Controller
 *
 * Endpoints for placing and retrieving bets.
 * Protected by JWT authentication - requires valid Bearer token.
 */
@ApiTags('bets')
@ApiBearerAuth('JWT-auth')
@Controller('api/bets')
@UseGuards(JwtAuthGuard)
export class BetsController {
    constructor(
        private readonly placeBetUseCase: PlaceBetUseCase,
        private readonly getUserBetsUseCase: GetUserBetsUseCase,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Place a new bet on a prediction' })
    @ApiResponse({ status: 201, description: 'Bet placed successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT' })
    async placeBet(@Request() req: any, @Body() dto: PlaceBetDto) {
        const userId = req.user.userId;
        return this.placeBetUseCase.execute(userId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all bets for the authenticated user' })
    @ApiResponse({ status: 200, description: 'List of user bets' })
    async getBets(@Request() req: any) {
        const userId = req.user.userId;
        return this.getUserBetsUseCase.execute(userId);
    }
}

export { StreamController } from './stream.controller';
