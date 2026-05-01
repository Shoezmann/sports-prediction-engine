import { Injectable, Inject } from '@nestjs/common';
import { PREDICTION_REPOSITORY_PORT } from '../../domain/ports/output';
import type { PredictionRepositoryPort } from '../../domain/ports/output';
import { GoalsPredictor } from '../../domain/services/goals-predictor.service';

@Injectable()
export class GetPendingPredictionsUseCase {
    constructor(
        @Inject(PREDICTION_REPOSITORY_PORT)
        private readonly predictionRepo: PredictionRepositoryPort,
        private readonly goalsPredictor: GoalsPredictor,
    ) { }

    async execute(sportKey?: string): Promise<any[]> {
        const pendingPredictions = await this.predictionRepo.findPending(sportKey);

        const output = await Promise.all(pendingPredictions.map(async prediction => {
            // Use full Poisson goals prediction when game context is available
            const goalsFull = await this.goalsPredictor.predictGoalsFull(
                prediction.game.sportKey,
                prediction.game,
            ).catch(() => null);

            // Fallback to static league averages
            const goalsStatic = this.goalsPredictor.predictGoals(prediction.game.sportKey);
            const goals = goalsFull ?? goalsStatic;

            const probToObj = (ps: any) => ps ? ({
                homeWin: ps.homeWin.value,
                awayWin: ps.awayWin.value,
                draw: ps.draw?.value,
            }) : undefined;

            return {
                id: prediction.id,
                game: {
                    id: prediction.game.id,
                    sportKey: prediction.game.sportKey,
                    sportTitle: prediction.game.sportTitle,
                    sportGroup: prediction.game.sportGroup,
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
                    elo:         probToObj(prediction.modelBreakdown.elo),
                    form:        probToObj(prediction.modelBreakdown.form),
                    oddsImplied: probToObj(prediction.modelBreakdown.oddsImplied),
                    ml:          probToObj(prediction.modelBreakdown.ml),
                    poisson:     probToObj(prediction.modelBreakdown.poisson),
                    h2h:         probToObj(prediction.modelBreakdown.h2h),
                },
                goals: goals ? {
                    over2_5: 'over2_5' in goals ? goals.over2_5 : goalsStatic?.over2_5,
                    under2_5: 'under2_5' in goals ? goals.under2_5 : goalsStatic?.under2_5,
                    over1_5: 'over1_5' in goals ? (goals as any).over1_5 : undefined,
                    over3_5: 'over3_5' in goals ? (goals as any).over3_5 : undefined,
                    expectedGoals: 'expectedTotalGoals' in goals
                        ? (goals as any).expectedTotalGoals
                        : goalsStatic?.expectedGoals,
                    expectedGoalsHome: 'expectedGoalsHome' in goals ? (goals as any).expectedGoalsHome : undefined,
                    expectedGoalsAway: 'expectedGoalsAway' in goals ? (goals as any).expectedGoalsAway : undefined,
                } : undefined,
                btts: goals ? {
                    yes: 'bttsYes' in goals ? goals.bttsYes : goalsStatic?.bttsYes,
                    no: 'bttsNo' in goals ? goals.bttsNo : goalsStatic?.bttsNo,
                } : undefined,
                expectedValue: prediction.expectedValue,
                recommendedStake: prediction.recommendedStake,
                odds: prediction.odds,
                createdAt: prediction.createdAt.toISOString(),
            };
        }));

        output.sort((a, b) => new Date(a.game.commenceTime).getTime() - new Date(b.game.commenceTime).getTime());
        return output;
    }
}
