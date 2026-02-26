import { Prediction } from '../../entities';
import { ConfidenceLevel } from '@sports-prediction-engine/shared-types';

/**
 * Output Port: Prediction Repository
 *
 * Interface for persisting and querying prediction data.
 */
export interface PredictionRepositoryPort {
    save(prediction: Prediction): Promise<Prediction>;
    saveMany(predictions: Prediction[]): Promise<Prediction[]>;
    findById(id: string): Promise<Prediction | null>;
    findByGameId(gameId: string): Promise<Prediction | null>;
    findRecent(limit?: number, sportKey?: string): Promise<Prediction[]>;
    findResolved(sportKey?: string, limit?: number): Promise<Prediction[]>;
    findPending(sportKey?: string): Promise<Prediction[]>;
    findByConfidenceLevel(level: ConfidenceLevel): Promise<Prediction[]>;
    findByDateRange(from: Date, to: Date, sportKey?: string): Promise<Prediction[]>;
    countBySport(): Promise<Record<string, number>>;
}

export const PREDICTION_REPOSITORY_PORT = Symbol('PredictionRepositoryPort');
