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

  describe('confirmSale — customerId', () => {
    const baseItem = {
      productId: 1,
      productName: 'Remera',
      quantity: 1,
      unitPrice: 121,
      taxRate: 21,
      discountPercent: 0,
    };

    it('should save customer_id when sale is created with a selected customer', () => {
      const fakeProduct = { id: 1, businessUnitId: 1 };
      const fakeResult = {
        sale: { id: 10, saleNumber: 1, totalAmount: 121, paymentMethods: [] },
        items: [],
      };
      const mockProductRepo = { getById: vi.fn().mockReturnValue(fakeProduct) } as unknown as never;
      const mockSaleRepo = { create: vi.fn().mockReturnValue(fakeResult) } as unknown as never;
      const svc = new SalesService(mockSaleRepo, mockProductRepo);

      svc.confirmSale({
        businessUnitId: 1,
        customerId: 42,
        items: [baseItem],
        paymentMethods: [{ method: 'cash', amount: 121 }],
      });

      const callArgs = vi.mocked(mockSaleRepo.create).mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      expect((callArgs as { customerId: unknown }).customerId).toBe(42);
    });

    it('should save null customer_id when sale is created as consumidor final', () => {
      const fakeProduct = { id: 1, businessUnitId: 1 };
      const fakeResult = {
        sale: { id: 11, saleNumber: 2, totalAmount: 121, paymentMethods: [] },
        items: [],
      };
      const mockProductRepo = { getById: vi.fn().mockReturnValue(fakeProduct) } as unknown as never;
      const mockSaleRepo = { create: vi.fn().mockReturnValue(fakeResult) } as unknown as never;
      const svc = new SalesService(mockSaleRepo, mockProductRepo);

      svc.confirmSale({
        businessUnitId: 1,
        // customerId not provided
        items: [baseItem],
        paymentMethods: [{ method: 'cash', amount: 121 }],
      });

      const callArgs = vi.mocked(mockSaleRepo.create).mock.calls[0]?.[0];
      expect(callArgs).toBeDefined();
      expect((callArgs as { customerId: unknown }).customerId).toBeNull();
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

  describe('confirmSale — redondeo de efectivo', () => {
    const baseItem = {
      productId: 1,
      productName: 'Producto',
      quantity: 1,
      unitPrice: 1230,
      taxRate: 21,
      discountPercent: 0,
    };

    function setup() {
      const fakeProduct = { id: 1, businessUnitId: 1 };
      const fakeResult = {
        sale: { id: 1, saleNumber: 1, totalAmount: 1230, roundingAdjustment: 0, paymentMethods: [] },
        items: [],
      };
      const mockProductRepo = { getById: vi.fn().mockReturnValue(fakeProduct) } as unknown as never;
      const mockSaleRepo = { create: vi.fn().mockReturnValue(fakeResult) } as unknown as never;
      const svc = new SalesService(mockSaleRepo, mockProductRepo);
      return { svc, mockSaleRepo };
    }

    it('should apply rounding adjustment when payment is 100% cash', () => {
      const { svc, mockSaleRepo } = setup();

      svc.confirmSale({
        businessUnitId: 1,
        items: [baseItem],
        paymentMethods: [{ method: 'cash', amount: 1200 }],
        roundingAdjustment: -30,
      });

      const callArgs = vi.mocked(mockSaleRepo.create).mock.calls[0]?.[0] as {
        totalAmount: number;
        roundingAdjustment: number;
      };
      expect(callArgs.totalAmount).toBe(1200);
      expect(callArgs.roundingAdjustment).toBe(-30);
    });

    it('should ignore rounding adjustment for non-cash payments', () => {
      const { svc, mockSaleRepo } = setup();

      svc.confirmSale({
        businessUnitId: 1,
        items: [baseItem],
        paymentMethods: [{ method: 'card', amount: 1230 }],
        roundingAdjustment: -30,
      });

      const callArgs = vi.mocked(mockSaleRepo.create).mock.calls[0]?.[0] as {
        totalAmount: number;
        roundingAdjustment: number;
      };
      expect(callArgs.totalAmount).toBe(1230);
      expect(callArgs.roundingAdjustment).toBe(0);
    });

    it('should ignore rounding adjustment for mixed payments (cash + other)', () => {
      const { svc, mockSaleRepo } = setup();

      svc.confirmSale({
        businessUnitId: 1,
        items: [baseItem],
        paymentMethods: [
          { method: 'cash', amount: 600 },
          { method: 'card', amount: 630 },
        ],
        roundingAdjustment: -30,
      });

      const callArgs = vi.mocked(mockSaleRepo.create).mock.calls[0]?.[0] as {
        totalAmount: number;
        roundingAdjustment: number;
      };
      expect(callArgs.totalAmount).toBe(1230);
      expect(callArgs.roundingAdjustment).toBe(0);
    });

    it('should never allow a positive adjustment (rounding up)', () => {
      const { svc, mockSaleRepo } = setup();

      svc.confirmSale({
        businessUnitId: 1,
        items: [baseItem],
        paymentMethods: [{ method: 'cash', amount: 1300 }],
        roundingAdjustment: 70, // intento de "redondear para arriba"
      });

      const callArgs = vi.mocked(mockSaleRepo.create).mock.calls[0]?.[0] as {
        totalAmount: number;
        roundingAdjustment: number;
      };
      expect(callArgs.totalAmount).toBe(1230);
      expect(callArgs.roundingAdjustment).toBe(0);
    });

    it('should clamp the adjustment so the total never goes negative', () => {
      const { svc, mockSaleRepo } = setup();

      svc.confirmSale({
        businessUnitId: 1,
        items: [baseItem],
        paymentMethods: [{ method: 'cash', amount: 0 }],
        roundingAdjustment: -5000, // mucho mayor al total
      });

      const callArgs = vi.mocked(mockSaleRepo.create).mock.calls[0]?.[0] as {
        totalAmount: number;
        roundingAdjustment: number;
      };
      expect(callArgs.totalAmount).toBe(0);
      expect(callArgs.roundingAdjustment).toBe(-1230);
    });

    it('should default to 0 adjustment when none is sent', () => {
      const { svc, mockSaleRepo } = setup();

      svc.confirmSale({
        businessUnitId: 1,
        items: [baseItem],
        paymentMethods: [{ method: 'cash', amount: 1230 }],
      });

      const callArgs = vi.mocked(mockSaleRepo.create).mock.calls[0]?.[0] as {
        totalAmount: number;
        roundingAdjustment: number;
      };
      expect(callArgs.totalAmount).toBe(1230);
      expect(callArgs.roundingAdjustment).toBe(0);
    });
  });
});
