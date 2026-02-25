import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { SportRepositoryPort } from '../../../domain/ports/output';
import { Sport } from '../../../domain/entities';
import { SportEntity } from '../entities/sport.orm-entity';
import { EntityMapper } from '../mappers/entity.mapper';

@Injectable()
export class PgSportRepository implements SportRepositoryPort {
    constructor(
        @InjectRepository(SportEntity)
        private readonly repo: Repository<SportEntity>,
    ) { }

    async save(sport: Sport): Promise<Sport> {
        const orm = EntityMapper.toOrmSport(sport);
        await this.repo.save(orm);
        return sport;
    }

    async saveMany(sports: Sport[]): Promise<Sport[]> {
        const orms = sports.map((s) => EntityMapper.toOrmSport(s));
        await this.repo.save(orms);
        return sports;
    }

    async findByKey(key: string): Promise<Sport | null> {
        const orm = await this.repo.findOneBy({ key });
        return orm ? EntityMapper.toDomainSport(orm) : null;
    }

    async findAll(): Promise<Sport[]> {
        const orms = await this.repo.find();
        return orms.map(EntityMapper.toDomainSport);
    }

    async findActive(): Promise<Sport[]> {
        const orms = await this.repo.findBy({ active: true });
        return orms.map(EntityMapper.toDomainSport);
    }

    async findByGroup(group: string): Promise<Sport[]> {
        const orms = await this.repo.findBy({ group });
        return orms.map(EntityMapper.toDomainSport);
    }

    async updateActiveStatus(key: string, active: boolean): Promise<void> {
        await this.repo.update(key, { active });
    }
}
