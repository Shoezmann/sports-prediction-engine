import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { GameEntity } from '../../infrastructure/persistence/entities/game.orm-entity';
import { TeamEntity } from '../../infrastructure/persistence/entities/team.orm-entity';
import { SportEntity } from '../../infrastructure/persistence/entities/sport.orm-entity';
import { MatchStatisticsEntity } from '../../infrastructure/persistence/entities/match-statistics.orm-entity';
import { SportCategory } from '@sports-prediction-engine/shared-types';
import { PSL_TEAM_ALIASES } from './psl-historical-teams.seeds';

/**
 * Historical Match Data Format
 * 
 * This interface defines the expected format for bulk historical data imports.
 * Data can be provided as JSON files or CSV files.
 */
export interface HistoricalMatchImport {
  date: string; // ISO date or "YYYY-MM-DD"
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  htHomeScore?: number; // Half-time score
  htAwayScore?: number;
  season: string; // e.g., "1996/1997"
  round?: string; // e.g., "Round 1", "Matchday 15"
  venue?: string;
  attendance?: number;
  referee?: string;
  
  // Optional match statistics
  stats?: {
    homeXg?: number;
    awayXg?: number;
    homeShots?: number;
    awayShots?: number;
    homeShotsOnTarget?: number;
    awayShotsOnTarget?: number;
    homePossession?: number;
    awayPossession?: number;
    homeCorners?: number;
    awayCorners?: number;
    homeFouls?: number;
    awayFouls?: number;
    homeYellowCards?: number;
    awayYellowCards?: number;
    homeRedCards?: number;
    awayRedCards?: number;
    homePasses?: number;
    awayPasses?: number;
    homePassAccuracy?: number;
    awayPassAccuracy?: number;
  };
}

/**
 * Import result summary
 */
export interface ImportResult {
  totalRows: number;
  successfulImports: number;
  skippedDuplicates: number;
  failedImports: number;
  teamsCreated: number;
  statisticsCreated: number;
  errors: string[];
}

@Injectable()
export class HistoricalDataImporter {
  private readonly logger = new Logger(HistoricalDataImporter.name);

  constructor(
    @InjectRepository(GameEntity)
    private readonly gameRepo: Repository<GameEntity>,
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
    @InjectRepository(SportEntity)
    private readonly sportRepo: Repository<SportEntity>,
    @InjectRepository(MatchStatisticsEntity)
    private readonly statsRepo: Repository<MatchStatisticsEntity>,
  ) {}

  /**
   * Import historical data from a JSON file
   */
  async importFromJson(filePath: string): Promise<ImportResult> {
    this.logger.log(`Importing historical data from: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const matches: HistoricalMatchImport[] = JSON.parse(fileContent);

    return this.processMatches(matches);
  }

  /**
   * Import historical data from a CSV file
   */
  async importFromCsv(filePath: string): Promise<ImportResult> {
    this.logger.log(`Importing historical data from CSV: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const matches = this.parseCsv(fileContent);

    return this.processMatches(matches);
  }

  /**
   * Process an array of match imports
   */
  async processMatches(matches: HistoricalMatchImport[]): Promise<ImportResult> {
    const result: ImportResult = {
      totalRows: matches.length,
      successfulImports: 0,
      skippedDuplicates: 0,
      failedImports: 0,
      teamsCreated: 0,
      statisticsCreated: 0,
      errors: [],
    };

    this.logger.log(`Processing ${matches.length} matches...`);

    for (const match of matches) {
      try {
        const processed = await this.processSingleMatch(match);
        
        if (processed === 'success') {
          result.successfulImports++;
        } else if (processed === 'duplicate') {
          result.skippedDuplicates++;
        }
      } catch (error) {
        result.failedImports++;
        const errorMsg = `Failed to import: ${match.homeTeam} vs ${match.awayTeam} (${match.date}): ${error.message}`;
        result.errors.push(errorMsg);
        this.logger.error(errorMsg);
      }
    }

    this.logger.log(
      `Import complete: ${result.successfulImports} imported, ${result.skippedDuplicates} duplicates skipped, ${result.failedImports} failed`,
    );

    return result;
  }

  /**
   * Process a single match import
   */
  private async processSingleMatch(
    match: HistoricalMatchImport,
  ): Promise<'success' | 'duplicate'> {
    // Resolve team names
    const homeTeamName = this.resolveTeamName(match.homeTeam);
    const awayTeamName = this.resolveTeamName(match.awayTeam);

    if (!homeTeamName || !awayTeamName) {
      throw new Error(
        `Could not resolve team names: ${match.homeTeam} vs ${match.awayTeam}`,
      );
    }

    // Ensure teams exist in database
    const homeTeam = await this.ensureTeamExists(homeTeamName);
    const awayTeam = await this.ensureTeamExists(awayTeamName);

    // Generate unique external ID
    const matchDate = new Date(match.date);
    const externalId = `psl_hist_${homeTeamName}_${awayTeamName}_${matchDate.toISOString().split('T')[0]}`;

    // Check for duplicates
    const existing = await this.gameRepo.findOne({ where: { externalId } });
    if (existing) {
      return 'duplicate';
    }

    // Ensure sport exists
    const sport = await this.ensureSportExists();

    // Create game entity
    const game = await this.gameRepo.save({
      id: uuidv4(),
      externalId,
      sportKey: 'soccer_south_africa_psl',
      sportTitle: 'PSL',
      sportGroup: 'Soccer',
      sportCategory: SportCategory.THREE_WAY,
      homeTeamId: homeTeam.id,
      homeTeam,
      awayTeamId: awayTeam.id,
      awayTeam,
      commenceTime: matchDate,
      completed: true,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      status: 'finished',
    });

    // Create match statistics if available
    if (match.stats) {
      await this.statsRepo.save({
        id: uuidv4(),
        gameId: game.id,
        game,
        homeGoals: match.homeScore,
        awayGoals: match.awayScore,
        homeXg: match.stats.homeXg ?? null,
        awayXg: match.stats.awayXg ?? null,
        homeShots: match.stats.homeShots ?? null,
        awayShots: match.stats.awayShots ?? null,
        homeShotsOnTarget: match.stats.homeShotsOnTarget ?? null,
        awayShotsOnTarget: match.stats.awayShotsOnTarget ?? null,
        homePossession: match.stats.homePossession ?? null,
        awayPossession: match.stats.awayPossession ?? null,
        homeCorners: match.stats.homeCorners ?? null,
        awayCorners: match.stats.awayCorners ?? null,
        homeFouls: match.stats.homeFouls ?? null,
        awayFouls: match.stats.awayFouls ?? null,
        homeYellowCards: match.stats.homeYellowCards ?? null,
        awayYellowCards: match.stats.awayYellowCards ?? null,
        homeRedCards: match.stats.homeRedCards ?? null,
        awayRedCards: match.stats.awayRedCards ?? null,
        homePasses: match.stats.homePasses ?? null,
        awayPasses: match.stats.awayPasses ?? null,
        homePassAccuracy: match.stats.homePassAccuracy ?? null,
        awayPassAccuracy: match.stats.awayPassAccuracy ?? null,
        venue: match.venue ?? null,
        attendance: match.attendance ?? null,
        referee: match.referee ?? null,
        round: match.round ?? null,
      });
    }

    return 'success';
  }

  /**
   * Ensure a team exists in the database, create if not
   */
  private async ensureTeamExists(teamName: string): Promise<TeamEntity> {
    let team = await this.teamRepo.findOne({
      where: { name: teamName, sportKey: 'soccer_south_africa_psl' },
    });

    if (!team) {
      team = await this.teamRepo.save({
        id: uuidv4(),
        name: teamName,
        sportKey: 'soccer_south_africa_psl',
        shortName: null,
        eloRating: 1500,
      });
    }

    return team;
  }

  /**
   * Ensure PSL sport entry exists
   */
  private async ensureSportExists(): Promise<SportEntity> {
    let sport = await this.sportRepo.findOne({
      where: { key: 'soccer_south_africa_psl' },
    });

    if (!sport) {
      sport = await this.sportRepo.save({
        id: uuidv4(),
        key: 'soccer_south_africa_psl',
        group: 'Soccer',
        title: 'PSL',
        description: 'Premier Soccer League - South Africa',
        active: true,
        hasOutrights: false,
        category: SportCategory.THREE_WAY,
        lastSyncedAt: new Date(),
      });
    }

    return sport;
  }

  /**
   * Resolve team name from various sources to canonical name
   */
  private resolveTeamName(name: string): string | null {
    if (!name || name === 'Unknown' || name === 'TBD') {
      return null;
    }

    // Check direct alias
    const resolved = PSL_TEAM_ALIASES[name];
    if (resolved) {
      return resolved;
    }

    // Try fuzzy match (lowercase, strip FC, United, etc.)
    const normalized = name
      .toLowerCase()
      .replace(/\s*(fc|sc|ac|us|rc|cf|ec)\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    for (const [alias, canonical] of Object.entries(PSL_TEAM_ALIASES)) {
      const normalizedAlias = alias
        .toLowerCase()
        .replace(/\s*(fc|sc|ac|us|rc|cf|ec)\s*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (normalizedAlias === normalized) {
        return canonical as string;
      }
    }

    // Return original if no match found
    return name;
  }

  /**
   * Simple CSV parser
   * Expects headers: date,homeTeam,awayTeam,homeScore,awayScore,htHomeScore,htAwayScore,season,round,venue,attendance
   */
  private parseCsv(csvContent: string): HistoricalMatchImport[] {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const matches: HistoricalMatchImport[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length < 6) continue;

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      matches.push({
        date: row.date,
        homeTeam: row.homeTeam,
        awayTeam: row.awayTeam,
        homeScore: parseInt(row.homeScore, 10),
        awayScore: parseInt(row.awayScore, 10),
        htHomeScore: row.htHomeScore ? parseInt(row.htHomeScore, 10) : undefined,
        htAwayScore: row.htAwayScore ? parseInt(row.htAwayScore, 10) : undefined,
        season: row.season,
        round: row.round || undefined,
        venue: row.venue || undefined,
        attendance: row.attendance ? parseInt(row.attendance, 10) : undefined,
        referee: row.referee || undefined,
      });
    }

    return matches;
  }

  /**
   * Import all JSON files from a directory
   */
  async importFromDirectory(directoryPath: string): Promise<ImportResult> {
    this.logger.log(`Importing from directory: ${directoryPath}`);

    const files = fs.readdirSync(directoryPath).filter(f => f.endsWith('.json'));
    
    const combinedResult: ImportResult = {
      totalRows: 0,
      successfulImports: 0,
      skippedDuplicates: 0,
      failedImports: 0,
      teamsCreated: 0,
      statisticsCreated: 0,
      errors: [],
    };

    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const result = await this.importFromJson(filePath);
      
      combinedResult.totalRows += result.totalRows;
      combinedResult.successfulImports += result.successfulImports;
      combinedResult.skippedDuplicates += result.skippedDuplicates;
      combinedResult.failedImports += result.failedImports;
      combinedResult.teamsCreated += result.teamsCreated;
      combinedResult.statisticsCreated += result.statisticsCreated;
      combinedResult.errors.push(...result.errors);
    }

    return combinedResult;
  }
}
