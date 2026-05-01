import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { GameEntity } from '../infrastructure/persistence/entities/game.orm-entity';
import { TeamEntity } from '../infrastructure/persistence/entities/team.orm-entity';
import { SportEntity } from '../infrastructure/persistence/entities/sport.orm-entity';
import { SportCategory } from '@sports-prediction-engine/shared-types';
import { TeamMatchingService } from './team-matching.service';

/**
 * SofaScore Scraper Service
 *
 * Uses SofaScore's unofficial public API — no authentication, no API keys.
 * Covers 50+ football leagues, basketball (NBA, EuroLeague), tennis (ATP/WTA),
 * and ice hockey with live scores, upcoming fixtures, and recent results.
 *
 * Rate limiting: 800ms between requests to stay under their threshold.
 * Caching: responses cached for 5 minutes to prevent hammering.
 */

export interface SofaScoreEvent {
    id: number;
    slug: string;
    homeTeam: { id: number; name: string; slug: string };
    awayTeam: { id: number; name: string; slug: string };
    tournament: { id: number; name: string; slug: string; category?: { name: string; slug: string } };
    startTimestamp: number;
    status: { code: number; description: string; type: string };
    homeScore?: { current?: number; period1?: number; period2?: number; normaltime?: number };
    awayScore?: { current?: number; period1?: number; period2?: number; normaltime?: number };
    time?: { played?: number; periodLength?: number; currentPeriodStart?: number };
}

/** SofaScore sport slugs */
export type SofaScoreSport = 'football' | 'basketball' | 'tennis' | 'ice-hockey';

/** Maps our internal sportKey prefix to SofaScore sport slugs */
const SPORT_KEY_TO_SOFASCORE: Record<string, SofaScoreSport> = {
    soccer: 'football',
    basketball: 'basketball',
    tennis: 'tennis',
    icehockey: 'ice-hockey',
};

/**
 * Tournament name substrings → our internal sportKey
 * Checked case-insensitively. First match wins.
 */
const TOURNAMENT_TO_SPORT_KEY: Array<{ pattern: RegExp; key: string; title: string; group: string }> = [
    // English Football
    { pattern: /premier league/i, key: 'soccer_epl', title: 'Premier League', group: 'Soccer' },
    { pattern: /efl championship/i, key: 'soccer_efl_champ', title: 'EFL Championship', group: 'Soccer' },
    { pattern: /fa cup/i, key: 'soccer_fa_cup', title: 'FA Cup', group: 'Soccer' },
    // Spanish
    { pattern: /laliga|la liga/i, key: 'soccer_spain_la_liga', title: 'La Liga', group: 'Soccer' },
    // Italian
    { pattern: /serie a/i, key: 'soccer_italy_serie_a', title: 'Serie A', group: 'Soccer' },
    // German
    { pattern: /bundesliga/i, key: 'soccer_germany_bundesliga', title: 'Bundesliga', group: 'Soccer' },
    // French
    { pattern: /ligue 1/i, key: 'soccer_france_ligue_one', title: 'Ligue 1', group: 'Soccer' },
    // Dutch
    { pattern: /eredivisie/i, key: 'soccer_netherlands_eredivisie', title: 'Eredivisie', group: 'Soccer' },
    // Portuguese
    { pattern: /liga portugal|primeira liga/i, key: 'soccer_portugal_primeira_liga', title: 'Primeira Liga', group: 'Soccer' },
    // Scottish
    { pattern: /scottish premiership/i, key: 'soccer_scotland_premiership', title: 'Scottish Premiership', group: 'Soccer' },
    // Belgian
    { pattern: /pro league|jupiler/i, key: 'soccer_belgium_first_div', title: 'Pro League', group: 'Soccer' },
    // Turkish
    { pattern: /s[üu]per lig/i, key: 'soccer_turkey_super_league', title: 'Süper Lig', group: 'Soccer' },
    // Greek
    { pattern: /super league.*greece|greece.*super league/i, key: 'soccer_greece_super_league', title: 'Super League', group: 'Soccer' },
    // Russian
    { pattern: /russian premier league|rpl/i, key: 'soccer_russia_premier_league', title: 'RPL', group: 'Soccer' },
    // Austrian
    { pattern: /bundesliga.*austria|austria.*bundesliga/i, key: 'soccer_austria_bundesliga', title: 'Austrian Bundesliga', group: 'Soccer' },
    // Swiss
    { pattern: /swiss super league/i, key: 'soccer_switzerland_superleague', title: 'Swiss Super League', group: 'Soccer' },
    // Polish
    { pattern: /ekstraklasa/i, key: 'soccer_poland_ekstraklasa', title: 'Ekstraklasa', group: 'Soccer' },
    // South African
    { pattern: /betway premiership|dstv premiership|south africa.*premiership|psl/i, key: 'soccer_south_africa_psl', title: 'PSL', group: 'Soccer' },
    // European Cups
    { pattern: /champions league/i, key: 'soccer_uefa_champions_league', title: 'Champions League', group: 'Soccer' },
    { pattern: /europa league/i, key: 'soccer_uefa_europa_league', title: 'Europa League', group: 'Soccer' },
    { pattern: /conference league/i, key: 'soccer_uefa_conference_league', title: 'Conference League', group: 'Soccer' },
    // Americas
    { pattern: /mls/i, key: 'soccer_usa_mls', title: 'MLS', group: 'Soccer' },
    { pattern: /brasileir[aã]o|campeonato brasileiro/i, key: 'soccer_brazil_campeonato', title: 'Brasileirão', group: 'Soccer' },
    { pattern: /liga mx|liga de expansión/i, key: 'soccer_mexico_ligamx', title: 'Liga MX', group: 'Soccer' },
    { pattern: /liga profesional|primera división.*argentina/i, key: 'soccer_argentina_primera_division', title: 'Liga Profesional', group: 'Soccer' },
    // Africa
    { pattern: /afcon|africa cup of nations/i, key: 'soccer_africa_cup_of_nations', title: 'AFCON', group: 'Soccer' },
    // International
    { pattern: /world cup qual.*uefa|uefa.*world cup qual/i, key: 'soccer_fifa_world_cup_qualifiers_uefa', title: 'WCQ UEFA', group: 'Soccer' },
    { pattern: /fifa world cup(?! qual)/i, key: 'soccer_fifa_world_cup', title: 'World Cup', group: 'Soccer' },
    { pattern: /euro 20\d\d|european championship/i, key: 'soccer_uefa_euro_championship', title: 'Euro Championship', group: 'Soccer' },
    { pattern: /copa am[eé]rica/i, key: 'soccer_conmebol_copa_america', title: 'Copa América', group: 'Soccer' },
    // Basketball
    { pattern: /nba/i, key: 'basketball_nba', title: 'NBA', group: 'Basketball' },
    { pattern: /euroleague/i, key: 'basketball_euroleague', title: 'EuroLeague', group: 'Basketball' },
    // Tennis
    { pattern: /atp.*masters|masters.*1000/i, key: 'tennis_atp_masters', title: 'ATP Masters 1000', group: 'Tennis' },
    { pattern: /australian open|roland garros|wimbledon|us open/i, key: 'tennis_grand_slams', title: 'Grand Slams', group: 'Tennis' },
    { pattern: /atp.*500/i, key: 'tennis_atp_500', title: 'ATP 500', group: 'Tennis' },
    { pattern: /wta.*1000/i, key: 'tennis_wta_1000', title: 'WTA 1000', group: 'Tennis' },
    // Ice Hockey
    { pattern: /nhl/i, key: 'icehockey_nhl', title: 'NHL', group: 'Ice Hockey' },
    { pattern: /khl/i, key: 'icehockey_khl', title: 'KHL', group: 'Ice Hockey' },
];

/** SofaScore status code → our internal status */
const STATUS_MAP: Record<number, string> = {
    0: 'scheduled',
    6: 'in_progress',
    7: 'in_progress',  // 2nd half
    31: 'in_progress', // Halftime
    32: 'in_progress', // Extra time
    41: 'in_progress', // Penalties
    60: 'postponed',
    70: 'cancelled',
    100: 'finished',
};

const SOFASCORE_BASE = 'https://api.sofascore.com/api/v1';

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
];

@Injectable()
export class SofaScoreScraperService {
    private readonly logger = new Logger(SofaScoreScraperService.name);
    private uaIndex = 0;

    /** Response cache: url → { data, fetchedAt } */
    private readonly cache = new Map<string, { data: any; fetchedAt: number }>();
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    constructor(
        private readonly httpService: HttpService,
        @InjectRepository(GameEntity)
        private readonly gameRepo: Repository<GameEntity>,
        @InjectRepository(TeamEntity)
        private readonly teamRepo: Repository<TeamEntity>,
        @InjectRepository(SportEntity)
        private readonly sportRepo: Repository<SportEntity>,
        private readonly teamMatching: TeamMatchingService,
    ) {}

    // ─────────────────────────────────────────────────────────────────────
    // PUBLIC API
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Fetch + save upcoming fixtures for the next N days across all supported sports.
     * Returns total count of fixtures saved/updated.
     */
    async syncUpcomingFixtures(daysAhead = 7): Promise<{ found: number; saved: number; sports: string[] }> {
        let totalFound = 0;
        let totalSaved = 0;
        const sportsUsed = new Set<string>();

        const sports: SofaScoreSport[] = ['football', 'basketball', 'tennis'];

        for (const sport of sports) {
            for (let d = 0; d <= daysAhead; d++) {
                const date = this.getDateString(d);
                try {
                    const events = await this.fetchScheduledEvents(sport, date);
                    for (const event of events) {
                        totalFound++;
                        const mapping = this.mapTournament(event.tournament.name);
                        if (!mapping) continue;

                        sportsUsed.add(mapping.key);
                        const saved = await this.saveFixture(event, mapping);
                        if (saved) totalSaved++;
                    }
                    await this.delay(800);
                } catch (err) {
                    this.logger.warn(`SofaScore sync failed for ${sport}/${date}: ${err.message}`);
                }
            }
        }

        return { found: totalFound, saved: totalSaved, sports: [...sportsUsed] };
    }

    /**
     * Fetch live scores across all sports right now.
     * No caching — always fresh for live data.
     */
    async fetchLiveScores(): Promise<SofaScoreEvent[]> {
        const live: SofaScoreEvent[] = [];
        const sports: SofaScoreSport[] = ['football', 'basketball', 'tennis'];

        for (const sport of sports) {
            try {
                const events = await this.fetchLiveEvents(sport);
                live.push(...events);
                await this.delay(400);
            } catch (err) {
                this.logger.warn(`Live fetch failed for ${sport}: ${err.message}`);
            }
        }

        return live;
    }

    /**
     * Fetch recent results (last N days) for updating ELO and predictions.
     */
    async fetchRecentResults(daysBack = 7): Promise<SofaScoreEvent[]> {
        const results: SofaScoreEvent[] = [];

        for (let d = 1; d <= daysBack; d++) {
            const date = this.getDateString(-d);
            try {
                const events = await this.fetchScheduledEvents('football', date);
                const finished = events.filter(e => e.status.type === 'finished' || e.status.code === 100);
                results.push(...finished);
                await this.delay(600);
            } catch (err) {
                this.logger.warn(`Results fetch failed for ${date}: ${err.message}`);
            }
        }

        return results;
    }

    /**
     * Map a SofaScore event to our raw score data format.
     */
    toRawScore(event: SofaScoreEvent): {
        homeTeam: string;
        awayTeam: string;
        homeScore: number;
        awayScore: number;
        date: Date;
        status: string;
        league: string;
        sportKey: string;
    } | null {
        const mapping = this.mapTournament(event.tournament.name);
        if (!mapping) return null;

        const hs = event.homeScore?.normaltime ?? event.homeScore?.current;
        const as_ = event.awayScore?.normaltime ?? event.awayScore?.current;
        if (hs === undefined || as_ === undefined) return null;

        return {
            homeTeam: event.homeTeam.name,
            awayTeam: event.awayTeam.name,
            homeScore: hs,
            awayScore: as_,
            date: new Date(event.startTimestamp * 1000),
            status: 'FINISHED',
            league: mapping.title,
            sportKey: mapping.key,
        };
    }

    /**
     * Get minute for a live event.
     */
    getLiveMinute(event: SofaScoreEvent): number | null {
        if (!event.time) return null;
        const played = event.time.played;
        if (played === undefined) return null;
        return played;
    }

    /**
     * Get status string for a live event.
     */
    getLiveStatus(event: SofaScoreEvent): string {
        const code = event.status.code;
        const type = event.status.type;

        if (type === 'finished') return 'FT';
        if (code === 31) return 'HT';
        if (code === 7 || (code === 6 && (event.time?.played ?? 0) > 45)) return '2H';
        if (code === 6) return '1H';
        if (code === 32) return 'ET';
        if (code === 41) return 'PEN';
        return 'LIVE';
    }

    // ─────────────────────────────────────────────────────────────────────
    // PRIVATE: SofaScore HTTP
    // ─────────────────────────────────────────────────────────────────────

    private async fetchScheduledEvents(sport: SofaScoreSport, date: string): Promise<SofaScoreEvent[]> {
        const url = `${SOFASCORE_BASE}/sport/${sport}/scheduled-events/${date}`;
        const data = await this.cachedGet(url);
        return (data?.events as SofaScoreEvent[]) ?? [];
    }

    private async fetchLiveEvents(sport: SofaScoreSport): Promise<SofaScoreEvent[]> {
        const url = `${SOFASCORE_BASE}/sport/${sport}/events/live`;
        // Live endpoint — bypass cache for freshness
        this.cache.delete(url);
        const data = await this.cachedGet(url);
        return (data?.events as SofaScoreEvent[]) ?? [];
    }

    private async cachedGet(url: string): Promise<any> {
        const now = Date.now();
        const hit = this.cache.get(url);
        if (hit && now - hit.fetchedAt < this.CACHE_TTL_MS) {
            return hit.data;
        }

        const ua = USER_AGENTS[this.uaIndex % USER_AGENTS.length];
        this.uaIndex++;

        const response = await firstValueFrom(
            this.httpService.get(url, {
                headers: {
                    'User-Agent': ua,
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Origin': 'https://www.sofascore.com',
                    'Referer': 'https://www.sofascore.com/',
                    'Cache-Control': 'no-cache',
                },
                timeout: 12_000,
            }),
        );

        this.cache.set(url, { data: response.data, fetchedAt: now });
        return response.data;
    }

    // ─────────────────────────────────────────────────────────────────────
    // PRIVATE: Fixture persistence
    // ─────────────────────────────────────────────────────────────────────

    private async saveFixture(
        event: SofaScoreEvent,
        mapping: { key: string; title: string; group: string; category: SportCategory },
    ): Promise<boolean> {
        if (event.status.type === 'finished') return false; // already completed

        const homeTeam = await this.resolveOrCreateTeam(event.homeTeam.name, mapping.key);
        const awayTeam = await this.resolveOrCreateTeam(event.awayTeam.name, mapping.key);
        if (!homeTeam || !awayTeam) return false;

        const commenceTime = new Date(event.startTimestamp * 1000);
        const externalId = `sofascore_${event.id}`;
        const status = STATUS_MAP[event.status.code] ?? 'scheduled';

        // 1. Check by SofaScore externalId
        const existing = await this.gameRepo.findOne({ where: { externalId } });

        if (existing) {
            const timeDiff = Math.abs(existing.commenceTime.getTime() - commenceTime.getTime());
            if (timeDiff > 3_600_000 || existing.status !== status) {
                existing.commenceTime = commenceTime;
                existing.status = status;
                await this.gameRepo.save(existing);
                return true;
            }
            return false;
        }

        // 2. Cross-source dedup: check if same teams already have an upcoming game
        //    from seeds or other scrapers (different externalId prefix)
        const crossSourceDup = await this.gameRepo.createQueryBuilder('game')
            .where('game.sportKey = :sportKey', { sportKey: mapping.key })
            .andWhere('game.completed = false')
            .andWhere('game.homeTeamId = :homeId', { homeId: homeTeam.id })
            .andWhere('game.awayTeamId = :awayId', { awayId: awayTeam.id })
            .getOne();

        if (crossSourceDup) {
            // Update the existing record with fresher SofaScore data if time changed
            const timeDiff = Math.abs(crossSourceDup.commenceTime.getTime() - commenceTime.getTime());
            if (timeDiff > 3_600_000 || crossSourceDup.status !== status) {
                crossSourceDup.commenceTime = commenceTime;
                crossSourceDup.status = status;
                crossSourceDup.externalId = externalId; // upgrade to SofaScore ID
                await this.gameRepo.save(crossSourceDup);
                this.logger.debug(`[SofaScore] Updated cross-source dup: ${homeTeam.name} vs ${awayTeam.name}`);
                return true;
            }
            return false;
        }

        // 3. Team-per-day constraint: prevent a team playing twice on the same day
        const matchDate = commenceTime.toISOString().split('T')[0];
        const dayStart = new Date(`${matchDate}T00:00:00Z`);
        const dayEnd = new Date(`${matchDate}T23:59:59Z`);

        const teamAlreadyPlaying = await this.gameRepo.createQueryBuilder('game')
            .where('game.sportKey = :sportKey', { sportKey: mapping.key })
            .andWhere('game.completed = false')
            .andWhere('game.commenceTime >= :dayStart', { dayStart })
            .andWhere('game.commenceTime <= :dayEnd', { dayEnd })
            .andWhere(
                '(game.homeTeamId = :homeId OR game.awayTeamId = :homeId OR game.homeTeamId = :awayId OR game.awayTeamId = :awayId)',
                { homeId: homeTeam.id, awayId: awayTeam.id },
            )
            .getOne();

        if (teamAlreadyPlaying) {
            this.logger.warn(
                `[SofaScore] Skipped: ${homeTeam.name} vs ${awayTeam.name} on ${matchDate} — ` +
                `team already scheduled in ${teamAlreadyPlaying.homeTeam?.name ?? 'unknown'} vs ${teamAlreadyPlaying.awayTeam?.name ?? 'unknown'}`,
            );
            return false;
        }

        await this.gameRepo.save({
            id: uuidv4(),
            externalId,
            sportKey: mapping.key,
            sportTitle: mapping.title,
            sportGroup: mapping.group,
            sportCategory: mapping.category as string,
            homeTeamId: homeTeam.id,
            homeTeam,
            awayTeamId: awayTeam.id,
            awayTeam,
            commenceTime,
            completed: false,
            status,
        });

        this.logger.debug(`[SofaScore] Saved: ${homeTeam.name} vs ${awayTeam.name} (${mapping.title}) @ ${commenceTime.toISOString()}`);
        return true;
    }

    /**
     * Resolve a team by name (fuzzy match). If not found, create it.
     * This ensures we never lose a fixture due to team name mismatch.
     */
    private async resolveOrCreateTeam(name: string, sportKey: string): Promise<TeamEntity | null> {
        const existing = await this.teamRepo.find({ where: { sportKey } });

        // 1. Exact match (case-insensitive)
        const exact = existing.find(t => t.name.toLowerCase() === name.toLowerCase());
        if (exact) return exact;

        // 2. Fuzzy match with threshold 0.75
        for (const team of existing) {
            const result = this.teamMatching.matchTeam(name, team.name);
            if (result.matched && result.confidence > 0.75) return team;
        }

        // 3. Create new team with default ELO (1500 = league average)
        await this.getOrCreateSport(sportKey); // ensure sport exists first

        const newTeam = this.teamRepo.create({
            id: uuidv4(),
            name,
            sportKey,
            eloRating: 1500,
        });
        return this.teamRepo.save(newTeam);
    }

    private async getOrCreateSport(sportKey: string): Promise<SportEntity | null> {
        const existing = await this.sportRepo.findOne({ where: { key: sportKey } });
        if (existing) return existing;

        const mapping = TOURNAMENT_TO_SPORT_KEY.find(m => m.key === sportKey);
        if (!mapping) return null;

        // SportEntity PK is 'key', group field is 'group'
        const sport = this.sportRepo.create({
            key: sportKey,
            title: mapping.title,
            group: mapping.group,
            active: true,
            category: this.inferCategory(sportKey) as string,
            hasOutrights: false,
        });
        return this.sportRepo.save(sport);
    }

    // ─────────────────────────────────────────────────────────────────────
    // PRIVATE: Helpers
    // ─────────────────────────────────────────────────────────────────────

    private mapTournament(tournamentName: string): { key: string; title: string; group: string; category: SportCategory } | null {
        for (const entry of TOURNAMENT_TO_SPORT_KEY) {
            if (entry.pattern.test(tournamentName)) {
                return {
                    key: entry.key,
                    title: entry.title,
                    group: entry.group,
                    category: this.inferCategory(entry.key),
                };
            }
        }
        return null;
    }

    private inferCategory(sportKey: string): SportCategory {
        if (sportKey.startsWith('soccer_')) return SportCategory.THREE_WAY;
        if (sportKey.startsWith('tennis_')) return SportCategory.HEAD_TO_HEAD;
        return SportCategory.TWO_WAY;
    }

    private getDateString(dayOffset: number): string {
        const d = new Date();
        d.setDate(d.getDate() + dayOffset);
        return d.toISOString().split('T')[0];
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
