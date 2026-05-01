import { Injectable, Logger } from '@nestjs/common';
import { PslHistoricalScraper } from './psl-historical-scraper.service';
import { HistoricalDataImporter } from './historical-data-importer.service';
import { PslHistoricalDataSeeder } from './psl-historical-data-seeder.service';
import { PSL_SEASONS, SA_TOURNAMENTS } from './psl-historical-teams.seeds';

/**
 * PSL Data Ingestion Service
 *
 * Orchestrates all PSL data collection activities:
 * 1. Historical scraping from FlashScore (1996-today)
 * 2. Bulk CSV/JSON imports
 * 3. Team synchronization
 * 4. Automated result fetching
 */
@Injectable()
export class PslDataIngestionService {
  private readonly logger = new Logger(PslDataIngestionService.name);

  constructor(
    private readonly historicalScraper: PslHistoricalScraper,
    private readonly dataImporter: HistoricalDataImporter,
    private readonly seeder: PslHistoricalDataSeeder,
  ) {}

  /**
   * Scrape all PSL historical data from 1996 to current season
   */
  async scrapeAllHistoricalData(): Promise<{
    totalMatches: number;
    totalTeams: number;
    totalNewMatches: number;
  }> {
    this.logger.log('Starting full PSL historical data scrape (1996-2026)...');

    const result = await this.historicalScraper.scrapeSeasons(PSL_SEASONS);

    this.logger.log(
      `PSL historical scrape complete: ${result.totalMatches} matches, ${result.totalTeams} teams, ${result.totalNewMatches} new`,
    );

    return result;
  }

  /**
   * Scrape a specific season
   */
  async scrapeSeason(season: string): Promise<any> {
    this.logger.log(`Scraping PSL season: ${season}`);
    return this.historicalScraper.scrapeSeason(season);
  }

  /**
   * Scrape all South African tournaments
   */
  async scrapeAllTournaments(): Promise<void> {
    this.logger.log('Scraping all South African tournaments...');

    const tournaments = Object.values(SA_TOURNAMENTS);

    for (const tournament of tournaments) {
      this.logger.log(`Processing: ${tournament.name}`);
      // TODO: Implement tournament-specific scraping
    }
  }

  /**
   * Import historical data from a JSON file
   */
  async importFromJson(filePath: string): Promise<any> {
    this.logger.log(`Importing PSL data from JSON: ${filePath}`);
    return this.dataImporter.importFromJson(filePath);
  }

  /**
   * Import historical data from a CSV file
   */
  async importFromCsv(filePath: string): Promise<any> {
    this.logger.log(`Importing PSL data from CSV: ${filePath}`);
    return this.dataImporter.importFromCsv(filePath);
  }

  /**
   * Import all data from a directory of JSON files
   */
  async importFromDirectory(directoryPath: string): Promise<any> {
    this.logger.log(`Importing PSL data from directory: ${directoryPath}`);
    return this.dataImporter.importFromDirectory(directoryPath);
  }

  /**
   * Get summary of PSL data in database
   */
  async getDataSummary(): Promise<{
    totalTeams: number;
    totalMatches: number;
    seasonsCovered: string[];
    tournamentsActive: string[];
  }> {
    // This will be implemented with repository injections
    return {
      totalTeams: 0,
      totalMatches: 0,
      seasonsCovered: [],
      tournamentsActive: [],
    };
  }

  /**
   * Seed sample historical matches for testing
   */
  async seedSampleMatches(seasons: number = 3): Promise<number> {
    this.logger.log(`Seeding sample matches for ${seasons} seasons...`);
    return this.seeder.generateSampleMatches(seasons);
  }
}
