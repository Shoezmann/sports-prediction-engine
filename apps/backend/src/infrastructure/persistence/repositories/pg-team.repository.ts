import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import type { TeamRepositoryPort } from '../../../domain/ports/output';
import { Team } from '../../../domain/entities';
import { TeamEntity } from '../entities/team.orm-entity';
import { EntityMapper } from '../mappers/entity.mapper';

@Injectable()
export class PgTeamRepository implements TeamRepositoryPort {
    constructor(
        @InjectRepository(TeamEntity)
        private readonly repo: Repository<TeamEntity>,
    ) { }

    async save(team: Team): Promise<Team> {
        const orm = EntityMapper.toOrmTeam(team);
        await this.repo.save(orm);
        return team;
    }

    async saveMany(teams: Team[]): Promise<Team[]> {
        const orms = teams.map((t) => EntityMapper.toOrmTeam(t));
        await this.repo.save(orms);
        return teams;
    }

    async findById(id: string): Promise<Team | null> {
        const orm = await this.repo.findOneBy({ id });
        return orm ? EntityMapper.toDomainTeam(orm) : null;
    }

    async findByName(name: string, sportKey: string): Promise<Team | null> {
        const orm = await this.repo.findOneBy({ name, sportKey });
        return orm ? EntityMapper.toDomainTeam(orm) : null;
    }

    async findBySportKey(sportKey: string): Promise<Team[]> {
        const orms = await this.repo.findBy({ sportKey });
        return orms.map(EntityMapper.toDomainTeam);
    }

    async findOrCreate(name: string, sportKey: string): Promise<Team> {
        const existing = await this.findByName(name, sportKey);
        if (existing) return existing;

        const team = Team.create({ id: uuidv4(), name, sportKey });
        await this.save(team);
        return team;
    }
}
