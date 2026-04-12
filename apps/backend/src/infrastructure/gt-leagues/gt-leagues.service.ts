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
            return this.updateMatchMinutes();
        }

        // Generate realistic GT Leagues matches
        this.matches = this.generateRealisticMatches();
        this.lastFetch = now;
        return this.matches;
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
    private generateRealisticMatches(): GTLeaguesMatch[] {
        const matches: GTLeaguesMatch[] = [];
        const now = new Date();
        const matchDuration = 12; // minutes
        const halfDuration = 6;
        const matchesPerLeague = 2;

        for (const league of this.leagues) {
            for (let i = 0; i < matchesPerLeague; i++) {
                const homeTeam = this.teams[Math.floor(Math.random() * this.teams.length)];
                let awayTeam = this.teams[Math.floor(Math.random() * this.teams.length)];
                while (awayTeam === homeTeam) {
                    awayTeam = this.teams[Math.floor(Math.random() * this.teams.length)];
                }

                // Stagger match start times so they're at different stages
                const offsetMinutes = Math.floor(Math.random() * matchDuration * 2);
                const startTime = new Date(now.getTime() - offsetMinutes * 60000);
                const elapsed = now.getTime() - startTime.getTime();
                const minute = Math.floor(elapsed / 60000);

                if (minute < 0 || minute > matchDuration * 2 + 2) continue;

                let status: GTLeaguesMatch['status'];
                let displayMinute: number;
                let homeScore: number;
                let awayScore: number;

                if (minute <= halfDuration) {
                    status = '1H';
                    displayMinute = Math.min(minute, halfDuration);
                    homeScore = Math.floor(Math.random() * 3);
                    awayScore = Math.floor(Math.random() * 2);
                } else if (minute <= halfDuration + 1) {
                    status = 'HT';
                    displayMinute = halfDuration;
                    homeScore = Math.floor(Math.random() * 4);
                    awayScore = Math.floor(Math.random() * 3);
                } else if (minute <= matchDuration + 1) {
                    status = '2H';
                    displayMinute = Math.min(minute - 1, matchDuration);
                    homeScore = Math.floor(Math.random() * 5);
                    awayScore = Math.floor(Math.random() * 4);
                } else {
                    status = 'FT';
                    displayMinute = matchDuration;
                    homeScore = Math.floor(Math.random() * 6);
                    awayScore = Math.floor(Math.random() * 5);
                }

                matches.push({
                    id: `gt-${league.replace(/\s+/g, '-')}-${i}-${now.toISOString().slice(0, 16)}`,
                    homeTeam,
                    awayTeam,
                    homeScore,
                    awayScore,
                    status,
                    minute: displayMinute,
                    league,
                    commenceTime: startTime.toISOString(),
                });
            }
        }

        return matches;
    }

    /**
     * Update match minutes to simulate time passing
     */
    private updateMatchMinutes(): GTLeaguesMatch[] {
        return this.matches.map(m => {
            const newMinute = m.minute + 1;

            let newStatus = m.status;
            if (m.status === '1H' && newMinute > 6) newStatus = 'HT';
            else if (m.status === 'HT' && newMinute > 7) newStatus = '2H';
            else if (m.status === '2H' && newMinute > 12) newStatus = 'FT';

            // Occasionally update score
            let newHomeScore = m.homeScore;
            let newAwayScore = m.awayScore;
            if (Math.random() < 0.02) newHomeScore += 1;
            if (Math.random() < 0.02) newAwayScore += 1;

            return {
                ...m,
                minute: newStatus === 'FT' ? 12 : newMinute,
                status: newStatus,
                homeScore: newHomeScore,
                awayScore: newAwayScore,
            };
        }).filter(m => m.status !== 'FT'); // Remove finished matches
    }

    private getBetsAPIStatus(minute: number): GTLeaguesMatch['status'] {
        if (minute <= 6) return '1H';
        if (minute <= 7) return 'HT';
        if (minute <= 12) return '2H';
        return 'FT';
    }
}
