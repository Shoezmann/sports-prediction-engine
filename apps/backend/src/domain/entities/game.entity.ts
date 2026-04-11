import {
    PredictionOutcome,
    SportCategory,
} from '@sports-prediction-engine/shared-types';
import { Team } from './team.entity';

/**
 * Domain Entity: Game
 *
 * Represents a match/event between two teams or competitors.
 * Contains the sport context needed for prediction model selection.
 */
export class Game {
    constructor(
        public readonly id: string,
        public readonly externalId: string,
        public readonly sportKey: string,
        public readonly sportTitle: string,
        public readonly sportGroup: string,
        public readonly sportCategory: SportCategory,
        public readonly homeTeam: Team,
        public readonly awayTeam: Team,
        public readonly commenceTime: Date,
        public readonly completed: boolean = false,
        public readonly homeScore?: number,
        public readonly awayScore?: number,
    ) { }

    static create(props: {
        id: string;
        externalId: string;
        sportKey: string;
        sportTitle: string;
        sportGroup: string;
        sportCategory: SportCategory;
        homeTeam: Team;
        awayTeam: Team;
        commenceTime: Date;
        completed?: boolean;
        homeScore?: number;
        awayScore?: number;
    }): Game {
        return new Game(
            props.id,
            props.externalId,
            props.sportKey,
            props.sportTitle,
            props.sportGroup,
            props.sportCategory,
            props.homeTeam,
            props.awayTeam,
            props.commenceTime,
            props.completed ?? false,
            props.homeScore,
            props.awayScore,
        );
    }

    /** Whether the game hasn't started yet */
    get isUpcoming(): boolean {
        return !this.completed && this.commenceTime > new Date();
    }

    /** Whether the game is scheduled for today */
    get isToday(): boolean {
        const now = new Date();
        return (
            this.commenceTime.getFullYear() === now.getFullYear() &&
            this.commenceTime.getMonth() === now.getMonth() &&
            this.commenceTime.getDate() === now.getDate()
        );
    }

    /** Whether the game is currently in progress */
    get isLive(): boolean {
        return !this.completed && this.commenceTime <= new Date();
    }

    /** Whether this sport supports draw outcomes */
    get supportsDraws(): boolean {
        return this.sportCategory === SportCategory.THREE_WAY;
    }

    /** Determine the actual outcome based on final scores */
    getOutcome(): PredictionOutcome {
        if (!this.completed || this.homeScore === undefined || this.awayScore === undefined) {
            return PredictionOutcome.PENDING;
        }

        if (this.homeScore > this.awayScore) {
            return PredictionOutcome.HOME_WIN;
        }
        if (this.awayScore > this.homeScore) {
            return PredictionOutcome.AWAY_WIN;
        }
        return PredictionOutcome.DRAW;
    }

    /** Mark game as completed with final scores */
    withResult(homeScore: number, awayScore: number): Game {
        return new Game(
            this.id,
            this.externalId,
            this.sportKey,
            this.sportTitle,
            this.sportGroup,
            this.sportCategory,
            this.homeTeam,
            this.awayTeam,
            this.commenceTime,
            true,
            homeScore,
            awayScore,
        );
    }

    /** Get the ELO actual score for the home team (1.0 win, 0.5 draw, 0.0 loss) */
    getHomeEloScore(): number | undefined {
        const outcome = this.getOutcome();
        if (outcome === PredictionOutcome.PENDING) return undefined;
        if (outcome === PredictionOutcome.HOME_WIN) return 1.0;
        if (outcome === PredictionOutcome.DRAW) return 0.5;
        return 0.0;
    }

    equals(other: Game): boolean {
        return this.id === other.id;
    }

    toString(): string {
        const score = this.completed
            ? ` (${this.homeScore}-${this.awayScore})`
            : '';
        return `${this.homeTeam.name} vs ${this.awayTeam.name}${score}`;
    }
}
