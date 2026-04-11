import { Inject, Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type {
    SportsDataPort,
    GameRepositoryPort,
    TeamRepositoryPort,
    SportRepositoryPort,
} from '../../domain/ports/output';
import {
    SPORTS_DATA_PORT,
    GAME_REPOSITORY_PORT,
    TEAM_REPOSITORY_PORT,
    SPORT_REPOSITORY_PORT,
} from '../../domain/ports/output';
import { Game } from '../../domain/entities';
import { EloCalculator } from '../../domain/services';

/**
 * Use Case: Historical Backfill
 * 
 * Fetches historical game results (past N days) and updates the database.
 * This effectively "warms up" the ELO ratings from the cold start 1500 limit.
 */
@Injectable()
export class HistoricalBackfillUseCase {
    private readonly logger = new Logger(HistoricalBackfillUseCase.name);

    constructor(
        @Inject(SPORTS_DATA_PORT)
        private readonly sportsData: SportsDataPort,
        @Inject(SPORT_REPOSITORY_PORT)
        private readonly sportRepo: SportRepositoryPort,
        @Inject(GAME_REPOSITORY_PORT)
        private readonly gameRepo: GameRepositoryPort,
        @Inject(TEAM_REPOSITORY_PORT)
        private readonly teamRepo: TeamRepositoryPort,
    ) {}

    async execute(days: number = 30): Promise<{ backfilled: number, eloUpdated: number }> {
        const sports = await this.sportRepo.findActive();
        let totalBackfilled = 0;
        let eloUpdated = 0;

        for (const sport of sports) {
            try {
                this.logger.log(`Backfilling historical scores for ${sport.key} (last ${days} days)...`);
                const scores = await this.sportsData.fetchScores(sport.key, days);
                
                // Process chronologically to properly simulate ELO trajectory
                const sortedScores = scores.sort((a,b) => new Date(a.lastUpdate).getTime() - new Date(b.lastUpdate).getTime());

                for (const score of sortedScores) {
                    if (!score.completed || score.homeScore === null || score.awayScore === null) continue;
                    
                    const existing = await this.gameRepo.findByExternalId(score.externalId);
                    if (existing && existing.completed) continue;

                    const homeTeam = await this.teamRepo.findOrCreate(score.homeTeam, sport.key);
                    const awayTeam = await this.teamRepo.findOrCreate(score.awayTeam, sport.key);

                    let completedGame: Game;
                    if (existing) {
                        completedGame = existing.withResult(score.homeScore, score.awayScore);
                    } else {
                        const newGame = Game.create({
                            id: uuidv4(),
                            externalId: score.externalId,
                            sportKey: sport.key,
                            sportTitle: sport.title,
                            sportGroup: sport.group,
                            sportCategory: sport.category,
                            homeTeam,
                            awayTeam,
                            commenceTime: new Date(score.lastUpdate)
                        });
                        completedGame = newGame.withResult(score.homeScore, score.awayScore);
                    }

                    await this.gameRepo.save(completedGame);
                    totalBackfilled++;

                    const homeEloScore = completedGame.getHomeEloScore();
                    if (homeEloScore !== undefined) {
                        const [updatedHome, updatedAway] = EloCalculator.updateRatings(
                            homeTeam, 
                            awayTeam,
                            homeEloScore,
                        );
                        await this.teamRepo.save(updatedHome);
                        await this.teamRepo.save(updatedAway);
                        eloUpdated += 2;
                    }
                }
            } catch (error) {
                this.logger.error(`Failed to backfill for ${sport.key}`, error);
            }
        }
        
        return { backfilled: totalBackfilled, eloUpdated: eloUpdated };
    }
}
