import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { GameEntity } from '../infrastructure/persistence/entities/game.orm-entity';
import { PredictionEntity } from '../infrastructure/persistence/entities/prediction.orm-entity';
import { TeamEntity } from '../infrastructure/persistence/entities/team.orm-entity';
import { EloCalculator } from '../domain/services/elo-calculator.service';
import { PredictionOutcome } from '@sports-prediction-engine/shared-types';
import {
  TeamMatchingService,
  MatchCandidate,
  MatchResult,
} from './team-matching.service';
import { DirectWebScraperService } from './direct-web-scraper.service';
import { EspnScraperService } from './espn-scraper.service';

/**
 * Automated Results Service
 *
 * Fetches match results from free public APIs and auto-resolves predictions.
 * Runs every 4 hours via cron job.
 *
 * Sources:
 * 1. Football-Data.org (free, 10 req/min) — EPL, La Liga, Serie A, Ligue 1, Bundesliga, Eredivisie
 * 2. The Odds API (when quota available) — PSL and others
 *
 * No manual entry needed — fully automated.
 */

interface ExternalMatch {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  date: string; // ISO date
  status: 'FINISHED' | string;
}

interface LeagueSource {
  leagueKey: string;
  source: 'football-data' | 'odds-api';
  externalId: string; // API-specific league ID
}

const LEAGUE_SOURCES: LeagueSource[] = [
  // Football-Data.org (free)
  { leagueKey: 'soccer_epl', source: 'football-data', externalId: 'PL' },
  {
    leagueKey: 'soccer_spain_la_liga',
    source: 'football-data',
    externalId: 'PD',
  },
  {
    leagueKey: 'soccer_italy_serie_a',
    source: 'football-data',
    externalId: 'SA',
  },
  {
    leagueKey: 'soccer_france_ligue_one',
    source: 'football-data',
    externalId: 'FL1',
  },
  {
    leagueKey: 'soccer_germany_bundesliga',
    source: 'football-data',
    externalId: 'BL1',
  },
  {
    leagueKey: 'soccer_netherlands_eredivisie',
    source: 'football-data',
    externalId: 'DED',
  },
  // The Odds API (when available)
  {
    leagueKey: 'soccer_south_africa_psl',
    source: 'odds-api',
    externalId: 'soccer_south_africa_psl',
  },
  {
    leagueKey: 'soccer_brazil_campeonato',
    source: 'odds-api',
    externalId: 'soccer_brazil_campeonato',
  },
];

/** Team name aliases for matching external API names to our seeded names */
const TEAM_ALIASES: Record<string, string> = {
  // EPL
  'Man City': 'Manchester City',
  'Man United': 'Manchester United',
  'Man. City': 'Manchester City',
  'Man. United': 'Manchester United',
  'Tottenham Hotspur FC': 'Tottenham',
  Tottenham: 'Tottenham Hotspur',
  'West Ham United FC': 'West Ham',
  'Wolverhampton Wanderers FC': 'Wolves',
  Wolverhampton: 'Wolves',
  'Wolverhampton Wanderers': 'Wolves',
  'Newcastle United FC': 'Newcastle United',
  'AFC Bournemouth': 'Bournemouth',
  // La Liga
  'Real Madrid CF': 'Real Madrid',
  'FC Barcelona': 'Barcelona',
  'Atlético de Madrid': 'Atletico Madrid',
  'Atlético Madrid': 'Atletico Madrid',
  'Athletic Club': 'Athletic Bilbao',
  'Real Sociedad de Fútbol': 'Real Sociedad',
  'Real Betis Balompié': 'Real Betis',
  'Villarreal CF': 'Villarreal',
  'Girona FC': 'Girona',
  'Sevilla FC': 'Sevilla',
  'Valencia CF': 'Valencia',
  'Celta de Vigo': 'Celta Vigo',
  'UD Las Palmas': 'Las Palmas',
  'RCD Mallorca': 'Mallorca',
  'CA Osasuna': 'Osasuna',
  'Rayo Vallecano de Madrid': 'Rayo Vallecano',
  'Elche CF': 'Elche',
  'RCD Espanyol de Barcelona': 'Espanyol',
  'Deportivo Alavés': 'Alavés',
  // Serie A
  'FC Internazionale Milano': 'Inter',
  'Inter Milan': 'Inter',
  'Associazione Calcio Milan': 'Milan',
  'AC Milan': 'Milan',
  'Juventus FC': 'Juventus',
  'SSC Napoli': 'Napoli',
  'SS Lazio': 'Lazio',
  'AS Roma': 'Roma',
  'ACF Fiorentina': 'Fiorentina',
  'Bologna FC 1909': 'Bologna',
  'Torino FC': 'Torino',
  'Genoa CFC': 'Genoa',
  'Udinese Calcio': 'Udinese',
  'Cagliari Calcio': 'Cagliari',
  'US Lecce': 'Lecce',
  'Empoli FC': 'Empoli',
  'Hellas Verona FC': 'Verona',
  // Ligue 1
  'Paris Saint-Germain': 'Paris Saint Germain',
  PSG: 'Paris Saint Germain',
  'Olympique de Marseille': 'Marseille',
  'Olympique Lyonnais': 'Lyon',
  'AS Monaco': 'Monaco',
  'LOSC Lille': 'Lille',
  'RC Lens': 'Lens',
  'Stade Rennais FC 1901': 'Rennes',
  'Stade Rennais': 'Rennes',
  'OGC Nice': 'Nice',
  'FC Nantes': 'Nantes',
  'Montpellier HSC': 'Montpellier',
  'RC Strasbourg Alsace': 'Strasbourg',
  'Stade de Reims': 'Reims',
  'Le Havre AC': 'Le Havre',
  'FC Metz': 'Metz',
  'AJ Auxerre': 'Auxerre',
  // Bundesliga
  'FC Bayern München': 'Bayern Munich',
  'Bayer 04 Leverkusen': 'Bayer Leverkusen',
  'Borussia Dortmund': 'Dortmund',
  'RB Leipzig': 'RB Leipzig',
  'Eintracht Frankfurt': 'Frankfurt',
  'VfL Wolfsburg': 'Wolfsburg',
  'SC Freiburg': 'Freiburg',
  '1. FC Union Berlin': 'Union Berlin',
  'Borussia Mönchengladbach': 'Monchengladbach',
  'VfB Stuttgart': 'Stuttgart',
  'SV Werder Bremen': 'Werder Bremen',
  'TSG 1899 Hoffenheim': 'Hoffenheim',
  '1. FSV Mainz 05': 'Mainz 05',
  'FC Augsburg': 'Augsburg',
  '1. FC Heidenheim 1846': 'Heidenheim',
  // Eredivisie
  PSV: 'PSV',
  'PSV Eindhoven': 'PSV',
  'Feyenoord Rotterdam': 'Feyenoord',
  'AFC Ajax': 'Ajax',
  'FC Twente': 'FC Twente',
  'AZ Alkmaar': 'AZ Alkmaar',
  AZ: 'AZ Alkmaar',
  'Fortuna Sittard': 'Fortuna Sittard',
  'Heracles Almelo': 'Heracles',
  'SC Heerenveen': 'Heerenveen',
  'FC Utrecht': 'FC Utrecht',
  'NEC Nijmegen': 'NEC Nijmegen',
  NEC: 'NEC Nijmegen',
  'Go Ahead Eagles': 'Go Ahead Eagles',
  'FC Groningen': 'FC Groningen',
  'PEC Zwolle': 'PEC Zwolle',
  'Sparta Rotterdam': 'Sparta Rotterdam',
  'Willem II Tilburg': 'Willem II',
  'Willem II': 'Willem II',
  'FC Volendam': 'Volendam',
  'RKC Waalwijk': 'RKC Waalwijk',
  'Almere City FC': 'Almere City',
  // PSL
  'Mamelodi Sundowns FC': 'Mamelodi Sundowns',
  'Orlando Pirates FC': 'Orlando Pirates',
  'Kaizer Chiefs FC': 'Kaizer Chiefs',
  'Stellenbosch FC': 'Stellenbosch',
  'Cape Town City FC': 'Cape Town City',
  'SuperSport United FC': 'SuperSport United',
  'AmaZulu FC': 'AmaZulu',
  'Sekhukhune United FC': 'Sekhukhune United',
  'Lamontville Golden Arrows': 'Golden Arrows',
  'Golden Arrows FC': 'Golden Arrows',
  'Richards Bay FC': 'Richards Bay',
  'Moroka Swallows FC': 'Moroka Swallows',
  'Chippa United FC': 'Chippa United',
  'Polokwane City FC': 'Polokwane City',
  'TS Galaxy FC': 'TS Galaxy',
  // Brasileirão
  Flamengo: 'Flamengo',
  'CR Flamengo': 'Flamengo',
  Palmeiras: 'Palmeiras',
  'SE Palmeiras': 'Palmeiras',
  'São Paulo FC': 'São Paulo',
  'Sao Paulo': 'São Paulo',
  Corinthians: 'Corinthians',
  'SC Corinthians': 'Corinthians',
  'Atlético Mineiro': 'Atlético Mineiro',
  'Atletico-MG': 'Atlético Mineiro',
  Grêmio: 'Grêmio',
  Gremio: 'Grêmio',
  Internacional: 'Internacional',
  Botafogo: 'Botafogo',
  'Botafogo FR': 'Botafogo',
  Fluminense: 'Fluminense',
  'Fluminense FC': 'Fluminense',
  Fortaleza: 'Fortaleza',
  'Fortaleza EC': 'Fortaleza',
  Cruzeiro: 'Cruzeiro',
  'Cruzeiro EC': 'Cruzeiro',
  'Athletico Paranaense': 'Athletico Paranaense',
  CAP: 'Athletico Paranaense',
  Bahia: 'Bahia',
  'EC Bahia': 'Bahia',
  Bragantino: 'Bragantino',
  'RB Bragantino': 'Bragantino',
  Santos: 'Santos',
  'Santos FC': 'Santos',
  'Vasco da Gama': 'Vasco da Gama',
  'CR Vasco da Gama': 'Vasco da Gama',
  Coritiba: 'Coritiba',
  'Coritiba FC': 'Coritiba',
  Vitória: 'Vitória',
  'EC Vitória': 'Vitória',
  Cuiabá: 'Cuiabá',
  Cuiaba: 'Cuiabá',
  Goiás: 'Goiás',
  Goias: 'Goiás',
};

@Injectable()
export class AutoResultsService implements OnModuleInit {
  private readonly logger = new Logger(AutoResultsService.name);
  private readonly FOOTBALL_DATA_URL = 'https://api.football-data.org/v4';

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(GameEntity)
    private readonly gameRepo: Repository<GameEntity>,
    @InjectRepository(PredictionEntity)
    private readonly predictionRepo: Repository<PredictionEntity>,
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,
    private readonly teamMatching: TeamMatchingService,
    private readonly scraper: DirectWebScraperService,
    private readonly espn: EspnScraperService,
  ) {}

  async onModuleInit() {
    // Run once on startup in dev mode
    await this.fetchAndResolveResults();
  }

  // Every 4 hours — check for completed matches
  @Cron('0 */4 * * *', { name: 'auto-results' })
  async handleAutoResults() {
    this.logger.log('[CRON */4h] Fetching match results...');
    try {
      const result = await this.fetchAndResolveResults();
      this.logger.log(
        `[CRON */4h] Results: ${result.gamesUpdated} games resolved, ${result.predictionsResolved} predictions resolved, ${result.eloUpdated} ELO updates`,
      );
    } catch (error) {
      this.logger.error('[CRON */4h] Results fetch failed', error);
    }
  }

  /**
   * Fetch results from all sources with multi-source validation.
   * Only resolves predictions when we have confident matches.
   */
  async fetchAndResolveResults(): Promise<{
    gamesUpdated: number;
    predictionsResolved: number;
    eloUpdated: number;
    sourceConflicts: number;
    skippedLowConfidence: number;
  }> {
    let gamesUpdated = 0;
    let predictionsResolved = 0;
    let eloUpdated = 0;
    let sourceConflicts = 0;
    let skippedLowConfidence = 0;

    // Collect results from all sources per league
    const leagueResults: Map<string, ExternalMatch[]> = new Map();

    // 1. ESPN — primary results source (free, no auth, all leagues including PSL)
    try {
      const espnResults = await this.espn.fetchRecentResults(14);
      for (const result of espnResults) {
        const existing = leagueResults.get(result.leagueKey) || [];
        existing.push({
          homeTeam: result.homeTeam,
          awayTeam: result.awayTeam,
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          date: result.date,
          status: 'FINISHED',
        });
        leagueResults.set(result.leagueKey, existing);
      }
      this.logger.log(`ESPN results: ${espnResults.length} finished matches`);
    } catch (error) {
      this.logger.warn(`ESPN results failed: ${error.message}`);
    }

    // 2. Football-Data.org (free tier fallback, needs valid API key)
    const fdApiKey = process.env.FOOTBALL_DATA_API_KEY || '';
    if (fdApiKey && !fdApiKey.includes('your_')) {
      const fdLeagues = LEAGUE_SOURCES.filter(
        (s) => s.source === 'football-data',
      );
      for (const league of fdLeagues) {
        try {
          const matches = await this.fetchFootballDataMatches(league.externalId);
          const existing = leagueResults.get(league.leagueKey) || [];
          leagueResults.set(league.leagueKey, [...existing, ...matches]);
        } catch (error) {
          this.logger.warn(
            `Football-Data.org failed for ${league.leagueKey}: ${error.message}`,
          );
        }
      }
    }

    // 3. The Odds API (when quota available)
    const oddsLeagues = LEAGUE_SOURCES.filter((s) => s.source === 'odds-api');
    for (const league of oddsLeagues) {
      try {
        const matches = await this.fetchOdsApiMatches(league.externalId);
        const existing = leagueResults.get(league.leagueKey) || [];
        leagueResults.set(league.leagueKey, [...existing, ...matches]);
      } catch (error) {
        this.logger.warn(
          `Odds API failed for ${league.leagueKey}: ${error.message}`,
        );
      }
    }

    // Process each league with multi-source validation
    for (const [leagueKey, allMatches] of leagueResults) {
      const deduped = this.deduplicateMatches(allMatches);

      if (deduped.hasConflict) {
        sourceConflicts += deduped.conflictCount;
        this.logger.warn(
          `[${leagueKey}] ${deduped.conflictCount} conflicting results across sources`,
        );
      }

      const resolved = await this.resolveMatchesWithValidation(
        leagueKey,
        deduped.matches,
      );
      gamesUpdated += resolved.games;
      predictionsResolved += resolved.predictions;
      eloUpdated += resolved.elo;
      skippedLowConfidence += resolved.skipped;
    }

    this.logger.log(
      `Results: ${gamesUpdated} games, ${predictionsResolved} predictions, ${eloUpdated} ELO updates. Conflicts: ${sourceConflicts}, Low-confidence skipped: ${skippedLowConfidence}`,
    );

    return {
      gamesUpdated,
      predictionsResolved,
      eloUpdated,
      sourceConflicts,
      skippedLowConfidence,
    };
  }

  /**
   * Deduplicate matches from multiple sources.
   * Returns unique matches and flags conflicts.
   */
  private deduplicateMatches(matches: ExternalMatch[]): {
    matches: ExternalMatch[];
    hasConflict: boolean;
    conflictCount: number;
  } {
    const matchMap: Map<string, ExternalMatch[]> = new Map();

    for (const match of matches) {
      const key = `${this.normalizeTeamName(match.homeTeam)} vs ${this.normalizeTeamName(match.awayTeam)}`;
      const dateKey = new Date(match.date).toISOString().split('T')[0];
      const compositeKey = `${key}_${dateKey}`;

      if (!matchMap.has(compositeKey)) {
        matchMap.set(compositeKey, []);
      }
      matchMap.get(compositeKey)!.push(match);
    }

    const uniqueMatches: ExternalMatch[] = [];
    let conflictCount = 0;

    for (const [, matchGroup] of matchMap) {
      if (matchGroup.length === 1) {
        uniqueMatches.push(matchGroup[0]);
      } else {
        // Multiple sources - check for consensus
        const scores = matchGroup.map((m) => `${m.homeScore}-${m.awayScore}`);
        const uniqueScores = [...new Set(scores)];

        if (uniqueScores.length === 1) {
          // All sources agree - use first one
          uniqueMatches.push(matchGroup[0]);
        } else {
          // Conflict - use the most common score
          conflictCount++;
          const scoreCounts = new Map<string, number>();
          for (const m of matchGroup) {
            const scoreKey = `${m.homeScore}-${m.awayScore}`;
            scoreCounts.set(scoreKey, (scoreCounts.get(scoreKey) || 0) + 1);
          }
          const [bestScore] = [...scoreCounts.entries()].sort(
            (a, b) => b[1] - a[1],
          )[0];
          const [home, away] = bestScore.split('-').map(Number);
          const bestMatch = matchGroup.find(
            (m) => m.homeScore === home && m.awayScore === away,
          )!;
          uniqueMatches.push(bestMatch);
        }
      }
    }

    return {
      matches: uniqueMatches,
      hasConflict: conflictCount > 0,
      conflictCount,
    };
  }

  /**
   * Resolve matches with validation - skips low confidence matches.
   */
  private async resolveMatchesWithValidation(
    leagueKey: string,
    matches: ExternalMatch[],
  ): Promise<{
    games: number;
    predictions: number;
    elo: number;
    skipped: number;
  }> {
    const unresolvedGames = await this.gameRepo.find({
      where: { sportKey: leagueKey, completed: false },
      relations: ['homeTeam', 'awayTeam'],
    });

    let games = 0;
    let predictions = 0;
    let elo = 0;
    let skipped = 0;

    for (const match of matches) {
      const matchDate = new Date(match.date);
      const game = this.findMatchingGame(unresolvedGames, match, matchDate);

      if (!game) {
        skipped++;
        continue;
      }

      // Mark game as completed
      game.completed = true;
      game.homeScore = match.homeScore;
      game.awayScore = match.awayScore;
      game.status = 'finished';
      await this.gameRepo.save(game);
      games++;

      // Resolve predictions
      const predList = await this.predictionRepo.find({
        where: { gameId: game.id, isResolved: false },
      });

      for (const pred of predList) {
        const outcome = this.getOutcome(match.homeScore, match.awayScore);
        pred.actualOutcome = outcome;
        pred.isResolved = true;
        pred.isCorrect = pred.predictedOutcome === outcome;
        await this.predictionRepo.save(pred);
        predictions++;
      }

      // Update ELO ratings
      const homeScoreValue = this.getEloScore(match.homeScore, match.awayScore);
      const [updatedHome, updatedAway] = EloCalculator.updateRatings(
        this.toDomainTeam(game.homeTeam),
        this.toDomainTeam(game.awayTeam),
        homeScoreValue,
      );

      await this.teamRepo.update(game.homeTeamId, {
        eloRating: updatedHome.eloRating.value,
      });
      await this.teamRepo.update(game.awayTeamId, {
        eloRating: updatedAway.eloRating.value,
      });
      elo += 2;
    }

    return { games, predictions, elo, skipped };
  }

  /**
   * Fetch completed matches from Football-Data.org (free).
   * Covers: EPL, La Liga, Serie A, Ligue 1, Bundesliga, Eredivisie.
   */
  private async fetchFootballDataMatches(
    competitionId: string,
  ): Promise<ExternalMatch[]> {
    const url = `${this.FOOTBALL_DATA_URL}/competitions/${competitionId}/matches?status=FINISHED`;
    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: {
          'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY || '',
        },
        timeout: 10_000,
      }),
    );

    const data = response.data as any;
    const matches = data.matches || [];

    return matches
      .filter(
        (m: any) => m.status === 'FINISHED' && m.score?.fullTime?.home !== null,
      )
      .map((m: any) => ({
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        homeScore: m.score.fullTime.home,
        awayScore: m.score.fullTime.away,
        date: m.utcDate,
        status: m.status,
      }));
  }

  /**
   * Fetch completed matches from The Odds API.
   * Requires valid API key with remaining quota.
   */
  private async fetchOdsApiMatches(sportKey: string): Promise<ExternalMatch[]> {
    const apiKey = process.env.ODDS_API_KEY || '';
    if (!apiKey || apiKey.includes('your_')) return [];

    const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/scores?daysFrom=7`;
    const response = await firstValueFrom(
      this.httpService.get(url, {
        params: { apiKey },
        timeout: 10_000,
      }),
    );

    const data = response.data as any[];
    if (!Array.isArray(data)) return [];

    return data
      .filter((m: any) => m.completed && m.scores)
      .map((m: any) => {
        const homeEntry = m.scores.find((s: any) => s.name === m.home_team);
        const awayEntry = m.scores.find((s: any) => s.name === m.away_team);
        return {
          homeTeam: m.home_team,
          awayTeam: m.away_team,
          homeScore: homeEntry ? parseInt(homeEntry.score, 10) : 0,
          awayScore: awayEntry ? parseInt(awayEntry.score, 10) : 0,
          date: m.commence_time,
          status: 'FINISHED',
        };
      });
  }

  /**
   * Match external results to our games and resolve predictions.
   */
  private async resolveMatches(
    leagueKey: string,
    matches: ExternalMatch[],
  ): Promise<{ games: number; predictions: number; elo: number }> {
    let games = 0;
    let predictions = 0;
    let elo = 0;

    // Get all unresolved games for this league
    const unresolvedGames = await this.gameRepo.find({
      where: { sportKey: leagueKey, completed: false },
      relations: ['homeTeam', 'awayTeam'],
    });

    for (const match of matches) {
      // Find matching game by team names and date proximity
      const matchDate = new Date(match.date);
      const game = this.findMatchingGame(unresolvedGames, match, matchDate);

      if (!game) continue;

      // Mark game as completed
      game.completed = true;
      game.homeScore = match.homeScore;
      game.awayScore = match.awayScore;
      game.status = 'finished';
      await this.gameRepo.save(game);
      games++;

      // Resolve predictions
      const predList = await this.predictionRepo.find({
        where: { gameId: game.id, isResolved: false },
      });

      for (const pred of predList) {
        const outcome = this.getOutcome(match.homeScore, match.awayScore);
        pred.actualOutcome = outcome;
        pred.isResolved = true;
        pred.isCorrect = pred.predictedOutcome === outcome;
        await this.predictionRepo.save(pred);
        predictions++;
      }

      // Update ELO ratings
      const homeScoreValue = this.getEloScore(match.homeScore, match.awayScore);
      const [updatedHome, updatedAway] = EloCalculator.updateRatings(
        this.toDomainTeam(game.homeTeam),
        this.toDomainTeam(game.awayTeam),
        homeScoreValue,
      );

      await this.teamRepo.update(game.homeTeamId, {
        eloRating: updatedHome.eloRating.value,
      });
      await this.teamRepo.update(game.awayTeamId, {
        eloRating: updatedAway.eloRating.value,
      });
      elo += 2;

      this.logger.log(
        `[${leagueKey}] ${game.homeTeam.name} ${match.homeScore}-${match.awayScore} ${game.awayTeam.name} → ${predictions} predictions resolved`,
      );
    }

    return { games, predictions, elo };
  }

  /**
   * Find a matching game by team name (with alias resolution) and date proximity.
   * Uses confidence scoring to prevent false positives.
   */
  private findMatchingGame(
    games: GameEntity[],
    match: ExternalMatch,
    matchDate: Date,
  ): GameEntity | null {
    const candidates: MatchCandidate[] = games.map((g) => ({
      gameId: g.id,
      homeTeam: g.homeTeam.name,
      awayTeam: g.awayTeam.name,
      commenceTime: new Date(g.commenceTime),
      sportKey: g.sportKey,
    }));

    const matchResult: MatchResult = {
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      date: matchDate,
      source: 'auto-results',
    };

    const result = this.teamMatching.findBestMatch(matchResult, candidates, {
      maxDaysDiff: 1,
      minConfidence: 0.8,
    });

    if (result.candidate && result.confidence >= 0.8) {
      this.logger.debug(
        `[MATCH] ${match.homeTeam} vs ${match.awayTeam} → matched with ${result.confidence.toFixed(2)} confidence: ${result.reason}`,
      );
      return games.find((g) => g.id === result.candidate!.gameId) || null;
    }

    this.logger.warn(
      `[NO MATCH] ${match.homeTeam} vs ${match.awayTeam} on ${matchDate.toISOString().split('T')[0]} - ${result.reason}`,
    );
    return null;
  }

  /**
   * Normalize team name using our alias map.
   */
  private normalizeTeamName(name: string): string {
    // Check direct alias match
    if (TEAM_ALIASES[name]) return TEAM_ALIASES[name];
    // Check reverse (our name might be the alias)
    for (const [external, internal] of Object.entries(TEAM_ALIASES)) {
      if (internal === name) return external;
    }
    // Fallback: lowercase and strip common suffixes
    return name
      .toLowerCase()
      .replace(/\s*(fc|sc|ac|us|rc|cf|ec|sv|vb|1\.|2\.)\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getOutcome(homeScore: number, awayScore: number): PredictionOutcome {
    if (homeScore > awayScore) return PredictionOutcome.HOME_WIN;
    if (awayScore > homeScore) return PredictionOutcome.AWAY_WIN;
    return PredictionOutcome.DRAW;
  }

  private getEloScore(homeScore: number, awayScore: number): number {
    if (homeScore > awayScore) return 1.0;
    if (awayScore > homeScore) return 0.0;
    return 0.5;
  }

  private toDomainTeam(ormTeam: TeamEntity): any {
    return {
      id: ormTeam.id,
      name: ormTeam.name,
      sportKey: ormTeam.sportKey,
      eloRating: { value: ormTeam.eloRating },
    };
  }
}
