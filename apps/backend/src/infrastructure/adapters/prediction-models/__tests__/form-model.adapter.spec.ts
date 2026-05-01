import { FormModelAdapter } from '../form-model.adapter';
import { Game } from '../../../../domain/entities';
import { Team } from '../../../../domain/entities';
import { EloRating } from '../../../../domain/value-objects';
import { SportCategory, PredictionOutcome } from '@sports-prediction-engine/shared-types';

describe('FormModelAdapter', () => {
  let adapter: FormModelAdapter;
  let mockGameRepo: any;

  const homeTeam = new Team('t1', 'Home Team', 'soccer_epl', null, new EloRating(1500));
  const awayTeam = new Team('t2', 'Away Team', 'soccer_epl', null, new EloRating(1500));
  const testGame = new Game(
    'g1', 'ext1', 'soccer_epl', 'EPL', 'Soccer', 
    SportCategory.THREE_WAY, homeTeam, awayTeam, new Date(), false
  );

  beforeEach(() => {
    mockGameRepo = {
      findRecentByTeam: jest.fn().mockResolvedValue([])
    };
    adapter = new FormModelAdapter(mockGameRepo);
  });

  it('should use ELO fallback when no recent games found', async () => {
    const result = await adapter.predict(testGame, SportCategory.THREE_WAY);
    // 1500 vs 1500 ELO -> 0.5 base strength -> ~25% draw, ~37.5% home/away
    expect(result.homeWin.value).toBeCloseTo(0.375, 2);
    expect(result.draw?.value).toBeCloseTo(0.25, 2);
    expect(result.awayWin.value).toBeCloseTo(0.375, 2);
  });

  it('should adjust probabilities based on positive form', async () => {
    // Create mock recent games where home team won everything
    const recentGame = {
      homeTeam, awayTeam,
      getOutcome: () => PredictionOutcome.HOME_WIN
    };
    
    mockGameRepo.findRecentByTeam.mockImplementation((teamId: string) => {
      if (teamId === 't1') return Promise.resolve([recentGame, recentGame]); // 100% win
      return Promise.resolve([]); // No history for away
    });

    const result = await adapter.predict(testGame, SportCategory.THREE_WAY);
    // Home team has 100% win rate vs 0% (null) history for away
    // It should lean more towards home win than the neutral 0.375
    expect(result.homeWin.value).toBeGreaterThan(0.375);
  });

  it('should return correct name', () => {
    expect(adapter.getName()).toBe('form');
  });
});
