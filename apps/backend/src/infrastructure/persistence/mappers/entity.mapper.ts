import { Sport, Team, Game, Prediction, User, Bet } from '../../../domain/entities';
import type { ModelBreakdown } from '../../../domain/entities';
import { Confidence, ProbabilitySet } from '../../../domain/value-objects';
import { SportEntity } from '../entities/sport.orm-entity';
import { TeamEntity } from '../entities/team.orm-entity';
import { GameEntity } from '../entities/game.orm-entity';
import { PredictionEntity } from '../entities/prediction.orm-entity';
import { UserEntity } from '../entities/user.orm-entity';
import { BetEntity } from '../entities/bet.orm-entity';
import { getSportCategory, SportCategory, PredictionOutcome } from '@sports-prediction-engine/shared-types';

/**
 * Maps between TypeORM entities and domain entities.
 * Keeps persistence concerns entirely within the infrastructure layer.
 */
export class EntityMapper {
    // ── User ───────────────────────────────────────────────────

    static toDomainUser(orm: UserEntity): User {
        return User.create({
            id: orm.id,
            email: orm.email,
            passwordHash: orm.passwordHash,
            firstName: orm.firstName ?? undefined,
            favoriteSports: orm.favoriteSports ?? undefined,
            createdAt: orm.createdAt,
        });
    }

    static toOrmUser(domain: User): Partial<UserEntity> {
        return {
            id: domain.id,
            email: domain.email,
            passwordHash: domain.passwordHash,
            firstName: domain.firstName ?? null,
            favoriteSports: domain.favoriteSports ?? null,
        };
    }

    // ── Sport ──────────────────────────────────────────────────

    static toDomainSport(orm: SportEntity): Sport {
        return Sport.create({
            key: orm.key,
            group: orm.group,
            title: orm.title,
            description: orm.description,
            active: orm.active,
            hasOutrights: orm.hasOutrights,
            lastSyncedAt: orm.lastSyncedAt ?? undefined,
        });
    }

    static toOrmSport(domain: Sport): Partial<SportEntity> {
        return {
            key: domain.key,
            group: domain.group,
            title: domain.title,
            description: domain.description,
            active: domain.active,
            hasOutrights: domain.hasOutrights,
            category: domain.category,
            lastSyncedAt: domain.lastSyncedAt ?? null,
        };
    }

    // ── Team ───────────────────────────────────────────────────

    static toDomainTeam(orm: TeamEntity): Team {
        return Team.create({
            id: orm.id,
            name: orm.name,
            sportKey: orm.sportKey,
            shortName: orm.shortName ?? undefined,
            eloRating: orm.eloRating,
        });
    }

    static toOrmTeam(domain: Team): Partial<TeamEntity> {
        return {
            id: domain.id,
            name: domain.name,
            sportKey: domain.sportKey,
            shortName: domain.shortName ?? null,
            eloRating: domain.eloRating.value,
        };
    }

    // ── Game ───────────────────────────────────────────────────

    static toDomainGame(orm: GameEntity): Game {
        const homeTeam = EntityMapper.toDomainTeam(orm.homeTeam);
        const awayTeam = EntityMapper.toDomainTeam(orm.awayTeam);

        return Game.create({
            id: orm.id,
            externalId: orm.externalId,
            sportKey: orm.sportKey,
            sportCategory: orm.sportCategory as SportCategory,
            homeTeam,
            awayTeam,
            commenceTime: orm.commenceTime,
            completed: orm.completed,
            homeScore: orm.homeScore ?? undefined,
            awayScore: orm.awayScore ?? undefined,
        });
    }

    static toOrmGame(domain: Game): Partial<GameEntity> {
        return {
            id: domain.id,
            externalId: domain.externalId,
            sportKey: domain.sportKey,
            sportCategory: domain.sportCategory,
            homeTeamId: domain.homeTeam.id,
            awayTeamId: domain.awayTeam.id,
            commenceTime: domain.commenceTime,
            completed: domain.completed,
            homeScore: domain.homeScore ?? null,
            awayScore: domain.awayScore ?? null,
        };
    }

    // ── Prediction ─────────────────────────────────────────────

    static toDomainPrediction(orm: PredictionEntity): Prediction {
        const game = EntityMapper.toDomainGame(orm.game);

        const category = game.sportCategory;
        const probabilities =
            orm.probDraw !== null
                ? ProbabilitySet.threeWay(orm.probHomeWin, orm.probDraw, orm.probAwayWin)
                : ProbabilitySet.forCategory(category, orm.probHomeWin, orm.probAwayWin);

        // Reconstruct model breakdown from JSON
        const breakdown = orm.modelBreakdown
            ? EntityMapper.deserializeBreakdown(orm.modelBreakdown, category)
            : undefined;

        // Build modelBreakdown in the right shape
        const modelBreakdown: ModelBreakdown = {
            elo: breakdown?.['elo'] ?? probabilities,
            form: breakdown?.['form'] ?? probabilities,
            oddsImplied: breakdown?.['oddsImplied'] ?? probabilities,
        };

        if (orm.isResolved && orm.actualOutcome) {
            // Reconstruct a resolved prediction via constructor
            const confidence = Confidence.create(orm.confidenceValue);
            return new Prediction(
                orm.id,
                game,
                orm.predictedOutcome as PredictionOutcome,
                confidence,
                probabilities,
                modelBreakdown,
                orm.createdAt,
                orm.actualOutcome as PredictionOutcome,
                orm.isCorrect ?? undefined,
                orm.expectedValue ?? undefined,
                orm.recommendedStake ?? undefined,
                orm.odds ?? undefined,
            );
        }

        // Unresolved — use create factory
        return Prediction.create({
            id: orm.id,
            game,
            probabilities,
            modelBreakdown,
            createdAt: orm.createdAt,
            expectedValue: orm.expectedValue ?? undefined,
            recommendedStake: orm.recommendedStake ?? undefined,
            odds: orm.odds ?? undefined,
        });
    }

    static toOrmPrediction(domain: Prediction): Partial<PredictionEntity> {
        return {
            id: domain.id,
            gameId: domain.game.id,
            sportKey: domain.sportKey,
            probHomeWin: domain.probabilities.homeWin.value,
            probAwayWin: domain.probabilities.awayWin.value,
            probDraw: domain.probabilities.draw?.value ?? null,
            predictedOutcome: domain.predictedOutcome,
            confidenceValue: domain.confidence.value,
            confidenceLevel: domain.confidence.level,
            modelBreakdown: domain.modelBreakdown
                ? EntityMapper.serializeBreakdown(domain.modelBreakdown)
                : null,
            actualOutcome: domain.actualOutcome ?? null,
            isCorrect: domain.isCorrect ?? null,
            isResolved: domain.isResolved,
            expectedValue: domain.expectedValue ?? null,
            recommendedStake: domain.recommendedStake ?? null,
            odds: domain.odds ?? null,
        };
    }

    // ── Helpers ────────────────────────────────────────────────

    private static serializeBreakdown(
        breakdown: ModelBreakdown,
    ): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const [key, ps] of Object.entries(breakdown)) {
            result[key] = {
                homeWin: ps.homeWin.value,
                awayWin: ps.awayWin.value,
                draw: ps.draw?.value ?? null,
            };
        }
        return result;
    }

    private static deserializeBreakdown(
        json: Record<string, unknown>,
        category: SportCategory,
    ): Record<string, ProbabilitySet> {
        const result: Record<string, ProbabilitySet> = {};
        for (const [key, val] of Object.entries(json)) {
            const data = val as { homeWin: number; awayWin: number; draw?: number | null };
            result[key] =
                data.draw != null
                    ? ProbabilitySet.threeWay(data.homeWin, data.draw, data.awayWin)
                    : ProbabilitySet.forCategory(category, data.homeWin, data.awayWin);
        }
        return result;
    }

    // ── Bet ───────────────────────────────────────────────────

    static toDomainBet(orm: BetEntity): Bet {
        return new Bet(
            orm.id,
            orm.userId,
            orm.predictionId,
            orm.bookmaker,
            Number(orm.lockedOdds),
            orm.status,
            orm.placedAt,
            orm.resolvedAt ?? undefined,
            orm.prediction ? EntityMapper.toDomainPrediction(orm.prediction) : undefined,
        );
    }

    static toOrmBet(domain: Bet): Partial<BetEntity> {
        return {
            id: domain.id,
            userId: domain.userId,
            predictionId: domain.predictionId,
            bookmaker: domain.bookmaker,
            lockedOdds: domain.lockedOdds,
            status: domain.status,
            placedAt: domain.placedAt,
            resolvedAt: domain.resolvedAt ?? null,
        };
    }
}
