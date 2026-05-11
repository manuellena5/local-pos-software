import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../server/db/connection', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    all: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue(null),
  },
}));

import { DashboardService } from '../../server/core/services/DashboardService';

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    service = new DashboardService();
    vi.clearAllMocks();
  });

  describe('getData', () => {
    it('should return salesToday with 0 when no sales', () => {
      const result = service.getData(1, 'retail-textil');
      expect(result.salesToday.count).toBe(0);
      expect(result.salesToday.total).toBe(0);
    });

    it('should return cashbox with 0 balance when no movements', () => {
      const result = service.getData(1, 'retail-textil');
      expect(result.cashbox.balance).toBe(0);
      expect(result.cashbox.lastAuditDate).toBeNull();
    });

    it('should return criticalStock as empty array when no critical items', () => {
      const result = service.getData(1, 'retail-textil');
      expect(result.criticalStock).toEqual([]);
    });

    it('should include topProductsWeek for retail-textil module', () => {
      const result = service.getData(1, 'retail-textil');
      expect(result.topProductsWeek).toBeDefined();
      expect(result.upcomingOrders).toBeUndefined();
    });

    it('should include upcomingOrders for taller-medida module', () => {
      const result = service.getData(2, 'taller-medida');
      expect(result.upcomingOrders).toBeDefined();
      expect(result.topProductsWeek).toBeUndefined();
    });

    it('should not include module-specific widgets for other modules', () => {
      const result = service.getData(1, 'retail-general');
      expect(result.topProductsWeek).toBeDefined();
      expect(result.upcomingOrders).toBeUndefined();
    });
  });
});
