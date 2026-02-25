import { SportCategory } from '../enums/sport-category.enum';

/**
 * Maps sport group names (from The Odds API) to their prediction model category.
 * Used to determine whether a sport uses three-way, two-way, or head-to-head predictions.
 */
export const SPORT_GROUP_CATEGORY_MAP: Record<string, SportCategory> = {
    'Soccer': SportCategory.THREE_WAY,
    'Ice Hockey': SportCategory.THREE_WAY,
    'American Football': SportCategory.TWO_WAY,
    'Basketball': SportCategory.TWO_WAY,
    'Baseball': SportCategory.TWO_WAY,
    'Aussie Rules': SportCategory.TWO_WAY,
    'Rugby League': SportCategory.TWO_WAY,
    'Rugby Union': SportCategory.TWO_WAY,
    'Volleyball': SportCategory.TWO_WAY,
    'Handball': SportCategory.TWO_WAY,
    'Lacrosse': SportCategory.TWO_WAY,
    'Cricket': SportCategory.TWO_WAY,
    'Tennis': SportCategory.HEAD_TO_HEAD,
    'Mixed Martial Arts': SportCategory.HEAD_TO_HEAD,
    'Boxing': SportCategory.HEAD_TO_HEAD,
    'Table Tennis': SportCategory.HEAD_TO_HEAD,
    'Golf': SportCategory.OUTRIGHT,
};

/**
 * Derive the sport category from a sport group name.
 * Falls back to TWO_WAY for unknown sport groups.
 */
export function getSportCategory(group: string): SportCategory {
    return SPORT_GROUP_CATEGORY_MAP[group] ?? SportCategory.TWO_WAY;
}
