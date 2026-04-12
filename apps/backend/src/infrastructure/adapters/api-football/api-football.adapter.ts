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
    // African leagues (priority)
    { id: 288, key: 'soccer_south_africa_psl', title: 'PSL (South Africa)', group: 'Soccer' },
    { id: 246, key: 'soccer_egypt_premier_league', title: 'Egypt Premier League', group: 'Soccer' },
    { id: 201, key: 'soccer_morocco_botola', title: 'Botola Pro (Morocco)', group: 'Soccer' },
    { id: 184, key: 'soccer_nigeria_npl', title: 'NPL (Nigeria)', group: 'Soccer' },
    { id: 204, key: 'soccer_ghana_premier', title: 'Ghana Premier League', group: 'Soccer' },
    { id: 287, key: 'soccer_tunisia_ligue_1', title: 'Tunisia Ligue 1', group: 'Soccer' },
    { id: 206, key: 'soccer_algeria_ligue_1', title: 'Algeria Ligue 1', group: 'Soccer' },
    { id: 179, key: 'soccer_kenya_premier', title: 'Kenya Premier League', group: 'Soccer' },
    { id: 307, key: 'soccer_tanzania_premier', title: 'Tanzania Premier League', group: 'Soccer' },
    { id: 172, key: 'soccer_cameroon_elite_one', title: 'Elite One (Cameroon)', group: 'Soccer' },
    // CAF competitions
    { id: 14, key: 'soccer_caf_champions_league', title: 'CAF Champions League', group: 'Soccer' },
    { id: 513, key: 'soccer_caf_confederation_cup', title: 'CAF Confederation Cup', group: 'Soccer' },
    { id: 1, key: 'soccer_africa_cup_of_nations', title: 'Africa Cup of Nations', group: 'Soccer' },
    // Top European leagues (for context)
    { id: 39, key: 'soccer_epl', title: 'Premier League', group: 'Soccer' },
    { id: 140, key: 'soccer_spain_la_liga', title: 'La Liga', group: 'Soccer' },
    { id: 135, key: 'soccer_italy_serie_a', title: 'Serie A', group: 'Soccer' },
    { id: 78, key: 'soccer_germany_bundesliga', title: 'Bundesliga', group: 'Soccer' },
    { id: 61, key: 'soccer_france_ligue_one', title: 'Ligue 1', group: 'Soccer' },
    { id: 2, key: 'soccer_uefa_champs_league', title: 'UEFA Champions League', group: 'Soccer' },
];

@Injectable()
export class ApiFootballAdapter implements SportsDataPort {
    private readonly logger = new Logger(ApiFootballAdapter.name);
    private readonly baseUrl: string;
    private readonly apiKey: string;
    private readonly apiHost: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.baseUrl = this.configService.get<string>('API_FOOTBALL_BASE_URL') ?? 'https://v3.football.api-sports.io';
        this.apiKey = this.configService.get<string>('API_FOOTBALL_KEY') ?? '';
        this.apiHost = this.configService.get<string>('API_FOOTBALL_HOST') ?? 'v3.football.api-sports.io';

        if (!this.apiKey || this.apiKey === 'your_api_key_here') {
            this.logger.warn('⚠️  API_FOOTBALL_KEY is not set. Get your key at https://dashboard.api-football.com');
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
        if (!this.apiKey || this.apiKey === 'your_api_key_here') return {} as T;

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
                    // fallback removed
                    return [] as unknown as T;
                }
                throw new Error(JSON.stringify(data.errors));
            }

            return data;
        } catch (error: any) {
            const status = error.response?.status;
            if (status === 429 || status === 401 || status === 403) {
                this.logger.warn(`API quota reached (Status ${status}). Switching to MOCK FALLBACK.`);
                // fallback removed
                return [] as unknown as T;
            }
            throw error;
        }
    }

}
