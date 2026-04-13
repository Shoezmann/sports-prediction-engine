import { Injectable, Logger } from '@nestjs/common';

/** League-average goals data for fallback predictions */
const LEAGUE_GOALS_DATA: Record<string, { avgGoals: number; over25Pct: number; bttsPct: number }> = {
    // High-scoring leagues
    'soccer_germany_bundesliga': { avgGoals: 3.2, over25Pct: 0.58, bttsPct: 0.56 },
    'soccer_netherlands_eredivisie': { avgGoals: 3.1, over25Pct: 0.57, bttsPct: 0.55 },
    'soccer_switzerland_superleague': { avgGoals: 3.0, over25Pct: 0.55, bttsPct: 0.54 },
    // Mid-high scoring
    'soccer_epl': { avgGoals: 2.8, over25Pct: 0.52, bttsPct: 0.52 },
    'soccer_spain_la_liga': { avgGoals: 2.7, over25Pct: 0.50, bttsPct: 0.50 },
    'soccer_italy_serie_a': { avgGoals: 2.7, over25Pct: 0.49, bttsPct: 0.51 },
    'soccer_france_ligue_one': { avgGoals: 2.6, over25Pct: 0.48, bttsPct: 0.49 },
    'soccer_uefa_champs_league': { avgGoals: 2.9, over25Pct: 0.54, bttsPct: 0.53 },
    'soccer_uefa_europa_league': { avgGoals: 2.7, over25Pct: 0.50, bttsPct: 0.50 },
    // Lower scoring
    'soccer_south_africa_psl': { avgGoals: 2.2, over25Pct: 0.40, bttsPct: 0.42 },
    'soccer_argentina_primera_division': { avgGoals: 2.3, over25Pct: 0.42, bttsPct: 0.43 },
    'soccer_brazil_campeonato': { avgGoals: 2.4, over25Pct: 0.44, bttsPct: 0.45 },
    'soccer_mexico_ligamx': { avgGoals: 2.5, over25Pct: 0.46, bttsPct: 0.47 },
    'soccer_greece_super_league': { avgGoals: 2.3, over25Pct: 0.41, bttsPct: 0.43 },
    // Default for unknown leagues
    'default': { avgGoals: 2.6, over25Pct: 0.48, bttsPct: 0.49 },
};

/**
 * Domain Service: Goals Predictor
 *
 * Generates Over/Under 2.5 and BTTS predictions.
 * Uses league-average data until ML models are trained.
 */
@Injectable()
export class GoalsPredictor {
    private readonly logger = new Logger(GoalsPredictor.name);

    /**
     * Generate goals predictions for a sport key.
     * Falls back to league averages when no trained ML model exists.
     */
    predictGoals(sportKey: string): { over2_5: number; under2_5: number; expectedGoals: number; bttsYes: number; bttsNo: number } | null {
        // Only soccer supports goals predictions
        if (!sportKey.startsWith('soccer_')) return null;

        const data = LEAGUE_GOALS_DATA[sportKey] ?? LEAGUE_GOALS_DATA['default'];

        return {
            over2_5: data.over25Pct,
            under2_5: 1 - data.over25Pct,
            expectedGoals: data.avgGoals,
            bttsYes: data.bttsPct,
            bttsNo: 1 - data.bttsPct,
        };
    }

    /**
     * Check if a goals prediction was correct based on actual score.
     */
    static checkGoalsPrediction(actualHomeScore: number, actualAwayScore: number, over2_5: boolean, btts: boolean): { goalsCorrect: boolean; bttsCorrect: boolean; totalGoals: number } {
        const totalGoals = actualHomeScore + actualAwayScore;
        const actualOver2_5 = totalGoals > 2.5;
        const actualBtts = actualHomeScore > 0 && actualAwayScore > 0;

        return {
            goalsCorrect: actualOver2_5 === over2_5,
            bttsCorrect: actualBtts === btts,
            totalGoals,
        };
    }
}
