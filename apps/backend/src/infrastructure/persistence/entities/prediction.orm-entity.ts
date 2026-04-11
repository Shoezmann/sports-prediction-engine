import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { GameEntity } from './game.orm-entity';

@Entity('predictions')
@Index('idx_predictions_sport_key_resolved', ['sportKey', 'isResolved'])
@Index('idx_predictions_confidence_level_resolved', ['confidenceLevel', 'isCorrect'])
@Index('idx_predictions_sport_key_created', ['sportKey', 'createdAt'])
@Index('idx_predictions_actual_outcome', ['actualOutcome', 'isCorrect'])
export class PredictionEntity {
    @PrimaryColumn({ type: 'uuid' })
    id!: string;

    @Column({ name: 'game_id', type: 'uuid', unique: true })
    @Index()
    gameId!: string;

    @ManyToOne(() => GameEntity, { eager: true })
    @JoinColumn({ name: 'game_id' })
    game!: GameEntity;

    @Column({ name: 'sport_key', type: 'varchar', length: 128 })
    @Index()
    sportKey!: string;

    // Probability values
    @Column({ name: 'prob_home_win', type: 'float' })
    probHomeWin!: number;

    @Column({ name: 'prob_away_win', type: 'float' })
    probAwayWin!: number;

    @Column({ name: 'prob_draw', type: 'float', nullable: true })
    probDraw!: number | null;

    // Predicted outcome
    @Column({ name: 'predicted_outcome', type: 'varchar', length: 32 })
    predictedOutcome!: string;

    // Confidence
    @Column({ name: 'confidence_value', type: 'float' })
    confidenceValue!: number;

    @Column({ name: 'confidence_level', type: 'varchar', length: 16 })
    confidenceLevel!: string;

    // Model breakdown (stored as JSON)
    @Column({ name: 'model_breakdown', type: 'jsonb', nullable: true })
    modelBreakdown!: Record<string, unknown> | null;

    // Value Betting metrics
    @Column({ name: 'expected_value', type: 'float', nullable: true })
    expectedValue!: number | null;

    @Column({ name: 'recommended_stake', type: 'float', nullable: true })
    recommendedStake!: number | null;

    @Column({ name: 'odds', type: 'float', nullable: true })
    odds!: number | null;

    // Actual result
    @Column({ name: 'actual_outcome', type: 'varchar', length: 32, nullable: true })
    actualOutcome!: string | null;

    @Column({ name: 'is_correct', type: 'boolean', nullable: true })
    isCorrect!: boolean | null;

    @Column({ name: 'is_resolved', type: 'boolean', default: false })
    isResolved!: boolean;

    @CreateDateColumn({ name: 'created_at' })
    @Index()
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}
