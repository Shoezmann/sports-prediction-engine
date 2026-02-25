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
import { EloCalculator } from '../../domain/services';

/**
 * Use Case: Update Game Results
 *
 * Fetches completed game scores from The Odds API and:
 * 1. Updates game entities with final scores
 * 2. Marks predictions with actual outcomes (correct/incorrect)
 * 3. Updates team ELO ratings based on results
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
    }> {
        const unresolvedGames = await this.gameRepo.findUnresolved();
        this.logger.log(
            `Found ${unresolvedGames.length} unresolved games to check`,
        );

        const bySport = new Map<string, string[]>();
        for (const game of unresolvedGames) {
            const ids = bySport.get(game.sportKey) ?? [];
            ids.push(game.externalId);
            bySport.set(game.sportKey, ids);
        }

        let updated = 0;
        let predictionsResolved = 0;
        let eloUpdated = 0;

        for (const [sportKey, _gameIds] of bySport) {
            try {
                const scores = await this.sportsData.fetchScores(sportKey);

                for (const score of scores) {
                    if (!score.completed || score.homeScore === null || score.awayScore === null) {
                        continue;
                    }

                    const game = unresolvedGames.find(
                        (g) => g.externalId === score.externalId,
                    );
                    if (!game) continue;

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
            `Results update complete: ${updated} games updated, ${predictionsResolved} predictions resolved, ${eloUpdated} ELO ratings updated`,
        );

        return { updated, predictionsResolved, eloUpdated };
    }
}
