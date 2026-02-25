/**
 * Team or competitor in a match/event.
 */
export interface TeamDto {
    /** Internal UUID */
    id: string;

    /** Team/competitor display name */
    name: string;

    /** Abbreviated name (optional) */
    shortName?: string;

    /** Current ELO rating for this team within its sport/league */
    eloRating: number;

    /** The Odds API sport key this team belongs to */
    sportKey: string;
}
