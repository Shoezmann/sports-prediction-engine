import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SportCategory } from '@sports-prediction-engine/shared-types';
import type {
    SportsDataPort,
    RawGameData,
    RawScoreData,
    RawOddsData,
    RawBookmakerData,
} from '../../../domain/ports/output';
import { Sport } from '../../../domain/entities';

const API_FOOTBALL_LEAGUES = [
    { id: 39, key: 'soccer_epl', title: 'Premier League', group: 'Soccer' },
    { id: 140, key: 'soccer_spain_la_liga', title: 'La Liga', group: 'Soccer' },
    { id: 135, key: 'soccer_italy_serie_a', title: 'Serie A', group: 'Soccer' },
    { id: 78, key: 'soccer_germany_bundesliga', title: 'Bundesliga', group: 'Soccer' },
    { id: 61, key: 'soccer_france_ligue_one', title: 'Ligue 1', group: 'Soccer' },
    { id: 2, key: 'soccer_uefa_champs_league', title: 'UEFA Champions League', group: 'Soccer' },
    { id: 288, key: 'soccer_south_africa_psl', title: 'PSL (South Africa)', group: 'Soccer' },
];

@Injectable()
export class ApiFootballAdapter implements SportsDataPort {
    private readonly logger = new Logger(ApiFootballAdapter.name);
    private readonly baseUrl: string;
    private readonly apiKey: string;
    private readonly apiHost: string;

    private fallbackMode = false;
    private mockTeams = ['Arsenal', 'Chelsea', 'Liverpool', 'Man City', 'Man United', 'Spurs', 'Newcastle', 'Mamelodi Sundowns', 'Orlando Pirates', 'Kaizer Chiefs', 'SuperSport United'];

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.baseUrl = this.configService.get<string>('API_FOOTBALL_BASE_URL') ?? 'https://v3.football.api-sports.io';
        this.apiKey = this.configService.get<string>('API_FOOTBALL_KEY') ?? '';
        this.apiHost = this.configService.get<string>('API_FOOTBALL_HOST') ?? 'v3.football.api-sports.io';

        if (!this.apiKey || this.apiKey === 'your_api_key_here') {
            this.logger.warn('⚠️  API_FOOTBALL_KEY is not set. API calls will fail. Using mock fallback.');
            this.fallbackMode = true;
        }
    }

    async fetchSports(): Promise<Sport[]> {
        return API_FOOTBALL_LEAGUES.map((l) =>
            Sport.create({
                key: l.key,
                group: l.group,
                title: l.title,
                description: 'API-Football League',
                active: true,
                hasOutrights: false,
                lastSyncedAt: new Date(),
            }),
        );
    }

    async fetchUpcomingGames(sportKey: string): Promise<RawGameData[]> {
        const league = API_FOOTBALL_LEAGUES.find(l => l.key === sportKey);
        if (!league) return [];

        try {
            const data = await this.makeRequest<any>(`/fixtures`, { league: league.id.toString(), next: '50' });
            if (!data.response) return [];

            this.logger.log(`Fetched ${data.response.length} upcoming events for ${sportKey}`);

            return data.response.map((f: any) => ({
                externalId: f.fixture.id.toString(),
                sportKey: sportKey,
                commenceTime: f.fixture.date,
                homeTeam: f.teams.home.name,
                awayTeam: f.teams.away.name,
            }));
        } catch (error) {
            this.logger.error(`Failed to fetch events for ${sportKey}`, error);
            return [];
        }
    }

    async fetchScores(sportKey: string, daysFrom: number = 3): Promise<RawScoreData[]> {
        const league = API_FOOTBALL_LEAGUES.find(l => l.key === sportKey);
        if (!league) return [];

        try {
            const data = await this.makeRequest<any>(`/fixtures`, { league: league.id.toString(), last: '50' });
            if (!data.response) return [];

            this.logger.log(`Fetched ${data.response.length} scores for ${sportKey}`);

            return data.response.map((f: any) => ({
                externalId: f.fixture.id.toString(),
                sportKey: sportKey,
                completed: ['FT', 'AET', 'PEN'].includes(f.fixture.status.short),
                homeTeam: f.teams.home.name,
                awayTeam: f.teams.away.name,
                homeScore: f.goals.home ?? null,
                awayScore: f.goals.away ?? null,
                lastUpdate: new Date().toISOString(),
            }));
        } catch (error) {
            this.logger.error(`Failed to fetch scores for ${sportKey}`, error);
            return [];
        }
    }

    async fetchOdds(sportKey: string): Promise<RawOddsData[]> {
        const league = API_FOOTBALL_LEAGUES.find(l => l.key === sportKey);
        if (!league) return [];

        try {
            const currentYear = new Date().getFullYear().toString();
            // Fetch odds for the upcoming page of fixtures. This might need to be fine-tuned or paginated.
            const data = await this.makeRequest<any>(`/odds`, { league: league.id.toString(), season: currentYear });
            if (!data.response) return [];

            this.logger.log(`Fetched odds for ${data.response.length} events in ${sportKey}`);

            return data.response.map((o: any) => {
                const h2hMarket = o.bookmakers[0]?.bets.find((b: any) => b.name === 'Match Winner');
                const outcomes = h2hMarket?.values.map((v: any) => ({
                    name: v.value === 'Home' ? o.fixture.home_name : v.value === 'Away' ? o.fixture.away_name : 'Draw',
                    price: parseFloat(v.odd),
                })) || [];

                return {
                    externalId: o.fixture.id.toString(),
                    sportKey: sportKey,
                    homeTeam: 'Home Team', // Unfortunately, /odds doesn't return team names directly without joining. We mapped names in outcomes best effort.
                    awayTeam: 'Away Team',
                    bookmakers: [
                        {
                            key: o.bookmakers[0]?.name || 'default',
                            title: o.bookmakers[0]?.name || 'Default Bookie',
                            markets: [{
                                key: 'h2h',
                                outcomes: outcomes,
                            }],
                        },
                    ],
                };
            });
        } catch (error) {
            this.logger.error(`Failed to fetch odds for ${sportKey}`, error);
            return [];
        }
    }

    private async makeRequest<T>(path: string, params: Record<string, string> = {}): Promise<T> {
        if (this.fallbackMode) return this.generateMockResponse<T>(path);

        const url = `${this.baseUrl}${path}`;
        try {
            const response = await firstValueFrom(
                this.httpService.get<T>(url, {
                    params,
                    headers: {
                        'x-apisports-key': this.apiKey,
                        'x-apisports-host': this.apiHost,
                        // support rapidapi format
                        'x-rapidapi-key': this.apiKey,
                        'x-rapidapi-host': this.apiHost,
                    },
                    timeout: 10_000,
                }),
            );

            // API Sports return structure passes errors inside `errors` prop instead of http status sometimes
            const data = response.data as any;
            if (data.errors && Object.keys(data.errors).length > 0) {
                if (data.errors.rateLimit || data.errors.token || String(data.errors.requests).includes('limit')) {
                    this.logger.warn(`API-Football Quota limit or Invalid Key. Switching to MOCK. Error: ${JSON.stringify(data.errors)}`);
                    this.fallbackMode = true;
                    return this.generateMockResponse<T>(path);
                }
                throw new Error(JSON.stringify(data.errors));
            }

            return data;
        } catch (error: any) {
            const status = error.response?.status;
            if (status === 429 || status === 401 || status === 403) {
                this.logger.warn(`API quota reached (Status ${status}). Switching to MOCK FALLBACK.`);
                this.fallbackMode = true;
                return this.generateMockResponse<T>(path);
            }
            throw error;
        }
    }

    private generateMockResponse<T>(path: string): T {
        const numItems = Math.floor(Math.random() * 3) + 2;

        if (path.includes('fixtures')) {
            const events = [];
            for (let i = 0; i < numItems; i++) {
                const home = this.mockTeams[Math.floor(Math.random() * 4)];
                const away = this.mockTeams[4 + Math.floor(Math.random() * 4)];
                const isScores = path.includes('last');

                let commenceTime = new Date();
                if (isScores) {
                    commenceTime = new Date(Date.now() - 86400000);
                } else {
                    commenceTime.setHours(commenceTime.getHours() + Math.floor(Math.random() * 48) + 1);
                }

                events.push({
                    fixture: {
                        id: Date.now() + i,
                        date: commenceTime.toISOString(),
                        status: { short: isScores ? 'FT' : 'NS' }
                    },
                    teams: {
                        home: { name: home },
                        away: { name: away }
                    },
                    goals: isScores ? {
                        home: Math.floor(Math.random() * 4),
                        away: Math.floor(Math.random() * 4)
                    } : { home: null, away: null }
                });
            }
            return { response: events } as unknown as T;
        }

        if (path.includes('odds')) {
            const odds = [];
            for (let i = 0; i < 5; i++) {
                odds.push({
                    fixture: { id: Date.now() + i, home_name: 'Mock Home', away_name: 'Mock Away' },
                    bookmakers: [{
                        name: 'MockBookie',
                        bets: [{
                            name: 'Match Winner',
                            values: [
                                { value: 'Home', odd: (1.5 + Math.random()).toFixed(2) },
                                { value: 'Away', odd: (2.5 + Math.random()).toFixed(2) },
                                { value: 'Draw', odd: (3.0 + Math.random()).toFixed(2) }
                            ]
                        }]
                    }]
                });
            }
            return { response: odds } as unknown as T;
        }

        return { response: [] } as unknown as T;
    }
}
