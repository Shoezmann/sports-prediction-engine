import { Sport } from '../../entities';

/**
 * Output Port: Sports Data Provider
 *
 * Interface for fetching sport and event data from external APIs.
 * Implemented by infrastructure adapters (e.g., TheOddsApiAdapter).
 */
export interface SportsDataPort {
    /** Fetch all available sports from the external API */
    fetchSports(): Promise<Sport[]>;

    /** Fetch upcoming games for a specific sport */
    fetchUpcomingGames(sportKey: string): Promise<RawGameData[]>;

    /** Fetch completed game scores for a specific sport */
    fetchScores(sportKey: string, daysFrom?: number): Promise<RawScoreData[]>;

    /** Fetch current odds for a specific sport */
    fetchOdds(sportKey: string): Promise<RawOddsData[]>;
}

/** Raw game data as returned from external API (before domain mapping) */
export interface RawGameData {
    externalId: string;
    sportKey: string;
    commenceTime: string;
    homeTeam: string;
    awayTeam: string;
    /** Optional status from the API: 'scheduled', 'postponed', 'cancelled', 'in_progress', 'finished' */
    status?: string;
}

/** Raw score data from external API */
export interface RawScoreData {
    externalId: string;
    sportKey: string;
    completed: boolean;
    homeTeam: string;
    awayTeam: string;
    homeScore: number | null;
    awayScore: number | null;
    lastUpdate: string;
    /** Optional status from the API: 'postponed', 'cancelled', etc. */
    status?: string;
}

/** Raw odds data from external API */
export interface RawOddsData {
    externalId: string;
    sportKey: string;
    homeTeam: string;
    awayTeam: string;
    bookmakers: RawBookmakerData[];
}

export interface RawBookmakerData {
    key: string;
    title: string;
    markets: RawMarketData[];
}

export interface RawMarketData {
    key: string;
    outcomes: RawOutcomeData[];
}

export interface RawOutcomeData {
    name: string;
    price: number;
}

export const SPORTS_DATA_PORT = Symbol('SportsDataPort');
