import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { ConfidenceLevel } from '@sports-prediction-engine/shared-types';
import type { PredictionRepositoryPort } from '../../../domain/ports/output';
import { Prediction } from '../../../domain/entities';
import { PredictionEntity } from '../entities/prediction.orm-entity';
import { EntityMapper } from '../mappers/entity.mapper';

@Injectable()
export class PgPredictionRepository implements PredictionRepositoryPort {
    constructor(
        @InjectRepository(PredictionEntity)
        private readonly repo: Repository<PredictionEntity>,
    ) { }

    async save(prediction: Prediction): Promise<Prediction> {
        const orm = EntityMapper.toOrmPrediction(prediction);
        await this.repo.save(orm);
        return prediction;
    }

    async saveMany(predictions: Prediction[]): Promise<Prediction[]> {
        const orms = predictions.map((p) => EntityMapper.toOrmPrediction(p));
        await this.repo.save(orms);
        return predictions;
    }

    async findById(id: string): Promise<Prediction | null> {
        const orm = await this.repo.findOneBy({ id });
        return orm ? EntityMapper.toDomainPrediction(orm) : null;
    }

    async findByGameId(gameId: string): Promise<Prediction | null> {
        const orm = await this.repo.findOneBy({ gameId });
        return orm ? EntityMapper.toDomainPrediction(orm) : null;
    }

    async findRecent(limit: number = 20, sportKey?: string): Promise<Prediction[]> {
        const where: Record<string, unknown> = {};
        if (sportKey) where['sportKey'] = sportKey;

        const orms = await this.repo.find({
            where,
            order: { createdAt: 'DESC' },
            take: limit,
        });
        return orms.map(EntityMapper.toDomainPrediction);
    }

    async findResolved(sportKey?: string, limit?: number): Promise<Prediction[]> {
        const where: Record<string, unknown> = { isResolved: true };
        if (sportKey) where['sportKey'] = sportKey;

        const orms = await this.repo.find({
            where,
            order: { createdAt: 'DESC' },
            take: limit,
        });
        return orms.map(EntityMapper.toDomainPrediction);
    }

    async findPending(): Promise<Prediction[]> {
        const orms = await this.repo.findBy({ isResolved: false });
        return orms.map(EntityMapper.toDomainPrediction);
    }

    async findByConfidenceLevel(level: ConfidenceLevel): Promise<Prediction[]> {
        const orms = await this.repo.findBy({ confidenceLevel: level });
        return orms.map(EntityMapper.toDomainPrediction);
    }

    async findByDateRange(from: Date, to: Date, sportKey?: string): Promise<Prediction[]> {
        const where: Record<string, unknown> = {
            createdAt: Between(from, to),
        };
        if (sportKey) where['sportKey'] = sportKey;

        const orms = await this.repo.find({
            where,
            order: { createdAt: 'ASC' },
        });
        return orms.map(EntityMapper.toDomainPrediction);
    }

    async countBySport(): Promise<Record<string, number>> {
        const results = await this.repo
            .createQueryBuilder('p')
            .select('p.sport_key', 'sportKey')
            .addSelect('COUNT(*)', 'count')
            .groupBy('p.sport_key')
            .getRawMany();

        const counts: Record<string, number> = {};
        for (const r of results) {
            counts[r.sportKey] = parseInt(r.count, 10);
        }
        return counts;
    }
}
