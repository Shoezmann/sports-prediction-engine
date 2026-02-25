import { SportCategory, SportGroup } from '../enums';

/**
 * Sport as returned from The Odds API and stored in the database.
 * Sports are dynamically discovered via GET /v4/sports.
 */
export interface SportDto {
    /** The Odds API sport key, e.g. 'soccer_epl', 'basketball_nba' */
    key: string;

    /** Sport group, e.g. 'Soccer', 'Basketball' */
    group: SportGroup;

    /** Human-readable title, e.g. 'EPL', 'NBA' */
    title: string;

    /** Description, e.g. 'English Premier League' */
    description: string;

    /** Whether this sport is currently in-season */
    active: boolean;

    /** Whether this sport supports outright/futures markets */
    hasOutrights: boolean;

    /** Prediction model category derived from the sport group */
    category: SportCategory;
}
