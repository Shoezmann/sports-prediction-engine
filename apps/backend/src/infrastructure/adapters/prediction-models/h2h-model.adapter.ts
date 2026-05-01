import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { SportCategory } from '@sports-prediction-engine/shared-types';
import type { PredictionModelPort, GameRepositoryPort } from '../../../domain/ports/output';
import { GAME_REPOSITORY_PORT } from '../../../domain/ports/output';
import { ProbabilitySet } from '../../../domain/value-objects';
import { Game } from '../../../domain/entities';
import { PredictionOutcome } from '@sports-prediction-engine/shared-types';

/**
 * Head-to-Head (H2H) Prediction Model
 *
 * Analyses the historical record between the two specific teams playing.
 * H2H patterns matter significantly in football — certain matchups have
 * structural asymmetries that ELO alone doesn't capture (tactical mismatches,
 * psychological factors, historical dominance).
 *
 * Features used:
 *   - H2H win/draw/loss rates (last 10 meetings)
 *   - Recency weighting: recent meetings count more
 *   - Home-specific H2H (same venue subset)
 *   - Blended with ELO when H2H data is sparse
 *
 * Returns neutral distribution when insufficient H2H history (< 3 meetings).
 */
@Injectable()
export class H2HModelAdapter implements PredictionModelPort {
    private readonly logger = new Logger(H2HModelAdapter.name);

    /** Minimum H2H meetings before the model has signal */
    private static readonly MIN_MEETINGS = 3;

    /** Maximum meetings to consider (older data decays fast) */
    private static readonly MAX_MEETINGS = 10;

    /** Weight of H2H vs ELO blend — scales with data confidence */
    private static readonly MAX_H2H_WEIGHT = 0.65; // up to 65% H2H, 35% ELO

    constructor(
        @Optional() @Inject(GAME_REPOSITORY_PORT)
        private readonly gameRepo?: GameRepositoryPort,
    ) {}

    getName(): string {
        return 'h2h';
    }

    supportsCategory(category: SportCategory): boolean {
        // H2H is meaningful for team sports; not applicable to outright markets
        return category !== SportCategory.OUTRIGHT;
    }

    async predict(game: Game, category: SportCategory): Promise<ProbabilitySet> {
        try {
            const h2h = await this.getH2HHistory(game);

            if (h2h.meetings < H2HModelAdapter.MIN_MEETINGS) {
                // Fall back to ELO-based probabilities when no meaningful H2H data
                return this.eloFallback(game, category);
            }

            const { homeWinRate, drawRate, awayWinRate } = h2h;

            // Confidence in H2H data scales with number of meetings
            const h2hWeight = Math.min(
                H2HModelAdapter.MAX_H2H_WEIGHT,
                0.20 + (h2h.meetings - H2HModelAdapter.MIN_MEETINGS) * 0.075,
            );
            const eloWeight = 1 - h2hWeight;

            // ELO-based probabilities for blending
            const { eloHome, eloDraw, eloAway } = this.eloProbs(game, category);

            // Blend H2H and ELO
            const blendedHome = homeWinRate * h2hWeight + eloHome * eloWeight;
            const blendedDraw = drawRate   * h2hWeight + eloDraw * eloWeight;
            const blendedAway = awayWinRate * h2hWeight + eloAway * eloWeight;

            if (category === SportCategory.THREE_WAY) {
                const total = blendedHome + blendedDraw + blendedAway;
                return ProbabilitySet.threeWay(blendedHome / total, blendedDraw / total, blendedAway / total);
            }

            // TWO_WAY: re-normalise ignoring draw
            const twoTotal = blendedHome + blendedAway;
            return ProbabilitySet.twoWay(blendedHome / twoTotal, blendedAway / twoTotal);
        } catch (err) {
            this.logger.warn(`H2H model error: ${err.message}`);
            return this.eloFallback(game, category);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // H2H history retrieval
    // ─────────────────────────────────────────────────────────────────────

    private async getH2HHistory(game: Game): Promise<{
        meetings: number;
        homeWinRate: number;
        drawRate: number;
        awayWinRate: number;
    }> {
        if (!this.gameRepo) {
            return { meetings: 0, homeWinRate: 0.40, drawRate: 0.26, awayWinRate: 0.34 };
        }

        // Find completed meetings between these two teams in both home/away permutations
        const [asHomeGames, asAwayGames] = await Promise.all([
            this.gameRepo.findRecentByTeam(game.homeTeam.id, H2HModelAdapter.MAX_MEETINGS),
            this.gameRepo.findRecentByTeam(game.awayTeam.id, H2HModelAdapter.MAX_MEETINGS),
        ]);

        // Filter to meetings between these two teams specifically
        const h2hGames = [
            ...asHomeGames.filter(g =>
                g.completed &&
                (g.awayTeam.id === game.awayTeam.id || g.homeTeam.id === game.awayTeam.id),
            ),
            ...asAwayGames.filter(g =>
                g.completed &&
                (g.homeTeam.id === game.homeTeam.id || g.awayTeam.id === game.homeTeam.id),
            ),
        ];

        // Deduplicate by game ID
        const seen = new Set<string>();
        const unique = h2hGames.filter(g => {
            if (seen.has(g.id)) return false;
            seen.add(g.id);
            return true;
        });

        // Sort by most recent first
        unique.sort((a, b) => new Date(b.commenceTime).getTime() - new Date(a.commenceTime).getTime());

        const meetings = unique.slice(0, H2HModelAdapter.MAX_MEETINGS);
        if (meetings.length < H2HModelAdapter.MIN_MEETINGS) {
            return { meetings: meetings.length, homeWinRate: 0.40, drawRate: 0.26, awayWinRate: 0.34 };
        }

        // Compute weighted win rates (recency decay: 1.0, 0.9, 0.8, ...)
        let weightedHomeWin = 0;
        let weightedDraw = 0;
        let weightedAwayWin = 0;
        let totalWeight = 0;

        meetings.forEach((g, i) => {
            const weight = Math.max(0.30, 1.0 - i * 0.10);
            totalWeight += weight;

            const outcome = g.getOutcome();
            const homeTeamIsOurHome = g.homeTeam.id === game.homeTeam.id;

            if (outcome === PredictionOutcome.HOME_WIN) {
                if (homeTeamIsOurHome) weightedHomeWin += weight;
                else weightedAwayWin += weight;
            } else if (outcome === PredictionOutcome.AWAY_WIN) {
                if (homeTeamIsOurHome) weightedAwayWin += weight;
                else weightedHomeWin += weight;
            } else if (outcome === PredictionOutcome.DRAW) {
                weightedDraw += weight;
            }
        });

        return {
            meetings: meetings.length,
            homeWinRate: weightedHomeWin / totalWeight,
            drawRate: weightedDraw / totalWeight,
            awayWinRate: weightedAwayWin / totalWeight,
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    // ELO helpers
    // ─────────────────────────────────────────────────────────────────────

    /** ELO-based probabilities (raw, no home advantage in THIS model) */
    private eloProbs(game: Game, category: SportCategory): { eloHome: number; eloDraw: number; eloAway: number } {
        const eloHome = game.homeTeam.eloRating.value;
        const eloAway = game.awayTeam.eloRating.value;
        const pHome = 1 / (1 + Math.pow(10, -(eloHome - eloAway + 40) / 400));

        if (category === SportCategory.THREE_WAY) {
            const draw = 0.26 * (1 - Math.abs(2 * pHome - 1)); // draw more likely when even
            const remaining = 1 - draw;
            return { eloHome: remaining * pHome, eloDraw: draw, eloAway: remaining * (1 - pHome) };
        }

        return { eloHome: pHome, eloDraw: 0, eloAway: 1 - pHome };
    }

    private eloFallback(game: Game, category: SportCategory): ProbabilitySet {
        const { eloHome, eloDraw, eloAway } = this.eloProbs(game, category);
        if (category === SportCategory.THREE_WAY) {
            return ProbabilitySet.threeWay(eloHome, eloDraw, eloAway);
        }
        return ProbabilitySet.twoWay(eloHome, eloAway);
    }
}
