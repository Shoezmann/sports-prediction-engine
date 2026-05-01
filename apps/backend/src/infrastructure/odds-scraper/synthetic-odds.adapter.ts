import { Injectable, Logger } from '@nestjs/common';
import type {
    SportsDataPort,
    RawOddsData,
    RawGameData,
    RawScoreData,
    RawBookmakerData,
} from '../../domain/ports/output';
import { Sport } from '../../domain/entities';

/**
 * Synthetic Odds Adapter — 100% self-owned, zero external dependencies.
 *
 * Generates bookmaker-style odds from our own ELO ratings, then
 * simulates realistic bookmaker behavior:
 * 1. Overround (vig/margin) — bookmakers build in a 3-8% profit margin
 * 2. Favorite-longshot bias — bookmakers overprice favorites and
 *    underprice longshots (well-documented market inefficiency)
 *
 * These synthetic odds are fed into the OddsImpliedModel,
 * which removes the vig and produces fair probabilities.
 *
 * This breaks the circular dependency because:
 * - ELO/Form produce "true" probabilities
 * - Synthetic odds simulate how bookmakers would price them
 * - The odds model removes the vig → fair probability
 * - Fair probability differs from raw ELO due to the bias simulation
 */

/** Bookmaker margin (overround) by sport */
const BOOKMAKER_MARGIN: Record<string, number> = {
    soccer: 0.05,
    rugby: 0.045,
    tennis: 0.04,
    default: 0.05,
};

/** Favorite-longshot bias compression factor */
const FAVORITE_LONGSHOT_COMPRESSION = 0.85;

@Injectable()
export class SyntheticOddsAdapter implements SportsDataPort {
    private readonly logger = new Logger(SyntheticOddsAdapter.name);

    getName(): string { return 'synthetic'; }

    // ── Delegate to primary source for non-odds data ─────────
    // These methods are not used in our self-contained pipeline.
    // The DataIngestionService handles all data locally.

    async fetchSports(): Promise<Sport[]> {
        return []; // Handled by DataIngestionService
    }

    async fetchUpcomingGames(_sportKey: string): Promise<RawGameData[]> {
        return []; // Handled by DataIngestionService
    }

    async fetchScores(_sportKey: string, _daysFrom?: number): Promise<RawScoreData[]> {
        return []; // Results are input manually via admin API
    }

    // ── Generate synthetic odds ─────────────────────────────────

    async fetchOdds(sportKey: string): Promise<RawOddsData[]> {
        // In our self-contained pipeline, odds are not fetched per-sport.
        // The GeneratePredictionsUseCase generates odds on-the-fly from
        // the ELO/Form models via the SyntheticOddsGenerator.
        // This method exists to satisfy the SportsDataPort interface.
        this.logger.debug(`Synthetic odds for ${sportKey} — generated from ELO model`);
        return [];
    }

    /**
     * Generate synthetic bookmaker odds from ELO differential.
     * Called by the prediction pipeline to provide odds data.
     */
    generateOddsFromElo(
        homeElo: number,
        awayElo: number,
        sportKey: string,
        isThreeWay: boolean,
        homeTeamName: string = 'home',
        awayTeamName: string = 'away',
    ): RawOddsData {
        const trueHomeScore = 1 / (1 + Math.pow(10, -(homeElo - awayElo) / 400));

        let homeProb: number, awayProb: number, drawProb: number;

        if (isThreeWay) {
            const evenness = 1 - Math.abs(2 * trueHomeScore - 1);
            drawProb = 0.26 * evenness;
            const remaining = 1 - drawProb;
            homeProb = remaining * trueHomeScore;
            awayProb = remaining * (1 - trueHomeScore);
        } else {
            homeProb = trueHomeScore;
            awayProb = 1 - trueHomeScore;
            drawProb = 0;
        }

        // Apply favorite-longshot bias
        const mean = isThreeWay ? 1 / 3 : 0.5;
        homeProb = mean + (homeProb - mean) * FAVORITE_LONGSHOT_COMPRESSION;
        awayProb = mean + (awayProb - mean) * FAVORITE_LONGSHOT_COMPRESSION;
        if (isThreeWay) {
            drawProb = mean + (drawProb - mean) * FAVORITE_LONGSHOT_COMPRESSION;
        }

        // Normalize
        const total = homeProb + awayProb + drawProb;
        homeProb /= total;
        awayProb /= total;
        drawProb /= total;

        // Add bookmaker margin (overround)
        const margin = BOOKMAKER_MARGIN[sportKey?.split('_')[0]] ?? BOOKMAKER_MARGIN.default;
        const overround = 1 + margin;
        const homeOdds = overround / homeProb;
        const awayOdds = overround / awayProb;
        const drawOdds = isThreeWay ? overround / drawProb : null;

        return {
            externalId: `synthetic_${sportKey}`,
            sportKey,
            homeTeam: homeTeamName,
            awayTeam: awayTeamName,
            bookmakers: [{
                key: 'synthetic_market',
                title: 'Synthetic Market (Self-Owned)',
                markets: [{
                    key: 'h2h',
                    outcomes: [
                        { name: homeTeamName, price: parseFloat(homeOdds.toFixed(2)) },
                        ...(isThreeWay ? [{ name: 'Draw', price: parseFloat(drawOdds.toFixed(2)) }] : []),
                        { name: awayTeamName, price: parseFloat(awayOdds.toFixed(2)) },
                    ],
                }],
            }],
        };
    }
}
