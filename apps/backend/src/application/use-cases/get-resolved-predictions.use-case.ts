import { Injectable, Inject } from '@nestjs/common';
import { PREDICTION_REPOSITORY_PORT } from '../../domain/ports/output';
import type { PredictionRepositoryPort } from '../../domain/ports/output';
import { GoalsPredictor } from '../../domain/services/goals-predictor.service';

@Injectable()
export class GetResolvedPredictionsUseCase {
    constructor(
        @Inject(PREDICTION_REPOSITORY_PORT)
        private readonly predictionRepo: PredictionRepositoryPort,
        private readonly goalsPredictor: GoalsPredictor,
    ) { }

    async execute(sportKey?: string): Promise<any[]> {
        const resolved = await this.predictionRepo.findResolved(sportKey);

        return resolved.map(p => {
            const hs = p.game.homeScore ?? 0;
            const as_ = p.game.awayScore ?? 0;
            const totalGoals = hs + as_;
            const actualOver2_5 = totalGoals > 2.5;
            const actualBtts = hs > 0 && as_ > 0;

            const goals = this.goalsPredictor.predictGoals(p.game.sportKey);
            const predictedOver2_5 = goals ? (goals.over2_5 > 0.5) : null;
            const predictedBtts = goals ? (goals.bttsYes > 0.5) : null;

            return {
                id: p.id,
                game: {
                    id: p.game.id,
                    sportKey: p.game.sportKey,
                    sportTitle: p.game.sportTitle,
                    sportGroup: p.game.sportGroup,
                    commenceTime: p.game.commenceTime.toISOString(),
                    homeTeam: { name: p.game.homeTeam.name },
                    awayTeam: { name: p.game.awayTeam.name },
                    homeScore: hs,
                    awayScore: as_,
                    totalGoals,
                },
                predictedOutcome: p.predictedOutcome,
                actualOutcome: p.actualOutcome,
                isCorrect: p.isCorrect,
                confidence: p.confidence.value,
                confidenceLevel: p.confidence.level,
                probabilities: {
                    homeWin: p.probabilities.homeWin.value,
                    awayWin: p.probabilities.awayWin.value,
                    draw: p.probabilities.draw?.value,
                },
                goals: goals ? {
                    over2_5: goals.over2_5,
                    under2_5: goals.under2_5,
                    predictedOver2_5,
                    actualOver2_5,
                    goalsCorrect: predictedOver2_5 !== null ? actualOver2_5 === predictedOver2_5 : null,
                } : undefined,
                btts: goals ? {
                    yes: goals.bttsYes,
                    no: goals.bttsNo,
                    predictedBtts,
                    actualBtts,
                    bttsCorrect: predictedBtts !== null ? actualBtts === predictedBtts : null,
                } : undefined,
                createdAt: p.createdAt.toISOString(),
            };
        });
    }
}
