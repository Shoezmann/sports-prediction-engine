import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { DataIngestionService } from './data-ingestion.service';
import { DirectWebScraperService } from './direct-web-scraper.service';
import { SofaScoreScraperService } from './sofascore-scraper.service';
import { ResultInputService } from './result-input.service';
import { AutoResultsService } from './auto-results.service';
import { ComprehensiveTeamScraper } from './comprehensive-team-scraper';
import { TeamMatchingService } from './team-matching.service';
import { EspnScraperService } from './espn-scraper.service';
import { OddsApiService } from './odds-api.service';
import { DataIngestionController } from './data-ingestion.controller';
import { TeamEntity } from '../infrastructure/persistence/entities/team.orm-entity';
import { GameEntity } from '../infrastructure/persistence/entities/game.orm-entity';
import { SportEntity } from '../infrastructure/persistence/entities/sport.orm-entity';
import { PredictionEntity } from '../infrastructure/persistence/entities/prediction.orm-entity';
import { BetEntity } from '../infrastructure/persistence/entities/bet.orm-entity';

/**
 * Data Ingestion Module
 *
 * Self-contained data pipeline — zero external API dependencies.
 * Primary data source: SofaScore (50+ leagues, free unofficial API).
 * Fallback: BBC Sport HTML scraping (EPL only).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeamEntity,
      GameEntity,
      SportEntity,
      PredictionEntity,
      BetEntity,
    ]),
    ScheduleModule.forRoot(),
    HttpModule.register({ timeout: 15_000 }),
  ],
  providers: [
    SofaScoreScraperService,
    EspnScraperService,
    OddsApiService,
    TeamMatchingService,
    DirectWebScraperService,
    DataIngestionService,
    ResultInputService,
    AutoResultsService,
    ComprehensiveTeamScraper,
  ],
  controllers: [DataIngestionController],
  exports: [
    SofaScoreScraperService,
    EspnScraperService,
    OddsApiService,
    DirectWebScraperService,
    DataIngestionService,
    ResultInputService,
    AutoResultsService,
    ComprehensiveTeamScraper,
    TeamMatchingService,
  ],
})
export class DataIngestionModule {}
