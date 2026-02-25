import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type { TeamRepositoryPort } from '../../../domain/ports/output';
import { Team } from '../../../domain/entities';

@Injectable()
export class InMemoryTeamRepository implements TeamRepositoryPort {
    private teams: Map<string, Team> = new Map();

    async save(team: Team): Promise<Team> {
        this.teams.set(team.id, team);
        return team;
    }

    async saveMany(teams: Team[]): Promise<Team[]> {
        for (const team of teams) {
            this.teams.set(team.id, team);
        }
        return teams;
    }

    async findById(id: string): Promise<Team | null> {
        return this.teams.get(id) ?? null;
    }

    async findByName(name: string, sportKey: string): Promise<Team | null> {
        return (
            Array.from(this.teams.values()).find(
                (t) => t.name === name && t.sportKey === sportKey,
            ) ?? null
        );
    }

    async findBySportKey(sportKey: string): Promise<Team[]> {
        return Array.from(this.teams.values()).filter(
            (t) => t.sportKey === sportKey,
        );
    }

    async findOrCreate(name: string, sportKey: string): Promise<Team> {
        const existing = await this.findByName(name, sportKey);
        if (existing) return existing;

        const team = Team.create({
            id: uuidv4(),
            name,
            sportKey,
        });
        await this.save(team);
        return team;
    }
}
