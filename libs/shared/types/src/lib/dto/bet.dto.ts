/**
 * Pure type DTOs for bets — no class-validator or NestJS dependencies.
 * These are safe to import in frontend code.
 */
import { BetStatus } from '../enums';
import { PredictionDto } from './prediction.dto';

export interface PlaceBetDto {
    predictionId: string;
    bookmaker?: string;
    customOdds?: number;
}

export interface BetDto {
    id: string;
    userId: string;
    predictionId: string;
    bookmaker?: string;
    lockedOdds: number;
    status: BetStatus;
    placedAt: Date;
    resolvedAt?: Date;
    prediction?: PredictionDto;
}
