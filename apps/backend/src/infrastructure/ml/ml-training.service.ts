import { Injectable, Inject, Logger } from '@nestjs/common';
import { spawn, exec } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import type { GameRepositoryPort } from '../../domain/ports/output';
import { GAME_REPOSITORY_PORT } from '../../domain/ports/output';
import type { Game } from '../../domain/entities';
import { ProbabilitySet } from '../../domain/value-objects';

const execAsync = promisify(exec);





export interface TrainingResult {
    error?: string;
    sport_key: string;
    n_matches: number;
    n_features: number;
    models: Record<string, string>;
    metrics: Record<string, any>;
}

export interface MLPrediction {
    home_team: string;
    away_team: string;
    outcome: { home_win: number; draw: number; away_win: number };
    goals: { over_2_5: number; under_2_5: number };
    btts: { yes: number; no: number };
    expected_goals: number;
    confidence: number;
    predicted_outcome: string;
}

@Injectable()
export class MLTrainingService {
    private readonly logger = new Logger(MLTrainingService.name);
    private readonly pythonPath: string;
    private readonly trainScript: string;
    private readonly predictScript: string;

    constructor(
        @Inject(GAME_REPOSITORY_PORT)
        private readonly gameRepo: GameRepositoryPort,
    ) {
        const projectRoot = process.cwd();
        this.pythonPath = 'python3';
        this.trainScript = path.join(projectRoot, 'apps/backend/src/infrastructure/ml', 'train_models.py');
        this.predictScript = path.join(projectRoot, 'apps/backend/src/infrastructure/ml', 'predict.py');
    }

    async trainModel(
        matches: Array<{
            date: string;
            home_team: string;
            away_team: string;
            home_score?: number;
            away_score?: number;
            home_odds?: number;
            draw_odds?: number;
            away_odds?: number;
            league?: string;
        }>,
        sportKey: string,
    ): Promise<TrainingResult | null> {
        try {
            const inputData = JSON.stringify({ matches, sport_key: sportKey });

            const stdout = await this._runPython(this.trainScript, inputData, 120000);

            const result = JSON.parse(stdout) as TrainingResult;

            if (result.error) {
                this.logger.warn(`Training failed for ${sportKey}: ${result.error}`);
                return null;
            }

            this.logger.log(
                `✅ Trained models for ${sportKey}: ${result.n_matches} matches, ` +
                `${result.n_features} features, ` +
                `outcome CV: ${(result.metrics.outcome?.cv_mean * 100).toFixed(1)}%, ` +
                `goals CV: ${(result.metrics.goals?.cv_mean * 100).toFixed(1)}%`,
            );

            return result;
        } catch (error) {
            this.logger.error(`Training failed for ${sportKey}`, error.message);
            return null;
        }
    }

    async predictMatches(
        historicalMatches: Array<{
            date: string;
            home_team: string;
            away_team: string;
            home_score?: number;
            away_score?: number;
            home_odds?: number;
            draw_odds?: number;
            away_odds?: number;
        }>,
        upcomingMatches: Array<{
            date: string;
            home_team: string;
            away_team: string;
            home_odds?: number;
            draw_odds?: number;
            away_odds?: number;
        }>,
        sportKey: string,
    ): Promise<MLPrediction[]> {
        try {
            const inputData = JSON.stringify({
                historical_matches: historicalMatches,
                upcoming_matches: upcomingMatches,
                sport_key: sportKey,
            });

            const stdout = await this._runPython(this.predictScript, inputData, 30000);

            const result = JSON.parse(stdout);
            return result.predictions || [];
        } catch (error) {
            this.logger.warn(`ML prediction failed for ${sportKey}, using fallback`);
            return [];
        }
    }

    private async _runPython(script: string, input: string, timeoutMs: number): Promise<string> {
        return new Promise((resolve, reject) => {
            const proc = spawn(this.pythonPath, [script], {
                timeout: timeoutMs,
            });
            let stdout = '';
            let stderr = '';

            proc.stdin.write(input);
            proc.stdin.end();

            proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
            proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

            proc.on('close', (code: number) => {
                if (code === 0) resolve(stdout);
                else reject(new Error(stderr || `Process exited with code ${code}`));
            });
            proc.on('error', reject);
        });
    }

    /**
     * Generate ML prediction for a single game.
     * Uses historical data for feature engineering and runs trained XGBoost model.
     * Returns probability set or null if no trained model available.
     */
    async predictMatch(
        game: Game,
        sportKey: string,
        currentOdds?: { home?: number; draw?: number; away?: number },
    ): Promise<{
        probabilities: ProbabilitySet;
        confidence: number;
        goals?: { over2_5: number; under2_5: number };
        btts?: { yes: number; no: number };
        expectedGoals?: number;
    } | null> {
        try {
            // Check if we have trained models for this sport
            const modelPath = path.join(process.cwd(), 'apps/backend/models', `${sportKey}_outcome.json`);
            const { execSync } = await import('child_process');

            try {
                execSync(`test -f "${modelPath}"`);
            } catch {
                this.logger.debug(`No trained ML model for ${sportKey}`);
                return null;
            }

            // Get historical matches for feature engineering
            const historicalMatches = await this.getHistoricalMatches(sportKey);

            if (historicalMatches.length < 20) {
                this.logger.debug(`Insufficient historical data for ML: ${sportKey} has ${historicalMatches.length} matches (need 20+)`);
                return null;
            }

            // Prepare input for prediction script
            const inputData = JSON.stringify({
                historical_matches: historicalMatches,
                upcoming_matches: [{
                    date: game.commenceTime.toISOString(),
                    home_team: game.homeTeam.name,
                    away_team: game.awayTeam.name,
                    home_odds: currentOdds?.home ?? null,
                    draw_odds: currentOdds?.draw ?? null,
                    away_odds: currentOdds?.away ?? null,
                }],
                sport_key: sportKey,
            });

            const stdout = await this._runPython(this.predictScript, inputData, 30000);
            const result = JSON.parse(stdout);

            if (!result.predictions?.length) {
                this.logger.warn(`ML predict.py returned no predictions for ${sportKey}`);
                return null;
            }

            const pred = result.predictions[0];

            // Convert probabilities to ProbabilitySet
            const homeProb = pred.outcome?.home_win ?? 0.33;
            const drawProb = pred.outcome?.draw ?? 0.33;
            const awayProb = pred.outcome?.away_win ?? 0.34;

            const probabilities = ProbabilitySet.threeWay(homeProb, drawProb, awayProb);

            const response: any = {
                probabilities,
                confidence: pred.confidence ?? 0.5,
            };

            if (pred.goals) {
                response.goals = {
                    over2_5: pred.goals.over_2_5,
                    under2_5: pred.goals.under_2_5,
                };
            }
            if (pred.btts) {
                response.btts = {
                    yes: pred.btts.yes,
                    no: pred.btts.no,
                };
            }
            if (pred.expected_goals != null) {
                response.expectedGoals = pred.expected_goals;
            }

            return response;
        } catch (error) {
            this.logger.warn(`ML prediction error for ${sportKey}: ${error.message}`);
            return null;
        }
    }

    /**
     * Fetch historical completed matches for a sport key.
     * Returns up to 500 most recent completed games for feature engineering.
     */
    private async getHistoricalMatches(sportKey: string): Promise<Array<{
        date: string;
        home_team: string;
        away_team: string;
        home_score?: number;
        away_score?: number;
        home_odds?: number;
        draw_odds?: number;
        away_odds?: number;
    }>> {
        const games = await this.gameRepo.findCompleted(sportKey, 500);

        return games
            .filter(g => g.homeScore !== null && g.awayScore !== null)
            .map(g => ({
                date: g.commenceTime.toISOString(),
                home_team: g.homeTeam.name,
                away_team: g.awayTeam.name,
                home_score: g.homeScore ?? undefined,
                away_score: g.awayScore ?? undefined,
                // Odds not stored in Game entity — market features will use neutral defaults
                home_odds: undefined,
                draw_odds: undefined,
                away_odds: undefined,
            }));
    }

    async healthCheck(): Promise<boolean> {
        try {
            const { stdout } = await execAsync(`${this.pythonPath} -c "import xgboost, pandas, sklearn; print('OK')"`);
            return stdout.trim() === 'OK';
        } catch {
            return false;
        }
    }
}
