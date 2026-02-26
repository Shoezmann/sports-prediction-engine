import { Injectable } from '@nestjs/common';
import { ConfidenceLevel } from '@sports-prediction-engine/shared-types';
import type { PredictionRepositoryPort } from '../../../domain/ports/output';
import { Prediction } from '../../../domain/entities';

@Injectable()
export class InMemoryPredictionRepository
    implements PredictionRepositoryPort {
    private predictions: Map<string, Prediction> = new Map();

    async save(prediction: Prediction): Promise<Prediction> {
        this.predictions.set(prediction.id, prediction);
        return prediction;
    }

    async saveMany(predictions: Prediction[]): Promise<Prediction[]> {
        for (const p of predictions) {
            this.predictions.set(p.id, p);
        }
        return predictions;
    }

    async findById(id: string): Promise<Prediction | null> {
        return this.predictions.get(id) ?? null;
    }

    async findByGameId(gameId: string): Promise<Prediction | null> {
        return (
            Array.from(this.predictions.values()).find(
                (p) => p.game.id === gameId,
            ) ?? null
        );
    }

    async findRecent(
        limit: number = 20,
        sportKey?: string,
    ): Promise<Prediction[]> {
        return Array.from(this.predictions.values())
            .filter((p) => !sportKey || p.sportKey === sportKey)
            .sort(
                (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
            )
            .slice(0, limit);
    }

    async findResolved(
        sportKey?: string,
        limit?: number,
    ): Promise<Prediction[]> {
        let resolved = Array.from(this.predictions.values())
            .filter(
                (p) =>
                    p.isResolved && (!sportKey || p.sportKey === sportKey),
            )
            .sort(
                (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
            );

        if (limit) resolved = resolved.slice(0, limit);
        return resolved;
    }

    async findPending(sportKey?: string): Promise<Prediction[]> {
        return Array.from(this.predictions.values()).filter(
            (p) => p.isPending && (!sportKey || p.sportKey === sportKey),
        );
    }

    async findByConfidenceLevel(
        level: ConfidenceLevel,
    ): Promise<Prediction[]> {
        return Array.from(this.predictions.values()).filter(
            (p) => p.confidence.level === level,
        );
    }

    async findByDateRange(
        from: Date,
        to: Date,
        sportKey?: string,
    ): Promise<Prediction[]> {
        return Array.from(this.predictions.values()).filter(
            (p) =>
                p.createdAt >= from &&
                p.createdAt <= to &&
                (!sportKey || p.sportKey === sportKey),
        );
    }

    async countBySport(): Promise<Record<string, number>> {
        const counts: Record<string, number> = {};
        for (const p of this.predictions.values()) {
            counts[p.sportKey] = (counts[p.sportKey] ?? 0) + 1;
        }
        return counts;
    }
}
