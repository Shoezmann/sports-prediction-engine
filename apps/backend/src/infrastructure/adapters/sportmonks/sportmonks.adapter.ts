import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type {
    SportsDataPort,
    RawGameData,
    RawScoreData,
    RawOddsData,
    RawBookmakerData,
} from '../../../domain/ports/output';
import { Sport } from '../../../domain/entities';

/**
 * Sportmonks African Football Data Adapter
 *
 * Provides comprehensive African league data including:
 * - South Africa PSL
 * - Egypt Premier League
 * - Morocco Botola Pro
 * - Nigeria NPL
 * - CAF Champions League
 * - CAF Confederation Cup
 * - And more
 *
 * Sign up at https://my.sportmonks.com to get your API token.
 * Free tier: 50 requests/day (enough for syncing African leagues)
 * Paid: $15/mo for 1000 requests/day + odds data
 */
@Injectable()
export class SportmonksAdapter implements SportsDataPort {
    private readonly logger = new Logger(SportmonksAdapter.name);
    private readonly baseUrl: string;
    private readonly apiToken: string;

    // African league IDs from Sportmonks
    private readonly AFRICAN_LEAGUES = [
        { id: 501, key: 'soccer_south_africa_psl', title: 'PSL (South Africa)', group: 'Soccer' },
        { id: 384, key: 'soccer_egypt_premier_league', title: 'Egypt Premier League', group: 'Soccer' },
        { id: 386, key: 'soccer_morocco_botola', title: 'Botola Pro (Morocco)', group: 'Soccer' },
        { id: 387, key: 'soccer_nigeria_npl', title: 'NPL (Nigeria)', group: 'Soccer' },
        { id: 396, key: 'soccer_ghana_premier', title: 'Ghana Premier League', group: 'Soccer' },
        { id: 388, key: 'soccer_tunisia_ligue_1', title: 'Tunisia Ligue 1', group: 'Soccer' },
        { id: 389, key: 'soccer_algeria_ligue_1', title: 'Algeria Ligue 1', group: 'Soccer' },
        { id: 390, key: 'soccer_kenya_premier', title: 'Kenya Premier League', group: 'Soccer' },
        { id: 502, key: 'soccer_tanzania_premier', title: 'Tanzania Premier League', group: 'Soccer' },
        { id: 392, key: 'soccer_cameroon_elite_one', title: 'Elite One (Cameroon)', group: 'Soccer' },
        // CAF competitions
        { id: 2, key: 'soccer_caf_champions_league', title: 'CAF Champions League', group: 'Soccer' },
        { id: 8, key: 'soccer_caf_confederation_cup', title: 'CAF Confederation Cup', group: 'Soccer' },
    ];

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.baseUrl = 'https://api.sportmonks.com/v3/football';
        this.apiToken = this.configService.get<string>('SPORTMONKS_TOKEN') ?? '';

        if (!this.apiToken || this.apiToken === 'your_sportmonks_token_here') {
            this.logger.warn('⚠️  SPORTMONKS_TOKEN is not set. Get your token at https://my.sportmonks.com');
        }
    }

    async fetchSports(): Promise<Sport[]> {
        return this.AFRICAN_LEAGUES.map((l) =>
            Sport.create({
                key: l.key,
                group: l.group,
                title: l.title,
                description: 'Sportmonks African Football',
                active: true,
                hasOutrights: false,
                lastSyncedAt: new Date(),
            }),
        );
    }

    async fetchUpcomingGames(sportKey: string): Promise<RawGameData[]> {
        const league = this.AFRICAN_LEAGUES.find(l => l.key === sportKey);
        if (!league) return [];

        try {
            // Fetch upcoming fixtures for this league
            const data = await this.makeRequest<any>(`/fixtures/upcoming/league/${league.id}`, {
                include: 'localTeam;visitorTeam',
            });

            const fixtures = data.data || [];
            this.logger.log(`Fetched ${fixtures.length} upcoming fixtures for ${sportKey}`);

            return fixtures.map((f: any) => ({
                externalId: f.id?.toString() || f.fixture_id?.toString(),
                sportKey: sportKey,
                commenceTime: f.starting_at || f.date,
                homeTeam: f.local_team?.name || f.localTeam?.name || 'Home',
                awayTeam: f.visitor_team?.name || f.visitorTeam?.name || 'Away',
            }));
        } catch (error) {
            this.logger.error(`Failed to fetch fixtures for ${sportKey}`, error.message);
            return [];
        }
    }

    async fetchScores(sportKey: string, daysFrom: number = 3): Promise<RawScoreData[]> {
        const league = this.AFRICAN_LEAGUES.find(l => l.key === sportKey);
        if (!league) return [];

        try {
            // Fetch recent results
            const data = await this.makeRequest<any>(`/fixtures/league/${league.id}`, {
                include: 'localTeam;visitorTeam',
                from: this.getDaysAgo(daysFrom),
                to: this.getToday(),
            });

            const fixtures = data.data || [];
            this.logger.log(`Fetched ${fixtures.length} scores for ${sportKey}`);

            return fixtures
                .filter((f: any) => ['FT', 'AET', 'PEN'].includes(f.time?.status))
                .map((f: any) => ({
                    externalId: f.id?.toString() || f.fixture_id?.toString(),
                    sportKey: sportKey,
                    completed: true,
                    homeTeam: f.local_team?.name || f.localTeam?.name || 'Home',
                    awayTeam: f.visitor_team?.name || f.visitorTeam?.name || 'Away',
                    homeScore: f.scores?.localteam_score ?? f.localteam_score ?? null,
                    awayScore: f.scores?.visitorteam_score ?? f.visitorteam_score ?? null,
                    lastUpdate: f.time?.starting_at?.date || new Date().toISOString(),
                }));
        } catch (error) {
            this.logger.error(`Failed to fetch scores for ${sportKey}`, error.message);
            return [];
        }
    }

    async fetchOdds(sportKey: string): Promise<RawOddsData[]> {
        const league = this.AFRICAN_LEAGUES.find(l => l.key === sportKey);
        if (!league) return [];

        try {
            // Fetch odds for upcoming fixtures
            const data = await this.makeRequest<any>(`/fixtures/upcoming/league/${league.id}`, {
                include: 'odds;localTeam;visitorTeam',
            });

            const fixtures = data.data || [];
            this.logger.log(`Fetched odds for ${fixtures.length} fixtures in ${sportKey}`);

            return fixtures
                .filter((f: any) => f.odds?.length > 0)
                .map((f: any) => {
                    const odds = f.odds[0];
                    const bookmakers: RawBookmakerData[] = [];

                    if (odds.data) {
                        const bookie = {
                            key: 'sportmonks',
                            title: 'Sportmonks',
                            markets: [{
                                key: 'h2h',
                                outcomes: [
                                    { name: f.local_team?.name || f.localTeam?.name || 'Home', price: parseFloat(odds.data.find((o: any) => o.label === 'Home')?.value || '1.9') },
                                    { name: 'Draw', price: parseFloat(odds.data.find((o: any) => o.label === 'Draw')?.value || '3.3') },
                                    { name: f.visitor_team?.name || f.visitorTeam?.name || 'Away', price: parseFloat(odds.data.find((o: any) => o.label === 'Away')?.value || '3.9') },
                                ],
                            }],
                        };
                        bookmakers.push(bookie);
                    }

                    return {
                        externalId: f.id?.toString() || f.fixture_id?.toString(),
                        sportKey: sportKey,
                        homeTeam: f.local_team?.name || f.localTeam?.name || 'Home',
                        awayTeam: f.visitor_team?.name || f.visitorTeam?.name || 'Away',
                        bookmakers,
                    };
                });
        } catch (error) {
            this.logger.error(`Failed to fetch odds for ${sportKey}`, error.message);
            return [];
        }
    }

    private async makeRequest<T>(path: string, params: Record<string, string> = {}): Promise<T> {
        if (!this.apiToken || this.apiToken === 'your_sportmonks_token_here') {
            return {} as T;
        }

        const url = `${this.baseUrl}/${path}`;
        const response = await firstValueFrom(
            this.httpService.get<T>(url, {
                params: {
                    api_token: this.apiToken,
                    ...params,
                },
                timeout: 15_000,
            }),
        );
        return response.data;
    }

    private getDaysAgo(days: number): string {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0];
    }

    private getToday(): string {
        return new Date().toISOString().split('T')[0];
    }
}
