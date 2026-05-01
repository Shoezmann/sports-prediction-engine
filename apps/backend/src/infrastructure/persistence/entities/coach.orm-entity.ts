import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Coach/Manager Entity
 *
 * Stores information about coaches and managers in South African football.
 * Tracks their career, win rates, trophies, and tactical preferences.
 */
@Entity('coaches')
@Index('idx_coaches_name', ['name'])
@Index('idx_coaches_nationality', ['nationality'])
@Index('idx_coaches_current_team', ['currentTeamName'])
export class CoachEntity {
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

  @Column({ name: 'current_team_name', type: 'varchar', length: 255, nullable: true })
  currentTeamName!: string | null;

  @Column({ name: 'current_league', type: 'varchar', length: 100, nullable: true })
  currentLeague!: string | null;

  @Column({ name: 'appointed_date', type: 'date', nullable: true })
  appointedDate!: Date | null;

  @Column({ name: 'contract_until', type: 'varchar', length: 10, nullable: true })
  contractUntil!: string | null;

  // ═══════════════════════════════════════════════════════
  //  CAREER STATISTICS
  // ═══════════════════════════════════════════════════════

  @Column({ name: 'career_matches', type: 'int', default: 0 })
  careerMatches!: number;

  @Column({ name: 'career_wins', type: 'int', default: 0 })
  careerWins!: number;

  @Column({ name: 'career_draws', type: 'int', default: 0 })
  careerDraws!: number;

  @Column({ name: 'career_losses', type: 'int', default: 0 })
  careerLosses!: number;

  @Column({ name: 'career_win_rate', type: 'float', nullable: true })
  careerWinRate!: number | null; // Percentage (0-100)

  @Column({ name: 'career_goals_for', type: 'int', default: 0 })
  careerGoalsFor!: number;

  @Column({ name: 'career_goals_against', type: 'int', default: 0 })
  careerGoalsAgainst!: number;

  @Column({ name: 'career_goal_difference', type: 'int', default: 0 })
  careerGoalDifference!: number;

  @Column({ name: 'career_points_per_game', type: 'float', nullable: true })
  careerPointsPerGame!: number | null;

  // ═══════════════════════════════════════════════════════
  //  CURRENT SEASON STATISTICS
  // ═══════════════════════════════════════════════════════

  @Column({ name: 'season', type: 'varchar', length: 20, nullable: true })
  season!: string | null;

  @Column({ name: 'season_matches', type: 'int', default: 0 })
  seasonMatches!: number;

  @Column({ name: 'season_wins', type: 'int', default: 0 })
  seasonWins!: number;

  @Column({ name: 'season_draws', type: 'int', default: 0 })
  seasonDraws!: number;

  @Column({ name: 'season_losses', type: 'int', default: 0 })
  seasonLosses!: number;

  @Column({ name: 'season_win_rate', type: 'float', nullable: true })
  seasonWinRate!: number | null;

  @Column({ name: 'season_goals_for', type: 'int', default: 0 })
  seasonGoalsFor!: number;

  @Column({ name: 'season_goals_against', type: 'int', default: 0 })
  seasonGoalsAgainst!: number;

  @Column({ name: 'season_points_per_game', type: 'float', nullable: true })
  seasonPointsPerGame!: number | null;

  // ═══════════════════════════════════════════════════════
  //  TROPHIES & ACHIEVEMENTS
  // ═══════════════════════════════════════════════════════

  @Column({ name: 'total_trophies', type: 'int', default: 0 })
  totalTrophies!: number;

  @Column({ name: 'league_titles', type: 'int', default: 0 })
  leagueTitles!: number;

  @Column({ name: 'domestic_cups', type: 'int', default: 0 })
  domesticCups!: number;

  @Column({ name: 'league_cups', type: 'int', default: 0 })
  leagueCups!: number;

  @Column({ name: 'continental_cups', type: 'int', default: 0 })
  continentalCups!: number;

  @Column({ name: 'super_cups', type: 'int', default: 0 })
  superCups!: number;

  @Column({ name: 'trophies_list', type: 'text', nullable: true })
  trophiesList!: string | null; // JSON array of trophies

  // ═══════════════════════════════════════════════════════
  //  TACTICAL INFORMATION
  // ═══════════════════════════════════════════════════════

  @Column({ name: 'preferred_formation', type: 'varchar', length: 20, nullable: true })
  preferredFormation!: string | null; // e.g., "4-2-3-1", "4-4-2"

  @Column({ name: 'formations_used', type: 'text', nullable: true })
  formationsUsed!: string | null; // JSON array of formations used

  @Column({ name: 'playing_style', type: 'varchar', length: 100, nullable: true })
  playingStyle!: string | null; // e.g., "Possession-based", "Counter-attacking"

  @Column({ name: 'coaching_badge', type: 'varchar', length: 100, nullable: true })
  coachingBadge!: string | null; // e.g., "CAF Pro", "UEFA A License"

  // ═══════════════════════════════════════════════════════
  //  COACHING HISTORY
  // ═══════════════════════════════════════════════════════

  @Column({ name: 'coaching_history', type: 'text', nullable: true })
  coachingHistory!: string | null; // JSON array of previous clubs

  @Column({ name: 'years_active', type: 'int', nullable: true })
  yearsActive!: number | null;

  @Column({ name: 'coaching_since', type: 'varchar', length: 10, nullable: true })
  coachingSince!: string | null; // e.g., "2010"

  // ═══════════════════════════════════════════════════════
  //  METADATA
  // ═══════════════════════════════════════════════════════

  @Column({ name: 'external_id', type: 'varchar', length: 128, nullable: true })
  @Index({ unique: true })
  externalId!: string | null;

  @Column({ name: 'data_source', type: 'varchar', length: 50, nullable: true })
  dataSource!: string | null;

  @Column({ type: 'text', nullable: true })
  biography!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
