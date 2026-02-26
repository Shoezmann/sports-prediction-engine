import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { BetRepositoryPort } from '../../../domain/ports/output/bet-repository.port';
import { Bet } from '../../../domain/entities/bet.entity';
import { BetEntity } from '../entities/bet.orm-entity';
import { EntityMapper } from '../mappers/entity.mapper';
import { BetStatus } from '@sports-prediction-engine/shared-types';

@Injectable()
export class PgBetRepository implements BetRepositoryPort {
    constructor(
        @InjectRepository(BetEntity)
        private readonly repo: Repository<BetEntity>,
    ) { }

    async save(bet: Bet): Promise<Bet> {
        const orm = EntityMapper.toOrmBet(bet);
        await this.repo.save(orm);
        return bet;
    }

    async findById(id: string): Promise<Bet | null> {
        const orm = await this.repo.findOneBy({ id });
        return orm ? EntityMapper.toDomainBet(orm) : null;
    }

    async findByUserId(userId: string): Promise<Bet[]> {
        const orms = await this.repo.find({
            where: { userId },
            order: { placedAt: 'DESC' },
            relations: ['prediction', 'prediction.game', 'prediction.game.homeTeam', 'prediction.game.awayTeam'], // Load relations if needed
        });
        return orms.map(EntityMapper.toDomainBet);
    }

    async findPendingByPredictionId(predictionId: string): Promise<Bet[]> {
        const orms = await this.repo.find({
            where: { predictionId, status: BetStatus.PENDING },
        });
        return orms.map(EntityMapper.toDomainBet);
    }
}
