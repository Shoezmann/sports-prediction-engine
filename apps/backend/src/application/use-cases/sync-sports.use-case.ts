import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SportsDataPort, SportRepositoryPort } from '../../domain/ports/output';
import { SPORTS_DATA_PORT, SPORT_REPOSITORY_PORT } from '../../domain/ports/output';


/**
 * Use Case: Sync Sports
 *
 * Fetches the latest sport list from The Odds API and updates
 * the local database with active/inactive status changes.
 */
@Injectable()
export class SyncSportsUseCase {
    private readonly logger = new Logger(SyncSportsUseCase.name);

    constructor(
        @Inject(SPORTS_DATA_PORT)
        private readonly sportsData: SportsDataPort,
        @Inject(SPORT_REPOSITORY_PORT)
        private readonly sportRepo: SportRepositoryPort,
    ) { }

    async execute(): Promise<{ total: number; active: number; new: number }> {
        this.logger.log('Syncing sports from The Odds API...');

        // Fetch all sports (free endpoint — no quota cost)
        const apiSports = await this.sportsData.fetchSports();

        // Get existing sports from DB
        const existingSports = await this.sportRepo.findAll();
        const existingKeys = new Set(existingSports.map((s) => s.key));

        // Upsert all sports
        let newCount = 0;
        for (const sport of apiSports) {
            if (!existingKeys.has(sport.key)) {
                newCount++;
            }
        }

        await this.sportRepo.saveMany(apiSports);

        const activeSports = apiSports.filter((s) => s.active);
        this.logger.log(
            `Sync complete: ${apiSports.length} total, ${activeSports.length} active, ${newCount} new`,
        );

        return {
            total: apiSports.length,
            active: activeSports.length,
            new: newCount,
        };
    }
}
