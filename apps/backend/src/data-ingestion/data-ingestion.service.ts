import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TeamEntity } from '../infrastructure/persistence/entities/team.orm-entity';
import { GameEntity } from '../infrastructure/persistence/entities/game.orm-entity';
import { SportEntity } from '../infrastructure/persistence/entities/sport.orm-entity';
import { PredictionEntity } from '../infrastructure/persistence/entities/prediction.orm-entity';
import { BetEntity } from '../infrastructure/persistence/entities/bet.orm-entity';
import { ALL_LEAGUES } from './league.config';
import { TEAM_SEEDS } from './team.seeds';
import { FIXTURE_SEEDS } from './fixture.seeds';
import {
  getSportCategory,
  SportCategory,
} from '@sports-prediction-engine/shared-types';
import { EloRating } from '../domain/value-objects/elo-rating.vo';
import { EspnScraperService } from './espn-scraper.service';

/**
 * Data Ingestion Service
 *
 * Seeds the database with teams, leagues, and fixtures.
 * Zero external API dependency — all data is owned by us.
 */
@Injectable()
export class DataIngestionService implements OnModuleInit {
  private readonly logger = new Logger(DataIngestionService.name);

  constructor(
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
    @InjectRepository(GameEntity)
    private readonly gameRepo: Repository<GameEntity>,
    @InjectRepository(SportEntity)
    private readonly sportRepo: Repository<SportEntity>,
    @InjectRepository(PredictionEntity)
    private readonly predictionRepo: Repository<PredictionEntity>,
    @InjectRepository(BetEntity)
    private readonly betRepo: Repository<BetEntity>,
    private readonly espnScraper: EspnScraperService,
  ) {}

  async onModuleInit() {
    try {
      // Always clean up stale/duplicate data on startup
      await this.cleanupFixtures();

      const existingGames = await this.gameRepo.count();
      if (existingGames === 0) {
        this.logger.log('No games in database, trying ESPN sync first...');

        // Seed sports and teams first (ESPN needs them for matching)
        await this.seedSports();
        await this.seedTeams();

        // Try ESPN for real fixtures
        const espnResult = await this.espnScraper.syncUpcomingFixtures(14).catch(err => {
          this.logger.warn(`ESPN startup sync failed: ${err.message}`);
          return { found: 0, saved: 0, sports: [] as string[] };
        });

        if (espnResult.saved > 0) {
          this.logger.log(`ESPN startup sync: ${espnResult.saved} real fixtures loaded`);
        } else {
          // Fall back to seed fixtures only if ESPN returned nothing
          this.logger.log('ESPN returned no fixtures, falling back to seed data...');
          await this.seedFixtures();
        }
      } else {
        this.logger.log(
          `Found ${existingGames} existing games, skipping auto-seed`,
        );
      }
    } catch (error) {
      this.logger.log('Could not check existing games, running seed...');
      await this.seedAll();
    }
  }

  /**
   * Clear all games and predictions (keep teams and sports)
   */
  async clearAllData(): Promise<{
    gamesDeleted: number;
    predictionsDeleted: number;
  }> {
    this.logger.log('Starting clear all data...');
    try {
      const predCount = await this.predictionRepo.count();
      const gameCount = await this.gameRepo.count();

      // Delete in FK order: bets → predictions → games
      const betResult = await this.betRepo.createQueryBuilder().delete().execute();
      this.logger.log(`Deleted ${betResult.affected} bets`);
      const predResult = await this.predictionRepo.createQueryBuilder().delete().execute();
      this.logger.log(`Deleted ${predResult.affected} predictions`);
      const gameResult = await this.gameRepo.createQueryBuilder().delete().execute();
      this.logger.log(`Deleted ${gameResult.affected} games`);

      return {
        gamesDeleted: gameResult.affected || 0,
        predictionsDeleted: predResult.affected || 0,
      };
    } catch (error) {
      this.logger.error('clearAllData failed:', error?.message || error);
      throw error;
    }
  }

  /**
   * Seed sample historical games with results for ML training
   */
  async seedSampleGamesForTraining(): Promise<{ gamesCreated: number }> {
    const PSL_TEAMS = [
      { name: 'Mamelodi Sundowns', elo: 1800 },
      { name: 'Orlando Pirates', elo: 1650 },
      { name: 'Kaizer Chiefs', elo: 1630 },
      { name: 'Cape Town City', elo: 1570 },
      { name: 'Stellenbosch', elo: 1580 },
      { name: 'SuperSport United', elo: 1560 },
      { name: 'AmaZulu', elo: 1540 },
      { name: 'Golden Arrows', elo: 1510 },
      { name: 'Chippa United', elo: 1480 },
      { name: 'Polokwane City', elo: 1470 },
      { name: 'Richards Bay', elo: 1490 },
      { name: 'Royal AM', elo: 1500 },
      { name: 'Sekhukhune United', elo: 1520 },
      { name: 'Marumo Gallants', elo: 1480 },
      { name: 'Moroka Swallows', elo: 1500 },
      { name: 'TS Galaxy', elo: 1500 },
    ];

    let count = 0;
    const now = new Date();

    // Create 80 COMPLETED games (past dates)
    for (let i = 0; i < 80; i++) {
      const homeTeam = PSL_TEAMS[Math.floor(Math.random() * PSL_TEAMS.length)];
      let awayTeam = PSL_TEAMS[Math.floor(Math.random() * PSL_TEAMS.length)];
      while (awayTeam.name === homeTeam.name) {
        awayTeam = PSL_TEAMS[Math.floor(Math.random() * PSL_TEAMS.length)];
      }

      const homeScore = Math.floor(Math.random() * 4);
      const awayScore = Math.floor(Math.random() * 3);

      // Past dates going back up to 8 weeks
      const daysAgo = Math.floor(Math.random() * 56);
      const matchDate = new Date(now);
      matchDate.setDate(matchDate.getDate() - daysAgo);
      matchDate.setHours(15, 0, 0, 0);

      const externalId = `train_psl_${homeTeam.name}_${awayTeam.name}_${matchDate.toISOString().split('T')[0]}_${i}`;

      let homeTeamEntity = await this.teamRepo.findOne({
        where: { name: homeTeam.name, sportKey: 'soccer_south_africa_psl' },
      });
      let awayTeamEntity = await this.teamRepo.findOne({
        where: { name: awayTeam.name, sportKey: 'soccer_south_africa_psl' },
      });

      if (!homeTeamEntity) {
        homeTeamEntity = await this.teamRepo.save({
          id: uuidv4(),
          name: homeTeam.name,
          sportKey: 'soccer_south_africa_psl',
          eloRating: homeTeam.elo,
        });
      }
      if (!awayTeamEntity) {
        awayTeamEntity = await this.teamRepo.save({
          id: uuidv4(),
          name: awayTeam.name,
          sportKey: 'soccer_south_africa_psl',
          eloRating: awayTeam.elo,
        });
      }

      const existing = await this.gameRepo.findOne({ where: { externalId } });
      if (!existing) {
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

    this.logger.log(`Seeded ${count} training games`);
    return { gamesCreated: count };
  }

  /**
   * Full seed: sports → teams → fixtures
   */
  async seedAll(): Promise<{
    sports: number;
    teams: number;
    fixtures: number;
  }> {
    const sports = await this.seedSports();
    const teams = await this.seedTeams();
    const fixtures = await this.seedFixtures();

    this.logger.log(
      `Data ingestion complete: ${sports} sports, ${teams} teams, ${fixtures} fixtures`,
    );
    return { sports, teams, fixtures };
  }

  /**
   * Cleanup stale and duplicate fixtures on startup.
   * 1. Remove past uncompleted fixtures (stale seeds that never got results)
   * 2. Remove duplicate fixtures (same home+away team, keep the one with best externalId)
   * 3. Remove double-bookings (team playing twice on same day, keep earliest created)
   */
  async cleanupFixtures(): Promise<{ expired: number; duplicates: number; doubleBookings: number }> {
    let expired = 0;
    let duplicates = 0;
    let doubleBookings = 0;

    // 1. Mark past uncompleted seed/scraped fixtures as expired
    const now = new Date();
    const pastGames = await this.gameRepo.createQueryBuilder('game')
      .where('game.completed = false')
      .andWhere('game.commenceTime < :now', { now })
      .andWhere("game.status NOT IN ('in_progress', 'finished')")
      .getMany();

    for (const game of pastGames) {
      await this.predictionRepo.delete({ gameId: game.id });
      await this.gameRepo.remove(game);
      expired++;
    }

    // 2. Remove duplicate fixtures (same home+away team combo, both uncompleted)
    const upcomingGames = await this.gameRepo.find({
      where: { completed: false },
      relations: ['homeTeam', 'awayTeam'],
      order: { commenceTime: 'ASC' },
    });

    const seen = new Map<string, GameEntity>();
    for (const game of upcomingGames) {
      if (!game.homeTeam || !game.awayTeam) continue;
      const key = `${game.sportKey}_${game.homeTeamId}_${game.awayTeamId}`;
      const existing = seen.get(key);
      if (existing) {
        // Keep the one with the best externalId source: espn > sofascore > scraper > seed
        const idPriority = (id: string) => id.startsWith('espn_') ? 3 : id.startsWith('sofascore_') ? 2 : id.startsWith('scraper_') ? 1 : 0;
        const keepExisting = idPriority(existing.externalId) >= idPriority(game.externalId);
        const toRemove = keepExisting ? game : existing;
        if (!keepExisting) seen.set(key, game);

        // Delete associated predictions first
        await this.predictionRepo.delete({ gameId: toRemove.id });
        await this.gameRepo.remove(toRemove);
        duplicates++;
      } else {
        seen.set(key, game);
      }
    }

    // 3. Remove double-bookings (team scheduled twice on same day in same league)
    const remainingGames = await this.gameRepo.find({
      where: { completed: false },
      relations: ['homeTeam', 'awayTeam'],
      order: { commenceTime: 'ASC' },
    });

    const teamDayMap = new Map<string, GameEntity>();
    for (const game of remainingGames) {
      if (!game.homeTeam || !game.awayTeam) continue;
      const day = game.commenceTime.toISOString().split('T')[0];

      for (const teamId of [game.homeTeamId, game.awayTeamId]) {
        const dayKey = `${game.sportKey}_${teamId}_${day}`;
        const existingGame = teamDayMap.get(dayKey);
        if (existingGame && existingGame.id !== game.id) {
          // Team already has a game this day — remove the later-inserted one
          await this.predictionRepo.delete({ gameId: game.id });
          await this.gameRepo.remove(game);
          doubleBookings++;
          break;
        }
        teamDayMap.set(dayKey, game);
      }
    }

    if (expired + duplicates + doubleBookings > 0) {
      this.logger.log(
        `Fixture cleanup: ${expired} expired, ${duplicates} duplicates, ${doubleBookings} double-bookings removed`,
      );
    }

    return { expired, duplicates, doubleBookings };
  }

  /**
   * Seed league/sport entries from our config.
   */
  private async seedSports(): Promise<number> {
    let count = 0;
    for (const league of ALL_LEAGUES.filter(
      (l) =>
        l.priority === 'core' ||
        l.priority === 'major' ||
        l.key === 'soccer_south_africa_psl',
    )) {
      const existing = await this.sportRepo.findOne({
        where: { key: league.key },
      });
      if (!existing) {
        const category =
          league.category === 'THREE_WAY'
            ? SportCategory.THREE_WAY
            : league.category === 'TWO_WAY'
              ? SportCategory.TWO_WAY
              : SportCategory.HEAD_TO_HEAD;

        const group =
          league.sport === 'soccer'
            ? 'Soccer'
            : league.sport === 'rugby'
              ? 'Rugby'
              : league.sport === 'tennis'
                ? 'Tennis'
                : league.sport;

        await this.sportRepo.save({
          id: uuidv4(),
          key: league.key,
          group,
          title: league.name,
          description: `${league.name} — ${league.country}`,
          active: true,
          hasOutrights: false,
          category,
          lastSyncedAt: new Date(),
        });
        count++;
      }
    }
    if (count > 0) {
      this.logger.log(`Seeded ${count} sports`);
    }
    return count;
  }

  /**
   * Seed teams with ELO ratings from our seed data.
   * Only inserts teams that don't already exist.
   */
  private async seedTeams(): Promise<number> {
    let count = 0;
    for (const seed of TEAM_SEEDS) {
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
      } else if (Math.abs(existing.eloRating - 1500) < 5) {
        // Update teams still at default rating
        await this.teamRepo.update(existing.id, { eloRating: seed.elo });
        count++;
      }
    }
    if (count > 0) {
      this.logger.log(`Seeded/updated ${count} teams`);
    }
    return count;
  }

  /**
   * Seed upcoming fixtures.
   * Creates games with commenceTime but not completed.
   * Skips games that already exist.
   */
  private async seedFixtures(): Promise<number> {
    let count = 0;
    for (const seed of FIXTURE_SEEDS) {
      const externalId = `seed_${seed.leagueKey}_${seed.homeTeam}_${seed.awayTeam}_${seed.commenceTime}`;
      const existing = await this.gameRepo.findOne({ where: { externalId } });
      if (existing) continue;

      // Cross-source dedup: check if same teams already have an upcoming game
      // (from SofaScore or another scraper with a different externalId prefix)
      const homeTeamEntity = await this.teamRepo.findOne({
        where: { name: seed.homeTeam, sportKey: seed.leagueKey },
      });
      const awayTeamEntity = await this.teamRepo.findOne({
        where: { name: seed.awayTeam, sportKey: seed.leagueKey },
      });
      if (homeTeamEntity && awayTeamEntity) {
        const crossSourceDup = await this.gameRepo.createQueryBuilder('game')
          .where('game.sportKey = :sportKey', { sportKey: seed.leagueKey })
          .andWhere('game.completed = false')
          .andWhere('game.homeTeamId = :homeId', { homeId: homeTeamEntity.id })
          .andWhere('game.awayTeamId = :awayId', { awayId: awayTeamEntity.id })
          .getOne();
        if (crossSourceDup) continue;

        // Team-per-day constraint: prevent a team playing twice on the same day
        const matchDate = new Date(seed.commenceTime).toISOString().split('T')[0];
        const dayStart = new Date(`${matchDate}T00:00:00Z`);
        const dayEnd = new Date(`${matchDate}T23:59:59Z`);
        const teamAlreadyPlaying = await this.gameRepo.createQueryBuilder('game')
          .where('game.sportKey = :sportKey', { sportKey: seed.leagueKey })
          .andWhere('game.completed = false')
          .andWhere('game.commenceTime >= :dayStart', { dayStart })
          .andWhere('game.commenceTime <= :dayEnd', { dayEnd })
          .andWhere(
            '(game.homeTeamId = :homeId OR game.awayTeamId = :homeId OR game.homeTeamId = :awayId OR game.awayTeamId = :awayId)',
            { homeId: homeTeamEntity.id, awayId: awayTeamEntity.id },
          )
          .getOne();
        if (teamAlreadyPlaying) continue;
      }

      // Check if we've already seeded a fixture with the same date slot
      const dateMatch = await this.gameRepo.findOne({
        where: {
          sportKey: seed.leagueKey,
          commenceTime: new Date(seed.commenceTime),
        },
        relations: ['homeTeam', 'awayTeam'],
      });
      if (dateMatch) continue;

      const homeTeam = await this.teamRepo.findOne({
        where: { name: seed.homeTeam, sportKey: seed.leagueKey },
      });
      const awayTeam = await this.teamRepo.findOne({
        where: { name: seed.awayTeam, sportKey: seed.leagueKey },
      });

      if (!homeTeam || !awayTeam) {
        this.logger.warn(
          `Missing team for fixture: ${seed.homeTeam} vs ${seed.awayTeam} in ${seed.leagueKey}`,
        );
        continue;
      }

      const sport = await this.sportRepo.findOne({
        where: { key: seed.leagueKey },
      });
      const category = sport?.category || SportCategory.THREE_WAY;
      const group = sport?.group || 'Soccer';

      await this.gameRepo.save({
        id: uuidv4(),
        externalId,
        sportKey: seed.leagueKey,
        sportTitle:
          ALL_LEAGUES.find((l) => l.key === seed.leagueKey)?.name ||
          seed.leagueKey,
        sportGroup: group,
        sportCategory: category,
        homeTeamId: homeTeam.id,
        homeTeam,
        awayTeamId: awayTeam.id,
        awayTeam,
        commenceTime: new Date(seed.commenceTime),
        completed: false,
        homeScore: null,
        awayScore: null,
        status: 'scheduled',
      });
      count++;
    }
    if (count > 0) {
      this.logger.log(`Seeded ${count} fixtures`);
    }
    return count;
  }
}
