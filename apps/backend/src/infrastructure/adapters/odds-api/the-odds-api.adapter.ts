import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
    getSportCategory,
} from '@sports-prediction-engine/shared-types';
import type {
    SportsDataPort,
    RawGameData,
    RawScoreData,
    RawOddsData,
    RawBookmakerData,
} from '../../../domain/ports/output';
import { Sport } from '../../../domain/entities';

/**
 * Infrastructure Adapter: The Odds API
 *
 * Implements the SportsDataPort interface to fetch sports, games,
 * scores, and odds from The Odds API v4.
 * NO MOCK DATA — returns empty arrays when API fails.
 */
@Injectable()
export class TheOddsApiAdapter implements SportsDataPort {
    private readonly logger = new Logger(TheOddsApiAdapter.name);
    private readonly baseUrl: string;
    private readonly apiKey: string;

    /** Tracks remaining API quota from response headers */
    private _remainingRequests: number | null = null;
    private _usedRequests: number | null = null;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.baseUrl =
            this.configService.get<string>('ODDS_API_BASE_URL') ??
            'https://api.the-odds-api.com/v4';
        this.apiKey = this.configService.get<string>('ODDS_API_KEY') ?? '';

        if (!this.apiKey || this.apiKey === 'your_api_key_here') {
            this.logger.warn(
                '⚠️  ODDS_API_KEY is not set. API calls will fail. Get your key at https://the-odds-api.com',
            );
        }
    }

    get remainingRequests(): number | null {
        return this._remainingRequests;
    }

    get usedRequests(): number | null {
        return this._usedRequests;
    }

    async fetchSports(): Promise<Sport[]> {
        try {
            const response = await this.makeRequest<OddsApiSport[]>(
                '/sports',
                { all: 'true' },
            );

            this.logger.log(
                `Fetched ${response.length} sports from The Odds API`,
            );

            return response.map((s) =>
                Sport.create({
                    key: s.key,
                    group: s.group,
                    title: s.title,
                    description: s.description,
                    active: s.active,
                    hasOutrights: s.has_outrights,
                    lastSyncedAt: new Date(),
                }),
            );
        } catch (error) {
            this.logger.error('Failed to fetch sports', error);
            return [];
        }
    }

    async fetchUpcomingGames(sportKey: string): Promise<RawGameData[]> {
        try {
            const response = await this.makeRequest<OddsApiEvent[]>(
                `/sports/${sportKey}/events`,
            );

            this.logger.log(
                `Fetched ${response.length} upcoming events for ${sportKey}`,
            );

            return response.map((e) => ({
                externalId: e.id,
                sportKey: e.sport_key,
                commenceTime: e.commence_time,
                homeTeam: e.home_team,
                awayTeam: e.away_team,
            }));
        } catch (error) {
            this.logger.error(
                `Failed to fetch events for ${sportKey}`,
                error,
            );
            return [];
        }
    }

    async fetchScores(
        sportKey: string,
        daysFrom: number = 3,
    ): Promise<RawScoreData[]> {
        try {
            const response = await this.makeRequest<OddsApiScore[]>(
                `/sports/${sportKey}/scores`,
                { daysFrom: daysFrom.toString() },
            );

            this.logger.log(
                `Fetched ${response.length} scores for ${sportKey}`,
            );

            return response.map((s) => ({
                externalId: s.id,
                sportKey: s.sport_key,
                completed: s.completed,
                homeTeam: s.home_team,
                awayTeam: s.away_team,
                homeScore: this.extractScore(s.scores, s.home_team),
                awayScore: this.extractScore(s.scores, s.away_team),
                lastUpdate: s.last_update ?? new Date().toISOString(),
            }));
        } catch (error) {
            this.logger.error(
                `Failed to fetch scores for ${sportKey}`,
                error,
            );
            return [];
        }
    }

    async fetchOdds(sportKey: string): Promise<RawOddsData[]> {
        try {
            const response = await this.makeRequest<OddsApiOdds[]>(
                `/sports/${sportKey}/odds`,
                {
                    regions: 'uk,us,au',
                    markets: 'h2h',
                    oddsFormat: 'decimal',
                },
            );

            this.logger.log(
                `Fetched odds for ${response.length} events in ${sportKey}`,
            );

            return response.map((o) => ({
                externalId: o.id,
                sportKey: o.sport_key,
                homeTeam: o.home_team,
                awayTeam: o.away_team,
                bookmakers: o.bookmakers.map(
                    (b): RawBookmakerData => ({
                        key: b.key,
                        title: b.title,
                        markets: b.markets.map((m) => ({
                            key: m.key,
                            outcomes: m.outcomes.map((out) => ({
                                name: out.name,
                                price: out.price,
                            })),
                        })),
                    }),
                ),
            }));
        } catch (error) {
            this.logger.error(
                `Failed to fetch odds for ${sportKey}`,
                error,
            );
            return [];
        }
    }

    // ─── Private helpers ─────────────────────────────────────────

    private async makeRequest<T>(
        path: string,
        params: Record<string, string> = {},
    ): Promise<T> {
        const url = `${this.baseUrl}${path}`;

        const response = await firstValueFrom(
            this.httpService.get<T>(url, {
                params: {
                    apiKey: this.apiKey,
                    ...params,
                },
                timeout: 10_000,
            }),
        );

        this.trackQuota(response.headers);
        return response.data;
    }

    private trackQuota(headers: Record<string, unknown>): void {
        const remaining = headers['x-requests-remaining'];
        const used = headers['x-requests-used'];

        if (remaining !== undefined) {
            this._remainingRequests = Number(remaining);
        }
        if (used !== undefined) {
            this._usedRequests = Number(used);
        }

        if (
            this._remainingRequests !== null &&
            this._remainingRequests < 50
        ) {
            this.logger.warn(
                `⚠️  Low API quota: ${this._remainingRequests} requests remaining (${this._usedRequests} used)`,
            );
        }
    }

    private extractScore(
        scores: OddsApiScoreEntry[] | null,
        teamName: string,
    ): number | null {
        if (!scores) return null;
        const entry = scores.find((s) => s.name === teamName);
        return entry ? parseInt(entry.score, 10) : null;
    }
}

// ─── The Odds API v4 response types ─────────────────────────

interface OddsApiSport {
    key: string;
    group: string;
    title: string;
    description: string;
    active: boolean;
    has_outrights: boolean;
}

interface OddsApiEvent {
    id: string;
    sport_key: string;
    sport_title: string;
    commence_time: string;
    home_team: string;
    away_team: string;
}

interface OddsApiScore {
    id: string;
    sport_key: string;
    sport_title: string;
    commence_time: string;
    completed: boolean;
    home_team: string;
    away_team: string;
    scores: OddsApiScoreEntry[] | null;
    last_update: string | null;
}

interface OddsApiScoreEntry {
    name: string;
    score: string;
}

interface OddsApiOdds {
    id: string;
    sport_key: string;
    sport_title: string;
    commence_time: string;
    home_team: string;
    away_team: string;
    bookmakers: OddsApiBookmaker[];
}

interface OddsApiBookmaker {
    key: string;
    title: string;
    last_update: string;
    markets: OddsApiMarket[];
}

interface OddsApiMarket {
    key: string;
    last_update: string;
    outcomes: OddsApiOutcome[];
}

interface OddsApiOutcome {
    name: string;
    price: number;
}
