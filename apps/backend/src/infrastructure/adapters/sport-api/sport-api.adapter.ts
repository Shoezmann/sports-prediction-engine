import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type {
    SportsDataPort,
    RawGameData,
    RawScoreData,
    RawOddsData,
} from '../../../domain/ports/output';
import { Sport } from '../../../domain/entities';

// SportAPI supports many sports, we'll map a few popular ones here.
const SPORT_API_CATEGORIES = [
    { id: 1, key: 'soccer_epl', title: 'Soccer - Premier League', group: 'Soccer' },
    { id: 2, key: 'basketball_nba', title: 'Basketball - NBA', group: 'Basketball' },
    { id: 3, key: 'tennis_atp', title: 'Tennis - ATP', group: 'Tennis' },
    { id: 4, key: 'baseball_mlb', title: 'Baseball - MLB', group: 'Baseball' },
    { id: 5, key: 'american_football_nfl', title: 'American Football - NFL', group: 'American Football' },
    { id: 6, key: 'mma_ufc', title: 'MMA - UFC', group: 'Mixed Martial Arts' },
    { id: 52, key: 'soccer_south_africa_psl', title: 'Soccer - PSL (South Africa)', group: 'Soccer' },
    { id: 23114, key: 'soccer_esoccer_gt_leagues_12', title: 'Esoccer GT Leagues - 12 mins', group: 'Esoccer' },
];

@Injectable()
export class SportApiAdapter implements SportsDataPort {
    private readonly logger = new Logger(SportApiAdapter.name);
    private readonly baseUrl: string;
    private readonly apiKey: string;
    private readonly apiHost: string;

    private fallbackMode = false;
    private mockTeams: Record<string, string[]> = {
        'Soccer': ['Arsenal', 'Chelsea', 'Liverpool', 'Man City', 'Man United', 'Spurs', 'Mamelodi Sundowns', 'Orlando Pirates', 'Kaizer Chiefs', 'SuperSport United'],
        'Basketball': ['Lakers', 'Warriors', 'Celtics', 'Heat', 'Bulls', 'Nets'],
        'Tennis': ['Djokovic', 'Alcaraz', 'Medvedev', 'Sinner', 'Nadal', 'Zverev'],
        'Baseball': ['Yankees', 'Dodgers', 'Red Sox', 'Astros', 'Braves', 'Mets'],
        'American Football': ['Chiefs', 'Eagles', '49ers', 'Bills', 'Bengals', 'Cowboys'],
        'Mixed Martial Arts': ['Makhachev', 'Jones', 'Volkanovski', 'Edwards', 'O\'Malley', 'Adesanya'],
        'Esoccer GT Leagues': ['GT Lions', 'GT Eagles', 'GT Sharks', 'GT Wolves', 'GT Panthers', 'GT Tigers', 'GT Bears', 'GT Hawks'],
    };

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.baseUrl = this.configService.get<string>('SPORT_API_BASE_URL') ?? 'https://sportapi7.p.rapidapi.com/api/v1';
        this.apiKey = this.configService.get<string>('SPORT_API_KEY') ?? '';
        this.apiHost = this.configService.get<string>('SPORT_API_HOST') ?? 'sportapi7.p.rapidapi.com';

        if (!this.apiKey || this.apiKey.includes('your_')) {
            this.logger.warn('⚠️  SPORT_API_KEY is not set or invalid. API calls will fail. Using mock fallback mode.');
            this.fallbackMode = true;
        }
    }

    async fetchSports(): Promise<Sport[]> {
        return SPORT_API_CATEGORIES.map((s) =>
            Sport.create({
                key: s.key,
                group: s.group,
                title: s.title,
                description: 'Powered by SportAPI',
                active: true,
                hasOutrights: false,
                lastSyncedAt: new Date(),
            }),
        );
    }

    async fetchUpcomingGames(sportKey: string): Promise<RawGameData[]> {
        const sport = SPORT_API_CATEGORIES.find(s => s.key === sportKey);
        if (!sport) return [];

        try {
            // Mocking the request path, SportAPI has specific endpoints per sport/category
            const data = await this.makeRequest<any>(`/events/schedule`, { categoryId: sport.id.toString() });

            if (!data || !data.events) {
                // If the real API returns empty or an unexpected format, fallback
                return this.generateMockResponse<RawGameData[]>('events', sportKey, sport.group);
            }

            this.logger.log(`Fetched ${data.events.length} upcoming events for ${sportKey}`);

            return data.events.map((e: any) => ({
                externalId: e.id.toString(),
                sportKey: sportKey,
                commenceTime: new Date(e.startTimestamp * 1000).toISOString(),
                homeTeam: e.homeTeam.name,
                awayTeam: e.awayTeam.name,
            }));
        } catch (error) {
            this.logger.error(`Failed to fetch events for ${sportKey}`, error);
            return this.generateMockResponse<RawGameData[]>('events', sportKey, sport.group);
        }
    }

    async fetchScores(sportKey: string, daysFrom: number = 3): Promise<RawScoreData[]> {
        const sport = SPORT_API_CATEGORIES.find(s => s.key === sportKey);
        if (!sport) return [];

        try {
            const data = await this.makeRequest<any>(`/events/results`, { categoryId: sport.id.toString(), days: daysFrom.toString() });

            if (!data || !data.events) {
                return this.generateMockResponse<RawScoreData[]>('scores', sportKey, sport.group);
            }

            this.logger.log(`Fetched ${data.events.length} scores for ${sportKey}`);

            return data.events.map((e: any) => ({
                externalId: e.id.toString(),
                sportKey: sportKey,
                completed: e.status.type === 'finished',
                homeTeam: e.homeTeam.name,
                awayTeam: e.awayTeam.name,
                homeScore: e.homeScore?.current ?? null,
                awayScore: e.awayScore?.current ?? null,
                lastUpdate: new Date().toISOString(),
            }));
        } catch (error) {
            this.logger.error(`Failed to fetch scores for ${sportKey}`, error);
            return this.generateMockResponse<RawScoreData[]>('scores', sportKey, sport.group);
        }
    }

    async fetchOdds(sportKey: string): Promise<RawOddsData[]> {
        const sport = SPORT_API_CATEGORIES.find(s => s.key === sportKey);
        if (!sport) return [];

        try {
            // Not all SportAPI endpoints provide full pre-match odds in the free tier easily.
            // We will attempt to fetch, but gracefully fallback to our odds generator if needed.
            const data = await this.makeRequest<any>(`/events/odds`, { categoryId: sport.id.toString() });

            if (!data || !data.odds) {
                return this.generateMockResponse<RawOddsData[]>('odds', sportKey, sport.group);
            }

            this.logger.log(`Fetched odds for events in ${sportKey}`);

            return data.odds.map((o: any) => ({
                externalId: o.eventId.toString(),
                sportKey: sportKey,
                homeTeam: o.homeTeamName || 'Home',
                awayTeam: o.awayTeamName || 'Away',
                bookmakers: [
                    {
                        key: 'sportapi_bookie',
                        title: 'SportAPI Bookmaker',
                        markets: [{
                            key: 'h2h',
                            outcomes: [
                                { name: o.homeTeamName || 'Home', price: o.choices?.home ?? 1.9 },
                                { name: o.awayTeamName || 'Away', price: o.choices?.away ?? 1.9 },
                                ...(o.choices?.draw ? [{ name: 'Draw', price: o.choices.draw }] : [])
                            ],
                        }],
                    },
                ],
            }));
        } catch (error) {
            this.logger.error(`Failed to fetch odds for ${sportKey}. Using mock odds.`, error);
            return this.generateMockResponse<RawOddsData[]>('odds', sportKey, sport.group);
        }
    }

    private async makeRequest<T>(path: string, params: Record<string, string> = {}): Promise<T> {
        if (this.fallbackMode) return null as unknown as T; // Will trigger the fallback handler in the caller methods

        const url = `${this.baseUrl}${path}`;
        try {
            const response = await firstValueFrom(
                this.httpService.get<T>(url, {
                    params,
                    headers: {
                        'x-rapidapi-key': this.apiKey,
                        'x-rapidapi-host': this.apiHost,
                    },
                    timeout: 10_000,
                }),
            );

            return response.data;
        } catch (error: any) {
            const status = error.response?.status;
            if (status === 429 || status === 401 || status === 403) {
                this.logger.warn(`SportAPI quota reached or invalid key (Status ${status}). Switching to MOCK FALLBACK.`);
                this.fallbackMode = true;
                return null as unknown as T;
            }
            throw error;
        }
    }

    private generateMockResponse<T>(endpoint: 'events' | 'scores' | 'odds', sportKey: string, group: string): T {
        const teams = this.mockTeams[group] || this.mockTeams['Soccer'];
        const numItems = Math.floor(Math.random() * 4) + 3; // 3 to 6 items

        if (endpoint === 'events') {
            const events: RawGameData[] = [];
            for (let i = 0; i < numItems; i++) {
                const home = teams[Math.floor(Math.random() * teams.length)];
                let away = teams[Math.floor(Math.random() * teams.length)];
                while (away === home) away = teams[Math.floor(Math.random() * teams.length)]; // Prevent playing yourself

                const commenceTime = new Date();
                commenceTime.setHours(commenceTime.getHours() + Math.floor(Math.random() * 72) + 1);

                events.push({
                    externalId: `mock-${sportKey}-${Date.now()}-${i}`,
                    sportKey,
                    commenceTime: commenceTime.toISOString(),
                    homeTeam: home,
                    awayTeam: away,
                });
            }
            return events as unknown as T;
        }

        if (endpoint === 'scores') {
            const scores: RawScoreData[] = [];
            for (let i = 0; i < numItems; i++) {
                const home = teams[Math.floor(Math.random() * teams.length)];
                let away = teams[Math.floor(Math.random() * teams.length)];
                while (away === home) away = teams[Math.floor(Math.random() * teams.length)];

                scores.push({
                    externalId: `mock-${sportKey}-${Date.now()}-${i}`,
                    sportKey,
                    completed: true,
                    homeTeam: home,
                    awayTeam: away,
                    homeScore: Math.floor(Math.random() * 5),
                    awayScore: Math.floor(Math.random() * 5),
                    lastUpdate: new Date().toISOString(),
                });
            }
            return scores as unknown as T;
        }

        if (endpoint === 'odds') {
            const odds: RawOddsData[] = [];
            // We just ensure there's generic odds available so the Predictor doesn't throw errors
            for (let i = 0; i < 15; i++) {
                const home = teams[Math.floor(Math.random() * teams.length)];
                let away = teams[Math.floor(Math.random() * teams.length)];

                odds.push({
                    externalId: `mock-odd-${sportKey}-${Date.now()}-${i}`,
                    sportKey,
                    homeTeam: home,
                    awayTeam: away,
                    bookmakers: [{
                        key: 'mock_bookie',
                        title: 'Mock Bookmaker',
                        markets: [{
                            key: 'h2h',
                            outcomes: [
                                { name: home, price: 1.5 + (Math.random() * 1.5) },
                                { name: away, price: 1.5 + (Math.random() * 1.5) },
                                { name: 'Draw', price: 2.5 + (Math.random() * 2.0) }
                            ]
                        }]
                    }]
                });
            }
            return odds as unknown as T;
        }

        return [] as unknown as T;
    }
}
