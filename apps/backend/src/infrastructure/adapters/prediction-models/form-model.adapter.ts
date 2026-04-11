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
    /** Sport-specific home advantage factors */
    private static readonly HOME_ADVANTAGE: Record<string, number> = {
        Soccer: 1.12,             // Strong home advantage in soccer
        'Ice Hockey': 1.06,       // Moderate home ice advantage
        Basketball: 1.06,         // Moderate home court advantage
        'American Football': 1.03, // Slight home field advantage
        MMA: 1.0,                 // Neutral (octagon is octagon)
        Boxing: 1.0,              // Neutral venue
        Tennis: 1.0,              // Neutral venue
    };

    /** Default home advantage for unknown sports */
    private static readonly DEFAULT_HOME_ADVANTAGE = 1.08;

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

        // Phase 2: Derive form from trailing 5 matches with recency weighting
        if (this.gameRepo) {
            const numMatches = 5;
            const homeRecentGames = await this.gameRepo.findRecentByTeam(game.homeTeam.id, numMatches);
            const awayRecentGames = await this.gameRepo.findRecentByTeam(game.awayTeam.id, numMatches);

            const calculateForm = (games: Game[], teamId: string): number | null => {
                if (games.length === 0) return null;
                let weightedPoints = 0;
                let totalWeight = 0;
                for (let i = 0; i < games.length; i++) {
                    // Recency weight: most recent = 1.0, decreasing by 0.15 per match
                    const weight = Math.max(0.25, 1.0 - (i * 0.15));
                    const g = games[i];
                    const outcome = g.getOutcome();
                    let points = 0;
                    if (g.homeTeam.id === teamId) {
                        if (outcome === PredictionOutcome.HOME_WIN) points = 1;
                        else if (outcome === PredictionOutcome.DRAW) points = 0.5;
                    } else {
                        if (outcome === PredictionOutcome.AWAY_WIN) points = 1;
                        else if (outcome === PredictionOutcome.DRAW) points = 0.5;
                    }
                    weightedPoints += points * weight;
                    totalWeight += weight;
                }
                return totalWeight > 0 ? weightedPoints / totalWeight : null;
            };

            const homeForm = calculateForm(homeRecentGames, game.homeTeam.id);
            const awayForm = calculateForm(awayRecentGames, game.awayTeam.id);

            if (homeForm !== null && awayForm !== null) {
                // Blend Form with ELO
                const eloHome = game.homeTeam.eloRating.value;
                const eloAway = game.awayTeam.eloRating.value;
                const baseStrengthElo = this.sigmoid((eloHome - eloAway) / 400);

                // Form diff ranges from -1 to 1.
                // Shift base strength by up to ±0.20 based on form (increased from ±0.15)
                const formDiff = homeForm - awayForm;
                baseHomeStrength = baseStrengthElo + (formDiff * 0.20);
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

        // Apply sport-specific home advantage
        const sportGroup = this.getSportGroup(game.sportKey);
        const homeAdvantage = FormModelAdapter.HOME_ADVANTAGE[sportGroup]
            ?? FormModelAdapter.DEFAULT_HOME_ADVANTAGE;
        const adjustedHome = Math.min(
            0.95,
            baseHomeStrength * homeAdvantage,
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

    /** Extract sport group name from a sportKey like 'soccer_epl' → 'Soccer' */
    private getSportGroup(sportKey: string): string {
        const keyMap: Record<string, string> = {
            soccer: 'Soccer',
            basketball: 'Basketball',
            americanfootball: 'American Football',
            icehockey: 'Ice Hockey',
            mma: 'MMA',
            boxing: 'Boxing',
            tennis: 'Tennis',
        };
        const prefix = sportKey.split('_')[0].toLowerCase();
        return keyMap[prefix] ?? sportKey;
    }
}
