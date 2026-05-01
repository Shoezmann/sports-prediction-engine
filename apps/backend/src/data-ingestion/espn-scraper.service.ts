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
import { ESPN_LEAGUES, getEspnScoreboardSlug, LeagueConfig } from './league.config';

export interface EspnMatchResult {
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    date: string;
    status: string;
    leagueKey: string;
}

const ESPN_SCOREBOARD_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

@Injectable()
export class EspnScraperService {
    private readonly logger = new Logger(EspnScraperService.name);

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

    /**
     * Sync upcoming fixtures from ESPN for all configured leagues.
     */
    async syncUpcomingFixtures(daysAhead = 14): Promise<{ found: number; saved: number; sports: string[] }> {
        let totalFound = 0;
        let totalSaved = 0;
        const sportsUsed = new Set<string>();

        const leagues = ESPN_LEAGUES.filter(l => l.sport === 'soccer' || l.sport === 'basketball');

        for (const league of leagues) {
            try {
                const result = await this.syncLeague(league, daysAhead);
                totalFound += result.found;
                totalSaved += result.saved;
                if (result.saved > 0) sportsUsed.add(league.key);

                // Rate limiting
                await this.delay(1500);
            } catch (err) {
                this.logger.warn(`ESPN sync failed for ${league.key}: ${err.message}`);
            }
        }

        this.logger.log(`ESPN sync complete: ${totalFound} found, ${totalSaved} saved across ${sportsUsed.size} leagues`);
        return { found: totalFound, saved: totalSaved, sports: [...sportsUsed] };
    }

    /**
     * Fetch recent match results from ESPN for all configured leagues.
     */
    async fetchRecentResults(daysBack = 14): Promise<EspnMatchResult[]> {
        const results: EspnMatchResult[] = [];
        const leagues = ESPN_LEAGUES.filter(l => l.sport === 'soccer' || l.sport === 'basketball');

        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - daysBack);

        const startStr = this.formatDate(start);
        const endStr = this.formatDate(end);

        for (const league of leagues) {
            const slug = getEspnScoreboardSlug(league);
            if (!slug) continue;

            try {
                const url = `${ESPN_SCOREBOARD_BASE}/${slug}/scoreboard?dates=${startStr}-${endStr}`;
                const response = await firstValueFrom(
                    this.httpService.get(url, {
                        headers: { 'Accept': 'application/json' },
                        timeout: 15_000,
                    }),
                );

                const events = response.data?.events ?? [];
                for (const event of events) {
                    const status = event.status?.type?.name;
                    if (status !== 'STATUS_FULL_TIME' && status !== 'STATUS_FINAL') continue;

                    const competition = event.competitions?.[0];
                    if (!competition) continue;

                    const competitors = competition.competitors;
                    if (!competitors || competitors.length < 2) continue;

                    const homeData = competitors.find((c: any) => c.homeAway === 'home') ?? competitors[0];
                    const awayData = competitors.find((c: any) => c.homeAway === 'away') ?? competitors[1];

                    const homeName = homeData.team?.displayName || homeData.team?.name;
                    const awayName = awayData.team?.displayName || awayData.team?.name;
                    const homeScore = parseInt(homeData.score, 10);
                    const awayScore = parseInt(awayData.score, 10);

                    if (!homeName || !awayName || isNaN(homeScore) || isNaN(awayScore)) continue;

                    results.push({
                        homeTeam: homeName,
                        awayTeam: awayName,
                        homeScore,
                        awayScore,
                        date: event.date,
                        status: 'FINISHED',
                        leagueKey: league.key,
                    });
                }

                await this.delay(1500);
            } catch (err) {
                this.logger.warn(`ESPN results fetch failed for ${league.key}: ${err.message}`);
            }
        }

        this.logger.log(`ESPN results: ${results.length} finished matches across ${leagues.length} leagues`);
        return results;
    }

    private async syncLeague(league: LeagueConfig, daysAhead: number): Promise<{ found: number; saved: number }> {
        const slug = getEspnScoreboardSlug(league);
        if (!slug) return { found: 0, saved: 0 };

        const now = new Date();
        const end = new Date();
        end.setDate(end.getDate() + daysAhead);

        const startStr = this.formatDate(now);
        const endStr = this.formatDate(end);
        const url = `${ESPN_SCOREBOARD_BASE}/${slug}/scoreboard?dates=${startStr}-${endStr}`;

        this.logger.debug(`[ESPN] Fetching ${league.name}: ${url}`);

        const response = await firstValueFrom(
            this.httpService.get(url, {
                headers: { 'Accept': 'application/json' },
                timeout: 15_000,
            }),
        );

        const events = response.data?.events ?? [];
        let found = 0;
        let saved = 0;

        for (const event of events) {
            found++;
            const ok = await this.saveEvent(event, league);
            if (ok) saved++;
        }

        if (found > 0) {
            this.logger.log(`[ESPN] ${league.name}: ${found} found, ${saved} saved`);
        }

        return { found, saved };
    }

    private async saveEvent(event: any, league: LeagueConfig): Promise<boolean> {
        const competition = event.competitions?.[0];
        if (!competition) return false;

        const competitors = competition.competitors;
        if (!competitors || competitors.length < 2) return false;

        // ESPN: competitors[0] is home (or first listed), competitors[1] is away
        const homeData = competitors.find((c: any) => c.homeAway === 'home') ?? competitors[0];
        const awayData = competitors.find((c: any) => c.homeAway === 'away') ?? competitors[1];

        const homeName = homeData.team?.displayName || homeData.team?.name;
        const awayName = awayData.team?.displayName || awayData.team?.name;
        if (!homeName || !awayName) return false;

        const commenceTime = new Date(event.date);
        if (isNaN(commenceTime.getTime())) return false;

        // Skip past events
        if (commenceTime < new Date()) return false;

        // Skip finished events
        const status = event.status?.type?.name;
        if (status === 'STATUS_FINAL' || status === 'STATUS_FULL_TIME') return false;

        const homeTeam = await this.resolveOrCreateTeam(homeName, league.key);
        const awayTeam = await this.resolveOrCreateTeam(awayName, league.key);
        if (!homeTeam || !awayTeam) return false;

        const dateStr = commenceTime.toISOString().split('T')[0];
        const externalId = `espn_${league.key}_${homeTeam.name}_${awayTeam.name}_${dateStr}`;

        // 1. Check by ESPN externalId
        const existing = await this.gameRepo.findOne({ where: { externalId } });
        if (existing) {
            const timeDiff = Math.abs(existing.commenceTime.getTime() - commenceTime.getTime());
            if (timeDiff > 3_600_000) {
                existing.commenceTime = commenceTime;
                await this.gameRepo.save(existing);
                return true;
            }
            return false;
        }

        // 2. Cross-source dedup: same teams already scheduled
        const crossSourceDup = await this.gameRepo.createQueryBuilder('game')
            .where('game.sportKey = :sportKey', { sportKey: league.key })
            .andWhere('game.completed = false')
            .andWhere('game.homeTeamId = :homeId', { homeId: homeTeam.id })
            .andWhere('game.awayTeamId = :awayId', { awayId: awayTeam.id })
            .getOne();

        if (crossSourceDup) {
            const timeDiff = Math.abs(crossSourceDup.commenceTime.getTime() - commenceTime.getTime());
            if (timeDiff > 3_600_000) {
                crossSourceDup.commenceTime = commenceTime;
                crossSourceDup.externalId = externalId;
                await this.gameRepo.save(crossSourceDup);
                return true;
            }
            return false;
        }

        // 3. Team-per-day constraint
        const dayStart = new Date(`${dateStr}T00:00:00Z`);
        const dayEnd = new Date(`${dateStr}T23:59:59Z`);

        const teamAlreadyPlaying = await this.gameRepo.createQueryBuilder('game')
            .where('game.sportKey = :sportKey', { sportKey: league.key })
            .andWhere('game.completed = false')
            .andWhere('game.commenceTime >= :dayStart', { dayStart })
            .andWhere('game.commenceTime <= :dayEnd', { dayEnd })
            .andWhere(
                '(game.homeTeamId = :homeId OR game.awayTeamId = :homeId OR game.homeTeamId = :awayId OR game.awayTeamId = :awayId)',
                { homeId: homeTeam.id, awayId: awayTeam.id },
            )
            .getOne();

        if (teamAlreadyPlaying) {
            this.logger.debug(`[ESPN] Skipped: ${homeName} vs ${awayName} on ${dateStr} — team already scheduled`);
            return false;
        }

        // Resolve sport metadata
        const sport = await this.sportRepo.findOne({ where: { key: league.key } });
        const category = sport?.category || (league.category === 'THREE_WAY' ? SportCategory.THREE_WAY : SportCategory.TWO_WAY);
        const group = sport?.group || (league.sport === 'soccer' ? 'Soccer' : league.sport === 'basketball' ? 'Basketball' : 'Other');

        await this.gameRepo.save({
            id: uuidv4(),
            externalId,
            sportKey: league.key,
            sportTitle: league.name,
            sportGroup: group,
            sportCategory: category as string,
            homeTeamId: homeTeam.id,
            homeTeam,
            awayTeamId: awayTeam.id,
            awayTeam,
            commenceTime,
            completed: false,
            status: 'scheduled',
        });

        this.logger.debug(`[ESPN] Saved: ${homeTeam.name} vs ${awayTeam.name} (${league.name}) @ ${commenceTime.toISOString()}`);
        return true;
    }

    private async resolveOrCreateTeam(name: string, sportKey: string): Promise<TeamEntity | null> {
        const existing = await this.teamRepo.find({ where: { sportKey } });

        // 1. Exact match (case-insensitive)
        const exact = existing.find(t => t.name.toLowerCase() === name.toLowerCase());
        if (exact) return exact;

        // 2. Fuzzy match
        for (const team of existing) {
            const result = this.teamMatching.matchTeam(name, team.name);
            if (result.matched && result.confidence > 0.75) return team;
        }

        // 3. Create new team
        await this.getOrCreateSport(sportKey);

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

        const league = ESPN_LEAGUES.find(l => l.key === sportKey);
        if (!league) return null;

        const group = league.sport === 'soccer' ? 'Soccer' : league.sport === 'basketball' ? 'Basketball' : 'Other';
        const category = league.category === 'THREE_WAY' ? SportCategory.THREE_WAY
            : league.category === 'TWO_WAY' ? SportCategory.TWO_WAY
            : SportCategory.HEAD_TO_HEAD;

        const sport = this.sportRepo.create({
            key: sportKey,
            title: league.name,
            group,
            active: true,
            category: category as string,
            hasOutrights: false,
        });
        return this.sportRepo.save(sport);
    }

    private formatDate(d: Date): string {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}${m}${day}`;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
