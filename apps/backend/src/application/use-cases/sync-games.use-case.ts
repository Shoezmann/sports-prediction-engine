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
import { Game, GameStatus, Sport } from '../../domain/entities';

/**
 * Use Case: Sync Games
 *
 * Fetches upcoming games for all active sports from The Odds API
 * and stores them in the database. Creates teams on first encounter.
 * Also detects rescheduled games (commenceTime changes) and updates them.
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
    ): Promise<{ synced: number; updated: number; rescheduled: number; sports: number }> {
        const sports = sportKeys
            ? await Promise.all(
                sportKeys.map((k) => this.sportRepo.findByKey(k)),
            ).then((results) => results.filter(Boolean) as Sport[])
            : await this.sportRepo.findActive();

        this.logger.log(
            `Syncing games for ${sports.length} active sports...`,
        );

        let totalSynced = 0;
        let totalUpdated = 0;
        let totalRescheduled = 0;

        for (const sport of sports) {
            try {
                const rawGames =
                    await this.sportsData.fetchUpcomingGames(sport.key);

                for (const raw of rawGames) {
                    const existing = await this.gameRepo.findByExternalId(
                        raw.externalId,
                    );

                    if (existing) {
                        // Check if the game was rescheduled (commenceTime changed)
                        const newCommenceTime = new Date(raw.commenceTime);
                        const existingCommenceTime = new Date(existing.commenceTime);
                        const timeDiffMs = Math.abs(newCommenceTime.getTime() - existingCommenceTime.getTime());
                        const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

                        // If kickoff time changed by more than 1 hour, treat as rescheduled
                        if (timeDiffHours > 1) {
                            const rescheduledGame = existing.withRescheduledTime(newCommenceTime);
                            await this.gameRepo.save(rescheduledGame);
                            totalRescheduled++;
                            this.logger.log(
                                `⏰ Rescheduled: ${existing.homeTeam.name} vs ${existing.awayTeam.name}: ` +
                                `${existingCommenceTime.toISOString()} → ${newCommenceTime.toISOString()} (${timeDiffHours.toFixed(1)}h shift)`,
                            );
                        }

                        // Check if game status changed to postponed/cancelled
                        if (raw.status) {
                            const normalizedStatus = this.normalizeStatus(raw.status);
                            if (normalizedStatus === GameStatus.POSTPONED && existing.status !== GameStatus.POSTPONED) {
                                const postponedGame = existing.withPostponed(newCommenceTime);
                                await this.gameRepo.save(postponedGame);
                                totalUpdated++;
                                this.logger.warn(
                                    `⚠️  Postponed: ${existing.homeTeam.name} vs ${existing.awayTeam.name}`,
                                );
                            } else if (normalizedStatus === GameStatus.CANCELLED && existing.status !== GameStatus.CANCELLED) {
                                const cancelledGame = existing.withCancelled();
                                await this.gameRepo.save(cancelledGame);
                                totalUpdated++;
                                this.logger.warn(
                                    `❌ Cancelled: ${existing.homeTeam.name} vs ${existing.awayTeam.name}`,
                                );
                            }
                        }

                        continue;
                    }

                    // Map API status to GameStatus
                    const gameStatus = raw.status
                        ? this.normalizeStatus(raw.status)
                        : GameStatus.SCHEDULED;

                    // Skip cancelled games entirely
                    if (gameStatus === GameStatus.CANCELLED) {
                        this.logger.debug(
                            `Skipping cancelled game: ${raw.homeTeam} vs ${raw.awayTeam}`,
                        );
                        continue;
                    }

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
                        status: gameStatus,
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
            `Game sync complete: ${totalSynced} new, ${totalUpdated} updated, ${totalRescheduled} rescheduled across ${sports.length} sports`,
        );

        return { synced: totalSynced, updated: totalUpdated, rescheduled: totalRescheduled, sports: sports.length };
    }

    /**
     * Normalize external API status strings to our GameStatus enum.
     * Handles various API formats (SportAPI, The Odds API, FlashScore, API-Football, etc.)
     */
    private normalizeStatus(rawStatus: string): GameStatus {
        const normalized = rawStatus.toLowerCase().trim();

        // Postponed indicators
        if (['postponed', 'postp', 'delayed', 'rescheduled', 'pst', 'et'].includes(normalized)) {
            return GameStatus.POSTPONED;
        }

        // Cancelled indicators
        if (['cancelled', 'canceled', 'canc', 'abandoned', 'abd'].includes(normalized)) {
            return GameStatus.CANCELLED;
        }

        // In progress indicators
        if (['in_progress', 'inprogress', 'started', 'live', '1h', '2h', 'halftime', 'ht', 'break'].includes(normalized)) {
            return GameStatus.IN_PROGRESS;
        }

        // API-Football specific: 'NS' = Not Started, 'TBD' = To Be Defined
        if (['ns', 'tbd'].includes(normalized)) {
            return GameStatus.SCHEDULED;
        }

        // Finished indicators
        if (['finished', 'ended', 'complete', 'completed', 'ft', 'aet', 'pen'].includes(normalized)) {
            return GameStatus.FINISHED;
        }

        // Default to scheduled
        return GameStatus.SCHEDULED;
    }
}
