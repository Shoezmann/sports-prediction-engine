import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { RawOddsData } from '../domain/ports/output';

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

/**
 * The Odds API Service
 *
 * Fetches real bookmaker odds from The Odds API (free tier: 500 req/month).
 * When real odds are available, they replace synthetic odds in the prediction pipeline.
 * Falls back gracefully when quota exhausted or leagues are inactive.
 */
@Injectable()
export class OddsApiService {
    private readonly logger = new Logger(OddsApiService.name);
    private requestsRemaining = 500;

    constructor(private readonly httpService: HttpService) {}

    /**
     * Fetch real odds for a sport key (e.g. 'soccer_epl').
     * Returns empty array if API key missing, quota exhausted, or league inactive.
     */
    async fetchOdds(sportKey: string): Promise<RawOddsData[]> {
        const apiKey = process.env.ODDS_API_KEY || '';
        if (!apiKey || apiKey.includes('your_')) return [];

        // Don't waste quota if we're running low
        if (this.requestsRemaining < 50) {
            this.logger.warn(`Odds API quota low (${this.requestsRemaining} remaining), skipping`);
            return [];
        }

        try {
            const url = `${ODDS_API_BASE}/sports/${sportKey}/odds`;
            const response = await firstValueFrom(
                this.httpService.get(url, {
                    params: {
                        apiKey,
                        regions: 'uk',
                        markets: 'h2h',
                        oddsFormat: 'decimal',
                        dateFormat: 'iso',
                    },
                    timeout: 10_000,
                }),
            );

            // Track quota from response headers
            const remaining = response.headers['x-requests-remaining'];
            if (remaining) {
                this.requestsRemaining = parseInt(remaining, 10);
                this.logger.debug(`Odds API quota: ${this.requestsRemaining} remaining`);
            }

            const events = response.data;
            if (!Array.isArray(events)) return [];

            return events.map((event: any) => ({
                externalId: event.id || `odds_${sportKey}_${event.home_team}_${event.away_team}`,
                sportKey: event.sport_key || sportKey,
                homeTeam: event.home_team,
                awayTeam: event.away_team,
                bookmakers: (event.bookmakers || []).map((bookie: any) => ({
                    key: bookie.key,
                    title: bookie.title,
                    markets: (bookie.markets || []).map((market: any) => ({
                        key: market.key,
                        outcomes: (market.outcomes || []).map((o: any) => ({
                            name: o.name,
                            price: o.price,
                        })),
                    })),
                })),
            }));
        } catch (error: any) {
            // 422 = sport inactive, 401 = bad key — don't log as error
            if (error?.response?.status === 422 || error?.response?.status === 401) {
                this.logger.debug(`Odds API: ${sportKey} inactive or unauthorized`);
            } else {
                this.logger.warn(`Odds API failed for ${sportKey}: ${error.message}`);
            }
            return [];
        }
    }

    /**
     * Fetch odds for multiple sport keys, with rate limiting.
     */
    async fetchOddsForLeagues(sportKeys: string[]): Promise<Map<string, RawOddsData[]>> {
        const result = new Map<string, RawOddsData[]>();

        for (const key of sportKeys) {
            const odds = await this.fetchOdds(key);
            if (odds.length > 0) {
                result.set(key, odds);
            }
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        return result;
    }

    getQuotaRemaining(): number {
        return this.requestsRemaining;
    }
}
