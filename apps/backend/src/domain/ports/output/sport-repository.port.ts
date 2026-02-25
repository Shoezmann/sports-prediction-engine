import { Sport } from '../../entities';

/**
 * Output Port: Sport Repository
 *
 * Interface for persisting and querying sport/league data.
 */
export interface SportRepositoryPort {
    save(sport: Sport): Promise<Sport>;
    saveMany(sports: Sport[]): Promise<Sport[]>;
    findByKey(key: string): Promise<Sport | null>;
    findAll(): Promise<Sport[]>;
    findActive(): Promise<Sport[]>;
    findByGroup(group: string): Promise<Sport[]>;
    updateActiveStatus(key: string, active: boolean): Promise<void>;
}

export const SPORT_REPOSITORY_PORT = Symbol('SportRepositoryPort');
