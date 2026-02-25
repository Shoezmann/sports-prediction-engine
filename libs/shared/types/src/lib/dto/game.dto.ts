import { SportCategory, SportGroup } from '../enums';
import { TeamDto } from './team.dto';

/**
 * A game/match/event with two sides (teams or individual competitors).
 */
export interface GameDto {
    /** Internal UUID */
    id: string;

    /** The Odds API sport key, e.g. 'soccer_epl' */
    sportKey: string;

    /** Sport group, e.g. 'Soccer' */
    sportGroup: SportGroup;

    /** Human-readable league/tournament name, e.g. 'EPL' */
    sportTitle: string;

    /** Determines prediction model type (three_way, two_way, head_to_head) */
    sportCategory: SportCategory;

    /** Home team or Competitor A */
    homeTeam: TeamDto;

    /** Away team or Competitor B */
    awayTeam: TeamDto;

    /** Scheduled start time (ISO 8601) */
    commenceTime: string;

    /** Whether final scores are available */
    completed: boolean;

    /** Home team / Competitor A final score (if completed) */
    homeScore?: number;

    /** Away team / Competitor B final score (if completed) */
    awayScore?: number;
}
