import { Injectable } from '@nestjs/common';
import { SportCategory } from '@sports-prediction-engine/shared-types';
import type { PredictionModelPort } from '../../../domain/ports/output';
import { ProbabilitySet } from '../../../domain/value-objects';
import { Game } from '../../../domain/entities';

/**
 * Form-Based Prediction Model
 *
 * Uses recent match results (last N games) to determine current form.
 * Form is expressed as a win rate for each team, then adjusted to
 * produce a probability distribution.
 *
 * Phase 1: Uses a simple home-advantage adjusted baseline.
 * Phase 2: Will incorporate actual historical data from the database.
 */
@Injectable()
export class FormModelAdapter implements PredictionModelPort {
    /** Home advantage factor (applied multiplicatively) */
    private static readonly HOME_ADVANTAGE = 1.1;

    getName(): string {
        return 'form';
    }

    supportsCategory(category: SportCategory): boolean {
        return category !== SportCategory.OUTRIGHT;
    }

    async predict(
        game: Game,
        category: SportCategory,
    ): Promise<ProbabilitySet> {
        // Phase 1: Derive form from ELO rating differential + home advantage
        // This gives a reasonable baseline until we have historical match data
        const eloHome = game.homeTeam.eloRating.value;
        const eloAway = game.awayTeam.eloRating.value;

        // Normalize ELO difference to a 0–1 scale
        const eloDiff = eloHome - eloAway;
        const baseHomeStrength = this.sigmoid(eloDiff / 400);

        // Apply home advantage
        const adjustedHome = Math.min(
            0.95,
            baseHomeStrength * FormModelAdapter.HOME_ADVANTAGE,
        );

        if (category === SportCategory.THREE_WAY) {
            // Estimate draw probability: higher when teams are close
            const evenness = 1 - Math.abs(2 * adjustedHome - 1);
            const drawProb = 0.25 * evenness; // max draw ~25%
            const remaining = 1 - drawProb;
            const homeWin = remaining * adjustedHome;
            const awayWin = remaining * (1 - adjustedHome);
            return ProbabilitySet.threeWay(homeWin, drawProb, awayWin);
        }

        // TWO_WAY or HEAD_TO_HEAD
        return ProbabilitySet.forCategory(
            category,
            adjustedHome,
            1 - adjustedHome,
        );
    }

    /** Standard sigmoid function */
    private sigmoid(x: number): number {
        return 1 / (1 + Math.exp(-x));
    }
}
