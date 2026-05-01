import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameEntity } from '../infrastructure/persistence/entities/game.orm-entity';
import { PredictionEntity } from '../infrastructure/persistence/entities/prediction.orm-entity';
import { TeamEntity } from '../infrastructure/persistence/entities/team.orm-entity';
import { EloCalculator } from '../domain/services/elo-calculator.service';

/**
 * Result Input Request DTO
 */
export interface ResultInputDto {
    homeTeam: string;
    awayTeam: string;
    leagueKey: string;
    homeScore: number;
    awayScore: number;
}

/**
 * Result Input Service
 *
 * Manually input match results.
 * Updates game completion, resolves predictions, and updates ELO ratings.
 */
@Injectable()
export class ResultInputService {
    private readonly logger = new Logger(ResultInputService.name);

    constructor(
        @InjectRepository(GameEntity)
        private readonly gameRepo: Repository<GameEntity>,
        @InjectRepository(PredictionEntity)
        private readonly predictionRepo: Repository<PredictionEntity>,
        @InjectRepository(TeamEntity)
        private readonly teamRepo: Repository<TeamEntity>,
    ) { }

    /**
     * Input a match result and process the entire pipeline:
     * 1. Find and complete the game
     * 2. Resolve associated predictions
     * 3. Update team ELO ratings
     */
    async inputResult(dto: ResultInputDto): Promise<{
        gameUpdated: boolean;
        predictionsResolved: number;
        eloUpdated: number;
    }> {
        // Find the game
        const game = await this.gameRepo.findOne({
            where: {
                sportKey: dto.leagueKey,
                homeScore: null, // Not yet completed
                completed: false,
            },
            relations: ['homeTeam', 'awayTeam'],
            order: { commenceTime: 'ASC' },
        });

        if (!game) {
            // Try to find by team name match
            const allUnresolved = await this.gameRepo.find({
                where: { sportKey: dto.leagueKey, completed: false },
                relations: ['homeTeam', 'awayTeam'],
            });

            const found = allUnresolved.find(
                (g) =>
                    g.homeTeam.name.toLowerCase() === dto.homeTeam.toLowerCase() &&
                    g.awayTeam.name.toLowerCase() === dto.awayTeam.toLowerCase(),
            );

            if (!found) {
                return { gameUpdated: false, predictionsResolved: 0, eloUpdated: 0 };
            }

            return this.processGameResult(found, dto.homeScore, dto.awayScore);
        }

        return this.processGameResult(game, dto.homeScore, dto.awayScore);
    }

    /**
     * Process a single game result through the full pipeline.
     */
    private async processGameResult(
        game: GameEntity,
        homeScore: number,
        awayScore: number,
    ): Promise<{ gameUpdated: boolean; predictionsResolved: number; eloUpdated: number }> {
        // 1. Complete the game
        game.completed = true;
        game.homeScore = homeScore;
        game.awayScore = awayScore;
        game.status = 'finished';
        await this.gameRepo.save(game);

        // 2. Resolve predictions
        const predictions = await this.predictionRepo.find({
            where: { gameId: game.id, isResolved: false },
        });

        let predictionsResolved = 0;
        for (const pred of predictions) {
            const outcome = this.getOutcome(homeScore, awayScore, game.sportCategory);
            pred.actualOutcome = outcome;
            pred.isResolved = true;
            pred.isCorrect = pred.predictedOutcome === outcome;
            await this.predictionRepo.save(pred);
            predictionsResolved++;
        }

        // 3. Update ELO ratings
        const homeScoreValue = this.getEloScore(homeScore, awayScore);
        const [updatedHome, updatedAway] = EloCalculator.updateRatings(
            this.toDomainTeam(game.homeTeam),
            this.toDomainTeam(game.awayTeam),
            homeScoreValue,
        );

        await this.teamRepo.update(game.homeTeamId, { eloRating: updatedHome.eloRating.value });
        await this.teamRepo.update(game.awayTeamId, { eloRating: updatedAway.eloRating.value });

        this.logger.log(
            `Result: ${game.homeTeam.name} ${homeScore}-${awayScore} ${game.awayTeam.name} | ` +
            `Predictions: ${predictionsResolved} resolved | ` +
            `ELO: ${game.homeTeam.name} ${updatedHome.eloRating.value.toFixed(0)} | ` +
            `${game.awayTeam.name} ${updatedAway.eloRating.value.toFixed(0)}`,
        );

        return { gameUpdated: true, predictionsResolved, eloUpdated: 2 };
    }

    private getOutcome(homeScore: number, awayScore: number, category: string): string {
        if (homeScore > awayScore) return 'home_win';
        if (awayScore > homeScore) return 'away_win';
        return 'draw';
    }

    private getEloScore(homeScore: number, awayScore: number): number {
        if (homeScore > awayScore) return 1.0;
        if (awayScore > homeScore) return 0.0;
        return 0.5;
    }

    private toDomainTeam(ormTeam: TeamEntity): any {
        return {
            id: ormTeam.id,
            name: ormTeam.name,
            sportKey: ormTeam.sportKey,
            eloRating: { value: ormTeam.eloRating },
        };
    }
}
