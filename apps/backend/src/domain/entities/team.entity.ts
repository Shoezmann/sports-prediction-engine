import { EloRating } from '../value-objects';

/**
 * Domain Entity: Team
 *
 * Represents a team or individual competitor within a specific sport/league.
 * Each team has an ELO rating that is updated after each game result.
 */
export class Team {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly sportKey: string,
        public readonly eloRating: EloRating,
        public readonly shortName?: string,
        public readonly externalId?: string,
    ) { }

    static create(props: {
        id: string;
        name: string;
        sportKey: string;
        eloRating?: number;
        shortName?: string;
        externalId?: string;
    }): Team {
        return new Team(
            props.id,
            props.name,
            props.sportKey,
            props.eloRating
                ? EloRating.create(props.eloRating)
                : EloRating.default(),
            props.shortName,
            props.externalId,
        );
    }

    /** Create a new Team instance with an updated ELO rating */
    withUpdatedElo(newRating: EloRating): Team {
        return new Team(
            this.id,
            this.name,
            this.sportKey,
            newRating,
            this.shortName,
            this.externalId,
        );
    }

    /**
     * Calculate the expected score against an opponent using ELO ratings.
     * Returns probability of winning (0.0 – 1.0).
     */
    expectedScoreAgainst(opponent: Team): number {
        return this.eloRating.expectedScoreAgainst(opponent.eloRating);
    }

    /**
     * Update ELO after a game result.
     * @param actualScore - 1.0 for win, 0.5 for draw, 0.0 for loss
     * @param opponent - The opponent team
     */
    updateEloAfterGame(actualScore: number, opponent: Team): Team {
        const expectedScore = this.expectedScoreAgainst(opponent);
        const newRating = this.eloRating.updateAfterGame(
            actualScore,
            expectedScore,
        );
        return this.withUpdatedElo(newRating);
    }

    equals(other: Team): boolean {
        return this.id === other.id;
    }

    toString(): string {
        return `${this.name} (${this.eloRating})`;
    }
}
