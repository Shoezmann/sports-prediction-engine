import { Controller, Post, Get, Body, Query, Logger } from '@nestjs/common';
import { PslDataIngestionService } from './psl-data-ingestion.service';

/**
 * PSL Data Ingestion Controller
 *
 * Admin endpoints for managing PSL data collection and historical imports.
 * All endpoints require admin authentication (TODO: add auth guard).
 */
@Controller('api/admin/psl')
export class PslDataIngestionController {
  private readonly logger = new Logger(PslDataIngestionController.name);

  constructor(private readonly pslService: PslDataIngestionService) {}

  /**
   * Scrape all PSL historical data from 1996 to current season
   * POST /api/admin/psl/scrape-all
   */
  @Post('scrape-all')
  async scrapeAllHistoricalData() {
    this.logger.log('Admin: Starting full PSL historical scrape...');
    try {
      const result = await this.pslService.scrapeAllHistoricalData();
      return {
        success: true,
        message: 'PSL historical data scrape complete',
        data: result,
      };
    } catch (error) {
      this.logger.error('Scrape failed', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Scrape a specific PSL season
   * POST /api/admin/psl/scrape-season?season=2023/2024
   */
  @Post('scrape-season')
  async scrapeSeason(@Query('season') season: string) {
    this.logger.log(`Admin: Scraping season ${season}`);
    try {
      const result = await this.pslService.scrapeSeason(season);
      return {
        success: true,
        message: `Season ${season} scraped`,
        data: result,
      };
    } catch (error) {
      this.logger.error('Season scrape failed', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Import historical data from JSON file
   * POST /api/admin/psl/import-json
   * Body: { "filePath": "/path/to/data.json" }
   */
  @Post('import-json')
  async importJson(@Body() body: { filePath: string }) {
    this.logger.log(`Admin: Importing JSON from ${body.filePath}`);
    try {
      const result = await this.pslService.importFromJson(body.filePath);
      return {
        success: true,
        message: 'JSON import complete',
        data: result,
      };
    } catch (error) {
      this.logger.error('JSON import failed', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Import historical data from CSV file
   * POST /api/admin/psl/import-csv
   * Body: { "filePath": "/path/to/data.csv" }
   */
  @Post('import-csv')
  async importCsv(@Body() body: { filePath: string }) {
    this.logger.log(`Admin: Importing CSV from ${body.filePath}`);
    try {
      const result = await this.pslService.importFromCsv(body.filePath);
      return {
        success: true,
        message: 'CSV import complete',
        data: result,
      };
    } catch (error) {
      this.logger.error('CSV import failed', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Import all data from a directory of JSON files
   * POST /api/admin/psl/import-directory
   * Body: { "directoryPath": "/path/to/data-directory" }
   */
  @Post('import-directory')
  async importDirectory(@Body() body: { directoryPath: string }) {
    this.logger.log(`Admin: Importing directory ${body.directoryPath}`);
    try {
      const result = await this.pslService.importFromDirectory(body.directoryPath);
      return {
        success: true,
        message: 'Directory import complete',
        data: result,
      };
    } catch (error) {
      this.logger.error('Directory import failed', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get summary of PSL data in database
   * GET /api/admin/psl/summary
   */
  @Get('summary')
  async getSummary() {
    try {
      const summary = await this.pslService.getDataSummary();
      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      this.logger.error('Failed to get summary', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Seed sample historical matches for testing
   * POST /api/admin/psl/seed-sample?seasons=3
   */
  @Post('seed-sample')
  async seedSample(@Query('seasons') seasons: string) {
    const seasonsNum = parseInt(seasons || '3', 10);
    this.logger.log(`Admin: Seeding sample matches for ${seasonsNum} seasons`);
    try {
      const count = await this.pslService.seedSampleMatches(seasonsNum);
      return {
        success: true,
        message: `Seeded ${count} sample matches`,
        data: { matches: count },
      };
    } catch (error) {
      this.logger.error('Seeding failed', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
