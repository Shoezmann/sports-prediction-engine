import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('teams')
@Index(['name', 'sportKey'], { unique: true })
export class TeamEntity {
    @PrimaryColumn({ type: 'uuid' })
    id!: string;

    @Column({ type: 'varchar', length: 255 })
    @Index()
    name!: string;

    @Column({ name: 'sport_key', type: 'varchar', length: 128 })
    @Index()
    sportKey!: string;

    @Column({ name: 'short_name', type: 'varchar', length: 64, nullable: true })
    shortName!: string | null;

    @Column({ name: 'elo_rating', type: 'float', default: 1500 })
    eloRating!: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}
