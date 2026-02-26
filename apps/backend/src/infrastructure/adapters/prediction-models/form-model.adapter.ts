import { Injectable, Inject, Optional } from '@nestjs/common';
import { SportCategory } from '@sports-prediction-engine/shared-types';
import type { PredictionModelPort, GameRepositoryPort } from '../../../domain/ports/output';
import { GAME_REPOSITORY_PORT } from '../../../domain/ports/output';
import { ProbabilitySet } from '../../../domain/value-objects';
import { Game } from '../../../domain/entities';
import { PredictionOutcome } from '@sports-prediction-engine/shared-types';

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

    constructor(
        @Optional() @Inject(GAME_REPOSITORY_PORT)
        private readonly gameRepo?: GameRepositoryPort,
    ) { }

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
        let baseHomeStrength = 0.5;

        // Phase 2: Derive form from trailing 5 matches
        if (this.gameRepo) {
            const numMatches = 5;
            const homeRecentGames = await this.gameRepo.findRecentByTeam(game.homeTeam.id, numMatches);
            const awayRecentGames = await this.gameRepo.findRecentByTeam(game.awayTeam.id, numMatches);

            const calculateForm = (games: Game[], teamId: string): number | null => {
                if (games.length === 0) return null;
                let points = 0;
                for (const g of games) {
                    const outcome = g.getOutcome();
                    if (g.homeTeam.id === teamId) {
                        if (outcome === PredictionOutcome.HOME_WIN) points += 1;
                        else if (outcome === PredictionOutcome.DRAW) points += 0.5;
                    } else {
                        if (outcome === PredictionOutcome.AWAY_WIN) points += 1;
                        else if (outcome === PredictionOutcome.DRAW) points += 0.5;
                    }
                }
                return points / games.length;
            };

            const homeForm = calculateForm(homeRecentGames, game.homeTeam.id);
            const awayForm = calculateForm(awayRecentGames, game.awayTeam.id);

            if (homeForm !== null && awayForm !== null) {
                // Blend Form with ELO
                const eloHome = game.homeTeam.eloRating.value;
                const eloAway = game.awayTeam.eloRating.value;
                const baseStrengthElo = this.sigmoid((eloHome - eloAway) / 400);

                // Re-weight base strength based on pure recent match wins
                // e.g if Home Form is 1.0 (5 wins) and Away Form is 0.0 (5 losses)
                const formDiff = homeForm - awayForm;
                
                // Form diff ranges from -1 to 1. 
                // We shift base strength up by at most 0.15 based on form.
                baseHomeStrength = baseStrengthElo + (formDiff * 0.15);
                baseHomeStrength = Math.max(0.01, Math.min(0.99, baseHomeStrength));
            } else {
                 // Fallback to Phase 1 setup
                 const eloHome = game.homeTeam.eloRating.value;
                 const eloAway = game.awayTeam.eloRating.value;
                 baseHomeStrength = this.sigmoid((eloHome - eloAway) / 400);
            }
        } else {
             const eloHome = game.homeTeam.eloRating.value;
             const eloAway = game.awayTeam.eloRating.value;
             baseHomeStrength = this.sigmoid((eloHome - eloAway) / 400);
        }

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
