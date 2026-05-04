import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB antes de importar el servicio
vi.mock('../../server/db/connection', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    all: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue(null),
  },
  sqlite: {},
}));

import { ReportService } from '../../server/core/services/ReportService';

describe('ReportService', () => {
  let service: ReportService;

  beforeEach(() => {
    service = new ReportService();
  });

  describe('getSalesByRange', () => {
    it('should return empty array when no sales', () => {
      const result = service.getSalesByRange(1, '2026-04-01', '2026-04-28');
      expect(result).toEqual([]);
    });
  });

  describe('getSalesByDate', () => {
    it('should return default empty report when no sales', () => {
      const result = service.getSalesByDate(1, '2026-04-28');
      expect(result.totalSales).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.date).toBe('2026-04-28');
    });
  });

  describe('getTopProducts', () => {
    it('should return empty array when no sales', () => {
      const result = service.getTopProducts(1, 10);
      expect(result).toEqual([]);
    });
  });

  describe('getTopCustomers', () => {
    it('should return empty array when no sales', () => {
      const result = service.getTopCustomers(1, 10);
      expect(result).toEqual([]);
    });
  });

  describe('generateCSV', () => {
    it('should generate CSV with BOM and headers', () => {
      const csv = service.generateCSV(
        [{ name: 'Producto A', quantity: 10, revenue: 1000 }],
        [
          { key: 'name', label: 'Nombre' },
          { key: 'quantity', label: 'Cantidad' },
          { key: 'revenue', label: 'Ingresos' },
        ],
      );
      expect(csv).toContain('Nombre,Cantidad,Ingresos');
      expect(csv).toContain('Producto A,10,1000');
      // BOM
      expect(csv.charCodeAt(0)).toBe(0xFEFF);
    });

    it('should escape values containing commas', () => {
      const csv = service.generateCSV(
        [{ name: 'Producto, con coma', quantity: 5, revenue: 500 }],
        [{ key: 'name', label: 'Nombre' }, { key: 'quantity', label: 'Q' }, { key: 'revenue', label: 'R' }],
      );
      expect(csv).toContain('"Producto, con coma"');
    });

    it('should escape values containing double quotes', () => {
      const csv = service.generateCSV(
        [{ name: 'Producto "especial"', quantity: 1, revenue: 100 }],
        [{ key: 'name', label: 'Nombre' }, { key: 'quantity', label: 'Q' }, { key: 'revenue', label: 'R' }],
      );
      expect(csv).toContain('"Producto ""especial"""');
    });

    it('should handle null/undefined values', () => {
      const csv = service.generateCSV(
        [{ name: null, quantity: undefined, revenue: 0 }],
        [{ key: 'name', label: 'Nombre' }, { key: 'quantity', label: 'Q' }, { key: 'revenue', label: 'R' }],
      );
      expect(csv).toContain(',,0');
    });
  });
});
