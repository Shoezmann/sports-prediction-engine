import { GoalsPredictor } from '../goals-predictor.service';

describe('GoalsPredictor', () => {
  let predictor: GoalsPredictor;

  beforeEach(() => {
    predictor = new GoalsPredictor();
  });

  describe('predictGoals', () => {
    it('should return null for non-soccer sports', () => {
      expect(predictor.predictGoals('basketball_nba')).toBeNull();
    });

    it('should return correct probabilities for EPL', () => {
      const result = predictor.predictGoals('soccer_epl');
      expect(result).toBeDefined();
      expect(result?.expectedGoals).toBe(2.8);
      expect(result?.over2_5).toBe(0.52);
      expect(result?.bttsYes).toBe(0.52);
    });

    it('should use default values for unknown soccer leagues', () => {
      const result = predictor.predictGoals('soccer_unknown');
      expect(result?.expectedGoals).toBe(2.6);
    });
  });

  describe('checkGoalsPrediction', () => {
    it('should correctly grade Over 2.5 and BTTS: Yes (3-1)', () => {
      const result = GoalsPredictor.checkGoalsPrediction(3, 1, true, true);
      expect(result.goalsCorrect).toBe(true);
      expect(result.bttsCorrect).toBe(true);
      expect(result.totalGoals).toBe(4);
    });

    it('should correctly grade Under 2.5 and BTTS: No (1-0)', () => {
      const result = GoalsPredictor.checkGoalsPrediction(1, 0, false, false);
      expect(result.goalsCorrect).toBe(true);
      expect(result.bttsCorrect).toBe(true);
      expect(result.totalGoals).toBe(1);
    });

    it('should correctly grade incorrect predictions (0-0)', () => {
      const result = GoalsPredictor.checkGoalsPrediction(0, 0, true, true);
      expect(result.goalsCorrect).toBe(false);
      expect(result.bttsCorrect).toBe(false);
    });
  });
});
