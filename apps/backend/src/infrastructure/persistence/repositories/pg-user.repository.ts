import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../domain/entities';
import { UserRepositoryPort } from '../../../domain/ports/output';
import { UserEntity } from '../entities/user.orm-entity';
import { EntityMapper } from '../mappers/entity.mapper';

@Injectable()
export class PgUserRepository implements UserRepositoryPort {
    constructor(
        @InjectRepository(UserEntity)
        private readonly repository: Repository<UserEntity>,
    ) { }

    async save(user: User): Promise<User> {
        const ormEntity = EntityMapper.toOrmUser(user);
        const saved = await this.repository.save(ormEntity);
        return EntityMapper.toDomainUser(saved);
    }

    async findById(id: string): Promise<User | null> {
        const found = await this.repository.findOne({ where: { id } });
        return found ? EntityMapper.toDomainUser(found) : null;
    }

    async findByEmail(email: string): Promise<User | null> {
        const found = await this.repository.findOne({ where: { email } });
        return found ? EntityMapper.toDomainUser(found) : null;
    }

    async update(user: User): Promise<User> {
        return this.save(user);
    }
}
