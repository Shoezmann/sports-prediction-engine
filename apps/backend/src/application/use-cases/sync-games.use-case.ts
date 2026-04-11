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
import { Game, Sport } from '../../domain/entities';

/**
 * Use Case: Sync Games
 *
 * Fetches upcoming games for all active sports from The Odds API
 * and stores them in the database. Creates teams on first encounter.
 */
@Injectable()
export class SyncGamesUseCase {
    private readonly logger = new Logger(SyncGamesUseCase.name);

    constructor(
        @Inject(SPORTS_DATA_PORT)
        private readonly sportsData: SportsDataPort,
        @Inject(SPORT_REPOSITORY_PORT)
        private readonly sportRepo: SportRepositoryPort,
        @Inject(GAME_REPOSITORY_PORT)
        private readonly gameRepo: GameRepositoryPort,
        @Inject(TEAM_REPOSITORY_PORT)
        private readonly teamRepo: TeamRepositoryPort,
    ) { }

    async execute(
        sportKeys?: string[],
    ): Promise<{ synced: number; sports: number }> {
        const sports = sportKeys
            ? await Promise.all(
                sportKeys.map((k) => this.sportRepo.findByKey(k)),
            ).then((results) => results.filter(Boolean) as Sport[])
            : await this.sportRepo.findActive();

        this.logger.log(
            `Syncing games for ${sports.length} active sports...`,
        );

        let totalSynced = 0;

        for (const sport of sports) {
            try {
                const rawGames =
                    await this.sportsData.fetchUpcomingGames(sport.key);

                for (const raw of rawGames) {
                    const existing = await this.gameRepo.findByExternalId(
                        raw.externalId,
                    );
                    if (existing) continue;

                    const homeTeam = await this.teamRepo.findOrCreate(
                        raw.homeTeam,
                        sport.key,
                    );
                    const awayTeam = await this.teamRepo.findOrCreate(
                        raw.awayTeam,
                        sport.key,
                    );

                    const game = Game.create({
                        id: uuidv4(),
                        externalId: raw.externalId,
                        sportKey: sport.key,
                        sportTitle: sport.title,
                        sportGroup: sport.group,
                        sportCategory: sport.category,
                        homeTeam,
                        awayTeam,
                        commenceTime: new Date(raw.commenceTime),
                    });

                    await this.gameRepo.save(game);
                    totalSynced++;
                }

                this.logger.log(
                    `Synced ${rawGames.length} events for ${sport.key}`,
                );
            } catch (error) {
                this.logger.error(
                    `Failed to sync games for ${sport.key}`,
                    error,
                );
            }
        }

        this.logger.log(
            `Game sync complete: ${totalSynced} new games across ${sports.length} sports`,
        );

        return { synced: totalSynced, sports: sports.length };
    }
}
