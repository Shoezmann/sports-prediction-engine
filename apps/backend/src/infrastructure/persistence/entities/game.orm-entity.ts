import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TeamEntity } from './team.orm-entity';

@Entity('games')
export class GameEntity {
    @PrimaryColumn({ type: 'uuid' })
    id!: string;

    @Column({ name: 'external_id', type: 'varchar', length: 128, unique: true })
    @Index()
    externalId!: string;

    @Column({ name: 'sport_key', type: 'varchar', length: 128 })
    @Index()
    sportKey!: string;

    @Column({ name: 'sport_category', type: 'varchar', length: 32 })
    sportCategory!: string;

    @Column({ name: 'home_team_id', type: 'uuid' })
    homeTeamId!: string;

    @Column({ name: 'away_team_id', type: 'uuid' })
    awayTeamId!: string;

    @ManyToOne(() => TeamEntity, { eager: true })
    @JoinColumn({ name: 'home_team_id' })
    homeTeam!: TeamEntity;

    @ManyToOne(() => TeamEntity, { eager: true })
    @JoinColumn({ name: 'away_team_id' })
    awayTeam!: TeamEntity;

    @Column({ name: 'commence_time', type: 'timestamptz' })
    @Index()
    commenceTime!: Date;

    @Column({ type: 'boolean', default: false })
    completed!: boolean;

    @Column({ name: 'home_score', type: 'int', nullable: true })
    homeScore!: number | null;

    @Column({ name: 'away_score', type: 'int', nullable: true })
    awayScore!: number | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}
