import { Injectable, Logger } from '@nestjs/common';
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
 * Fetches Esoccer GT Leagues (12-minute matches, 24/7).
 * Source: SofaScore esports endpoint — no paid API, no API keys.
 *
 * SofaScore covers GT Leagues under their esports section.
 * Response cached for 30 seconds (matches only last 12 minutes).
 */
@Injectable()
export class GTLeaguesService {
    private readonly logger = new Logger(GTLeaguesService.name);

    private cache: { data: GTLeaguesMatch[]; fetchedAt: number } | null = null;
    private readonly CACHE_TTL = 30_000; // 30 seconds

    private readonly SOFASCORE_ESPORT_LIVE = 'https://api.sofascore.com/api/v1/sport/esports/events/live';
    private readonly SOFASCORE_ESPORT_TODAY = 'https://api.sofascore.com/api/v1/sport/esports/scheduled-events';

    constructor(private readonly httpService: HttpService) {}

    /**
     * Get current live and upcoming GT Leagues matches.
     * Uses SofaScore esports data — zero API dependency.
     */
    async getMatches(): Promise<GTLeaguesMatch[]> {
        const now = Date.now();

        if (this.cache && now - this.cache.fetchedAt < this.CACHE_TTL) {
            return this.cache.data;
        }

        try {
            const matches = await this.fetchFromSofaScore();
            this.cache = { data: matches, fetchedAt: now };
            this.logger.debug(`GT Leagues: ${matches.length} matches from SofaScore`);
            return matches;
        } catch (err) {
            this.logger.warn(`GT Leagues fetch failed: ${err.message}`);
            return this.cache?.data ?? [];
        }
    }

    private async fetchFromSofaScore(): Promise<GTLeaguesMatch[]> {
        const response = await firstValueFrom(
            this.httpService.get(this.SOFASCORE_ESPORT_LIVE, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Accept': 'application/json',
                    'Origin': 'https://www.sofascore.com',
                    'Referer': 'https://www.sofascore.com/',
                },
                timeout: 8_000,
            }),
        );

        const events = (response.data?.events ?? []) as any[];

        // Filter to GT Leagues specifically (12-minute esoccer)
        const gtEvents = events.filter((e: any) => {
            const name = (e.tournament?.name || e.category?.name || '').toLowerCase();
            return name.includes('gt') || name.includes('12 min') || name.includes('esoccer');
        });

        return gtEvents.map((e: any) => this.mapEvent(e));
    }

    private mapEvent(e: any): GTLeaguesMatch {
        const status = e.status?.type ?? 'notstarted';
        const played = e.time?.played ?? 0;

        return {
            id: String(e.id ?? `gt_${e.homeTeam?.name}_${e.awayTeam?.name}`),
            homeTeam: e.homeTeam?.name ?? 'Home',
            awayTeam: e.awayTeam?.name ?? 'Away',
            homeScore: e.homeScore?.current ?? 0,
            awayScore: e.awayScore?.current ?? 0,
            status: this.getStatus(status, played),
            minute: played,
            league: e.tournament?.name ?? 'GT Leagues — 12 mins',
            commenceTime: new Date((e.startTimestamp ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        };
    }

    private getStatus(type: string, minute: number): GTLeaguesMatch['status'] {
        if (type === 'finished') return 'FT';
        if (type === 'halftime') return 'HT';
        if (minute > 6) return '2H';
        return '1H';
    }
}
