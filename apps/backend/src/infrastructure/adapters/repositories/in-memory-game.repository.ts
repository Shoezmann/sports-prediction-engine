import { Injectable } from '@nestjs/common';
import type { GameRepositoryPort } from '../../../domain/ports/output';
import { Game } from '../../../domain/entities';

@Injectable()
export class InMemoryGameRepository implements GameRepositoryPort {
    private games: Map<string, Game> = new Map();

    async save(game: Game): Promise<Game> {
        this.games.set(game.id, game);
        return game;
    }

    async saveMany(games: Game[]): Promise<Game[]> {
        for (const game of games) {
            this.games.set(game.id, game);
        }
        return games;
    }

    async findById(id: string): Promise<Game | null> {
        return this.games.get(id) ?? null;
    }

    async findByExternalId(externalId: string): Promise<Game | null> {
        return (
            Array.from(this.games.values()).find(
                (g) => g.externalId === externalId,
            ) ?? null
        );
    }

    async findUpcoming(sportKey?: string): Promise<Game[]> {
        const now = new Date();
        return Array.from(this.games.values()).filter(
            (g) =>
                !g.completed &&
                g.commenceTime > now &&
                (!sportKey || g.sportKey === sportKey),
        );
    }

    async findCompleted(sportKey?: string, limit?: number): Promise<Game[]> {
        let games = Array.from(this.games.values())
            .filter(
                (g) => g.completed && (!sportKey || g.sportKey === sportKey),
            )
            .sort(
                (a, b) =>
                    b.commenceTime.getTime() - a.commenceTime.getTime(),
            );

        if (limit) games = games.slice(0, limit);
        return games;
    }

    async findByDateRange(
        from: Date,
        to: Date,
        sportKey?: string,
    ): Promise<Game[]> {
        return Array.from(this.games.values()).filter(
            (g) =>
                g.commenceTime >= from &&
                g.commenceTime <= to &&
                (!sportKey || g.sportKey === sportKey),
        );
    }

    async findUnresolved(): Promise<Game[]> {
        const now = new Date();
        return Array.from(this.games.values()).filter(
            (g) => !g.completed && g.commenceTime < now,
        );
    }

    async findRecentByTeam(teamId: string, limit: number = 5): Promise<Game[]> {
        const games = Array.from(this.games.values())
            .filter(g => g.completed && (g.homeTeam.id === teamId || g.awayTeam.id === teamId))
            .sort((a, b) => b.commenceTime.getTime() - a.commenceTime.getTime());
        
        return games.slice(0, limit);
    }
}
