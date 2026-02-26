import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class UserEntity {
    @PrimaryColumn({ type: 'uuid' })
    id!: string;

    @Column({ name: 'email', type: 'varchar', length: 255, unique: true })
    email!: string;

    @Column({ name: 'password_hash', type: 'varchar', length: 255 })
    passwordHash!: string;

    @Column({ name: 'first_name', type: 'varchar', length: 100, nullable: true })
    firstName!: string | null;

    @Column({ name: 'favorite_sports', type: 'jsonb', nullable: true })
    favoriteSports!: string[] | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;
}
