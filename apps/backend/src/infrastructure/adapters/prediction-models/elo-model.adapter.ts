import { Injectable } from '@nestjs/common';
import { SportCategory } from '@sports-prediction-engine/shared-types';
import type { PredictionModelPort } from '../../../domain/ports/output';
import { ProbabilitySet } from '../../../domain/value-objects';
import { Game, Team } from '../../../domain/entities';
import { EloCalculator } from '../../../domain/services';
import { EloRating } from '../../../domain/value-objects/elo-rating.vo';

/**
 * ELO Prediction Model
 *
 * Uses team ELO ratings to calculate expected win probabilities.
 * For THREE_WAY sports, draw probability is derived from the
 * historical draw rate and how evenly matched the teams are.
 *
 * Home advantage is applied by adding a sport-specific ELO bonus
 * to the home team's rating before computing expected scores.
 */
@Injectable()
export class EloModelAdapter implements PredictionModelPort {
    /** Historical draw rates by sport group (used for THREE_WAY sports) */
    private static readonly DRAW_RATES: Record<string, number> = {
        Soccer: 0.26,
        'Ice Hockey': 0.23,
        Basketball: 0,
        'American Football': 0.005,
        MMA: 0.02,
        Boxing: 0.05,
        Tennis: 0,
    };

    /** Home advantage expressed as ELO rating bonus points */
    private static readonly HOME_ADVANTAGE_ELO: Record<string, number> = {
        Soccer: 65,              // ~home wins 45%, typical in EPL/PSL
        'Ice Hockey': 35,        // moderate home ice advantage
        Basketball: 40,          // moderate home court advantage
        'American Football': 25, // slight home field advantage
        MMA: 0,                  // neutral venue
        Boxing: 0,               // neutral venue
        Tennis: 0,               // neutral venue
    };

    private static readonly DEFAULT_HOME_ADVANTAGE_ELO = 50;

    getName(): string {
        return 'elo';
    }

    supportsCategory(category: SportCategory): boolean {
        return category !== SportCategory.OUTRIGHT;
    }

    async predict(
        game: Game,
        category: SportCategory,
    ): Promise<ProbabilitySet> {
        const sportGroup = this.getSportGroup(game.sportKey);

        // Apply home advantage as an ELO bonus to the home team's effective rating
        const homeAdvantage = EloModelAdapter.HOME_ADVANTAGE_ELO[sportGroup]
            ?? EloModelAdapter.DEFAULT_HOME_ADVANTAGE_ELO;

        const effectiveHomeTeam = this.createHomeTeamWithAdvantage(
            game.homeTeam,
            homeAdvantage,
        );

        const expectedHome = effectiveHomeTeam.expectedScoreAgainst(game.awayTeam);

        if (category === SportCategory.THREE_WAY) {
            // FIX: lookup by sportGroup name, not sportKey
            const drawRate = EloModelAdapter.DRAW_RATES[sportGroup] ?? 0.26;
            const { homeWin, draw, awayWin } =
                EloCalculator.toThreeWayProbability(expectedHome, drawRate);
            return ProbabilitySet.threeWay(homeWin, draw, awayWin);
        }

        return ProbabilitySet.forCategory(
            category,
            expectedHome,
            1 - expectedHome,
        );
    }

    /**
     * Create a temporary team instance with home-advantage-boosted ELO.
     * The home advantage bonus (e.g. +65 ELO for soccer) shifts the
     * expected win probability to reflect real home advantage.
     */
    private createHomeTeamWithAdvantage(team: Team, eloBonus: number): Team {
        const adjustedRating = EloRating.create(team.eloRating.value + eloBonus);
        return new Team(
            team.id,
            team.name,
            team.sportKey,
            adjustedRating,
        );
    }

    /** Extract sport group from sportKey: 'soccer_epl' → 'Soccer' */
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
