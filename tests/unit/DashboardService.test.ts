import { describe, it, expect, vi } from 'vitest';
import type { DashboardRepository } from '../../server/core/repositories/DashboardRepository';

// Stub completo del repo — cada método retorna un valor seguro por defecto.
function makeRepo(overrides: Partial<Record<keyof DashboardRepository, unknown>> = {}): DashboardRepository {
  return {
    getSalesToday: vi.fn().mockReturnValue({ total: 0, count: 0 }),
    getSalesYesterday: vi.fn().mockReturnValue(0),
    getSalesWeek: vi.fn().mockReturnValue({ total: 0, count: 0 }),
    getSalesMonth: vi.fn().mockReturnValue(0),
    getSalesByDate: vi.fn().mockReturnValue([]),
    getTodaySalesPaymentMethods: vi.fn().mockReturnValue([]),
    getSalesSinceTimestamp: vi.fn().mockReturnValue(0),
    getCajaSession: vi.fn().mockReturnValue(null),
    getLowStockProducts: vi.fn().mockReturnValue([]),
    getRecentSales: vi.fn().mockReturnValue([]),
    getTopProducts: vi.fn().mockReturnValue([]),
    ...overrides,
  } as unknown as DashboardRepository;
}

import { DashboardService } from '../../server/core/services/DashboardService';

describe('DashboardService', () => {
  describe('getFullDashboard', () => {
    it('should return kpis.salesToday = 0 when no sales today', () => {
      const service = new DashboardService(makeRepo());
      const result = service.getFullDashboard(1);
      expect(result.kpis.salesToday).toBe(0);
      expect(result.kpis.transactionsToday).toBe(0);
    });

    it('should compute avgTicketToday correctly when there are sales', () => {
      const repo = makeRepo({
        getSalesToday: vi.fn().mockReturnValue({ total: 300, count: 3 }),
      });
      const service = new DashboardService(repo);
      const result = service.getFullDashboard(1);
      expect(result.kpis.avgTicketToday).toBe(100);
    });

    it('should return cajaActual = null when no open cash session', () => {
      const service = new DashboardService(makeRepo());
      const result = service.getFullDashboard(1);
      expect(result.cajaActual).toBeNull();
    });

    it('should return lowStock as empty array when no critical items', () => {
      const service = new DashboardService(makeRepo());
      const result = service.getFullDashboard(1);
      expect(result.lowStock).toEqual([]);
    });

    it('should return recentSales as empty array when no sales', () => {
      const service = new DashboardService(makeRepo());
      const result = service.getFullDashboard(1);
      expect(result.recentSales).toEqual([]);
    });

    it('should return topProducts as empty array when no sales this month', () => {
      const service = new DashboardService(makeRepo());
      const result = service.getFullDashboard(1);
      expect(result.topProducts).toEqual([]);
    });

    it('should include salesMonth in kpis', () => {
      const repo = makeRepo({
        getSalesMonth: vi.fn().mockReturnValue(5000),
      });
      const service = new DashboardService(repo);
      const result = service.getFullDashboard(1);
      expect(result.kpis.salesMonth).toBe(5000);
    });

    it('should parse paymentMethod from first entry of paymentMethods JSON in recentSales', () => {
      const repo = makeRepo({
        getRecentSales: vi.fn().mockReturnValue([
          {
            id: 1,
            createdAt: '2026-06-16T10:00:00',
            totalAmount: 200,
            paymentMethods: JSON.stringify([{ method: 'transfer', amount: 200 }]),
            customerName: 'Ana Pérez',
            itemsCount: 2,
          },
        ]),
      });
      const service = new DashboardService(repo);
      const result = service.getFullDashboard(1);
      expect(result.recentSales).toHaveLength(1);
      expect(result.recentSales[0]!.paymentMethod).toBe('transfer');
      expect(result.recentSales[0]!.customerName).toBe('Ana Pérez');
      expect(result.recentSales[0]!.itemsCount).toBe(2);
    });

    it('should default paymentMethod to cash when paymentMethods JSON is malformed', () => {
      const repo = makeRepo({
        getRecentSales: vi.fn().mockReturnValue([
          {
            id: 2,
            createdAt: '2026-06-16T11:00:00',
            totalAmount: 100,
            paymentMethods: 'invalid-json',
            customerName: null,
            itemsCount: 1,
          },
        ]),
      });
      const service = new DashboardService(repo);
      const result = service.getFullDashboard(1);
      expect(result.recentSales[0]!.paymentMethod).toBe('cash');
    });

    it('should map topProducts from repo with rounded revenue', () => {
      const repo = makeRepo({
        getTopProducts: vi.fn().mockReturnValue([
          { productId: 1, name: 'Sábana', sku: 'SAB-001', totalUnits: 10, totalRevenue: 1500.555 },
        ]),
      });
      const service = new DashboardService(repo);
      const result = service.getFullDashboard(1);
      expect(result.topProducts).toHaveLength(1);
      expect(result.topProducts[0]!.totalRevenue).toBe(1500.56);
      expect(result.topProducts[0]!.totalUnits).toBe(10);
    });

    it('should compute salesTodayDelta = null when yesterday had no sales', () => {
      const repo = makeRepo({
        getSalesToday: vi.fn().mockReturnValue({ total: 500, count: 5 }),
        getSalesYesterday: vi.fn().mockReturnValue(0),
      });
      const service = new DashboardService(repo);
      const result = service.getFullDashboard(1);
      expect(result.kpis.salesTodayDelta).toBeNull();
    });

    it('should compute salesTodayDelta correctly when yesterday had sales', () => {
      const repo = makeRepo({
        getSalesToday: vi.fn().mockReturnValue({ total: 1500, count: 5 }),
        getSalesYesterday: vi.fn().mockReturnValue(1000),
      });
      const service = new DashboardService(repo);
      const result = service.getFullDashboard(1);
      // (1500 - 1000) / 1000 * 100 = 50%
      expect(result.kpis.salesTodayDelta).toBe(50);
    });

    it('should query "today" using local midnight converted to UTC, not the raw UTC calendar day', () => {
      // sales.createdAt se guarda en UTC (SQLite datetime('now')). Si el
      // límite de "hoy" se calculara en UTC en vez de en hora local, una
      // venta hecha en las últimas horas del día local (ya "mañana" en UTC)
      // quedaría afuera de "hoy" — el bug reportado con Espacio BIP (Argentina).
      const repo = makeRepo();
      const service = new DashboardService(repo);
      service.getFullDashboard(1);

      const now = new Date();
      const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const expectedBoundary = localMidnight.toISOString().replace('T', ' ').slice(0, 19);

      expect(repo.getSalesToday).toHaveBeenCalledWith(1, expectedBoundary);
    });
  });
});
