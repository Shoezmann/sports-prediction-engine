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
        const pending = await this.predictionRepo.findPending(sportKey);

        const totalPredictions = resolved.length;
        const pendingPredictions = pending.length;
        const correctPredictions = resolved.filter(
            (p) => p.isCorrect,
        ).length;
        const accuracy =
            totalPredictions > 0 ? correctPredictions / totalPredictions : 0;

        return {
            totalPredictions,
            pendingPredictions,
            correctPredictions,
            accuracy,
            brierScore: this.calculateBrierScore(resolved),
            brierScoreByModel: {
                elo: this.calculateBrierScoreForModel(resolved, 'elo'),
                form: this.calculateBrierScoreForModel(resolved, 'form'),
                oddsImplied: this.calculateBrierScoreForModel(resolved, 'oddsImplied'),
                ml: this.calculateBrierScoreForModel(resolved, 'ml'),
                ensemble: this.calculateBrierScore(resolved),
            },
            byConfidenceLevel: {
                high: this.bucketByConfidence(resolved, ConfidenceLevel.HIGH),
                medium: this.bucketByConfidence(resolved, ConfidenceLevel.MEDIUM),
                low: this.bucketByConfidence(resolved, ConfidenceLevel.LOW),
            },
            byModel: {
                elo: this.modelAccuracy(resolved, 'elo'),
                form: this.modelAccuracy(resolved, 'form'),
                oddsImplied: this.modelAccuracy(resolved, 'oddsImplied'),
                ml: this.modelAccuracy(resolved, 'ml'),
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
        const groups: Record<string, Prediction[]> = {};
        for (const p of predictions) {
            const group = p.game.sportGroup;
            if (!group) continue;

            // Map sport group strings to enum values
            const enumKey = Object.values(SportGroup).find(v => v === group) as SportGroup | undefined;
            if (!enumKey) continue;

            (groups[enumKey] ??= []).push(p);
        }

        const result: Partial<Record<SportGroup, AccuracyBucketDto>> = {};
        for (const [key, preds] of Object.entries(groups)) {
            const correct = preds.filter((p) => p.isCorrect).length;
            result[key as SportGroup] = {
                total: preds.length,
                correct,
                accuracy: preds.length > 0 ? correct / preds.length : 0,
            };
        }
        return result;
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

    /**
     * Calculate Brier Score for probability calibration.
     * Brier Score measures the mean squared difference between predicted probabilities
     * and actual outcomes. Lower is better (0.0 is perfect calibration).
     *
     * Formula: BS = (1/N) * Σ(forecast_i - actual_i)²
     *
     * For a 3-way outcome (home/draw/away):
     * BS = (p_home - actual_home)² + (p_draw - actual_draw)² + (p_away - actual_away)²
     */
    private calculateBrierScore(predictions: Prediction[]): number | null {
        if (predictions.length === 0) return null;

        let totalBrier = 0;
        let count = 0;

        for (const pred of predictions) {
            if (!pred.actualOutcome) continue;

            const probs = pred.probabilities;
            const actual = this.outcomeToOneHot(pred.actualOutcome, pred.modelBreakdown?.elo?.draw !== undefined);

            // Brier Score = sum of squared differences
            const homeDiff = probs.homeWin.value - actual.homeWin;
            const awayDiff = probs.awayWin.value - actual.awayWin;
            const drawDiff = (probs.draw?.value ?? 0) - (actual.draw ?? 0);

            const brier = homeDiff * homeDiff + awayDiff * awayDiff + drawDiff * drawDiff;
            totalBrier += brier;
            count++;
        }

        return count > 0 ? totalBrier / count : null;
    }

    /**
     * Calculate Brier Score for a specific model.
     */
    private calculateBrierScoreForModel(
        predictions: Prediction[],
        modelName: string,
    ): number | null {
        if (predictions.length === 0) return null;

        let totalBrier = 0;
        let count = 0;

        for (const pred of predictions) {
            if (!pred.actualOutcome || !pred.modelBreakdown) continue;

            const modelProbs = pred.modelBreakdown[modelName as keyof typeof pred.modelBreakdown];
            if (!modelProbs) continue;

            const actual = this.outcomeToOneHot(pred.actualOutcome, modelProbs.draw !== undefined);

            const homeDiff = modelProbs.homeWin.value - actual.homeWin;
            const awayDiff = modelProbs.awayWin.value - actual.awayWin;
            const drawDiff = (modelProbs.draw?.value ?? 0) - (actual.draw ?? 0);

            const brier = homeDiff * homeDiff + awayDiff * awayDiff + drawDiff * drawDiff;
            totalBrier += brier;
            count++;
        }

        return count > 0 ? totalBrier / count : null;
    }

    /**
     * Convert a PredictionOutcome to a one-hot encoded vector.
     * e.g., HOME_WIN -> { homeWin: 1, awayWin: 0, draw: 0 }
     */
    private outcomeToOneHot(
        outcome: string,
        hasDraw: boolean = true,
    ): { homeWin: number; awayWin: number; draw?: number } {
        const result: { homeWin: number; awayWin: number; draw?: number } = {
            homeWin: 0,
            awayWin: 0,
        };

        if (hasDraw) {
            result.draw = 0;
        }

        switch (outcome) {
            case 'home_win':
                result.homeWin = 1;
                break;
            case 'away_win':
                result.awayWin = 1;
                break;
            case 'draw':
                if (hasDraw) {
                    result.draw = 1;
                }
                break;
        }

        return result;
    }
}
