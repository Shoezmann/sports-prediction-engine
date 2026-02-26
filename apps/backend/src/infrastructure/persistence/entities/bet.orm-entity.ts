import {
    Entity,
    Column,
    PrimaryColumn,
    CreateDateColumn,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import { BetStatus } from '@sports-prediction-engine/shared-types';
import { UserEntity } from './user.orm-entity';
import { PredictionEntity } from './prediction.orm-entity';

@Entity('bets')
export class BetEntity {
    @PrimaryColumn('uuid')
    id: string;

    @Column('uuid', { name: 'user_id' })
    userId: string;

    @Column('uuid', { name: 'prediction_id' })
    predictionId: string;

    @Column('numeric', { precision: 10, scale: 2 })
    stake: number;

    @Column('numeric', { precision: 10, scale: 4 })
    lockedOdds: number;

    @Column({
        type: 'enum',
        enum: BetStatus,
        default: BetStatus.PENDING,
    })
    status: BetStatus;

    @CreateDateColumn({ name: 'placed_at' })
    placedAt: Date;

    @Column({ type: 'timestamp', name: 'resolved_at', nullable: true })
    resolvedAt: Date | null;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'user_id' })
    user?: UserEntity;

    @ManyToOne(() => PredictionEntity)
    @JoinColumn({ name: 'prediction_id' })
    prediction?: PredictionEntity;
}
