import { Inject, Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type {
    GameRepositoryPort,
    PredictionRepositoryPort,
    PredictionModelPort,
    SportRepositoryPort,
} from '../../domain/ports/output';
import {
    GAME_REPOSITORY_PORT,
    PREDICTION_REPOSITORY_PORT,
    PREDICTION_MODEL_PORT,
    SPORT_REPOSITORY_PORT,
} from '../../domain/ports/output';
import { Prediction, GameStatus } from '../../domain/entities';
import { EnsemblePredictor } from '../../domain/services';
import { GoalsPredictor } from '../../domain/services/goals-predictor.service';
import { OddsImpliedModelAdapter } from '../../infrastructure/adapters/prediction-models';
import { MlModelAdapter } from '../../infrastructure/adapters/prediction-models/ml-model.adapter';
import { SyntheticOddsAdapter } from '../../infrastructure/odds-scraper/synthetic-odds.adapter';
import { OddsApiService } from '../../data-ingestion/odds-api.service';

/**
 * Use Case: Generate Predictions
 *
 * 6-model ensemble: ELO, Form, OddsImplied, Poisson, H2H, ML.
 * Goals predictions via Poisson with team-specific attack/defense.
 * Zero external API dependency — odds generated synthetically from ELO.
 */
@Injectable()
export class GeneratePredictionsUseCase {
    private readonly logger = new Logger(GeneratePredictionsUseCase.name);
    private readonly ensemble: EnsemblePredictor;

    constructor(
        @Inject(GAME_REPOSITORY_PORT)
        private readonly gameRepo: GameRepositoryPort,
        @Inject(PREDICTION_REPOSITORY_PORT)
        private readonly predictionRepo: PredictionRepositoryPort,
        @Inject(PREDICTION_MODEL_PORT)
        private readonly models: PredictionModelPort[],
        @Inject(SPORT_REPOSITORY_PORT)
        private readonly sportRepo: SportRepositoryPort,
        private readonly oddsImpliedModel: OddsImpliedModelAdapter,
        private readonly mlModel: MlModelAdapter,
        private readonly syntheticOdds: SyntheticOddsAdapter,
        private readonly oddsApi: OddsApiService,
        private readonly goalsPredictor: GoalsPredictor,
    ) {
        this.ensemble = new EnsemblePredictor([...models, mlModel]);
    }

    async execute(
        sportKey?: string,
    ): Promise<{ generated: number; skipped: number }> {
        const games = await this.gameRepo.findUpcoming(sportKey);
        this.logger.log(
            `Found ${games.length} upcoming games${sportKey ? ` for ${sportKey}` : ''}`,
        );

        let generated = 0;
        let skipped = 0;

        // Try to fetch real odds from The Odds API for active leagues
        const oddsSportKeys = [...new Set(games.map(g => g.sportKey))];
        const realOddsMap = await this.oddsApi.fetchOddsForLeagues(oddsSportKeys).catch(() => new Map());
        const realOddsCount = [...realOddsMap.values()].reduce((sum, arr) => sum + arr.length, 0);
        if (realOddsCount > 0) {
            this.logger.log(`Fetched real odds for ${realOddsCount} games (quota: ${this.oddsApi.getQuotaRemaining()} remaining)`);
        }

        // Build odds per game: real odds first, synthetic fallback
        const gameOdds = new Map<string, ReturnType<typeof this.syntheticOdds.generateOddsFromElo>>();
        for (const game of games) {
            // Check if we have real odds for this game
            const leagueRealOdds = realOddsMap.get(game.sportKey) || [];
            const realOdd = leagueRealOdds.find(o =>
                o.homeTeam === game.homeTeam.name || o.awayTeam === game.awayTeam.name,
            );

            if (realOdd) {
                gameOdds.set(game.externalId, { ...realOdd, externalId: game.externalId } as any);
            } else {
                // Synthetic fallback
                const isThreeWay = game.sportCategory === 'three_way';
                const odds = this.syntheticOdds.generateOddsFromElo(
                    game.homeTeam.eloRating.value,
                    game.awayTeam.eloRating.value,
                    game.sportKey,
                    isThreeWay,
                    game.homeTeam.name,
                    game.awayTeam.name,
                );
                // Override externalId to match game's ID (synthetic uses generic 'synthetic_sportKey')
                gameOdds.set(game.externalId, { ...odds, externalId: game.externalId });
            }
        }

        // Feed odds into OddsImplied model
        this.oddsImpliedModel.setOddsData([...gameOdds.values()]);

        // Fetch all resolved predictions to calculate dynamic weights per sport
        const resolvedPredictions = await this.predictionRepo.findResolved(sportKey);
        const dynamicWeightsBySport = new Map<string, Record<string, number>>();

        const sportKeys = [...new Set(games.map((g) => g.sportKey))];
        for (const key of sportKeys) {
            const weights = this.calculateDynamicWeights(key, resolvedPredictions);
            if (weights) {
                dynamicWeightsBySport.set(key, weights);
            }
        }

        for (const game of games) {
            try {
                const existing = await this.predictionRepo.findByGameId(game.id);
                if (existing && existing.isResolved) {
                    skipped++;
                    continue;
                }
                const predictionId = existing ? existing.id : uuidv4();

                const customWeights = dynamicWeightsBySport.get(game.sportKey);

                const { probabilities, breakdown } = await this.ensemble.predict(
                    game,
                    game.sportCategory,
                    customWeights,
                );

                // Determine predicted outcome
                const pHome = probabilities.homeWin.value;
                const pAway = probabilities.awayWin.value;
                const pDraw = probabilities.draw?.value ?? 0;
                let predictedTeam = '';
                let predictedProb = 0;

                if (pHome > pAway && pHome > pDraw) {
                    predictedTeam = game.homeTeam.name;
                    predictedProb = pHome;
                } else if (pAway > pHome && pAway > pDraw) {
                    predictedTeam = game.awayTeam.name;
                    predictedProb = pAway;
                } else {
                    predictedTeam = 'Draw';
                    predictedProb = pDraw;
                }

                // Extract best odds from our synthetic odds
                const matchOdds = gameOdds.get(game.externalId);
                let bestOdds: number | undefined;

                if (matchOdds && matchOdds.bookmakers.length > 0) {
                    let maxPrice = 0;
                    for (const bookie of matchOdds.bookmakers) {
                        const h2h = bookie.markets.find((m) => m.key === 'h2h');
                        if (h2h) {
                            const outcome = h2h.outcomes.find((o) => o.name === predictedTeam);
                            if (outcome && outcome.price > maxPrice) {
                                maxPrice = outcome.price;
                            }
                        }
                    }
                    if (maxPrice > 1.0) bestOdds = maxPrice;
                }

                // Calculate Expected Value (EV) and Kelly Criterion Stake
                let expectedValue: number | undefined;
                let recommendedStake: number | undefined;

                if (bestOdds && bestOdds > 1.0) {
                    expectedValue = (predictedProb * bestOdds) - 1.0;
                    if (expectedValue > 0 && bestOdds > 1) {
                        const kellyFraction = (predictedProb * bestOdds - 1) / (bestOdds - 1);
                        recommendedStake = Math.min(0.05, Math.max(0, kellyFraction * 0.25));
                    }
                }

                const prediction = Prediction.create({
                    id: predictionId,
                    game,
                    probabilities,
                    modelBreakdown: breakdown,
                    expectedValue,
                    recommendedStake,
                    odds: bestOdds,
                });

                await this.predictionRepo.save(prediction);
                generated++;
            } catch (error) {
                this.logger.error(
                    `Failed to generate prediction for game ${game.id}`,
                    error,
                );
                skipped++;
            }
        }

        this.logger.log(
            `Predictions complete: ${generated} generated, ${skipped} skipped`,
        );

        return { generated, skipped };
    }

    private calculateDynamicWeights(
        sportKey: string,
        resolvedPredictions: Prediction[],
    ): Record<string, number> | undefined {
        const sportPredictions = resolvedPredictions.filter((p) => p.sportKey === sportKey);
        if (sportPredictions.length < 5) return undefined;

        const modelAccuracies: Record<string, number> = {};
        const allModels = ['elo', 'form', 'oddsImplied', 'poisson', 'h2h', 'ml'];

        for (const model of allModels) {
            let correct = 0;
            let total = 0;
            for (const p of sportPredictions) {
                if (!p.actualOutcome || !p.modelBreakdown) continue;
                const modelProbs = p.modelBreakdown[model as keyof typeof p.modelBreakdown];
                if (!modelProbs) continue;
                total++;
                const homeWin = modelProbs.homeWin.value;
                const awayWin = modelProbs.awayWin.value;
                const draw = modelProbs.draw?.value ?? 0;
                let predicted: string;
                if (homeWin >= awayWin && homeWin >= draw) predicted = 'home_win';
                else if (awayWin >= homeWin && awayWin >= draw) predicted = 'away_win';
                else predicted = 'draw';
                if (predicted === p.actualOutcome) correct++;
            }
            if (total > 0) {
                modelAccuracies[model] = correct / total;
            }
        }

        const totalAccuracy = Object.values(modelAccuracies).reduce((sum, acc) => sum + Math.max(acc, 0.05), 0);
        if (totalAccuracy === 0) return undefined;

        const dynamicWeights: Record<string, number> = {};
        for (const [model, acc] of Object.entries(modelAccuracies)) {
            dynamicWeights[model] = Math.max(acc, 0.05) / totalAccuracy;
        }

        const parts = Object.entries(dynamicWeights)
            .map(([m, w]) => `${m.toUpperCase()}: ${(w * 100).toFixed(1)}%`)
            .join(', ');
        this.logger.log(`Dynamic Weights [${sportKey}] ${parts}`);

        return dynamicWeights;
    }
}
