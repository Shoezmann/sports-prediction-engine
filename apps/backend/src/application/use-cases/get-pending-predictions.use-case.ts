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
            game: {
                id: prediction.game.id,
                sportKey: prediction.game.sportKey,
                commenceTime: prediction.game.commenceTime.toISOString(),
                homeTeam: {
                    id: prediction.game.homeTeam.id,
                    name: prediction.game.homeTeam.name,
                },
                awayTeam: {
                    id: prediction.game.awayTeam.id,
                    name: prediction.game.awayTeam.name,
                },
            },
            predictedOutcome: prediction.predictedOutcome,
            confidence: prediction.confidence.value,
            confidenceLevel: prediction.confidence.level,
            probabilities: {
                homeWin: prediction.probabilities.homeWin.value,
                awayWin: prediction.probabilities.awayWin.value,
                draw: prediction.probabilities.draw?.value,
            },
            modelBreakdown: {
                elo: {
                    homeWin: prediction.modelBreakdown.elo.homeWin.value,
                    awayWin: prediction.modelBreakdown.elo.awayWin.value,
                    draw: prediction.modelBreakdown.elo.draw?.value,
                },
                form: {
                    homeWin: prediction.modelBreakdown.form.homeWin.value,
                    awayWin: prediction.modelBreakdown.form.awayWin.value,
                    draw: prediction.modelBreakdown.form.draw?.value,
                },
                oddsImplied: {
                    homeWin: prediction.modelBreakdown.oddsImplied.homeWin.value,
                    awayWin: prediction.modelBreakdown.oddsImplied.awayWin.value,
                    draw: prediction.modelBreakdown.oddsImplied.draw?.value,
                },
            },
            expectedValue: prediction.expectedValue,
            recommendedStake: prediction.recommendedStake,
            odds: prediction.odds,
            createdAt: prediction.createdAt.toISOString(),
        }));

        // Sort by commence time
        output.sort((a, b) => new Date(a.game.commenceTime).getTime() - new Date(b.game.commenceTime).getTime());

        return output;
    }
}
