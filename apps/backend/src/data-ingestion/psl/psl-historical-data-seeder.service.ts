/**
 * PSL Historical Data Seeder
 *
 * Seeds comprehensive historical data for PSL from 1996 to 2026.
 * This includes:
 * - All historical teams
 * - Sample historical matches (to be replaced with real data imports)
 * - Tournament configurations
 *
 * Run this script to initialize the database with baseline PSL data.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TeamEntity } from '../../infrastructure/persistence/entities/team.orm-entity';
import { GameEntity } from '../../infrastructure/persistence/entities/game.orm-entity';
import { SportEntity } from '../../infrastructure/persistence/entities/sport.orm-entity';
import { SportCategory } from '@sports-prediction-engine/shared-types';
import { PSL_HISTORICAL_TEAMS, PSL_SEASONS, SA_TOURNAMENTS } from './psl-historical-teams.seeds';

@Injectable()
export class PslHistoricalDataSeeder implements OnModuleInit {
  private readonly logger = new Logger(PslHistoricalDataSeeder.name);

  constructor(
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
    @InjectRepository(GameEntity)
    private readonly gameRepo: Repository<GameEntity>,
    @InjectRepository(SportEntity)
    private readonly sportRepo: Repository<SportEntity>,
  ) {}

  async onModuleInit() {
    // Auto-seed on startup in development mode
    if (process.env.NODE_ENV === 'development') {
      await this.seedAllPslData();
    }
  }

  /**
   * Seed all PSL historical data
   */
  async seedAllPslData(): Promise<{
    teams: number;
    tournaments: number;
    sports: number;
  }> {
    this.logger.log('Starting PSL historical data seeding...');

    const teams = await this.seedHistoricalTeams();
    const tournaments = await this.seedTournaments();
    const sports = await this.seedSportEntries();

    this.logger.log(
      `PSL data seeding complete: ${teams} teams, ${tournaments} tournaments, ${sports} sport entries`,
    );

    return { teams, tournaments, sports };
  }

  /**
   * Seed all historical PSL teams
   */
  private async seedHistoricalTeams(): Promise<number> {
    let count = 0;

    for (const seed of PSL_HISTORICAL_TEAMS) {
      const existing = await this.teamRepo.findOne({
        where: { name: seed.name, sportKey: seed.leagueKey },
      });

      if (!existing) {
        await this.teamRepo.save({
          id: uuidv4(),
          name: seed.name,
          sportKey: seed.leagueKey,
          shortName: seed.shortName ?? null,
          eloRating: seed.elo,
        });
        count++;
        this.logger.debug(`Seeded team: ${seed.name}`);
      }
    }

    if (count > 0) {
      this.logger.log(`Seeded ${count} PSL teams`);
    }

    return count;
  }

  /**
   * Seed tournament configurations
   */
  private async seedTournaments(): Promise<number> {
    let count = 0;

    for (const [key, tournament] of Object.entries(SA_TOURNAMENTS)) {
      const existing = await this.sportRepo.findOne({
        where: { key: tournament.key },
      });

      if (!existing) {
        await this.sportRepo.save({
          id: uuidv4(),
          key: tournament.key,
          group: 'Soccer',
          title: tournament.name,
          description: `${tournament.name} - ${tournament.country}`,
          active: true,
          hasOutrights: false,
          category: SportCategory.THREE_WAY,
          lastSyncedAt: new Date(),
        });
        count++;
        this.logger.debug(`Seeded tournament: ${tournament.name}`);
      }
    }

    if (count > 0) {
      this.logger.log(`Seeded ${count} tournaments`);
    }

    return count;
  }

  /**
   * Seed sport entries for all PSL tournaments
   */
  private async seedSportEntries(): Promise<number> {
    // This is already covered by seedTournaments
    return 0;
  }

  /**
   * Generate sample historical matches for testing
   * This creates placeholder data - real data should be imported via the HistoricalDataImporter
   */
  async generateSampleMatches(seasonsToGenerate: number = 3): Promise<number> {
    this.logger.log(`Generating sample matches for last ${seasonsToGenerate} seasons...`);

    const recentSeasons = PSL_SEASONS.slice(-seasonsToGenerate);
    let count = 0;

    // Get active teams (teams that are not defunct or have no lastSeason)
    const activeTeams = PSL_HISTORICAL_TEAMS.filter(
      (t) => !t.defunct || !t.lastSeason,
    );

    for (const season of recentSeasons) {
      const [startYear] = season.split('/');
      const startYearNum = parseInt(startYear, 10);

      // Generate 15 teams for this season based on first/last season
      const seasonTeams = activeTeams.filter((t) => {
        if (t.firstSeason) {
          const firstYear = parseInt(t.firstSeason.split('/')[0], 10);
          if (firstYear > startYearNum) return false;
        }
        if (t.lastSeason) {
          const lastYear = parseInt(t.lastSeason.split('/')[0], 10);
          if (lastYear < startYearNum) return false;
        }
        return true;
      }).slice(0, 16); // PSL typically has 16 teams

      if (seasonTeams.length < 4) continue;

      // Generate 30 matchdays (typical PSL season)
      for (let matchday = 1; matchday <= 30; matchday++) {
        // Generate 8 matches per matchday
        for (let matchIndex = 0; matchIndex < 8; matchIndex++) {
          const homeTeam = seasonTeams[matchIndex % seasonTeams.length];
          const awayTeam = seasonTeams[(matchIndex + 8) % seasonTeams.length];

          if (homeTeam.name === awayTeam.name) continue;

          // Generate random score
          const homeScore = Math.floor(Math.random() * 4);
          const awayScore = Math.floor(Math.random() * 3);

          // Generate match date (spread across season)
          const matchMonth = 8 + Math.floor((matchday - 1) / 4); // August to May
          const matchDay = 10 + ((matchday - 1) % 4) * 7;
          const matchDate = new Date(startYearNum, matchMonth - 1, Math.min(matchDay, 28));

          const externalId = `sample_psl_${homeTeam.name}_${awayTeam.name}_${matchDate.toISOString().split('T')[0]}`;

          // Check if already exists
          const existing = await this.gameRepo.findOne({ where: { externalId } });
          if (existing) continue;

          // Get teams
          const homeTeamEntity = await this.teamRepo.findOne({
            where: { name: homeTeam.name, sportKey: 'soccer_south_africa_psl' },
          });
          const awayTeamEntity = await this.teamRepo.findOne({
            where: { name: awayTeam.name, sportKey: 'soccer_south_africa_psl' },
          });

          if (!homeTeamEntity || !awayTeamEntity) continue;

          await this.gameRepo.save({
            id: uuidv4(),
            externalId,
            sportKey: 'soccer_south_africa_psl',
            sportTitle: 'PSL',
            sportGroup: 'Soccer',
            sportCategory: SportCategory.THREE_WAY,
            homeTeamId: homeTeamEntity.id,
            homeTeam: homeTeamEntity,
            awayTeamId: awayTeamEntity.id,
            awayTeam: awayTeamEntity,
            commenceTime: matchDate,
            completed: true,
            homeScore,
            awayScore,
            status: 'finished',
          });

          count++;
        }
      }
    }

    this.logger.log(`Generated ${count} sample matches`);
    return count;
  }
}
