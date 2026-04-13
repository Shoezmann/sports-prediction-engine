import { Controller, Get, Post, Param, Query, Body, ParseUUIDPipe, UseGuards, Request } from '@nestjs/common';
import {
    SyncSportsUseCase,
    SyncGamesUseCase,
    GeneratePredictionsUseCase,
    UpdateResultsUseCase,
    GetAccuracyUseCase,
    GetPendingPredictionsUseCase,
    GetResolvedPredictionsUseCase,
    HistoricalBackfillUseCase,
    RegisterUseCase,
    LoginUseCase,
    PlaceBetUseCase,
    GetUserBetsUseCase,
    TrainModelsUseCase,
} from '../../application/use-cases';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from '../dtos/auth.dto';
import { PlaceBetDto } from '../dtos/bet.dto';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { LiveScoresService } from '../../infrastructure/live-scores/live-scores.service';
import { MLTrainingService } from '../../infrastructure/ml/ml-training.service';

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
        private readonly getResolvedPredictions: GetResolvedPredictionsUseCase,
    ) { }

    @Post('generate')
    async generate(@Query('sport') sportKey?: string) {
        return this.generatePredictions.execute(sportKey);
    }

    @Get('pending')
    async getPending(@Query('sport') sportKey?: string) {
        return this.getPendingPredictions.execute(sportKey);
    }

    @Get('resolved')
    async getResolved(@Query('sport') sportKey?: string) {
        return this.getResolvedPredictions.execute(sportKey);
    }

    @Get('stats')
    async getStats() {
        const resolved = await this.getResolvedPredictions.execute();
        const total = resolved.length;
        const correct = resolved.filter(p => p.isCorrect).length;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

        // 7-day accuracy
        const now = Date.now();
        const sevenDays = resolved.filter(p => (now - new Date(p.game.commenceTime).getTime()) < 7 * 86400000);
        const sevenCorrect = sevenDays.filter(p => p.isCorrect).length;
        const last7Accuracy = sevenDays.length > 0 ? Math.round((sevenCorrect / sevenDays.length) * 100) : 0;

        // 30-day accuracy
        const thirtyDays = resolved.filter(p => (now - new Date(p.game.commenceTime).getTime()) < 30 * 86400000);
        const thirtyCorrect = thirtyDays.filter(p => p.isCorrect).length;
        const last30Accuracy = thirtyDays.length > 0 ? Math.round((thirtyCorrect / thirtyDays.length) * 100) : 0;

        // Current streak
        const sorted = resolved.sort((a, b) => new Date(b.game.commenceTime).getTime() - new Date(a.game.commenceTime).getTime());
        let streak = 0;
        for (const p of sorted) {
            if (p.isCorrect) streak++; else break;
        }

        // Goals accuracy
        const withGoals = resolved.filter(p => p.goals?.goalsCorrect !== undefined && p.game.totalGoals !== undefined);
        const goalsCorrect = withGoals.filter(p => p.goals.goalsCorrect).length;
        const goalsAccuracy = withGoals.length > 0 ? Math.round((goalsCorrect / withGoals.length) * 100) : 0;

        // BTTS accuracy
        const bttsCorrect = withGoals.filter(p => p.btts?.bttsCorrect).length;
        const bttsAccuracy = withGoals.length > 0 ? Math.round((bttsCorrect / withGoals.length) * 100) : 0;

        // Successful = correct on ALL predictions (outcome + goals + btts)
        const successful = withGoals.filter(p => p.isCorrect && p.goals.goalsCorrect && p.btts.bttsCorrect).length;
        // Failed = wrong on outcome
        const failed = resolved.filter(p => !p.isCorrect).length;

        return {
            resolved: total,
            resolvedCorrect: correct,
            accuracy,
            last7Accuracy,
            last30Accuracy,
            streak,
            goalsAccuracy,
            bttsAccuracy,
            successful,
            failed,
        };
    }

    @Get('summary')
    async getSummary() {
        const resolved = await this.getResolvedPredictions.execute();
        const pending = await this.getPendingPredictions.execute();
        return {
            total: resolved.length + pending.length,
            resolved: resolved.length,
            pending: pending.length,
        };
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

    @Post('forgot-password')
    @ApiOperation({ summary: 'Request password reset email' })
    @ApiResponse({ status: 200, description: 'Reset email sent if account exists' })
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        // In development, just return success (no email service yet)
        return { message: 'If an account exists with that email, a reset link has been sent.' };
    }

    @Post('reset-password')
    @ApiOperation({ summary: 'Reset password with token' })
    @ApiResponse({ status: 200, description: 'Password reset successful' })
    @ApiResponse({ status: 400, description: 'Invalid token or password' })
    async resetPassword(@Body() dto: ResetPasswordDto) {
        // In development, accept any token for now
        return { message: 'Password reset successful. You can now login.' };
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



/**
 * Live Scores API Controller
 *
 * Returns live scores from our scraper + API sources.
 */
@ApiTags('live-scores')
@Controller('api/live-scores')
export class LiveScoresApiController {
    constructor(
        private readonly liveScoresService: LiveScoresService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get all live scores from scraper + APIs' })
    async getLiveScores() {
        const matches = await this.liveScoresService.getLiveMatches();
        return {
            matches,
            count: matches.length,
            live: matches.filter(m => m.status === '1H' || m.status === '2H' || m.status === 'LIVE').length,
        };
    }
}


/**
 * ML Training API Controller
 */
@ApiTags('ml')
@Controller('api/ml')
export class MLTrainingController {
    constructor(
        private readonly mlService: MLTrainingService,
        private readonly trainModels: TrainModelsUseCase,
    ) { }

    @Post('train')
    @ApiOperation({ summary: 'Trigger ML model training for all sports with sufficient data' })
    async train(@Query('sportKey') sportKey?: string) {
        const result = await this.trainModels.execute(sportKey);
        return {
            message: `ML training complete: ${result.trained} trained, ${result.failed} failed`,
            status: result.trained > 0 ? 'success' : 'insufficient_data',
            trained: result.trained,
            failed: result.failed,
        };
    }

    @Get('health')
    @ApiOperation({ summary: 'Check ML environment' })
    async health() {
        const ready = await this.mlService.healthCheck();
        return { ready, python: ready, models: ['outcome', 'goals', 'btts'] };
    }
}

export { StreamController } from './stream.controller';
export { GTLeaguesController } from './gt-leagues.controller';
export { LiveScoresController } from './live-scores.controller';
