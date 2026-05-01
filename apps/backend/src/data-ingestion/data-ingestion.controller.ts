import { Controller, Get, Post, Body, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DataIngestionService } from './data-ingestion.service';
import { ResultInputService } from './result-input.service';
import { ComprehensiveTeamScraper } from './comprehensive-team-scraper';
import { DirectWebScraperService } from './direct-web-scraper.service';
import { SofaScoreScraperService } from './sofascore-scraper.service';
import { EspnScraperService } from './espn-scraper.service';

@ApiTags('admin')
@Controller('api/admin')
export class DataIngestionController {
  private readonly logger = new Logger(DataIngestionController.name);

  constructor(
    private readonly dataIngestion: DataIngestionService,
    private readonly resultInput: ResultInputService,
    private readonly teamScraper: ComprehensiveTeamScraper,
    private readonly directScraper: DirectWebScraperService,
    private readonly sofascore: SofaScoreScraperService,
    private readonly espn: EspnScraperService,
  ) {}

  @Post('sync-direct')
  @ApiOperation({ summary: 'Sync upcoming games and live scores via SofaScore + BBC fallback' })
  @ApiQuery({ name: 'force', type: Boolean, required: false, description: 'Force refresh by clearing upcoming games first' })
  async syncDirect(@Query('force') force?: string) {
    const forceRefresh = force === 'true';
    const result = await this.directScraper.syncAll(forceRefresh);
    return { message: 'Direct sync complete', ...result };
  }

  @Post('sync-espn')
  @ApiOperation({ summary: 'Sync upcoming fixtures from ESPN (free, no API key)' })
  @ApiQuery({ name: 'days', type: Number, required: false, description: 'Days ahead to sync (default: 14)' })
  async syncEspn(@Query('days') days?: string) {
    const daysAhead = parseInt(days || '14', 10);
    const result = await this.espn.syncUpcomingFixtures(daysAhead);
    return { message: 'ESPN sync complete', ...result };
  }

  @Post('sync-sofascore')
  @ApiOperation({ summary: 'Sync upcoming fixtures from SofaScore (50+ leagues, free, no API key)' })
  @ApiQuery({ name: 'days', type: Number, required: false, description: 'Days ahead to sync (default: 7)' })
  async syncSofaScore(@Query('days') days?: string) {
    const daysAhead = parseInt(days || '7', 10);
    const result = await this.sofascore.syncUpcomingFixtures(daysAhead);
    return { message: 'SofaScore sync complete', ...result };
  }

  @Get('sofascore-results')
  @ApiOperation({ summary: 'Fetch recent results from SofaScore (last N days)' })
  @ApiQuery({ name: 'days', type: Number, required: false, description: 'Days back to fetch (default: 7)' })
  async getSofaScoreResults(@Query('days') days?: string) {
    const daysBack = parseInt(days || '7', 10);
    const results = await this.sofascore.fetchRecentResults(daysBack);
    const mapped = results
      .map(e => this.sofascore.toRawScore(e))
      .filter(Boolean);
    return { count: mapped.length, results: mapped };
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed all leagues, teams, and fixtures' })
  async seedAll() {
    const result = await this.dataIngestion.seedAll();
    return { message: 'Data ingestion complete', ...result };
  }

  @Post('seed-sample-games')
  @ApiOperation({
    summary: 'Seed sample historical games with results for ML training',
  })
  async seedSampleGames() {
    const result = await this.dataIngestion.seedSampleGamesForTraining();
    return { message: 'Sample games seeded', ...result };
  }

  @Post('cleanup-fixtures')
  @ApiOperation({ summary: 'Remove expired, duplicate, and double-booked fixtures' })
  async cleanupFixtures() {
    const result = await this.dataIngestion.cleanupFixtures();
    return { message: 'Fixture cleanup complete', ...result };
  }

  @Post('clear-games')
  @ApiOperation({ summary: 'Clear all games and predictions' })
  async clearGames() {
    try {
      const result = await this.dataIngestion.clearAllData();
      return { message: 'All data cleared', ...result };
    } catch (err) {
      this.logger.error('Clear games failed', err);
      throw err;
    }
  }

  @Post('result')
  @ApiOperation({ summary: 'Input a match result' })
  async inputResult(
    @Body()
    body: {
      homeTeam: string;
      awayTeam: string;
      leagueKey: string;
      homeScore: number;
      awayScore: number;
    },
  ) {
    const result = await this.resultInput.inputResult({
      homeTeam: body.homeTeam,
      awayTeam: body.awayTeam,
      leagueKey: body.leagueKey,
      homeScore: body.homeScore,
      awayScore: body.awayScore,
    });
    return { message: 'Result processed', ...result };
  }

  @Post('sync-teams')
  @ApiOperation({
    summary: 'Scrape and sync teams from ESPN + Football-Data.org',
  })
  async syncTeams() {
    const result = await this.teamScraper.syncAll();
    return { message: 'Team sync complete', ...result };
  }

  @Get('status')
  @ApiOperation({ summary: 'System data status overview' })
  async getStatus() {
    return {
      architecture: 'Zero external paid APIs — SofaScore scraping only',
      leagues: '50+ (EPL, La Liga, Bundesliga, Serie A, Ligue 1, Champions League, PSL, MLS, NBA, etc.)',
      sports: ['soccer', 'basketball', 'tennis', 'ice-hockey'],
      dataSources: [
        'SofaScore (primary — fixtures, live scores, results)',
        'BBC Sport (EPL fallback)',
        'PSL Official (PSL fallback)',
      ],
      predictionEngine: {
        ensemble: '6-model weighted ensemble',
        models: ['ELO', 'Form', 'OddsImplied (Synthetic)', 'Poisson/Dixon-Coles', 'H2H', 'ML (XGBoost)'],
        goalsModel: 'Team-specific Poisson with attack/defense ratings',
        calibration: 'Dynamic per-sport weight adaptation from historical accuracy',
      },
    };
  }
}
