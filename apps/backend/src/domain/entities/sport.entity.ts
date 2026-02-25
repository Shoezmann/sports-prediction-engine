import {
    SportCategory,
    SportGroup,
    getSportCategory,
} from '@sports-prediction-engine/shared-types';

/**
 * Domain Entity: Sport
 *
 * Represents a sport/league as discovered from The Odds API.
 * Contains metadata needed to determine prediction model behavior.
 */
export class Sport {
    constructor(
        public readonly key: string,
        public readonly group: SportGroup,
        public readonly title: string,
        public readonly description: string,
        public readonly active: boolean,
        public readonly hasOutrights: boolean,
        public readonly category: SportCategory,
        public readonly lastSyncedAt?: Date,
    ) { }

    static create(props: {
        key: string;
        group: string;
        title: string;
        description: string;
        active: boolean;
        hasOutrights: boolean;
        lastSyncedAt?: Date;
    }): Sport {
        const category = getSportCategory(props.group);
        return new Sport(
            props.key,
            props.group as SportGroup,
            props.title,
            props.description,
            props.active,
            props.hasOutrights,
            category,
            props.lastSyncedAt,
        );
    }

    /** Create a new Sport instance with updated active status */
    withActiveStatus(active: boolean): Sport {
        return new Sport(
            this.key,
            this.group,
            this.title,
            this.description,
            active,
            this.hasOutrights,
            this.category,
            this.lastSyncedAt,
        );
    }

    /** Create a new Sport instance with updated sync timestamp */
    withSyncedAt(date: Date): Sport {
        return new Sport(
            this.key,
            this.group,
            this.title,
            this.description,
            this.active,
            this.hasOutrights,
            this.category,
            date,
        );
    }

    get isThreeWay(): boolean {
        return this.category === SportCategory.THREE_WAY;
    }

    get isTwoWay(): boolean {
        return this.category === SportCategory.TWO_WAY;
    }

    get isHeadToHead(): boolean {
        return this.category === SportCategory.HEAD_TO_HEAD;
    }

    get isOutright(): boolean {
        return this.category === SportCategory.OUTRIGHT;
    }

    /** Whether this sport supports draw outcomes */
    get supportsDraws(): boolean {
        return this.isThreeWay;
    }
}
