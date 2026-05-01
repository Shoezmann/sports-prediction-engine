import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { PslHistoricalScraper } from './psl-historical-scraper.service';
import { HistoricalDataImporter } from './historical-data-importer.service';
import { PslDataIngestionService } from './psl-data-ingestion.service';
import { PslDataIngestionController } from './psl-data-ingestion.controller';
import { PslHistoricalDataSeeder } from './psl-historical-data-seeder.service';
import { GameEntity } from '../../infrastructure/persistence/entities/game.orm-entity';
import { TeamEntity } from '../../infrastructure/persistence/entities/team.orm-entity';
import { SportEntity } from '../../infrastructure/persistence/entities/sport.orm-entity';
import { MatchStatisticsEntity } from '../../infrastructure/persistence/entities/match-statistics.orm-entity';
import { PlayerEntity } from '../../infrastructure/persistence/entities/player.orm-entity';
import { CoachEntity } from '../../infrastructure/persistence/entities/coach.orm-entity';

/**
 * PSL Data Ingestion Module
 *
 * Dedicated module for South African PSL data collection and historical imports.
 * Handles:
 * - Historical data scraping from FlashScore (1996-today)
 * - Bulk CSV/JSON imports
 * - Team synchronization across all PSL tournaments
 * - Automated result fetching for PSL and cup competitions
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      GameEntity,
      TeamEntity,
      SportEntity,
      MatchStatisticsEntity,
      PlayerEntity,
      CoachEntity,
    ]),
    ScheduleModule.forRoot(),
    HttpModule.register({ timeout: 15000 }),
  ],
  providers: [
    PslHistoricalScraper,
    HistoricalDataImporter,
    PslDataIngestionService,
    PslHistoricalDataSeeder,
  ],
  controllers: [PslDataIngestionController],
  exports: [
    PslHistoricalScraper,
    HistoricalDataImporter,
    PslDataIngestionService,
    PslHistoricalDataSeeder,
  ],
})
export class PslDataIngestionModule {}
