import { BetStatus } from '@sports-prediction-engine/shared-types';
import { Prediction } from './prediction.entity';

export class Bet {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly predictionId: string,
        public readonly bookmaker: string | undefined,
        public readonly lockedOdds: number,
        public readonly status: BetStatus,
        public readonly placedAt: Date,
        public readonly resolvedAt?: Date,
        public readonly prediction?: Prediction,
    ) {}

    // Removing potentialPayout as stakes are removed

    isResolved(): boolean {
        return this.status !== BetStatus.PENDING;
    }

    resolve(won: boolean): Bet {
        if (this.isResolved()) {
            throw new Error('Bet is already resolved');
        }
        return new Bet(
            this.id,
            this.userId,
            this.predictionId,
            this.bookmaker,
            this.lockedOdds,
            won ? BetStatus.WON : BetStatus.LOST,
            this.placedAt,
            new Date(),
            this.prediction,
        );
    }
}
