import { Bet } from '../../entities/bet.entity';

export interface BetRepositoryPort {
    save(bet: Bet): Promise<Bet>;
    findById(id: string): Promise<Bet | null>;
    findByUserId(userId: string): Promise<Bet[]>;
    findPendingByPredictionId(predictionId: string): Promise<Bet[]>;
}

export const BET_REPOSITORY_PORT = Symbol('BetRepositoryPort');
