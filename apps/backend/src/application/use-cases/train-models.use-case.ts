import { Injectable, Inject, Logger } from '@nestjs/common';
import type { GameRepositoryPort } from '../../domain/ports/output';
import { GAME_REPOSITORY_PORT } from '../../domain/ports/output';
import { MLTrainingService } from '../../infrastructure/ml/ml-training.service';

/**
 * Use Case: Train ML Models
 *
 * Fetches historical results from the database,
 * trains XGBoost models for outcome, goals, and BTTS,
 * and saves trained models to disk.
 */
@Injectable()
export class TrainModelsUseCase {
    private readonly logger = new Logger(TrainModelsUseCase.name);

    constructor(
        @Inject(GAME_REPOSITORY_PORT)
        private readonly gameRepo: GameRepositoryPort,
        private readonly mlService: MLTrainingService,
    ) { }

    async execute(sportKey?: string): Promise<{ trained: number; failed: number }> {
        // Get all resolved games with scores
        const games = await this.gameRepo.findCompleted(sportKey);

        if (games.length < 50) {
            this.logger.log(`Insufficient data for training: ${games.length} games`);
            return { trained: 0, failed: 0 };
        }

        // Group by sport key
        const bySport = new Map<string, typeof games>();
        for (const game of games) {
            if (!bySport.has(game.sportKey)) {
                bySport.set(game.sportKey, []);
            }
            bySport.get(game.sportKey)!.push(game);
        }

        let trained = 0;
        let failed = 0;

        for (const [key, sportGames] of bySport) {
            // Prepare training data
            const matches = sportGames
                .filter(g => g.homeScore !== null && g.awayScore !== null && g.commenceTime)
                .map(g => ({
                    date: g.commenceTime.toISOString(),
                    home_team: g.homeTeam.name,
                    away_team: g.awayTeam.name,
                    home_score: g.homeScore,
                    away_score: g.awayScore,
                    
                    league: key,
                }));

            if (matches.length < 50) {
                this.logger.debug(`Skipping ${key}: only ${matches.length} matches`);
                continue;
            }

            const result = await this.mlService.trainModel(matches, key);
            if (result) {
                trained++;
            } else {
                failed++;
            }
        }

        this.logger.log(`Training complete: ${trained} trained, ${failed} failed`);
        return { trained, failed };
    }
}
