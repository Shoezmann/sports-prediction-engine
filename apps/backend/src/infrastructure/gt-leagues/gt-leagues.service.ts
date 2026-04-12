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
 * Falls back to realistic generated data if API is unavailable.
 */
@Injectable()
export class GTLeaguesService {
    private readonly logger = new Logger(GTLeaguesService.name);
    private matches: GTLeaguesMatch[] = [];
    private lastFetch = 0;
    private readonly FETCH_INTERVAL = 30_000; // 30 seconds

    // Real GT Leagues team pool
    private readonly teams = [
        'A.Madrid(Crysis)', 'Barcelona(Carlos)', 'Real Madrid(Snail)', 'Villarreal(Delpiero)',
        'A.Bilbao(Banega)', 'Roma(Professor)', 'Inter(Viper)', 'Juventus(Lucas)',
        'Napoli(Sensei)', 'Atalanta(Eminem)', 'A.Madrid(Titan)', 'Barcelona(Klaus)',
        'Real Madrid(Hulk)', 'Villarreal(Habibi)', 'A.Bilbao(Razvan)', 'Roma(Arthur)',
        'Inter(Fred)', 'Juventus(Kevin)', 'Napoli(Shaolin)', 'Atalanta(Eros)',
        'A.Madrid(David)', 'Barcelona(Furious)', 'Real Madrid(Stan)', 'Villarreal(Snail)',
        'A.Bilbao(Carlos)', 'Roma(Delpiero)', 'Inter(Banega)', 'Juventus(Professor)',
        'Napoli(Viper)', 'Atalanta(Lucas)',
    ];

    private readonly leagues = [
        'GT Leagues — 12 mins',
        'GT Leagues — 10 mins',
        'GT Leagues — Super Cup',
        'GT Leagues — Champions Cup',
        'GT Leagues — Nations Cup'
    ];

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Get current live and upcoming GT Leagues matches.
     */
    async getMatches(): Promise<GTLeaguesMatch[]> {
        const now = Date.now();

        // Try real API first if we have a BetsAPI key
        const betsApiKey = this.configService.get<string>('BETSAPI_KEY');
        if (betsApiKey && betsApiKey !== 'your_betsapi_key_here') {
            try {
                const matches = await this.fetchFromBetsAPI(betsApiKey);
                if (matches.length > 0) {
                    this.matches = matches;
                    this.lastFetch = now;
                    return matches;
                }
            } catch {
                // Fall through to generated data
            }
        }

        // If we recently fetched, return cached matches
        if (now - this.lastFetch < this.FETCH_INTERVAL && this.matches.length > 0) {
            return [];
        }

        // Generate realistic GT Leagues matches
        // No real data — return empty instead of mock
        this.lastFetch = now;
        return [];
    }

    /**
     * Fetch real GT Leagues data from BetsAPI
     */
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

        return data.results.map((event: any) => {
            const scores = event?.scores?.[0] || {};
            const stats = event?.extra?.[0]?.st || {};
            const time = event?.timer?.tm || 0;

            return {
                id: event.id,
                homeTeam: event.home?.name || 'Home',
                awayTeam: event.away?.name || 'Away',
                homeScore: parseInt(scores?.home || '0'),
                awayScore: parseInt(scores?.away || '0'),
                status: this.getBetsAPIStatus(event.timer?.tm || 0),
                minute: time || 0,
                league: 'GT Leagues — 12 mins',
                commenceTime: new Date(event.time * 1000).toISOString(),
            };
        });
    }

    /**
     * Generate realistic GT Leagues matches that mirror the real format
     */

    /**
     * Update match minutes to simulate time passing
     */

    private getBetsAPIStatus(minute: number): GTLeaguesMatch['status'] {
        if (minute <= 6) return '1H';
        if (minute <= 7) return 'HT';
        if (minute <= 12) return '2H';
        return 'FT';
    }
}
