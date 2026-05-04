import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SalesService } from '../../server/core/services/SalesService';

describe('SalesService', () => {
  let service: SalesService;

  beforeEach(() => {
    const mockSaleRepo = { create: vi.fn(), getById: vi.fn(), getAll: vi.fn() } as unknown as never;
    const mockProductRepo = { getById: vi.fn() } as unknown as never;
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
    // Los lineTotals llegan CON IVA incluido (unitPrice = displayPrice).
    // taxableAmount y taxAmount se EXTRAEN del total, no se suman encima.
    // Ejemplo: 121 = 100 + 21% IVA → taxableAmount=100, taxAmount=21, total=121

    it('should extract IVA from totals without discount', () => {
      // lineTotals: [121, 242] → subtotal=363 (ya incluye 21% IVA)
      const result = service.calculateTotals([121, 242], 21, 0, 0);
      expect(result.subtotal).toBe(363);
      expect(result.discountAmount).toBe(0);
      expect(result.taxableAmount).toBe(300);
      expect(result.taxAmount).toBe(63);
      expect(result.totalAmount).toBe(363);
    });

    it('should apply percent discount and extract IVA', () => {
      // lineTotal: [121] → subtotal=121, discount 10% → total=108.9
      const result = service.calculateTotals([121], 21, 10, 0);
      expect(result.subtotal).toBe(121);
      expect(result.discountAmount).toBe(12.1);
      expect(result.totalAmount).toBe(108.9);
      expect(result.taxableAmount).toBe(Math.round((108.9 / 1.21) * 100) / 100);
      expect(result.taxAmount).toBe(Math.round((108.9 - result.taxableAmount) * 100) / 100);
    });

    it('should apply fixed discount amount and extract IVA', () => {
      // lineTotal: [242] → subtotal=242, discount $50 → total=192
      const result = service.calculateTotals([242], 21, 0, 50);
      expect(result.subtotal).toBe(242);
      expect(result.discountAmount).toBe(50);
      expect(result.totalAmount).toBe(192);
      expect(result.taxableAmount).toBe(Math.round((192 / 1.21) * 100) / 100);
    });

    it('should prioritize fixed amount over percent', () => {
      const result = service.calculateTotals([121], 21, 10, 20);
      // discountAmount=20 tiene prioridad sobre discountPercent=10
      expect(result.discountAmount).toBe(20);
    });

    it('should handle 0% tax rate', () => {
      const result = service.calculateTotals([500], 0, 0, 0);
      expect(result.subtotal).toBe(500);
      expect(result.totalAmount).toBe(500);
      expect(result.taxableAmount).toBe(500);
      expect(result.taxAmount).toBe(0);
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
      const mockProductRepo = { getById: vi.fn() } as unknown as never;
      const mockSaleRepo = { create: vi.fn() } as unknown as never;
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
      const mockProductRepo = { getById: vi.fn().mockReturnValue(null) } as unknown as never;
      const mockSaleRepo = { create: vi.fn() } as unknown as never;
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
