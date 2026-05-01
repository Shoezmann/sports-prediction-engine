import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { GameEntity } from '../../infrastructure/persistence/entities/game.orm-entity';
import { TeamEntity } from '../../infrastructure/persistence/entities/team.orm-entity';
import { SportEntity } from '../../infrastructure/persistence/entities/sport.orm-entity';
import { SportCategory } from '@sports-prediction-engine/shared-types';

/**
 * PSL Historical Data Scraper
 *
 * Scrapes historical match data from FlashScore and other free sources
 * for PSL from 1996 to present day.
 *
 * Target data points per match:
 * - Date, home team, away team, score
 * - Half-time score (when available)
 * - Cards, corners, possession (when available)
 * - Venue, attendance (when available)
 */

export interface HistoricalMatch {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  htHomeScore?: number;
  htAwayScore?: number;
  status: 'FINISHED';
  season: string; // e.g., "1996/1997"
  round?: string; // e.g., "Round 1", "Quarter-finals"
  venue?: string;
  attendance?: number;
}

/**
 * FlashScore tournament IDs for South African football
 * These IDs are used to query historical data
 */
const FLASHSCORE_TOURNAMENTS = {
  PSL: {
    sportId: 1, // Soccer
    tournamentId: 'Cz4qJqJb', // PSL tournament ID on FlashScore
    name: 'Premier Soccer League',
    country: 'South Africa',
  },
  Nedbank_Cup: {
    sportId: 1,
    tournamentId: 'lxGvJqJb',
    name: 'Nedbank Cup',
    country: 'South Africa',
  },
  MTN8: {
    sportId: 1,
    tournamentId: 'K8wMKqJb',
    name: 'MTN 8',
    country: 'South Africa',
  },
  Carling_Knockout: {
    sportId: 1,
    tournamentId: 'nZq8LqJb',
    name: 'Carling Knockout',
    country: 'South Africa',
  },
};

/**
 * Comprehensive PSL team aliases (1996-2026)
 * Maps all historical team name variants to canonical names
 */
const PSL_TEAM_ALIASES: Record<string, string> = {
  // Mamelodi Sundowns
  'Mamelodi Sundowns': 'Mamelodi Sundowns',
  'Mamelodi Sundowns FC': 'Mamelodi Sundowns',
  'Sundowns': 'Mamelodi Sundowns',

  // Orlando Pirates
  'Orlando Pirates': 'Orlando Pirates',
  'Orlando Pirates FC': 'Orlando Pirates',
  'Pirates': 'Orlando Pirates',

  // Kaizer Chiefs
  'Kaizer Chiefs': 'Kaizer Chiefs',
  'Kaizer Chiefs FC': 'Kaizer Chiefs',
  'Chiefs': 'Kaizer Chiefs',

  // SuperSport United
  'SuperSport United': 'SuperSport United',
  'SuperSport United FC': 'SuperSport United',
  'Supersport United': 'SuperSport United',
  'SuperSport': 'SuperSport United',

  // Cape Town City (old and new)
  'Cape Town City': 'Cape Town City',
  'Cape Town City FC': 'Cape Town City',
  'CT City': 'Cape Town City',

  // AmaZulu
  'AmaZulu': 'AmaZulu',
  'AmaZulu FC': 'AmaZulu',
  'Usuthu': 'AmaZulu',

  // Golden Arrows
  'Golden Arrows': 'Golden Arrows',
  'Lamontville Golden Arrows': 'Golden Arrows',
  'Golden Arrows FC': 'Golden Arrows',
  'Arrows': 'Golden Arrows',

  // Stellenbosch FC
  'Stellenbosch': 'Stellenbosch',
  'Stellenbosch FC': 'Stellenbosch',
  'Stellies': 'Stellenbosch',

  // Chippa United
  'Chippa United': 'Chippa United',
  'Chippa United FC': 'Chippa United',
  'Chippas': 'Chippa United',

  // Polokwane City
  'Polokwane City': 'Polokwane City',
  'Polokwane City FC': 'Polokwane City',
  'Bakgaga Ba Mphahlele': 'Polokwane City',

  // Bloemfontein Celtic (defunct)
  'Bloemfontein Celtic': 'Bloemfontein Celtic',
  'Bloem Celtic': 'Bloemfontein Celtic',
  'Celtic': 'Bloemfontein Celtic',
  'BFC': 'Bloemfontein Celtic',

  // Free State Stars
  'Free State Stars': 'Free State Stars',
  'FS Stars': 'Free State Stars',
  'Stars': 'Free State Stars',

  // Maritzburg United
  'Maritzburg United': 'Maritzburg United',
  'Maritzburg': 'Maritzburg United',
  'MUFC': 'Maritzburg United',

  // Platinum Stars (defunct - now TTM)
  'Platinum Stars': 'Platinum Stars',
  'Platinum': 'Platinum Stars',
  'Silver Stars': 'Platinum Stars',

  // TTM (took over Platinum Stars)
  'TTM': 'TTM',
  'Tshakhuma Tsha Madzivhadila': 'TTM',

  // Highlands Park (defunct)
  'Highlands Park': 'Highlands Park',
  'HP': 'Highlands Park',

  // Bidvest Wits (now University of Pretoria)
  'Bidvest Wits': 'Bidvest Wits',
  'Wits': 'Bidvest Wits',
  'Wits University': 'Bidvest Wits',

  // University of Pretoria
  'University of Pretoria': 'University of Pretoria',
  'AmaTuks': 'University of Pretoria',
  'Tuks': 'University of Pretoria',

  // Ajax Cape Town (now Cape Town Spurs)
  'Ajax Cape Town': 'Ajax Cape Town',
  'Ajax CT': 'Ajax Cape Town',
  'Cape Town Spurs': 'Cape Town Spurs',
  'CT Spurs': 'Cape Town Spurs',

  // Vasco da Gama (SA)
  'Vasco da Gama': 'Vasco da Gama',
  'Vasco': 'Vasco da Gama',

  // Bay United
  'Bay United': 'Bay United',

  // Mpumalanga Black Aces (defunct)
  'Mpumalanga Black Aces': 'Mpumalanga Black Aces',
  'Black Aces': 'Mpumalanga Black Aces',
  'Aces': 'Mpumalanga Black Aces',

  // Dynamos
  'Dynamos': 'Dynamos',

  // Jomo Cosmos
  'Jomo Cosmos': 'Jomo Cosmos',
  'Cosmos': 'Jomo Cosmos',

  // Moroka Swallows
  'Moroka Swallows': 'Moroka Swallows',
  'Swallows': 'Moroka Swallows',
  'Swallows FC': 'Moroka Swallows',

  // Marumo Gallants
  'Marumo Gallants': 'Marumo Gallants',
  'Gallants': 'Marumo Gallants',

  // Richards Bay
  'Richards Bay': 'Richards Bay',
  'Richards Bay FC': 'Richards Bay',
  'RBFC': 'Richards Bay',

  // Royal AM (took over Highlands Park)
  'Royal AM': 'Royal AM',
  'Royal AM FC': 'Royal AM',

  // TS Galaxy
  'TS Galaxy': 'TS Galaxy',
  'TS Galaxy FC': 'TS Galaxy',
  'Galaxy': 'TS Galaxy',

  // Sekhukhune United
  'Sekhukhune United': 'Sekhukhune United',
  'Sekhukhune United FC': 'Sekhukhune United',

  // Ubuntu Cape Town
  'Ubuntu Cape Town': 'Ubuntu Cape Town',

  // Cape Town All Stars
  'Cape Town All Stars': 'Cape Town All Stars',
  'All Stars': 'Cape Town All Stars',

  // Milford
  'Milford': 'Milford',
};

@Injectable()
export class PslHistoricalScraper {
  private readonly logger = new Logger(PslHistoricalScraper.name);
  private readonly FLASHSCORE_BASE = 'https://flashscore4.p.rapidapi.com/api/flashscore/v2';

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(GameEntity)
    private readonly gameRepo: Repository<GameEntity>,
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
    @InjectRepository(SportEntity)
    private readonly sportRepo: Repository<SportEntity>,
  ) {}

  /**
   * Scrape historical data for a specific season from FlashScore
   * Note: FlashScore API may have limitations for historical data
   * This method is designed to work with whatever the API provides
   */
  async scrapeSeason(season: string): Promise<{
    matches: number;
    teams: number;
    newMatches: number;
  }> {
    const apiKey = process.env.SCRAPER_RAPIDAPI_KEY;
    if (!apiKey || apiKey.includes('your_')) {
      this.logger.warn('SCRAPER_RAPIDAPI_KEY not configured, skipping FlashScore scrape');
      return { matches: 0, teams: 0, newMatches: 0 };
    }

    this.logger.log(`Scraping PSL season: ${season}`);

    try {
      // Try to get tournament data from FlashScore
      const tournament = FLASHSCORE_TOURNAMENTS.PSL;
      const matches = await this.fetchTournamentMatches(
        apiKey,
        tournament.sportId,
        tournament.tournamentId,
        season,
      );

      const teams = await this.extractTeams(matches);
      const newMatches = await this.saveHistoricalMatches(matches);

      this.logger.log(
        `Season ${season}: ${matches.length} matches, ${teams.length} teams, ${newMatches} new`,
      );

      return { matches: matches.length, teams: teams.length, newMatches };
    } catch (error) {
      this.logger.error(`Failed to scrape season ${season}: ${error.message}`);
      return { matches: 0, teams: 0, newMatches: 0 };
    }
  }

  /**
   * Fetch matches for a tournament from FlashScore
   */
  private async fetchTournamentMatches(
    apiKey: string,
    sportId: number,
    tournamentId: string,
    season: string,
  ): Promise<HistoricalMatch[]> {
    const matches: HistoricalMatch[] = [];

    try {
      // FlashScore v2 API endpoint for tournament fixtures
      const response = await firstValueFrom(
        this.httpService.get(`${this.FLASHSCORE_BASE}/tournaments/fixtures`, {
          params: {
            sport_id: sportId,
            tournament_id: tournamentId,
            season: season,
          },
          headers: {
            'x-rapidapi-key': apiKey,
            'x-rapidapi-host': 'flashscore4.p.rapidapi.com',
          },
          timeout: 15000,
        }),
      );

      const data = response.data as any;
      const rounds = data.rounds || data.events || [];

      for (const round of rounds) {
        const roundName = round.name || round.round || 'Unknown';
        const games = round.matches || round.events || [];

        for (const game of games) {
          const homeTeam = game.home_team || game.home || {};
          const awayTeam = game.away_team || game.away || {};
          const score = game.scores || {};
          const status = game.match_status || game.status || {};

          // Only include finished matches
          if (!status.is_finished && status.stage !== 'Finished') {
            continue;
          }

          const homeScore = score.home ?? score.home_total;
          const awayScore = score.away ?? score.away_total;

          // Skip if no score available
          if (homeScore === null || awayScore === null) {
            continue;
          }

          // Extract half-time scores if available
          const htHomeScore = score.home_period1 ?? score.home_1st_half;
          const htAwayScore = score.away_period1 ?? score.away_1st_half;

          const matchDate = game.start_time || game.timestamp || game.date;

          matches.push({
            date: new Date(matchDate * 1000).toISOString(),
            homeTeam: homeTeam.name || 'Unknown',
            awayTeam: awayTeam.name || 'Unknown',
            homeScore: parseInt(homeScore, 10),
            awayScore: parseInt(awayScore, 10),
            htHomeScore: htHomeScore ? parseInt(htHomeScore, 10) : undefined,
            htAwayScore: htAwayScore ? parseInt(htAwayScore, 10) : undefined,
            status: 'FINISHED',
            season: season,
            round: roundName,
            venue: game.venue || game.stadium,
            attendance: game.attendance,
          });
        }
      }
    } catch (error) {
      this.logger.warn(
        `FlashScore fetch failed for season ${season}: ${error.message}`,
      );
    }

    return matches;
  }

  /**
   * Extract unique teams from matches and ensure they exist in database
   */
  private async extractTeams(
    matches: HistoricalMatch[],
  ): Promise<TeamEntity[]> {
    const teamNames = new Set<string>();

    for (const match of matches) {
      teamNames.add(match.homeTeam);
      teamNames.add(match.awayTeam);
    }

    const teams: TeamEntity[] = [];

    for (const name of teamNames) {
      const canonicalName = this.resolveTeamName(name);
      if (!canonicalName) continue;

      // Check if team exists
      let team = await this.teamRepo.findOne({
        where: { name: canonicalName, sportKey: 'soccer_south_africa_psl' },
      });

      if (!team) {
        team = await this.teamRepo.save({
          id: uuidv4(),
          name: canonicalName,
          sportKey: 'soccer_south_africa_psl',
          shortName: null,
          eloRating: 1500,
        });
        this.logger.debug(`Created team: ${canonicalName}`);
      }

      teams.push(team);
    }

    return teams;
  }

  /**
   * Save historical matches to database
   */
  private async saveHistoricalMatches(
    matches: HistoricalMatch[],
  ): Promise<number> {
    let newCount = 0;

    for (const match of matches) {
      const homeTeamName = this.resolveTeamName(match.homeTeam);
      const awayTeamName = this.resolveTeamName(match.awayTeam);

      if (!homeTeamName || !awayTeamName) {
        this.logger.warn(
          `Could not resolve team names: ${match.homeTeam} vs ${match.awayTeam}`,
        );
        continue;
      }

      // Find team entities
      const homeTeam = await this.teamRepo.findOne({
        where: { name: homeTeamName, sportKey: 'soccer_south_africa_psl' },
      });
      const awayTeam = await this.teamRepo.findOne({
        where: { name: awayTeamName, sportKey: 'soccer_south_africa_psl' },
      });

      if (!homeTeam || !awayTeam) {
        this.logger.warn(
          `Teams not found: ${homeTeamName} vs ${awayTeamName}`,
        );
        continue;
      }

      // Generate unique external ID
      const matchDate = new Date(match.date);
      const externalId = `psl_hist_${homeTeamName}_${awayTeamName}_${matchDate.toISOString().split('T')[0]}`;

      // Check if match already exists
      const existing = await this.gameRepo.findOne({
        where: { externalId },
      });

      if (existing) {
        continue;
      }

      // Get or create sport entry
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

      // Save game
      await this.gameRepo.save({
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

      newCount++;
    }

    return newCount;
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
        return canonical;
      }
    }

    // Return original if no match found (we'll add it manually later)
    return name;
  }

  /**
   * Scrape multiple seasons at once
   */
  async scrapeSeasons(seasons: string[]): Promise<{
    totalMatches: number;
    totalTeams: number;
    totalNewMatches: number;
  }> {
    let totalMatches = 0;
    let totalTeams = 0;
    let totalNewMatches = 0;

    for (const season of seasons) {
      const result = await this.scrapeSeason(season);
      totalMatches += result.matches;
      totalTeams += result.teams;
      totalNewMatches += result.newMatches;
    }

    return {
      totalMatches,
      totalTeams,
      totalNewMatches,
    };
  }
}
