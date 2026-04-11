import { BetStatus } from '../enums';
import { PredictionDto } from './prediction.dto';
import { IsUUID, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PlaceBetDto {
    @ApiProperty({ description: 'UUID of the prediction to bet on' })
    @IsUUID()
    predictionId!: string;

    @ApiProperty({ example: 'Betway', required: false })
    @IsOptional()
    @IsString()
    bookmaker?: string;

    @ApiProperty({ example: 1.85, required: false, description: 'Custom locked odds (optional)' })
    @IsOptional()
    @IsNumber()
    @Min(1.01, { message: 'Odds must be greater than 1.01' })
    @Max(1000, { message: 'Odds must be less than 1000' })
    customOdds?: number;
}

export class BetDto {
    id!: string;
    userId!: string;
    predictionId!: string;
    bookmaker?: string;
    lockedOdds!: number;
    status!: BetStatus;
    placedAt!: Date;
    resolvedAt?: Date;

    // Optional relation for expanded response
    prediction?: PredictionDto;
}
