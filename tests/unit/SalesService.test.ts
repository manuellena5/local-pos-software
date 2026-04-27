import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SalesService } from '../../server/core/services/SalesService';

describe('SalesService', () => {
  let service: SalesService;

  beforeEach(() => {
    const mockSaleRepo = { create: vi.fn(), getById: vi.fn(), getAll: vi.fn() } as any;
    const mockProductRepo = { getById: vi.fn() } as any;
    service = new SalesService(mockSaleRepo, mockProductRepo);
  });

  describe('calculateLineTotal', () => {
    it('should calculate line total without discount', () => {
      expect(service.calculateLineTotal(2, 100, 0)).toBe(200);
    });

    it('should apply item discount correctly', () => {
      expect(service.calculateLineTotal(2, 100, 10)).toBe(180);
    });

    it('should round to 2 decimals', () => {
      expect(service.calculateLineTotal(3, 33.33, 0)).toBe(99.99);
    });
  });

  describe('calculateTotals', () => {
    it('should calculate totals without discount', () => {
      const result = service.calculateTotals([100, 200], 21, 0, 0);
      expect(result.subtotal).toBe(300);
      expect(result.discountAmount).toBe(0);
      expect(result.taxableAmount).toBe(300);
      expect(result.taxAmount).toBe(63);
      expect(result.totalAmount).toBe(363);
    });

    it('should apply percent discount', () => {
      const result = service.calculateTotals([100], 21, 10, 0);
      expect(result.subtotal).toBe(100);
      expect(result.discountAmount).toBe(10);
      expect(result.taxableAmount).toBe(90);
      expect(result.taxAmount).toBe(18.9);
      expect(result.totalAmount).toBe(108.9);
    });

    it('should apply fixed discount amount', () => {
      const result = service.calculateTotals([200], 21, 0, 50);
      expect(result.subtotal).toBe(200);
      expect(result.discountAmount).toBe(50);
      expect(result.taxableAmount).toBe(150);
      expect(result.taxAmount).toBe(31.5);
      expect(result.totalAmount).toBe(181.5);
    });

    it('should prioritize fixed amount over percent', () => {
      const result = service.calculateTotals([100], 21, 10, 20);
      // discountAmount=20 tiene prioridad
      expect(result.discountAmount).toBe(20);
    });
  });

  describe('validatePaymentMethods', () => {
    it('should pass when payment covers total', () => {
      expect(() =>
        service.validatePaymentMethods([{ method: 'cash', amount: 363 }], 363)
      ).not.toThrow();
    });

    it('should pass with tolerance of $1', () => {
      expect(() =>
        service.validatePaymentMethods([{ method: 'cash', amount: 362.5 }], 363)
      ).not.toThrow();
    });

    it('should throw when payment is insufficient', () => {
      expect(() =>
        service.validatePaymentMethods([{ method: 'cash', amount: 100 }], 363)
      ).toThrow();
    });

    it('should throw when no payment methods', () => {
      expect(() => service.validatePaymentMethods([], 363)).toThrow();
    });

    it('should pass with multiple payment methods', () => {
      expect(() =>
        service.validatePaymentMethods(
          [
            { method: 'cash', amount: 200 },
            { method: 'card', amount: 163 },
          ],
          363
        )
      ).not.toThrow();
    });
  });

  describe('confirmSale', () => {
    it('should throw when cart is empty', () => {
      const mockProductRepo = { getById: vi.fn() } as any;
      const mockSaleRepo = { create: vi.fn() } as any;
      const svc = new SalesService(mockSaleRepo, mockProductRepo);

      expect(() =>
        svc.confirmSale({
          businessUnitId: 1,
          items: [],
          paymentMethods: [{ method: 'cash', amount: 0 }],
        })
      ).toThrow('vacío');
    });

    it('should throw when product not found in BU', () => {
      const mockProductRepo = { getById: vi.fn().mockReturnValue(null) } as any;
      const mockSaleRepo = { create: vi.fn() } as any;
      const svc = new SalesService(mockSaleRepo, mockProductRepo);

      expect(() =>
        svc.confirmSale({
          businessUnitId: 1,
          items: [
            {
              productId: 99,
              productName: 'Test',
              quantity: 1,
              unitPrice: 100,
              taxRate: 21,
              discountPercent: 0,
            },
          ],
          paymentMethods: [{ method: 'cash', amount: 121 }],
        })
      ).toThrow();
    });
  });
});
