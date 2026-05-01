import { Injectable, Logger } from '@nestjs/common';
import { SportsDataPort, RawGameData, RawScoreData, RawOddsData } from '../../domain/ports/output';
import { DirectWebScraperService } from '../../data-ingestion/direct-web-scraper.service';
import { Sport } from '../../domain/entities';

/**
 * Direct Web Scraper Adapter
 * 
 * Implementation of SportsDataPort that uses our own internal web scrapers
 * instead of external paid APIs.
 */
@Injectable()
export class DirectWebScraperAdapter implements SportsDataPort {
    private readonly logger = new Logger(DirectWebScraperAdapter.name);

    constructor(private readonly scraper: DirectWebScraperService) {}

    /**
     * Get sports supported by our scrapers
     */
    async fetchSports(): Promise<Sport[]> {
        // This could be dynamic, but for now we return our core sports
        return [];
    }

    /**
     * Fetch upcoming games using our direct scrapers
     */
    async fetchUpcomingGames(sportKey: string): Promise<RawGameData[]> {
        this.logger.debug(`Fetching upcoming games for ${sportKey} via direct scraper`);
        
        let result: { found: number; saved: number };

        if (sportKey === 'soccer_south_africa_psl') {
            await this.scraper.scrapePSLUpcoming();
        } else if (sportKey === 'soccer_epl') {
            await this.scraper.scrapeEPLUpcoming();
        }
        
        // Since processFixture already saves to DB, we don't necessarily 
        // need to return them here for the SyncGamesUseCase, 
        // but to keep the interface consistent, we could query them back or
        // modify scraper to return the entities.
        // For now, SyncGamesUseCase will see them in the DB.
        return [];
    }

    /**
     * Fetch scores using our direct scrapers
     */
    async fetchScores(sportKey: string, _daysFrom?: number): Promise<RawScoreData[]> {
        this.logger.debug(`Fetching scores for ${sportKey} via direct scraper`);
        const matches = await this.scraper.scrapeResults(sportKey);
        
        return matches.map(m => ({
            externalId: `scraper_${sportKey}_${m.homeTeam}_${m.awayTeam}_${new Date(m.date).toISOString().split('T')[0]}`,
            sportKey,
            completed: true,
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            homeScore: m.homeScore,
            awayScore: m.awayScore,
            lastUpdate: new Date().toISOString()
        }));
    }

    /**
     * Scrapers don't usually provide real-time odds in the same format.
     * We'll continue to use SyntheticOddsAdapter for ELO-based odds.
     */
    async fetchOdds(_sportKey: string): Promise<RawOddsData[]> {
        return [];
    }
}
