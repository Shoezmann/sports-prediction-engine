import { BetStatus } from '@sports-prediction-engine/shared-types';

export class Bet {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly predictionId: string,
        public readonly stake: number,
        public readonly lockedOdds: number,
        public readonly status: BetStatus,
        public readonly placedAt: Date,
        public readonly resolvedAt?: Date,
    ) {}

    get potentialPayout(): number {
        return this.stake * this.lockedOdds;
    }

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
            this.stake,
            this.lockedOdds,
            won ? BetStatus.WON : BetStatus.LOST,
            this.placedAt,
            new Date(),
        );
    }
}
