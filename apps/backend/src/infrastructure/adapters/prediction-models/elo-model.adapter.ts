import { Injectable } from '@nestjs/common';
import { SportCategory } from '@sports-prediction-engine/shared-types';
import type { PredictionModelPort } from '../../../domain/ports/output';
import { ProbabilitySet } from '../../../domain/value-objects';
import { Game } from '../../../domain/entities';
import { EloCalculator } from '../../../domain/services';

/**
 * ELO Prediction Model
 *
 * Uses team ELO ratings to calculate expected win probabilities.
 * For THREE_WAY sports, draw probability is derived from the
 * historical draw rate and how evenly matched the teams are.
 */
@Injectable()
export class EloModelAdapter implements PredictionModelPort {
    /** Historical draw rates by sport group */
    private static readonly DRAW_RATES: Record<string, number> = {
        Soccer: 0.26,
        'Ice Hockey': 0.23,
    };

    getName(): string {
        return 'elo';
    }

    supportsCategory(category: SportCategory): boolean {
        // ELO works for all head-to-head categories (not outright)
        return category !== SportCategory.OUTRIGHT;
    }

    async predict(
        game: Game,
        category: SportCategory,
    ): Promise<ProbabilitySet> {
        const expectedHome = game.homeTeam.expectedScoreAgainst(game.awayTeam);

        if (category === SportCategory.THREE_WAY) {
            const drawRate = EloModelAdapter.DRAW_RATES[game.sportKey] ?? 0.26;
            const { homeWin, draw, awayWin } =
                EloCalculator.toThreeWayProbability(expectedHome, drawRate);
            return ProbabilitySet.threeWay(homeWin, draw, awayWin);
        }

        // TWO_WAY or HEAD_TO_HEAD
        return ProbabilitySet.forCategory(
            category,
            expectedHome,
            1 - expectedHome,
        );
    }
}
