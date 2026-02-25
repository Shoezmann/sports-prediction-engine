import { Team } from '../entities';

/**
 * Domain Service: ELO Calculator
 *
 * Handles ELO rating updates for teams after game results.
 * Operates purely on domain entities — no external dependencies.
 */
export class EloCalculator {
    /**
     * Update both teams' ELO ratings after a game.
     *
     * @param homeTeam - The home team
     * @param awayTeam - The away team
     * @param homeScore - Actual home score: 1.0 (win), 0.5 (draw), 0.0 (loss)
     * @returns Updated team pair [homeTeam, awayTeam]
     */
    static updateRatings(
        homeTeam: Team,
        awayTeam: Team,
        homeScore: number,
    ): [Team, Team] {
        const awayScore = 1.0 - homeScore;

        const updatedHome = homeTeam.updateEloAfterGame(homeScore, awayTeam);
        const updatedAway = awayTeam.updateEloAfterGame(awayScore, homeTeam);

        return [updatedHome, updatedAway];
    }

    /**
     * Calculate expected win probability for home team against away team.
     * Uses the standard ELO formula.
     */
    static expectedHomeWin(homeTeam: Team, awayTeam: Team): number {
        return homeTeam.expectedScoreAgainst(awayTeam);
    }

    /**
     * Convert an ELO-based expected score into a three-way probability set.
     * Uses statistical analysis of draws in the sport.
     *
     * @param expectedScore - ELO expected score for home team (0.0–1.0)
     * @param drawRate - Historical draw rate for this sport (e.g., 0.26 for soccer)
     */
    static toThreeWayProbability(
        expectedScore: number,
        drawRate: number = 0.26,
    ): { homeWin: number; draw: number; awayWin: number } {
        // The draw probability is highest when teams are evenly matched
        // and decreases as the ELO gap increases
        const evenness = 1 - Math.abs(2 * expectedScore - 1);
        const drawProb = drawRate * evenness;

        // Distribute remaining probability between home and away
        const remaining = 1 - drawProb;
        const homeWin = remaining * expectedScore;
        const awayWin = remaining * (1 - expectedScore);

        return { homeWin, draw: drawProb, awayWin };
    }
}
