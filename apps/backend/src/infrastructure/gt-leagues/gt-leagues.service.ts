import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface GTLeaguesMatch {
    id: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    status: '1H' | 'HT' | '2H' | 'FT';
    minute: number;
    league: string;
    commenceTime: string;
}

/**
 * GT Leagues Service
 *
 * Fetches real-time Esoccer GT Leagues data from BetsAPI.
 * GT Leagues runs 24/7 with 12-minute matches.
 * Returns empty when no API key is configured — NO MOCK DATA.
 */
@Injectable()
export class GTLeaguesService {
    private readonly logger = new Logger(GTLeaguesService.name);
    private lastFetch = 0;
    private readonly FETCH_INTERVAL = 30_000;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Get current live and upcoming GT Leagues matches.
     * Only returns real data from BetsAPI — never generates fake matches.
     */
    async getMatches(): Promise<GTLeaguesMatch[]> {
        const now = Date.now();
        const betsApiKey = this.configService.get<string>('BETSAPI_KEY');

        if (!betsApiKey || betsApiKey === 'your_betsapi_key_here') {
            if (now - this.lastFetch > this.FETCH_INTERVAL) {
                this.logger.debug('No BetsAPI key configured — returning empty GT Leagues');
                this.lastFetch = now;
            }
            return [];
        }

        // Cache for 30 seconds
        if (now - this.lastFetch < this.FETCH_INTERVAL) {
            return [];
        }

        try {
            const matches = await this.fetchFromBetsAPI(betsApiKey);
            this.lastFetch = now;
            return matches;
        } catch (error) {
            this.logger.error('Failed to fetch GT Leagues from BetsAPI', error);
            return [];
        }
    }

    private async fetchFromBetsAPI(apiKey: string): Promise<GTLeaguesMatch[]> {
        const url = 'https://api.betsapi.com/v1/bet365/inplay_event';
        const response = await firstValueFrom(
            this.httpService.get(url, {
                params: {
                    token: apiKey,
                    league_id: 33948, // GT Leagues esoccer
                },
                timeout: 10_000,
            }),
        );

        const data = response.data as any;
        if (!data.success || !data.results) return [];

        return data.results.map((event: any) => ({
            id: event.id,
            homeTeam: event.home?.name || 'Home',
            awayTeam: event.away?.name || 'Away',
            homeScore: parseInt(event?.scores?.[0]?.home || '0'),
            awayScore: parseInt(event?.scores?.[0]?.away || '0'),
            status: this.getStatus(event.timer?.tm || 0),
            minute: event.timer?.tm || 0,
            league: 'GT Leagues — 12 mins',
            commenceTime: new Date(event.time * 1000).toISOString(),
        }));
    }

    private getStatus(minute: number): GTLeaguesMatch['status'] {
        if (minute <= 6) return '1H';
        if (minute <= 7) return 'HT';
        if (minute <= 12) return '2H';
        return 'FT';
    }
}
