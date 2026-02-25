import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
    AccuracyDto,
    AccuracyBucketDto,
} from '@sports-prediction-engine/shared-types';
import {
    ConfidenceLevel,
    SportGroup,
} from '@sports-prediction-engine/shared-types';
import type { PredictionRepositoryPort } from '../../domain/ports/output';
import { PREDICTION_REPOSITORY_PORT } from '../../domain/ports/output';
import { Prediction } from '../../domain/entities';

/**
 * Use Case: Get Accuracy Metrics
 *
 * Calculates prediction accuracy across all dimensions:
 * by sport, by sport group, by confidence level, by model, and rolling periods.
 */
@Injectable()
export class GetAccuracyUseCase {
    private readonly logger = new Logger(GetAccuracyUseCase.name);

    constructor(
        @Inject(PREDICTION_REPOSITORY_PORT)
        private readonly predictionRepo: PredictionRepositoryPort,
    ) { }

    async execute(sportKey?: string): Promise<AccuracyDto> {
        const resolved = await this.predictionRepo.findResolved(sportKey);

        const totalPredictions = resolved.length;
        const correctPredictions = resolved.filter(
            (p) => p.isCorrect,
        ).length;
        const accuracy =
            totalPredictions > 0 ? correctPredictions / totalPredictions : 0;

        return {
            totalPredictions,
            correctPredictions,
            accuracy,
            byConfidenceLevel: {
                high: this.bucketByConfidence(resolved, ConfidenceLevel.HIGH),
                medium: this.bucketByConfidence(resolved, ConfidenceLevel.MEDIUM),
                low: this.bucketByConfidence(resolved, ConfidenceLevel.LOW),
            },
            byModel: {
                elo: this.modelAccuracy(resolved, 'elo'),
                form: this.modelAccuracy(resolved, 'form'),
                oddsImplied: this.modelAccuracy(resolved, 'oddsImplied'),
                ensemble: accuracy,
            },
            bySport: this.groupBySport(resolved),
            bySportGroup: this.groupBySportGroup(resolved),
            last7Days: this.rollingAccuracy(resolved, 7),
            last30Days: this.rollingAccuracy(resolved, 30),
        };
    }

    private bucketByConfidence(
        predictions: Prediction[],
        level: ConfidenceLevel,
    ): AccuracyBucketDto {
        const filtered = predictions.filter(
            (p) => p.confidence.level === level,
        );
        const correct = filtered.filter((p) => p.isCorrect).length;
        return {
            total: filtered.length,
            correct,
            accuracy: filtered.length > 0 ? correct / filtered.length : 0,
        };
    }

    private modelAccuracy(
        predictions: Prediction[],
        modelName: string,
    ): number {
        let correct = 0;
        let total = 0;

        for (const p of predictions) {
            if (!p.actualOutcome || !p.modelBreakdown) continue;
            total++;

            const modelProbs =
                p.modelBreakdown[modelName as keyof typeof p.modelBreakdown];
            if (!modelProbs) continue;

            const homeWin = modelProbs.homeWin.value;
            const awayWin = modelProbs.awayWin.value;
            const draw = modelProbs.draw?.value ?? 0;

            let modelPrediction: string;
            if (homeWin >= awayWin && homeWin >= draw) {
                modelPrediction = 'home_win';
            } else if (awayWin >= homeWin && awayWin >= draw) {
                modelPrediction = 'away_win';
            } else {
                modelPrediction = 'draw';
            }

            if (modelPrediction === p.actualOutcome) {
                correct++;
            }
        }

        return total > 0 ? correct / total : 0;
    }

    private groupBySport(
        predictions: Prediction[],
    ): Record<string, AccuracyBucketDto> {
        const groups: Record<string, Prediction[]> = {};
        for (const p of predictions) {
            const key = p.sportKey;
            (groups[key] ??= []).push(p);
        }

        const result: Record<string, AccuracyBucketDto> = {};
        for (const [key, preds] of Object.entries(groups)) {
            const correct = preds.filter((p) => p.isCorrect).length;
            result[key] = {
                total: preds.length,
                correct,
                accuracy: preds.length > 0 ? correct / preds.length : 0,
            };
        }
        return result;
    }

    private groupBySportGroup(
        predictions: Prediction[],
    ): Partial<Record<SportGroup, AccuracyBucketDto>> {
        return {};
    }

    private rollingAccuracy(
        predictions: Prediction[],
        days: number,
    ): number {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const recent = predictions.filter(
            (p) => p.createdAt >= cutoff,
        );
        const correct = recent.filter((p) => p.isCorrect).length;
        return recent.length > 0 ? correct / recent.length : 0;
    }
}
