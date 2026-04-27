import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StockService } from '../../server/core/services/StockService';

const makeProduct = (overrides = {}) => ({
  id: 1,
  businessUnitId: 1,
  name: 'Sábana 144 hilos',
  description: null,
  category: 'blanqueria',
  sku: 'SAB-144',
  costPrice: 45,
  basePrice: 120,
  taxRate: 21,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeStockItem = (overrides = {}) => ({
  id: 10,
  productId: 1,
  businessUnitId: 1,
  quantity: 20,
  minimumThreshold: 5,
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeMovement = (overrides = {}) => ({
  id: 100,
  stockItemId: 10,
  businessUnitId: 1,
  type: 'entry' as const,
  quantity: 5,
  reason: 'Compra a proveedor',
  userId: undefined,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

function makeRepos(stockOverrides = {}, productOverrides = {}) {
  const stockRepo = {
    getByProductId: vi.fn().mockReturnValue(makeStockItem()),
    recordMovement: vi.fn().mockReturnValue(makeMovement()),
    updateStockQuantity: vi.fn(),
    getMovementHistory: vi.fn().mockReturnValue([makeMovement()]),
    getStockSummary: vi.fn().mockReturnValue([]),
    ...stockOverrides,
  } as any;

  const productRepo = {
    getById: vi.fn().mockReturnValue(makeProduct()),
    getAll: vi.fn().mockReturnValue([makeProduct()]),
    ...productOverrides,
  } as any;

  return { stockRepo, productRepo };
}

describe('StockService', () => {
  let service: StockService;

  beforeEach(() => {
    const { stockRepo, productRepo } = makeRepos();
    service = new StockService(stockRepo, productRepo);
  });

  // ── adjustStock ──────────────────────────────────────────────────────────
  describe('adjustStock', () => {
    it('should add stock and return new quantity', () => {
      const { stockRepo, productRepo } = makeRepos();
      service = new StockService(stockRepo, productRepo);

      const result = service.adjustStock(1, 1, 10, 'Entrada de mercadería');
      expect(result.newQuantity).toBe(30); // 20 + 10
      expect(stockRepo.updateStockQuantity).toHaveBeenCalledWith(10, 30);
    });

    it('should subtract stock and return new quantity', () => {
      const { stockRepo, productRepo } = makeRepos();
      service = new StockService(stockRepo, productRepo);

      const result = service.adjustStock(1, 1, -5, 'Salida por venta manual');
      expect(result.newQuantity).toBe(15); // 20 - 5
    });

    it('should record movement with correct type for entry', () => {
      const { stockRepo, productRepo } = makeRepos();
      service = new StockService(stockRepo, productRepo);

      service.adjustStock(1, 1, 8, 'Compra a proveedor');
      expect(stockRepo.recordMovement).toHaveBeenCalledWith(
        10, 1, 'entry', 8, 'Compra a proveedor', undefined
      );
    });

    it('should record movement with type "sale" for negative quantity', () => {
      const { stockRepo, productRepo } = makeRepos();
      service = new StockService(stockRepo, productRepo);

      service.adjustStock(1, 1, -3, 'Salida por venta');
      expect(stockRepo.recordMovement).toHaveBeenCalledWith(
        10, 1, 'sale', -3, 'Salida por venta', undefined
      );
    });

    it('should throw when product not found', () => {
      const { stockRepo, productRepo } = makeRepos({}, { getById: vi.fn().mockReturnValue(null) });
      service = new StockService(stockRepo, productRepo);

      expect(() => service.adjustStock(99, 1, 5, 'Test reason')).toThrow('no encontrado');
    });

    it('should throw when stock item not found', () => {
      const { stockRepo, productRepo } = makeRepos({ getByProductId: vi.fn().mockReturnValue(null) });
      service = new StockService(stockRepo, productRepo);

      expect(() => service.adjustStock(1, 1, 5, 'Test reason')).toThrow('no encontrado');
    });

    it('should throw BusinessRuleError when result would be negative', () => {
      // Stock actual = 20, bajamos 25 → negativo
      const { stockRepo, productRepo } = makeRepos({
        getByProductId: vi.fn().mockReturnValue(makeStockItem({ quantity: 20 })),
      });
      service = new StockService(stockRepo, productRepo);

      expect(() => service.adjustStock(1, 1, -25, 'Salida excesiva')).toThrow('suficiente stock');
    });

    it('should throw ValidationError when quantity is 0', () => {
      expect(() => service.adjustStock(1, 1, 0, 'Sin cambio')).toThrow();
    });

    it('should throw ValidationError when reason is too short (< 5 chars)', () => {
      expect(() => service.adjustStock(1, 1, 5, 'ok')).toThrow();
    });
  });

  // ── getMovementHistory ───────────────────────────────────────────────────
  describe('getMovementHistory', () => {
    it('should return movement history for a BU', () => {
      const { stockRepo, productRepo } = makeRepos();
      service = new StockService(stockRepo, productRepo);

      const history = service.getMovementHistory(1);
      expect(history).toHaveLength(1);
      expect(stockRepo.getMovementHistory).toHaveBeenCalledWith(1, undefined);
    });

    it('should pass filters to repository', () => {
      const { stockRepo, productRepo } = makeRepos();
      service = new StockService(stockRepo, productRepo);

      const filters = { productId: 1, type: 'entry' as const };
      service.getMovementHistory(1, filters);
      expect(stockRepo.getMovementHistory).toHaveBeenCalledWith(1, filters);
    });
  });

  // ── getStockSummary ──────────────────────────────────────────────────────
  describe('getStockSummary', () => {
    it('should return stock summary for a BU', () => {
      const { stockRepo, productRepo } = makeRepos();
      service = new StockService(stockRepo, productRepo);

      service.getStockSummary(1);
      expect(stockRepo.getStockSummary).toHaveBeenCalledWith(1);
    });
  });
});
