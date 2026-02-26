import { BetStatus } from '../enums';
import { PredictionDto } from './prediction.dto';

export class PlaceBetDto {
    predictionId!: string;
    stake!: number;
    customOdds?: number; // In case the user locked in odds different from the system odds
}

export class BetDto {
    id!: string;
    userId!: string;
    predictionId!: string;
    stake!: number;
    lockedOdds!: number;
    status!: BetStatus;
    potentialPayout!: number;
    placedAt!: Date;
    resolvedAt?: Date;

    // Optional relation for expanded response
    prediction?: PredictionDto;
}
