import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { SportCategory } from '@sports-prediction-engine/shared-types';
import type { PredictionModelPort, GameRepositoryPort } from '../../../domain/ports/output';
import { GAME_REPOSITORY_PORT } from '../../../domain/ports/output';
import { ProbabilitySet } from '../../../domain/value-objects';
import { Game } from '../../../domain/entities';
import { PredictionOutcome } from '@sports-prediction-engine/shared-types';

/**
 * Poisson / Dixon-Coles Prediction Model
 *
 * Industry-standard football prediction model used by professional bookmakers.
 * Models goals as independent Poisson random variables with Dixon-Coles
 * correction for low-score dependencies.
 *
 * Algorithm:
 *   1. Calculate each team's attack / defense strength from recent results
 *   2. Expected goals: λ_H = homeAttack × awayDef × homeAdv × leagueAvg
 *                      λ_A = awayAttack × homeDef × leagueAvg
 *   3. Build full score matrix P(x, y) via Poisson PMF + Dixon-Coles rho
 *   4. Sum matrix for P(home win), P(draw), P(away win)
 *
 * Only applied to soccer (THREE_WAY). Returns neutral for other categories.
 */
@Injectable()
export class PoissonModelAdapter implements PredictionModelPort {
    private readonly logger = new Logger(PoissonModelAdapter.name);

    /** Home advantage multiplier on expected goals (league averages) */
    private static readonly HOME_ADVANTAGE = 1.22;

    /** League-average goals for attack/defense baseline */
    private static readonly LEAGUE_AVG: Record<string, { home: number; away: number }> = {
        soccer_germany_bundesliga:           { home: 1.78, away: 1.42 },
        soccer_netherlands_eredivisie:       { home: 1.75, away: 1.35 },
        soccer_epl:                          { home: 1.55, away: 1.25 },
        soccer_spain_la_liga:                { home: 1.53, away: 1.17 },
        soccer_italy_serie_a:                { home: 1.50, away: 1.20 },
        soccer_france_ligue_one:             { home: 1.45, away: 1.15 },
        soccer_uefa_champions_league:        { home: 1.60, away: 1.30 },
        soccer_uefa_europa_league:           { home: 1.50, away: 1.20 },
        soccer_uefa_conference_league:       { home: 1.45, away: 1.15 },
        soccer_efl_champ:                    { home: 1.45, away: 1.15 },
        soccer_portugal_primeira_liga:       { home: 1.45, away: 1.15 },
        soccer_scotland_premiership:         { home: 1.50, away: 1.20 },
        soccer_belgium_first_div:            { home: 1.50, away: 1.22 },
        soccer_turkey_super_league:          { home: 1.48, away: 1.18 },
        soccer_south_africa_psl:             { home: 1.20, away: 1.00 },
        soccer_brazil_campeonato:            { home: 1.35, away: 1.05 },
        soccer_argentina_primera_division:   { home: 1.30, away: 1.00 },
        soccer_mexico_ligamx:                { home: 1.40, away: 1.10 },
        soccer_usa_mls:                      { home: 1.42, away: 1.13 },
        default:                             { home: 1.40, away: 1.10 },
    };

    /** Dixon-Coles tau parameter — controls low-score correlation strength */
    private static readonly TAU = 0.08;

    /** Max score to consider in the score matrix */
    private static readonly MAX_SCORE = 9;

    /** Minimum matches required before using team-specific attack/defense */
    private static readonly MIN_MATCHES_FOR_TEAM_STATS = 3;

    constructor(
        @Optional() @Inject(GAME_REPOSITORY_PORT)
        private readonly gameRepo?: GameRepositoryPort,
    ) {}

    getName(): string {
        return 'poisson';
    }

    supportsCategory(category: SportCategory): boolean {
        return category === SportCategory.THREE_WAY;
    }

    async predict(game: Game, category: SportCategory): Promise<ProbabilitySet> {
        try {
            const leagueAvg = PoissonModelAdapter.LEAGUE_AVG[game.sportKey]
                ?? PoissonModelAdapter.LEAGUE_AVG['default'];

            const { homeAttack, homeDef, awayAttack, awayDef } =
                await this.getTeamStrengths(game, leagueAvg);

            // Expected goals with home advantage
            const lambdaH = homeAttack * awayDef * PoissonModelAdapter.HOME_ADVANTAGE * leagueAvg.home;
            const lambdaA = awayAttack * homeDef * leagueAvg.away;

            const clampedH = Math.max(0.2, Math.min(6.0, lambdaH));
            const clampedA = Math.max(0.2, Math.min(6.0, lambdaA));

            const { homeWin, draw, awayWin } = this.computeOutcomes(clampedH, clampedA);

            return ProbabilitySet.threeWay(homeWin, draw, awayWin);
        } catch (err) {
            this.logger.warn(`Poisson model error for ${game.sportKey}: ${err.message}`);
            return ProbabilitySet.threeWay(0.40, 0.26, 0.34);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Core math
    // ─────────────────────────────────────────────────────────────────────

    private computeOutcomes(lH: number, lA: number): { homeWin: number; draw: number; awayWin: number } {
        const N = PoissonModelAdapter.MAX_SCORE;
        const tau = PoissonModelAdapter.TAU;

        let homeWin = 0;
        let draw = 0;
        let awayWin = 0;

        // Precompute Poisson PMF tables
        const pH = this.poissonPMF(lH, N);
        const pA = this.poissonPMF(lA, N);

        for (let x = 0; x <= N; x++) {
            for (let y = 0; y <= N; y++) {
                let p = pH[x] * pA[y];

                // Dixon-Coles correction for low scores (x+y <= 1 scores)
                const rho = this.dixonColesRho(x, y, lH, lA, tau);
                p *= rho;

                if (x > y) homeWin += p;
                else if (x === y) draw += p;
                else awayWin += p;
            }
        }

        // Normalise (Dixon-Coles rho can shift probabilities slightly)
        const total = homeWin + draw + awayWin;
        return {
            homeWin: homeWin / total,
            draw: draw / total,
            awayWin: awayWin / total,
        };
    }

    /**
     * Dixon-Coles correction factor ρ(x, y).
     * Adjusts probabilities for scores {(0,0),(1,0),(0,1),(1,1)} which are
     * empirically over/under-represented vs independent Poisson.
     */
    private dixonColesRho(x: number, y: number, lH: number, lA: number, tau: number): number {
        if (x === 0 && y === 0) return 1 - lH * lA * tau;
        if (x === 1 && y === 0) return 1 + lA * tau;
        if (x === 0 && y === 1) return 1 + lH * tau;
        if (x === 1 && y === 1) return 1 - tau;
        return 1;
    }

    /** Poisson PMF table P(X = 0), P(X = 1), ..., P(X = N) */
    private poissonPMF(lambda: number, N: number): number[] {
        const pmf: number[] = new Array(N + 1);
        let logP = -lambda; // log(P(X=0)) = -lambda
        pmf[0] = Math.exp(logP);
        for (let k = 1; k <= N; k++) {
            logP += Math.log(lambda) - Math.log(k);
            pmf[k] = Math.exp(logP);
        }
        return pmf;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Team attack / defense strengths
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Calculate attack and defense ratings from recent completed matches.
     * Uses the Dixon-Robinson / Dixon-Coles team-strength parameterisation:
     *   attackStrength  = team's avg goals scored   / league home avg
     *   defenseStrength = team's avg goals conceded  / league away avg
     * Values > 1 are above average.
     *
     * Falls back to 1.0 (league average) when insufficient data.
     */
    private async getTeamStrengths(
        game: Game,
        leagueAvg: { home: number; away: number },
    ): Promise<{ homeAttack: number; homeDef: number; awayAttack: number; awayDef: number }> {
        const neutral = { homeAttack: 1.0, homeDef: 1.0, awayAttack: 1.0, awayDef: 1.0 };

        if (!this.gameRepo) return neutral;

        const MIN = PoissonModelAdapter.MIN_MATCHES_FOR_TEAM_STATS;

        const [homeGames, awayGames] = await Promise.all([
            this.gameRepo.findRecentByTeam(game.homeTeam.id, 10),
            this.gameRepo.findRecentByTeam(game.awayTeam.id, 10),
        ]);

        const homeStat = this.computeGoalStats(homeGames, game.homeTeam.id);
        const awayStat = this.computeGoalStats(awayGames, game.awayTeam.id);

        if (homeStat.matches < MIN || awayStat.matches < MIN) return neutral;

        // Attack = avg goals scored / league avg (role-specific)
        const homeAttack = homeStat.avgScored / leagueAvg.home;
        const homeDef    = homeStat.avgConceded / leagueAvg.away;
        const awayAttack = awayStat.avgScored / leagueAvg.away;
        const awayDef    = awayStat.avgConceded / leagueAvg.home;

        return {
            homeAttack: Math.max(0.3, Math.min(3.0, homeAttack)),
            homeDef:    Math.max(0.3, Math.min(3.0, homeDef)),
            awayAttack: Math.max(0.3, Math.min(3.0, awayAttack)),
            awayDef:    Math.max(0.3, Math.min(3.0, awayDef)),
        };
    }

    /** Compute average goals scored/conceded for a team from recent games */
    private computeGoalStats(games: Game[], teamId: string): { avgScored: number; avgConceded: number; matches: number } {
        const completed = games.filter(g => g.completed && g.homeScore !== null && g.awayScore !== null);
        if (completed.length === 0) return { avgScored: 0, avgConceded: 0, matches: 0 };

        let totalScored = 0;
        let totalConceded = 0;

        for (const g of completed) {
            const isHome = g.homeTeam.id === teamId;
            const scored    = isHome ? (g.homeScore ?? 0) : (g.awayScore ?? 0);
            const conceded  = isHome ? (g.awayScore ?? 0) : (g.homeScore ?? 0);
            totalScored    += scored;
            totalConceded  += conceded;
        }

        return {
            avgScored:   totalScored   / completed.length,
            avgConceded: totalConceded / completed.length,
            matches:     completed.length,
        };
    }
}
