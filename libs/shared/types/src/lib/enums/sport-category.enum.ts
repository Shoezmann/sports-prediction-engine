/**
 * Sport categories determine prediction model behavior.
 * Each category corresponds to a different set of possible outcomes.
 */
export enum SportCategory {
  /** Home / Draw / Away — Soccer, Ice Hockey (regulation) */
  THREE_WAY = 'three_way',

  /** Home / Away — Basketball, American Football, Baseball */
  TWO_WAY = 'two_way',

  /** Competitor A / B — Tennis, MMA, Boxing */
  HEAD_TO_HEAD = 'head_to_head',

  /** Multiple competitors — Golf winner, Super Bowl winner, futures */
  OUTRIGHT = 'outright',
}
