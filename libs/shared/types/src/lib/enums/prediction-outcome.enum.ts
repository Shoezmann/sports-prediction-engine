/**
 * Possible prediction outcomes.
 * Which outcomes are valid depends on the sport category.
 */
export enum PredictionOutcome {
    /** Home team / Competitor A wins */
    HOME_WIN = 'home_win',

    /** Away team / Competitor B wins */
    AWAY_WIN = 'away_win',

    /** Match ends in a draw — only for THREE_WAY sports */
    DRAW = 'draw',

    /** Prediction has not yet been resolved */
    PENDING = 'pending',
}
