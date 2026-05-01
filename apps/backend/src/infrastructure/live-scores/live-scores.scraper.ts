import { Injectable, Logger } from '@nestjs/common';
import { DirectWebScraperService } from '../../data-ingestion/direct-web-scraper.service';
import { SofaScoreScraperService, SofaScoreEvent } from '../../data-ingestion/sofascore-scraper.service';

export interface LiveScoreData {
    id: string;
    sportKey: string;
    sportTitle: string;
    league: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number | null;
    awayScore: number | null;
    status: string;
    minute: number | null;
    commenceTime: string;
    updatedAt: number;
}

/** Sports that don't use cumulative scoring */
const NON_SCORING_SPORTS = new Set(['tennis', 'mma', 'mma_mixed_martial_arts', 'boxing']);

/**
 * Live Scores Scraper
 *
 * Fetches live scores on-demand via SofaScore's unofficial public API.
 * Zero external API dependencies — no RapidAPI, no BetsAPI, no API keys.
 *
 * Tiered approach:
 *   1. SofaScore live endpoint (primary — covers all major sports/leagues)
 *   2. DirectWebScraper BBC fallback (EPL only)
 */
@Injectable()
export class LiveScoresScraper {
    private readonly logger = new Logger(LiveScoresScraper.name);

    constructor(
        private readonly scraper: DirectWebScraperService,
        private readonly sofascore: SofaScoreScraperService,
    ) {}

    /**
     * Fetch live scores on-demand.
     * Primary: SofaScore → Fallback: BBC/DirectWebScraper
     */
    async getLiveScores(): Promise<LiveScoreData[]> {
        // 1. Try SofaScore (primary — all leagues)
        try {
            const events = await this.sofascore.fetchLiveScores();
            if (events.length > 0) {
                this.logger.debug(`SofaScore returned ${events.length} live events`);
                return events.map(e => this.sofaScoreToLiveScore(e));
            }
        } catch (err) {
            this.logger.warn(`SofaScore live fetch failed: ${err.message}`);
        }

        // 2. Fallback: DirectWebScraper (BBC Sport — EPL only)
        try {
            const internal = await this.scraper.scrapeLiveScores();
            if (internal.length > 0) {
                this.logger.debug(`BBC fallback returned ${internal.length} live matches`);
                return internal.map(s => ({
                    id: `internal_${s.homeTeam}_${s.awayTeam}_${Date.now()}`,
                    sportKey: s.sportKey ?? 'soccer_epl',
                    sportTitle: 'Football',
                    league: s.league ?? 'Major Leagues',
                    homeTeam: s.homeTeam,
                    awayTeam: s.awayTeam,
                    homeScore: s.homeScore,
                    awayScore: s.awayScore,
                    status: s.status,
                    minute: s.minute,
                    commenceTime: new Date().toISOString(),
                    updatedAt: Date.now(),
                }));
            }
        } catch (err) {
            this.logger.warn(`DirectWebScraper live fallback failed: ${err.message}`);
        }

        return [];
    }

    // ─────────────────────────────────────────────────────────────────────
    // Mapping helpers
    // ─────────────────────────────────────────────────────────────────────

    private sofaScoreToLiveScore(event: SofaScoreEvent): LiveScoreData {
        const sportKey = this.inferSportKey(event);
        const isScoring = !NON_SCORING_SPORTS.has(sportKey.split('_')[0]);

        const hs = isScoring ? (event.homeScore?.current ?? null) : null;
        const as_ = isScoring ? (event.awayScore?.current ?? null) : null;

        return {
            id: `sofascore_${event.id}`,
            sportKey,
            sportTitle: this.inferSportTitle(sportKey),
            league: event.tournament.name,
            homeTeam: event.homeTeam.name,
            awayTeam: event.awayTeam.name,
            homeScore: hs,
            awayScore: as_,
            status: this.sofascore.getLiveStatus(event),
            minute: this.sofascore.getLiveMinute(event),
            commenceTime: new Date(event.startTimestamp * 1000).toISOString(),
            updatedAt: Date.now(),
        };
    }

    private inferSportKey(event: SofaScoreEvent): string {
        const name = event.tournament.name;
        const mappings: Array<[RegExp, string]> = [
            [/premier league/i,           'soccer_epl'],
            [/la liga|laliga/i,           'soccer_spain_la_liga'],
            [/bundesliga/i,               'soccer_germany_bundesliga'],
            [/serie a/i,                  'soccer_italy_serie_a'],
            [/ligue 1/i,                  'soccer_france_ligue_one'],
            [/eredivisie/i,               'soccer_netherlands_eredivisie'],
            [/champions league/i,         'soccer_uefa_champions_league'],
            [/europa league/i,            'soccer_uefa_europa_league'],
            [/conference league/i,        'soccer_uefa_conference_league'],
            [/dstv|betway|psl/i,          'soccer_south_africa_psl'],
            [/nba/i,                      'basketball_nba'],
            [/euroleague/i,               'basketball_euroleague'],
            [/nhl/i,                      'icehockey_nhl'],
            [/atp|wta/i,                  'tennis_atp_masters'],
            [/mls/i,                      'soccer_usa_mls'],
        ];

        for (const [pattern, key] of mappings) {
            if (pattern.test(name)) return key;
        }
        return 'soccer_other';
    }

    private inferSportTitle(sportKey: string): string {
        if (sportKey.startsWith('soccer_')) return 'Football';
        if (sportKey.startsWith('basketball_')) return 'Basketball';
        if (sportKey.startsWith('tennis_')) return 'Tennis';
        if (sportKey.startsWith('icehockey_')) return 'Ice Hockey';
        return 'Sport';
    }
}
