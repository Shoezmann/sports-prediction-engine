import { Game } from '../../entities';

/**
 * Output Port: Game Repository
 *
 * Interface for persisting and querying game data.
 * Implemented by infrastructure adapters (e.g., TypeORM repository).
 */
export interface GameRepositoryPort {
  count(): Promise<number>;
  save(game: Game): Promise<Game>;
  saveMany(games: Game[]): Promise<Game[]>;
  findById(id: string): Promise<Game | null>;
  findByExternalId(externalId: string): Promise<Game | null>;
  findUpcoming(sportKey?: string): Promise<Game[]>;
  findCompleted(sportKey?: string, limit?: number): Promise<Game[]>;
  findByDateRange(from: Date, to: Date, sportKey?: string): Promise<Game[]>;
  findUnresolved(): Promise<Game[]>;
  findPostponed(): Promise<Game[]>;
  findRecentByTeam(teamId: string, limit?: number): Promise<Game[]>;
}

export const GAME_REPOSITORY_PORT = Symbol('GameRepositoryPort');
