import { Injectable, Inject } from '@nestjs/common';
import { PREDICTION_REPOSITORY_PORT } from '../../domain/ports/output';
import type { PredictionRepositoryPort } from '../../domain/ports/output';

@Injectable()
export class GetPendingPredictionsUseCase {
    constructor(
        @Inject(PREDICTION_REPOSITORY_PORT)
        private readonly predictionRepo: PredictionRepositoryPort,
    ) { }

    async execute(sportKey?: string): Promise<any[]> {
        const pendingPredictions = await this.predictionRepo.findPending(sportKey);

        const output = pendingPredictions.map(prediction => ({
            id: prediction.id,
            gameId: prediction.game.id,
            sportKey: prediction.game.sportKey,
            commenceTime: prediction.game.commenceTime.toISOString(),
            homeTeam: prediction.game.homeTeam,
            awayTeam: prediction.game.awayTeam,
            predictedWinner: prediction.predictedOutcome,
            confidenceScore: prediction.confidence.value,
            confidenceLevel: prediction.confidence.level,
            ensembleDetails: prediction.modelBreakdown,
            expectedValue: prediction.expectedValue,
            recommendedStake: prediction.recommendedStake,
            odds: prediction.odds,
        }));

        // Sort by commence time
        output.sort((a, b) => new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime());

        return output;
    }
}
