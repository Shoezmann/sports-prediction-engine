import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('sports')
export class SportEntity {
    @PrimaryColumn({ type: 'varchar', length: 128 })
    key!: string;

    @Column({ type: 'varchar', length: 64 })
    @Index()
    group!: string;

    @Column({ type: 'varchar', length: 255 })
    title!: string;

    @Column({ type: 'text', nullable: true })
    description!: string;

    @Column({ type: 'boolean', default: true })
    active!: boolean;

    @Column({ name: 'has_outrights', type: 'boolean', default: false })
    hasOutrights!: boolean;

    @Column({ type: 'varchar', length: 32 })
    category!: string;

    @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
    lastSyncedAt!: Date | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}
