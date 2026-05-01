import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Cron } from '@nestjs/schedule';
import { GameEntity } from '../infrastructure/persistence/entities/game.orm-entity';
import { TeamEntity } from '../infrastructure/persistence/entities/team.orm-entity';
import { SportEntity } from '../infrastructure/persistence/entities/sport.orm-entity';
import { SportCategory } from '@sports-prediction-engine/shared-types';
import { JSDOM } from 'jsdom';
import { TeamMatchingService } from './team-matching.service';
import { SofaScoreScraperService, SofaScoreEvent } from './sofascore-scraper.service';
import { EspnScraperService } from './espn-scraper.service';

/**
 * Direct Web Scraper Service
 *
 * Orchestrates all data ingestion.
 * Primary source: SofaScore (50+ leagues, 4 sports, zero API keys).
 * Fallback:       BBC Sport HTML scraping (EPL only).
 *
 * No external paid APIs. No RapidAPI. No BetsAPI.
 */
@Injectable()
export class DirectWebScraperService {
    private readonly logger = new Logger(DirectWebScraperService.name);

    private readonly BBC_EPL_URL = 'https://www.bbc.com/sport/football/premier-league/scores-fixtures';
    private readonly PSL_FIXTURES_URL = 'https://www.psl.co.za/fixtures';

    constructor(
        private readonly httpService: HttpService,
        private readonly espn: EspnScraperService,
        private readonly sofascore: SofaScoreScraperService,
        @InjectRepository(GameEntity)
        private readonly gameRepo: Repository<GameEntity>,
        @InjectRepository(TeamEntity)
        private readonly teamRepo: Repository<TeamEntity>,
        @InjectRepository(SportEntity)
        private readonly sportRepo: Repository<SportEntity>,
        private readonly teamMatching: TeamMatchingService,
    ) {}

    // ─────────────────────────────────────────────────────────────────────
    // Automated sync (every 4 hours — SofaScore covers all leagues)
    // ─────────────────────────────────────────────────────────────────────

    @Cron('0 */4 * * *', { name: 'direct-scraper-sync' })
    async handleCronSync() {
        this.logger.log('[CRON */4h] Starting data sync via SofaScore...');
        await this.syncAll(false);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Full sync: ESPN (primary) → SofaScore fallback → BBC fallback for EPL.
     */
    async syncAll(forceRefresh = false): Promise<any> {
        const start = Date.now();

        if (forceRefresh) {
            await this.gameRepo.delete({ completed: false });
            this.logger.warn('Cleared upcoming games for fresh sync');
        }

        // 1. ESPN — primary source (free, no auth, real fixtures)
        const espnResult = await this.espn.syncUpcomingFixtures(14).catch(err => {
            this.logger.error(`ESPN sync failed: ${err.message}`);
            return { found: 0, saved: 0, sports: [] as string[] };
        });

        // 2. SofaScore fallback (only if ESPN found nothing)
        let sofascoreResult = { found: 0, saved: 0, sports: [] as string[] };
        if (espnResult.found === 0) {
            sofascoreResult = await this.sofascore.syncUpcomingFixtures(7).catch(err => {
                this.logger.error(`SofaScore sync failed: ${err.message}`);
                return { found: 0, saved: 0, sports: [] as string[] };
            });
        }

        // 3. BBC fallback for EPL (only if neither ESPN nor SofaScore got it)
        const eplCovered = espnResult.sports.includes('soccer_epl') || sofascoreResult.sports.includes('soccer_epl');
        let bbcResult = { found: 0, saved: 0 };
        if (!eplCovered) {
            bbcResult = await this.scrapeEPLUpcoming().catch(() => ({ found: 0, saved: 0 }));
        }

        const duration = Date.now() - start;
        this.logger.log(
            `Sync complete in ${duration}ms — ESPN: ${espnResult.saved} saved | SofaScore: ${sofascoreResult.saved} saved | BBC: ${bbcResult.saved} saved`
        );

        return {
            espn: espnResult,
            sofascore: sofascoreResult,
            bbc: bbcResult,
            timestamp: new Date().toISOString(),
            duration_ms: duration,
        };
    }

    /**
     * Scrape upcoming PSL fixtures (used by DirectWebScraperAdapter).
     */
    async scrapePSLUpcoming(): Promise<{ found: number; saved: number }> {
        this.logger.log('Scraping PSL via SofaScore (primary)...');

        try {
            const events = await this.sofascore.syncUpcomingFixtures(7);
            const pslSaved = events.sports.includes('soccer_south_africa_psl') ? events.saved : 0;
            if (pslSaved > 0) return { found: events.found, saved: pslSaved };
        } catch (_) { /* fall through */ }

        // Fallback: PSL official website
        return this.scrapePSLOfficial();
    }

    /**
     * Scrape upcoming EPL fixtures (used by DirectWebScraperAdapter).
     */
    async scrapeEPLUpcoming(): Promise<{ found: number; saved: number }> {
        this.logger.log('Scraping EPL from BBC Sport (fallback)...');
        return this.scrapeBBCEPL();
    }

    /**
     * Fetch live scores right now.
     * Returns SofaScore live events mapped to our format.
     */
    async scrapeLiveScores(): Promise<Array<{
        homeTeam: string;
        awayTeam: string;
        homeScore: number | null;
        awayScore: number | null;
        status: string;
        minute: number | null;
        league: string;
        sportKey: string;
        lastUpdate: string;
    }>> {
        this.logger.log('Fetching live scores from SofaScore...');

        const events = await this.sofascore.fetchLiveScores().catch(err => {
            this.logger.error(`SofaScore live fetch failed: ${err.message}`);
            return [] as SofaScoreEvent[];
        });

        return events.map(e => ({
            homeTeam: e.homeTeam.name,
            awayTeam: e.awayTeam.name,
            homeScore: e.homeScore?.current ?? null,
            awayScore: e.awayScore?.current ?? null,
            status: this.sofascore.getLiveStatus(e),
            minute: this.sofascore.getLiveMinute(e),
            league: e.tournament.name,
            sportKey: this.inferSportKey(e),
            lastUpdate: new Date().toISOString(),
        }));
    }

    /**
     * Scrape results for a given league key.
     * Returns dates as ISO strings for compatibility with callers expecting string dates.
     */
    async scrapeResults(leagueKey: string): Promise<Array<{
        homeTeam: string;
        awayTeam: string;
        homeScore: number;
        awayScore: number;
        date: string;
        status: string;
    }>> {
        this.logger.log(`Fetching results for ${leagueKey} from SofaScore...`);

        const events = await this.sofascore.fetchRecentResults(14).catch(() => [] as SofaScoreEvent[]);

        return events
            .filter(e => {
                const raw = this.sofascore.toRawScore(e);
                return raw && raw.sportKey === leagueKey;
            })
            .map(e => {
                const raw = this.sofascore.toRawScore(e)!;
                return {
                    homeTeam: raw.homeTeam,
                    awayTeam: raw.awayTeam,
                    homeScore: raw.homeScore,
                    awayScore: raw.awayScore,
                    date: raw.date.toISOString(),
                    status: 'FINISHED',
                };
            });
    }

    /**
     * GT Leagues (Esoccer) — no free public source available.
     * Returns empty; the GTLeaguesService handles its own logic.
     */
    async scrapeGTLeagues(): Promise<any[]> {
        return [];
    }

    // ─────────────────────────────────────────────────────────────────────
    // BBC Sport HTML scraper (EPL fallback)
    // ─────────────────────────────────────────────────────────────────────

    private async scrapeBBCEPL(): Promise<{ found: number; saved: number }> {
        let found = 0;
        let saved = 0;

        try {
            const html = await this.fetchPage(this.BBC_EPL_URL);
            const dom = new JSDOM(html);
            const document = dom.window.document;

            for (const group of document.querySelectorAll('.qa-match-block')) {
                const dateText = group.querySelector('h3')?.textContent?.trim();
                if (!dateText) continue;

                for (const matchEl of group.querySelectorAll('li')) {
                    const teams = matchEl.querySelectorAll('.sp-c-fixture__team-name-wrap');
                    if (teams.length !== 2) continue;

                    const homeName = teams[0].textContent?.trim();
                    const awayName = teams[1].textContent?.trim();
                    const time = matchEl.querySelector('.sp-c-fixture__number--time')?.textContent?.trim();
                    const statusText = matchEl.querySelector('.sp-c-fixture__status')?.textContent?.trim();

                    if (homeName && awayName && time) {
                        found++;
                        const commenceTime = this.parseBBCDate(dateText, time);
                        const ok = await this.processFixture(
                            'soccer_epl', 'Premier League', 'Soccer',
                            homeName, awayName, commenceTime, statusText,
                        );
                        if (ok) saved++;
                    }
                }
            }
        } catch (err) {
            this.logger.error(`BBC EPL scrape failed: ${err.message}`);
        }

        return { found, saved };
    }

    // ─────────────────────────────────────────────────────────────────────
    // PSL official website fallback
    // ─────────────────────────────────────────────────────────────────────

    private async scrapePSLOfficial(): Promise<{ found: number; saved: number }> {
        let found = 0;
        let saved = 0;

        try {
            const html = await this.fetchPage(this.PSL_FIXTURES_URL);
            const dom = new JSDOM(html);
            const document = dom.window.document;

            for (const item of document.querySelectorAll('.match-row, .fixture-item, tr.fixture')) {
                const homeTeam = item.querySelector('.home-team, .team-home')?.textContent?.trim();
                const awayTeam = item.querySelector('.away-team, .team-away')?.textContent?.trim();
                const dateTimeStr = item.querySelector('.match-date, .time')?.textContent?.trim();
                const statusText = item.querySelector('.status, .match-status')?.textContent?.trim();

                if (homeTeam && awayTeam && dateTimeStr) {
                    found++;
                    const commenceTime = this.parsePSLDate(dateTimeStr);
                    const ok = await this.processFixture(
                        'soccer_south_africa_psl', 'PSL', 'Soccer',
                        homeTeam, awayTeam, commenceTime, statusText,
                    );
                    if (ok) saved++;
                }
            }
        } catch (err) {
            this.logger.error(`PSL official scrape failed: ${err.message}`);
        }

        return { found, saved };
    }

    // ─────────────────────────────────────────────────────────────────────
    // Fixture persistence
    // ─────────────────────────────────────────────────────────────────────

    private async processFixture(
        sportKey: string,
        sportTitle: string,
        sportGroup: string,
        rawHome: string,
        rawAway: string,
        commenceTime: Date,
        scrapedStatus?: string,
    ): Promise<boolean> {
        const homeTeam = await this.resolveTeam(rawHome, sportKey);
        const awayTeam = await this.resolveTeam(rawAway, sportKey);
        if (!homeTeam || !awayTeam) return false;

        const status = this.normalizeScrapedStatus(scrapedStatus);
        const externalId = `scraper_${sportKey}_${homeTeam.name}_${awayTeam.name}_${commenceTime.toISOString().split('T')[0]}`;

        const existing = await this.gameRepo.createQueryBuilder('game')
            .where('game.sportKey = :sportKey', { sportKey })
            .andWhere('game.completed = false')
            .andWhere('game.homeTeamId = :homeId', { homeId: homeTeam.id })
            .andWhere('game.awayTeamId = :awayId', { awayId: awayTeam.id })
            .getOne();

        if (existing) {
            const diff = Math.abs(existing.commenceTime.getTime() - commenceTime.getTime());
            const changed = diff > 3_600_000 || existing.status !== status;
            if (changed) {
                existing.commenceTime = commenceTime;
                existing.status = status;
                await this.gameRepo.save(existing);
                return true;
            }
            return false;
        }

        // Team-per-day constraint: prevent a team playing twice on the same day
        const matchDate = commenceTime.toISOString().split('T')[0];
        const dayStart = new Date(`${matchDate}T00:00:00Z`);
        const dayEnd = new Date(`${matchDate}T23:59:59Z`);

        const teamAlreadyPlaying = await this.gameRepo.createQueryBuilder('game')
            .where('game.sportKey = :sportKey', { sportKey })
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
                `[Scraper] Skipped: ${rawHome} vs ${rawAway} on ${matchDate} — team already scheduled`,
            );
            return false;
        }

        await this.gameRepo.save({
            id: uuidv4(),
            externalId,
            sportKey,
            sportTitle,
            sportGroup,
            sportCategory: sportKey.startsWith('soccer_') ? SportCategory.THREE_WAY : SportCategory.TWO_WAY,
            homeTeamId: homeTeam.id,
            homeTeam,
            awayTeamId: awayTeam.id,
            awayTeam,
            commenceTime,
            completed: false,
            status: status || 'scheduled',
        });

        return true;
    }

    private async resolveTeam(name: string, sportKey: string): Promise<TeamEntity | null> {
        const teams = await this.teamRepo.find({ where: { sportKey } });
        for (const team of teams) {
            const match = this.teamMatching.matchTeam(name, team.name);
            if (match.matched && match.confidence > 0.80) return team;
        }
        return null;
    }

    private normalizeScrapedStatus(scraped?: string): string {
        if (!scraped) return 'scheduled';
        const s = scraped.toLowerCase();
        if (s.includes('postponed') || s.includes('p-p') || s.includes('tbc')) return 'postponed';
        if (s.includes('cancelled') || s.includes('canc')) return 'cancelled';
        if (s.includes('live') || s.includes('1h') || s.includes('2h')) return 'in_progress';
        return 'scheduled';
    }

    // ─────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────

    private inferSportKey(event: SofaScoreEvent): string {
        // Try to match tournament name to known key
        const name = event.tournament.name;
        const knownMappings: Array<[RegExp, string]> = [
            [/premier league/i, 'soccer_epl'],
            [/la liga|laliga/i, 'soccer_spain_la_liga'],
            [/bundesliga/i, 'soccer_germany_bundesliga'],
            [/serie a/i, 'soccer_italy_serie_a'],
            [/ligue 1/i, 'soccer_france_ligue_one'],
            [/psl|dstv|betway prem/i, 'soccer_south_africa_psl'],
            [/champions league/i, 'soccer_uefa_champions_league'],
            [/nba/i, 'basketball_nba'],
        ];
        for (const [pattern, key] of knownMappings) {
            if (pattern.test(name)) return key;
        }
        // Fallback: derive from sport slug
        return 'soccer_other';
    }

    private parseBBCDate(dateHeader: string, timeStr: string): Date {
        try {
            const cleanDate = dateHeader.split(' ').slice(1).join(' ');
            const year = new Date().getFullYear();
            const d = new Date(`${cleanDate} ${year} ${timeStr}`);
            return isNaN(d.getTime()) ? new Date(`${cleanDate} ${year + 1} ${timeStr}`) : d;
        } catch {
            return new Date();
        }
    }

    private parsePSLDate(dateStr: string): Date {
        try {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? new Date() : d;
        } catch {
            return new Date();
        }
    }

    private async fetchPage(url: string): Promise<string> {
        const response = await firstValueFrom(
            this.httpService.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                },
                timeout: 12_000,
            }),
        );
        return response.data;
    }
}
