import { Team } from '../../entities';

/**
 * Output Port: Team Repository
 *
 * Interface for persisting and querying team data.
 */
export interface TeamRepositoryPort {
    save(team: Team): Promise<Team>;
    saveMany(teams: Team[]): Promise<Team[]>;
    findById(id: string): Promise<Team | null>;
    findByName(name: string, sportKey: string): Promise<Team | null>;
    findBySportKey(sportKey: string): Promise<Team[]>;
    findOrCreate(name: string, sportKey: string): Promise<Team>;
}

export const TEAM_REPOSITORY_PORT = Symbol('TeamRepositoryPort');
