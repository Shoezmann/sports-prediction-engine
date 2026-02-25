import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Between, Repository, IsNull } from 'typeorm';
import type { GameRepositoryPort } from '../../../domain/ports/output';
import { Game } from '../../../domain/entities';
import { GameEntity } from '../entities/game.orm-entity';
import { EntityMapper } from '../mappers/entity.mapper';

@Injectable()
export class PgGameRepository implements GameRepositoryPort {
    constructor(
        @InjectRepository(GameEntity)
        private readonly repo: Repository<GameEntity>,
    ) { }

    async save(game: Game): Promise<Game> {
        const orm = EntityMapper.toOrmGame(game);
        await this.repo.save(orm);
        return game;
    }

    async saveMany(games: Game[]): Promise<Game[]> {
        const orms = games.map((g) => EntityMapper.toOrmGame(g));
        await this.repo.save(orms);
        return games;
    }

    async findById(id: string): Promise<Game | null> {
        const orm = await this.repo.findOneBy({ id });
        return orm ? EntityMapper.toDomainGame(orm) : null;
    }

    async findByExternalId(externalId: string): Promise<Game | null> {
        const orm = await this.repo.findOneBy({ externalId });
        return orm ? EntityMapper.toDomainGame(orm) : null;
    }

    async findUpcoming(sportKey?: string): Promise<Game[]> {
        const where: Record<string, unknown> = {
            completed: false,
            commenceTime: MoreThan(new Date()),
        };
        if (sportKey) where['sportKey'] = sportKey;

        const orms = await this.repo.find({
            where,
            order: { commenceTime: 'ASC' },
        });
        return orms.map(EntityMapper.toDomainGame);
    }

    async findCompleted(sportKey?: string, limit?: number): Promise<Game[]> {
        const where: Record<string, unknown> = { completed: true };
        if (sportKey) where['sportKey'] = sportKey;

        const orms = await this.repo.find({
            where,
            order: { commenceTime: 'DESC' },
            take: limit,
        });
        return orms.map(EntityMapper.toDomainGame);
    }

    async findByDateRange(from: Date, to: Date, sportKey?: string): Promise<Game[]> {
        const where: Record<string, unknown> = {
            commenceTime: Between(from, to),
        };
        if (sportKey) where['sportKey'] = sportKey;

        const orms = await this.repo.find({
            where,
            order: { commenceTime: 'ASC' },
        });
        return orms.map(EntityMapper.toDomainGame);
    }

    async findUnresolved(): Promise<Game[]> {
        const orms = await this.repo.find({
            where: {
                completed: false,
                commenceTime: LessThan(new Date()),
            },
            order: { commenceTime: 'ASC' },
        });
        return orms.map(EntityMapper.toDomainGame);
    }
}
