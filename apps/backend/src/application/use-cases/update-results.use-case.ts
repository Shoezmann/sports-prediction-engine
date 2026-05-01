import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
    GameRepositoryPort,
    PredictionRepositoryPort,
    SportsDataPort,
    TeamRepositoryPort,
} from '../../domain/ports/output';
import {
    GAME_REPOSITORY_PORT,
    PREDICTION_REPOSITORY_PORT,
    SPORTS_DATA_PORT,
    TEAM_REPOSITORY_PORT,
} from '../../domain/ports/output';
import { GameStatus } from '../../domain/entities';
import { EloCalculator } from '../../domain/services';

/**
 * Use Case: Update Game Results
 *
 * Fetches completed game scores from The Odds API and:
 * 1. Updates game entities with final scores
 * 2. Marks predictions with actual outcomes (correct/incorrect)
 * 3. Updates team ELO ratings based on results
 * 4. Detects and handles postponed/cancelled games
 */
@Injectable()
export class UpdateResultsUseCase {
    private readonly logger = new Logger(UpdateResultsUseCase.name);

    constructor(
        @Inject(SPORTS_DATA_PORT)
        private readonly sportsData: SportsDataPort,
        @Inject(GAME_REPOSITORY_PORT)
        private readonly gameRepo: GameRepositoryPort,
        @Inject(PREDICTION_REPOSITORY_PORT)
        private readonly predictionRepo: PredictionRepositoryPort,
        @Inject(TEAM_REPOSITORY_PORT)
        private readonly teamRepo: TeamRepositoryPort,
    ) { }

    async execute(): Promise<{
        updated: number;
        predictionsResolved: number;
        eloUpdated: number;
        postponed: number;
        skipped: number;
    }> {
        const unresolvedGames = await this.gameRepo.findUnresolved();
        this.logger.log(
            `Found ${unresolvedGames.length} unresolved games to check`,
        );

        // Also check postponed games that might have been rescheduled and now have results
        const postponedGames = await this.gameRepo.findPostponed();
        const allGamesToCheck = [...unresolvedGames, ...postponedGames];

        if (postponedGames.length > 0) {
            this.logger.log(
                `Also checking ${postponedGames.length} postponed games for updates`,
            );
        }

        const bySport = new Map<string, typeof allGamesToCheck>();
        for (const game of allGamesToCheck) {
            const ids = bySport.get(game.sportKey) ?? [];
            ids.push(game);
            bySport.set(game.sportKey, ids);
        }

        let updated = 0;
        let predictionsResolved = 0;
        let eloUpdated = 0;
        let postponed = 0;
        let skipped = 0;

        for (const [sportKey, games] of bySport) {
            try {
                const scores = await this.sportsData.fetchScores(sportKey);

                for (const game of games) {
                    // Find matching score data
                    const score = scores.find(
                        (s) => s.externalId === game.externalId,
                    );

                    if (!score) {
                        // No score available yet
                        skipped++;
                        continue;
                    }

                    // Handle postponed/cancelled games reported via scores API
                    if (score.status) {
                        const normalizedStatus = this.normalizeStatus(score.status);
                        if (normalizedStatus === GameStatus.POSTPONED && game.status !== GameStatus.POSTPONED) {
                            const postponedGame = game.withPostponed();
                            await this.gameRepo.save(postponedGame);
                            postponed++;
                            this.logger.warn(
                                `⚠️  Postponed (from scores): ${game.homeTeam.name} vs ${game.awayTeam.name}`,
                            );
                            skipped++;
                            continue;
                        }
                        if (normalizedStatus === GameStatus.CANCELLED && game.status !== GameStatus.CANCELLED) {
                            const cancelledGame = game.withCancelled();
                            await this.gameRepo.save(cancelledGame);
                            this.logger.warn(
                                `❌ Cancelled (from scores): ${game.homeTeam.name} vs ${game.awayTeam.name}`,
                            );
                            skipped++;
                            continue;
                        }
                    }

                    // Skip if game is postponed/cancelled
                    if (game.status === GameStatus.POSTPONED || game.status === GameStatus.CANCELLED) {
                        skipped++;
                        continue;
                    }

                    // Skip if not completed or scores missing
                    if (!score.completed || score.homeScore === null || score.awayScore === null) {
                        skipped++;
                        continue;
                    }

                    const completedGame = game.withResult(
                        score.homeScore,
                        score.awayScore,
                    );
                    await this.gameRepo.save(completedGame);
                    updated++;

                    const prediction = await this.predictionRepo.findByGameId(game.id);
                    if (prediction) {
                        const actualOutcome = completedGame.getOutcome();
                        const resolvedPrediction = prediction.markResult(actualOutcome);
                        await this.predictionRepo.save(resolvedPrediction);
                        predictionsResolved++;

                        this.logger.debug(
                            `${resolvedPrediction.isCorrect ? '✅' : '❌'} ${game} → ${actualOutcome}`,
                        );
                    }

                    const homeEloScore = completedGame.getHomeEloScore();
                    if (homeEloScore !== undefined) {
                        const [updatedHome, updatedAway] = EloCalculator.updateRatings(
                            game.homeTeam,
                            game.awayTeam,
                            homeEloScore,
                        );
                        await this.teamRepo.save(updatedHome);
                        await this.teamRepo.save(updatedAway);
                        eloUpdated += 2;
                    }
                }
            } catch (error) {
                this.logger.error(
                    `Failed to update results for ${sportKey}`,
                    error,
                );
            }
        }

        this.logger.log(
            `Results update complete: ${updated} games updated, ${predictionsResolved} predictions resolved, ${eloUpdated} ELO ratings updated, ${postponed} postponed, ${skipped} skipped`,
        );

        return { updated, predictionsResolved, eloUpdated, postponed, skipped };
    }

    /**
     * Normalize external API status strings to our GameStatus enum.
     */
    private normalizeStatus(rawStatus: string): GameStatus {
        const normalized = rawStatus.toLowerCase().trim();

        if (['postponed', 'postp', 'delayed', 'rescheduled', 'pst', 'et'].includes(normalized)) {
            return GameStatus.POSTPONED;
        }
        if (['cancelled', 'canceled', 'canc', 'abandoned', 'abd'].includes(normalized)) {
            return GameStatus.CANCELLED;
        }
        // API-Football: 'NS' = Not Started, 'TBD' = To Be Defined
        if (['ns', 'tbd'].includes(normalized)) {
            return GameStatus.SCHEDULED;
        }
        if (['finished', 'ended', 'complete', 'completed', 'ft', 'aet', 'pen'].includes(normalized)) {
            return GameStatus.FINISHED;
        }
        if (['in_progress', 'inprogress', 'started', 'live', '1h', '2h', 'halftime', 'ht', 'break'].includes(normalized)) {
            return GameStatus.IN_PROGRESS;
        }
        return GameStatus.SCHEDULED;
    }
}
