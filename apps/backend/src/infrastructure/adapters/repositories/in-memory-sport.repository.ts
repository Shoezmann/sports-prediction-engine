import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type { SportRepositoryPort } from '../../../domain/ports/output';
import { Sport } from '../../../domain/entities';

/**
 * In-Memory Sport Repository
 *
 * Phase 1 implementation — stores data in memory.
 * Will be replaced by TypeORM/PostgreSQL in Phase 2.
 */
@Injectable()
export class InMemorySportRepository implements SportRepositoryPort {
    private sports: Map<string, Sport> = new Map();

    async save(sport: Sport): Promise<Sport> {
        this.sports.set(sport.key, sport);
        return sport;
    }

    async saveMany(sports: Sport[]): Promise<Sport[]> {
        for (const sport of sports) {
            this.sports.set(sport.key, sport);
        }
        return sports;
    }

    async findByKey(key: string): Promise<Sport | null> {
        return this.sports.get(key) ?? null;
    }

    async findAll(): Promise<Sport[]> {
        return Array.from(this.sports.values());
    }

    async findActive(): Promise<Sport[]> {
        return Array.from(this.sports.values()).filter((s) => s.active);
    }

    async findByGroup(group: string): Promise<Sport[]> {
        return Array.from(this.sports.values()).filter(
            (s) => s.group === group,
        );
    }

    async updateActiveStatus(key: string, active: boolean): Promise<void> {
        const sport = this.sports.get(key);
        if (sport) {
            this.sports.set(key, sport.withActiveStatus(active));
        }
    }
}
