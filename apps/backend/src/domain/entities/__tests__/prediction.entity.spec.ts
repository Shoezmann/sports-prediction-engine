import { Prediction } from '../prediction.entity';
import { Game } from '../game.entity';
import { Team } from '../team.entity';
import { ProbabilitySet, Probability, Confidence, EloRating } from '../../value-objects';
import { PredictionOutcome, SportCategory } from '@sports-prediction-engine/shared-types';

describe('Prediction Entity', () => {
  const homeTeam = new Team('t1', 'Home Team', 'soccer_epl', null, new EloRating(1500));
  const awayTeam = new Team('t2', 'Away Team', 'soccer_epl', null, new EloRating(1500));
  const game = new Game(
    'g1',
    'ext1',
    'soccer_epl',
    'Premier League',
    'Soccer',
    SportCategory.THREE_WAY,
    homeTeam,
    awayTeam,
    new Date(),
    false
  );

  const mockProbabilities = new ProbabilitySet(
    new Probability(0.6),
    new Probability(0.2),
    new Probability(0.2)
  );

  const mockBreakdown = {
    elo: mockProbabilities,
    form: mockProbabilities,
    oddsImplied: mockProbabilities
  };

  describe('create', () => {
    it('should create a prediction with derived outcome and confidence', () => {
      const prediction = Prediction.create({
        id: 'p1',
        game,
        probabilities: mockProbabilities,
        modelBreakdown: mockBreakdown
      });

      expect(prediction.id).toBe('p1');
      expect(prediction.predictedOutcome).toBe(PredictionOutcome.HOME_WIN);
      expect(prediction.confidence).toBeDefined();
      expect(prediction.isResolved).toBe(false);
    });

    it('should derive DRAW if probabilities are tied between home and away', () => {
      const tiedProbabilities = new ProbabilitySet(
        new Probability(0.4),
        new Probability(0.4),
        new Probability(0.2)
      );
      const prediction = Prediction.create({
        id: 'p1',
        game,
        probabilities: tiedProbabilities,
        modelBreakdown: mockBreakdown
      });
      expect(prediction.predictedOutcome).toBe(PredictionOutcome.DRAW);
    });
  });

  describe('markResult', () => {
    it('should mark a prediction as correct if outcomes match', () => {
      const prediction = Prediction.create({
        id: 'p1',
        game,
        probabilities: mockProbabilities,
        modelBreakdown: mockBreakdown
      });

      const resolved = prediction.markResult(PredictionOutcome.HOME_WIN);
      expect(resolved.isCorrect).toBe(true);
      expect(resolved.isResolved).toBe(true);
    });

    it('should mark a prediction as incorrect if outcomes do not match', () => {
      const prediction = Prediction.create({
        id: 'p1',
        game,
        probabilities: mockProbabilities,
        modelBreakdown: mockBreakdown
      });

      const resolved = prediction.markResult(PredictionOutcome.AWAY_WIN);
      expect(resolved.isCorrect).toBe(false);
      expect(resolved.isResolved).toBe(true);
    });
  });
});
