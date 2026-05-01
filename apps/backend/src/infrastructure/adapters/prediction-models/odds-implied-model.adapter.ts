import { Injectable, Logger } from '@nestjs/common';
import * as stringSimilarity from 'string-similarity';
import { SportCategory } from '@sports-prediction-engine/shared-types';
import type { PredictionModelPort, RawOddsData } from '../../../domain/ports/output';
import { ProbabilitySet } from '../../../domain/value-objects';
import { Game } from '../../../domain/entities';

/**
 * Odds-Implied Prediction Model
 *
 * Converts bookmaker odds into implied probabilities.
 * Averages across multiple bookmakers and removes the overround
 * (bookmaker margin) to produce fair probabilities.
 *
 * This is typically the strongest individual predictor because
 * bookmaker odds reflect extensive market research and betting volume.
 */
@Injectable()
export class OddsImpliedModelAdapter implements PredictionModelPort {
    private readonly logger = new Logger(OddsImpliedModelAdapter.name);

    /** Cached odds data, set externally before prediction */
    private oddsCache: Map<string, RawOddsData> = new Map();

    getName(): string {
        return 'oddsImplied';
    }

    supportsCategory(category: SportCategory): boolean {
        return category !== SportCategory.OUTRIGHT;
    }

    /**
     * Cache odds data for use during prediction.
     * Called by the application service before running predictions.
     */
    setOddsData(oddsData: RawOddsData[]): void {
        this.oddsCache.clear();
        for (const data of oddsData) {
            this.oddsCache.set(data.externalId, data);
        }
    }

    async predict(
        game: Game,
        category: SportCategory,
    ): Promise<ProbabilitySet> {
        const oddsData = this.oddsCache.get(game.externalId);

        if (!oddsData || oddsData.bookmakers.length === 0) {
            this.logger.debug(
                `No odds data for game ${game.externalId}, using uniform distribution`,
            );
            return this.getUniformDistribution(category);
        }

        // Collect implied probabilities from all bookmakers
        const impliedProbs = this.aggregateBookmakerOdds(
            oddsData,
            game.homeTeam.name,
            game.awayTeam.name,
            category,
        );

        return impliedProbs;
    }

    /**
     * Aggregate odds from multiple bookmakers into fair probabilities.
     * 1. Convert decimal odds to implied probability for each bookmaker
     * 2. Average across bookmakers
     * 3. Remove overround (normalize to sum to 1.0)
     */
    private aggregateBookmakerOdds(
        oddsData: RawOddsData,
        homeTeamName: string,
        awayTeamName: string,
        category: SportCategory,
    ): ProbabilitySet {
        let totalHomeProb = 0;
        let totalAwayProb = 0;
        let totalDrawProb = 0;
        let count = 0;

        for (const bookmaker of oddsData.bookmakers) {
            const h2hMarket = bookmaker.markets.find((m) => m.key === 'h2h');
            if (!h2hMarket) continue;

            let homeOutcome = h2hMarket.outcomes.find(
                (o) => o.name === homeTeamName || o.name.includes(homeTeamName) || homeTeamName.includes(o.name)
            );
            let awayOutcome = h2hMarket.outcomes.find(
                (o) => o.name === awayTeamName || o.name.includes(awayTeamName) || awayTeamName.includes(o.name)
            );
            
            // Fuzzy match fallback
            if (!homeOutcome || !awayOutcome) {
                const outcomeNames = h2hMarket.outcomes.map(o => o.name);
                
                if (!homeOutcome && outcomeNames.length > 0) {
                    const bestHomeMatch = stringSimilarity.findBestMatch(homeTeamName, outcomeNames);
                    if (bestHomeMatch.bestMatch.rating > 0.4) {
                        homeOutcome = h2hMarket.outcomes.find(o => o.name === bestHomeMatch.bestMatch.target);
                    }
                }
                
                if (!awayOutcome && outcomeNames.length > 0) {
                    const bestAwayMatch = stringSimilarity.findBestMatch(awayTeamName, outcomeNames);
                    if (bestAwayMatch.bestMatch.rating > 0.4) {
                        awayOutcome = h2hMarket.outcomes.find(o => o.name === bestAwayMatch.bestMatch.target);
                    }
                }
            }
            
            const drawOutcome = h2hMarket.outcomes.find(
                (o) => o.name.toLowerCase() === 'draw' || o.name.toLowerCase() === 'tie',
            );

            if (!homeOutcome || !awayOutcome) {
                 this.logger.debug(`Could not match teams for odds: ${homeTeamName} vs ${awayTeamName}. Proceeding to next bookie.`);
                 continue;
            }

            // Convert decimal odds to implied probability
            totalHomeProb += 1 / homeOutcome.price;
            totalAwayProb += 1 / awayOutcome.price;
            if (drawOutcome) {
                totalDrawProb += 1 / drawOutcome.price;
            }
            count++;
        }

        if (count === 0) {
            return this.getUniformDistribution(category);
        }

        // Average across bookmakers
        let avgHome = totalHomeProb / count;
        let avgAway = totalAwayProb / count;
        let avgDraw = totalDrawProb / count;

        // Remove overround by normalizing
        if (category === SportCategory.THREE_WAY) {
            const total = avgHome + avgAway + avgDraw;
            avgHome /= total;
            avgAway /= total;
            avgDraw /= total;
            return ProbabilitySet.threeWay(avgHome, avgDraw, avgAway);
        }

        const total = avgHome + avgAway;
        avgHome /= total;
        avgAway /= total;
        return ProbabilitySet.forCategory(category, avgHome, avgAway);
    }

    /** Return uniform (equal) distribution when no odds are available */
    private getUniformDistribution(
        category: SportCategory,
    ): ProbabilitySet {
        if (category === SportCategory.THREE_WAY) {
            return ProbabilitySet.threeWay(1 / 3, 1 / 3, 1 / 3);
        }
        return ProbabilitySet.forCategory(category, 0.5, 0.5);
    }
}
