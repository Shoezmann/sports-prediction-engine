import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { GameEntity } from './game.orm-entity';

/**
 * Match Statistics Entity
 *
 * Stores detailed match statistics for historical and current matches.
 * Includes goals, cards, corners, possession, xG, and other advanced metrics.
 */
@Entity('match_statistics')
@Index('idx_match_statistics_game_id', ['gameId'])
export class MatchStatisticsEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'game_id', type: 'uuid', unique: true })
  @Index()
  gameId!: string;

  @ManyToOne(() => GameEntity, { eager: true })
  @JoinColumn({ name: 'game_id' })
  game!: GameEntity;

  // ═══════════════════════════════════════════════════════
  //  GOALS & SCORING
  // ═══════════════════════════════════════════════════════

  @Column({ name: 'home_goals', type: 'int', default: 0 })
  homeGoals!: number;

  @Column({ name: 'away_goals', type: 'int', default: 0 })
  awayGoals!: number;

  @Column({ name: 'home_xg', type: 'float', nullable: true })
  homeXg!: number | null; // Expected goals

  @Column({ name: 'away_xg', type: 'float', nullable: true })
  awayXg!: number | null;

  @Column({ name: 'home_xg_first_half', type: 'float', nullable: true })
  homeXgFirstHalf!: number | null;

  @Column({ name: 'away_xg_first_half', type: 'float', nullable: true })
  awayXgFirstHalf!: number | null;

  @Column({ name: 'home_shots', type: 'int', nullable: true })
  homeShots!: number | null;

  @Column({ name: 'away_shots', type: 'int', nullable: true })
  awayShots!: number | null;

  @Column({ name: 'home_shots_on_target', type: 'int', nullable: true })
  homeShotsOnTarget!: number | null;

  @Column({ name: 'away_shots_on_target', type: 'int', nullable: true })
  awayShotsOnTarget!: number | null;

  @Column({ name: 'home_shots_off_target', type: 'int', nullable: true })
  homeShotsOffTarget!: number | null;

  @Column({ name: 'away_shots_off_target', type: 'int', nullable: true })
  awayShotsOffTarget!: number | null;

  @Column({ name: 'home_blocked_shots', type: 'int', nullable: true })
  homeBlockedShots!: number | null;

  @Column({ name: 'away_blocked_shots', type: 'int', nullable: true })
  awayBlockedShots!: number | null;

  // ═══════════════════════════════════════════════════════
  //  POSSESSION & PASSING
  // ═══════════════════════════════════════════════════════

  @Column({ name: 'home_possession', type: 'float', nullable: true })
  homePossession!: number | null; // Percentage (0-100)

  @Column({ name: 'away_possession', type: 'float', nullable: true })
  awayPossession!: number | null;

  @Column({ name: 'home_passes', type: 'int', nullable: true })
  homePasses!: number | null;

  @Column({ name: 'away_passes', type: 'int', nullable: true })
  awayPasses!: number | null;

  @Column({ name: 'home_passes_accurate', type: 'int', nullable: true })
  homePassesAccurate!: number | null;

  @Column({ name: 'away_passes_accurate', type: 'int', nullable: true })
  awayPassesAccurate!: number | null;

  @Column({ name: 'home_pass_accuracy', type: 'float', nullable: true })
  homePassAccuracy!: number | null; // Percentage

  @Column({ name: 'away_pass_accuracy', type: 'float', nullable: true })
  awayPassAccuracy!: number | null;

  // ═══════════════════════════════════════════════════════
  //  ATTACKING STATS
  // ═══════════════════════════════════════════════════════

  @Column({ name: 'home_corners', type: 'int', nullable: true })
  homeCorners!: number | null;

  @Column({ name: 'away_corners', type: 'int', nullable: true })
  awayCorners!: number | null;

  @Column({ name: 'home_crosses', type: 'int', nullable: true })
  homeCrosses!: number | null;

  @Column({ name: 'away_crosses', type: 'int', nullable: true })
  awayCrosses!: number | null;

  @Column({ name: 'home_offsides', type: 'int', nullable: true })
  homeOffsides!: number | null;

  @Column({ name: 'away_offsides', type: 'int', nullable: true })
  awayOffsides!: number | null;

  @Column({ name: 'home_attacks', type: 'int', nullable: true })
  homeAttacks!: number | null;

  @Column({ name: 'away_attacks', type: 'int', nullable: true })
  awayAttacks!: number | null;

  @Column({ name: 'home_dangerous_attacks', type: 'int', nullable: true })
  homeDangerousAttacks!: number | null;

  @Column({ name: 'away_dangerous_attacks', type: 'int', nullable: true })
  awayDangerousAttacks!: number | null;

  // ═══════════════════════════════════════════════════════
  //  DEFENDING STATS
  // ═══════════════════════════════════════════════════════

  @Column({ name: 'home_tackles', type: 'int', nullable: true })
  homeTackles!: number | null;

  @Column({ name: 'away_tackles', type: 'int', nullable: true })
  awayTackles!: number | null;

  @Column({ name: 'home_clearances', type: 'int', nullable: true })
  homeClearances!: number | null;

  @Column({ name: 'away_clearances', type: 'int', nullable: true })
  awayClearances!: number | null;

  @Column({ name: 'home_interceptions', type: 'int', nullable: true })
  homeInterceptions!: number | null;

  @Column({ name: 'away_interceptions', type: 'int', nullable: true })
  awayInterceptions!: number | null;

  // ═══════════════════════════════════════════════════════
  //  DISCIPLINE (CARDS & FOULS)
  // ═══════════════════════════════════════════════════════

  @Column({ name: 'home_fouls', type: 'int', nullable: true })
  homeFouls!: number | null;

  @Column({ name: 'away_fouls', type: 'int', nullable: true })
  awayFouls!: number | null;

  @Column({ name: 'home_yellow_cards', type: 'int', nullable: true })
  homeYellowCards!: number | null;

  @Column({ name: 'away_yellow_cards', type: 'int', nullable: true })
  awayYellowCards!: number | null;

  @Column({ name: 'home_red_cards', type: 'int', nullable: true })
  homeRedCards!: number | null;

  @Column({ name: 'away_red_cards', type: 'int', nullable: true })
  awayRedCards!: number | null;

  // ═══════════════════════════════════════════════════════
  //  GOALKEEPING STATS
  // ═══════════════════════════════════════════════════════

  @Column({ name: 'home_saves', type: 'int', nullable: true })
  homeSaves!: number | null;

  @Column({ name: 'away_saves', type: 'int', nullable: true })
  awaySaves!: number | null;

  // ═══════════════════════════════════════════════════════
  //  SET PIECES
  // ═══════════════════════════════════════════════════════

  @Column({ name: 'home_free_kicks', type: 'int', nullable: true })
  homeFreeKicks!: number | null;

  @Column({ name: 'away_free_kicks', type: 'int', nullable: true })
  awayFreeKicks!: number | null;

  @Column({ name: 'home_throw_ins', type: 'int', nullable: true })
  homeThrowIns!: number | null;

  @Column({ name: 'away_throw_ins', type: 'int', nullable: true })
  awayThrowIns!: number | null;

  @Column({ name: 'home_goal_kicks', type: 'int', nullable: true })
  homeGoalKicks!: number | null;

  @Column({ name: 'away_goal_kicks', type: 'int', nullable: true })
  awayGoalKicks!: number | null;

  // ═══════════════════════════════════════════════════════
  //  MATCH CONTEXT
  // ═══════════════════════════════════════════════════════

  @Column({ name: 'venue', type: 'varchar', length: 255, nullable: true })
  venue!: string | null;

  @Column({ name: 'attendance', type: 'int', nullable: true })
  attendance!: number | null;

  @Column({ name: 'referee', type: 'varchar', length: 255, nullable: true })
  referee!: string | null;

  @Column({ name: 'weather', type: 'varchar', length: 100, nullable: true })
  weather!: string | null; // e.g., "Sunny", "Rainy"

  @Column({ name: 'temperature', type: 'float', nullable: true })
  temperature!: number | null; // Celsius

  @Column({ name: 'round', type: 'varchar', length: 50, nullable: true })
  round!: string | null; // e.g., "Round 15", "Quarter-finals"

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
