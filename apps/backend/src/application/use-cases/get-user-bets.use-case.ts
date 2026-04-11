import { Inject, Injectable } from '@nestjs/common';
import { BET_REPOSITORY_PORT } from '../../domain/ports/output';
import type { BetRepositoryPort } from '../../domain/ports/output';
import { BetDto } from '@sports-prediction-engine/shared-types';
import { EntityMapper } from '../../infrastructure/persistence/mappers/entity.mapper'; // if needed directly, but it's better to map simply from domain object. However, Bet domain object doesn't carry prediction naturally.

@Injectable()
export class GetUserBetsUseCase {
    constructor(
        @Inject(BET_REPOSITORY_PORT)
        private readonly betRepo: BetRepositoryPort,
    ) { }

    async execute(userId: string): Promise<BetDto[]> {
        const bets = await this.betRepo.findByUserId(userId);
        
        return bets.map(bet => {
            return {
                id: bet.id,
                userId: bet.userId,
                predictionId: bet.predictionId,
                bookmaker: bet.bookmaker,
                lockedOdds: bet.lockedOdds,
                status: bet.status,
                placedAt: bet.placedAt,
                resolvedAt: bet.resolvedAt,
                prediction: bet.prediction ? {
                    id: bet.prediction.id,
                    gameId: bet.prediction.game.id,
                    sportKey: bet.prediction.sportKey,
                    commenceTime: bet.prediction.game.commenceTime.toISOString(),
                    homeTeam: bet.prediction.game.homeTeam as any,
                    awayTeam: bet.prediction.game.awayTeam as any,
                    predictedWinner: bet.prediction.predictedOutcome,
                    confidenceScore: bet.prediction.confidence.value,
                    confidenceLevel: bet.prediction.confidence.level,
                    odds: bet.prediction.odds,
                } : undefined
            } as any;
        });
    }
}
