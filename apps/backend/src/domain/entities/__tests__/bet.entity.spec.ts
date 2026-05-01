import { Bet } from '../bet.entity';
import { BetStatus } from '@sports-prediction-engine/shared-types';

describe('Bet Entity', () => {
  const mockBet = new Bet(
    'b1',
    'u1',
    'p1',
    'Betway',
    2.1,
    BetStatus.PENDING,
    new Date()
  );

  describe('resolve', () => {
    it('should mark a bet as WON and set resolvedAt', () => {
      const resolved = mockBet.resolve(true);
      expect(resolved.status).toBe(BetStatus.WON);
      expect(resolved.resolvedAt).toBeDefined();
    });

    it('should mark a bet as LOST and set resolvedAt', () => {
      const resolved = mockBet.resolve(false);
      expect(resolved.status).toBe(BetStatus.LOST);
      expect(resolved.resolvedAt).toBeDefined();
    });

    it('should throw error if resolving an already resolved bet', () => {
      const resolved = mockBet.resolve(true);
      expect(() => resolved.resolve(true)).toThrow('Bet is already resolved');
    });
  });

  describe('isResolved', () => {
    it('should return false for PENDING', () => {
      expect(mockBet.isResolved()).toBe(false);
    });

    it('should return true for WON', () => {
      const won = mockBet.resolve(true);
      expect(won.isResolved()).toBe(true);
    });

    it('should return true for LOST', () => {
      const lost = mockBet.resolve(false);
      expect(lost.isResolved()).toBe(true);
    });
  });
});
