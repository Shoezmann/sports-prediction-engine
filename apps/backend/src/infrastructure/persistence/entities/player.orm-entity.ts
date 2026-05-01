import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Player Entity
 *
 * Stores individual player information and career statistics.
 * Tracks goals, assists, appearances, cards across all competitions.
 */
@Entity('players')
@Index('idx_players_name', ['name'])
@Index('idx_players_team', ['currentTeamId'])
@Index('idx_players_nationality', ['nationality'])
@Index('idx_players_position', ['position'])
export class PlayerEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 255, nullable: true })
  fullName!: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth!: Date | null;

  @Column({ type: 'int', nullable: true })
  age!: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nationality!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  position!: string | null; // e.g., "Forward", "Midfielder", "Defender", "Goalkeeper"

  @Column({ name: 'detailed_position', type: 'varchar', length: 50, nullable: true })
  detailedPosition!: string | null; // e.g., "Centre-Forward", "Left Winger", "CDM"

  @Column({ name: 'shirt_number', type: 'int', nullable: true })
  shirtNumber!: number | null;

  @Column({ name: 'current_team_id', type: 'uuid', nullable: true })
  @Index()
  currentTeamId!: string | null;

  @Column({ name: 'current_team_name', type: 'varchar', length: 255, nullable: true })
  currentTeamName!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  league!: string | null;

  // ═══════════════════════════════════════════════════════
  //  CAREER STATISTICS (All Competitions)
  // ═══════════════════════════════════════════════════════

  @Column({ name: 'career_appearances', type: 'int', default: 0 })
  careerAppearances!: number;

  @Column({ name: 'career_goals', type: 'int', default: 0 })
  careerGoals!: number;

  @Column({ name: 'career_assists', type: 'int', default: 0 })
  careerAssists!: number;

  @Column({ name: 'career_yellow_cards', type: 'int', default: 0 })
  careerYellowCards!: number;

  @Column({ name: 'career_red_cards', type: 'int', default: 0 })
  careerRedCards!: number;

  @Column({ name: 'career_minutes_played', type: 'int', default: 0 })
  careerMinutesPlayed!: number;

  // ═══════════════════════════════════════════════════════
  //  SEASON STATISTICS (Current/Latest)
  // ═══════════════════════════════════════════════════════

  @Column({ name: 'season', type: 'varchar', length: 20, nullable: true })
  season!: string | null; // e.g., "2025/2026"

  @Column({ name: 'season_appearances', type: 'int', default: 0 })
  seasonAppearances!: number;

  @Column({ name: 'season_starts', type: 'int', default: 0 })
  seasonStarts!: number;

  @Column({ name: 'season_substitute_in', type: 'int', default: 0 })
  seasonSubstituteIn!: number;

  @Column({ name: 'season_substitute_out', type: 'int', default: 0 })
  seasonSubstituteOut!: number;

  @Column({ name: 'season_goals', type: 'int', default: 0 })
  seasonGoals!: number;

  @Column({ name: 'season_assists', type: 'int', default: 0 })
  seasonAssists!: number;

  @Column({ name: 'season_yellow_cards', type: 'int', default: 0 })
  seasonYellowCards!: number;

  @Column({ name: 'season_red_cards', type: 'int', default: 0 })
  seasonRedCards!: number;

  @Column({ name: 'season_minutes_played', type: 'int', default: 0 })
  seasonMinutesPlayed!: number;

  // ═══════════════════════════════════════════════════════
  //  ADVANCED STATISTICS
  // ═══════════════════════════════════════════════════════

  @Column({ name: 'goals_per_90', type: 'float', nullable: true })
  goalsPer90!: number | null;

  @Column({ name: 'assists_per_90', type: 'float', nullable: true })
  assistsPer90!: number | null;

  @Column({ name: 'goal_contributions', type: 'int', default: 0 })
  goalContributions!: number; // Goals + Assists

  @Column({ name: 'xg', type: 'float', nullable: true })
  xg!: number | null; // Expected goals

  @Column({ name: 'xa', type: 'float', nullable: true })
  xa!: number | null; // Expected assists

  @Column({ name: 'xg_per_90', type: 'float', nullable: true })
  xgPer90!: number | null;

  @Column({ name: 'shots_per_90', type: 'float', nullable: true })
  shotsPer90!: number | null;

  @Column({ name: 'shots_on_target_pct', type: 'float', nullable: true })
  shotsOnTargetPct!: number | null;

  @Column({ name: 'pass_accuracy', type: 'float', nullable: true })
  passAccuracy!: number | null;

  @Column({ name: 'key_passes_per_90', type: 'float', nullable: true })
  keyPassesPer90!: number | null;

  @Column({ name: 'dribbles_per_90', type: 'float', nullable: true })
  dribblesPer90!: number | null;

  @Column({ name: 'tackles_per_90', type: 'float', nullable: true })
  tacklesPer90!: number | null;

  @Column({ name: 'interceptions_per_90', type: 'float', nullable: true })
  interceptionsPer90!: number | null;

  // ═══════════════════════════════════════════════════════
  //  PHYSICAL ATTRIBUTES
  // ═══════════════════════════════════════════════════════

  @Column({ name: 'height_cm', type: 'int', nullable: true })
  heightCm!: number | null;

  @Column({ name: 'weight_kg', type: 'int', nullable: true })
  weightKg!: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  foot!: string | null; // "Left", "Right", "Both"

  // ═══════════════════════════════════════════════════════
  //  MARKET VALUE & CONTRACT
  // ═══════════════════════════════════════════════════════

  @Column({ name: 'market_value_eur', type: 'int', nullable: true })
  marketValueEur!: number | null;

  @Column({ name: 'contract_until', type: 'varchar', length: 10, nullable: true })
  contractUntil!: string | null; // e.g., "2026-06-30"

  // ═══════════════════════════════════════════════════════
  //  METADATA
  // ═══════════════════════════════════════════════════════

  @Column({ name: 'external_id', type: 'varchar', length: 128, nullable: true })
  @Index({ unique: true })
  externalId!: string | null;

  @Column({ name: 'data_source', type: 'varchar', length: 50, nullable: true })
  dataSource!: string | null; // e.g., "FlashScore", "FBref", "Manual"

  @Column({ type: 'text', nullable: true })
  biography!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
