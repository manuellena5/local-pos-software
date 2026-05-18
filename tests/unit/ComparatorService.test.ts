import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock db before importing anything that uses it
vi.mock('../../server/db/connection', () => {
  const mockDb = {
    select:    vi.fn(),
    from:      vi.fn(),
    where:     vi.fn(),
    innerJoin: vi.fn(),
    insert:    vi.fn(),
    update:    vi.fn(),
    set:       vi.fn(),
    values:    vi.fn(),
    returning: vi.fn(),
    all:       vi.fn(),
    get:       vi.fn(),
    run:       vi.fn(),
  };
  // All chain methods return the same object
  mockDb.select.mockReturnValue(mockDb);
  mockDb.from.mockReturnValue(mockDb);
  mockDb.where.mockReturnValue(mockDb);
  mockDb.innerJoin.mockReturnValue(mockDb);
  mockDb.insert.mockReturnValue(mockDb);
  mockDb.update.mockReturnValue(mockDb);
  mockDb.set.mockReturnValue(mockDb);
  mockDb.values.mockReturnValue(mockDb);
  mockDb.returning.mockReturnValue(mockDb);
  mockDb.all.mockReturnValue([]);
  mockDb.get.mockReturnValue(null);
  return { db: mockDb, sqlite: {} };
});

import { db } from '../../server/db/connection';
import { ComparatorService } from '../../server/modules/proveedores/services/ComparatorService';
import type { ProductSupplierLinkRepository } from '../../server/modules/proveedores/repositories/ProductSupplierLinkRepository';
import type { Supplier, SupplierProduct, Product, ProductSupplierLink } from '../../shared/types';

// ── typed mock db ─────────────────────────────────────────────────────────

type MockDb = {
  select: ReturnType<typeof vi.fn>;
  from:   ReturnType<typeof vi.fn>;
  where:  ReturnType<typeof vi.fn>;
  innerJoin: ReturnType<typeof vi.fn>;
  all:    ReturnType<typeof vi.fn>;
  get:    ReturnType<typeof vi.fn>;
  run:    ReturnType<typeof vi.fn>;
};
const mockDb = db as unknown as MockDb;

// ── factories ─────────────────────────────────────────────────────────────

function makeSupplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id: 1, businessUnitId: 1, name: 'Textil Norte', contactName: null,
    phone: null, email: null, paymentTerms: 'contado', deliveryDays: 3,
    minimumOrder: null, shippingCost: null, city: null, notes: null,
    isActive: true, createdAt: '2026-01-01', updatedAt: '2026-01-01', ...overrides,
  };
}

function makeSupplierProduct(overrides: Partial<SupplierProduct> = {}): SupplierProduct {
  return {
    id: 1, supplierId: 1, businessUnitId: 1, name: 'Toalla', supplierCode: null,
    unitCost: 600, currency: 'ARS', unit: 'unidad', categoryHint: null,
    isActive: true, lastUpdated: '2026-01-01', createdAt: '2026-01-01', ...overrides,
  };
}

function makeLink(overrides: Partial<ProductSupplierLink> = {}): ProductSupplierLink {
  return {
    id: 1, productId: 1, supplierProductId: 1, businessUnitId: 1,
    isPreferred: false, createdAt: '2026-01-01', ...overrides,
  };
}

function makeProductRow(overrides: Partial<Product & { costPrice: number; basePrice: number }> = {}) {
  return {
    id: 1, businessUnitId: 1, name: 'Toalla Ombré', sku: 'T01',
    costPrice: 500, basePrice: 1000, taxRate: 21, isActive: true,
    description: null, category: null, barcode: null, supplierCode: null,
    createdAt: '2026-01-01', updatedAt: '2026-01-01', ...overrides,
  };
}

function makeRepo(overrides: Partial<ProductSupplierLinkRepository> = {}): ProductSupplierLinkRepository {
  return {
    findLinksForProduct:              vi.fn().mockReturnValue([]),
    findAllLinksForBU:                vi.fn().mockReturnValue([]),
    createLink:                       vi.fn(),
    setPreferred:                     vi.fn(),
    deleteLink:                       vi.fn(),
    suggestMatches:                   vi.fn().mockReturnValue([]),
    findById:                         vi.fn().mockReturnValue(null),
    findByProductAndSupplierProduct:  vi.fn().mockReturnValue(null),
    findAllForProduct:                vi.fn().mockReturnValue([]),
    findUnlinkedForBU:                vi.fn().mockReturnValue([]),
    createProductFromSupplier:        vi.fn(),
    ...overrides,
  } as unknown as ProductSupplierLinkRepository;
}

// ── tests ─────────────────────────────────────────────────────────────────

describe('ComparatorService', () => {
  let service: ComparatorService;
  let repo: ProductSupplierLinkRepository;

  beforeEach(() => {
    repo    = makeRepo();
    service = new ComparatorService(repo);
    vi.mocked(mockDb.all).mockReset().mockReturnValue([]);
    vi.mocked(mockDb.get).mockReset().mockReturnValue(null);
    // Re-wire chain methods after reset
    vi.mocked(mockDb.select).mockReturnValue(mockDb);
    vi.mocked(mockDb.from).mockReturnValue(mockDb);
    vi.mocked(mockDb.where).mockReturnValue(mockDb);
    vi.mocked(mockDb.innerJoin).mockReturnValue(mockDb);
  });

  // ── getComparatorData ───────────────────────────────────────────────────

  describe('getComparatorData', () => {
    it('should sort rows: out → low → ok', () => {
      vi.mocked(mockDb.all)
        .mockReturnValueOnce([ // products
          makeProductRow({ id: 1, name: 'P ok'  }),
          makeProductRow({ id: 2, name: 'P low' }),
          makeProductRow({ id: 3, name: 'P out' }),
        ])
        .mockReturnValueOnce([ // stock
          { productId: 1, quantity: 10 },
          { productId: 2, quantity: 3  },
          { productId: 3, quantity: 0  },
        ])
        .mockReturnValueOnce([]); // suppliers

      vi.mocked(repo.findAllLinksForBU).mockReturnValue([]);

      const rows = service.getComparatorData(1);

      expect(rows[0]?.stockStatus).toBe('out');
      expect(rows[1]?.stockStatus).toBe('low');
      expect(rows[2]?.stockStatus).toBe('ok');
    });

    it('should calculate margin correctly', () => {
      vi.mocked(mockDb.all)
        .mockReturnValueOnce([makeProductRow({ basePrice: 1000 })])
        .mockReturnValueOnce([{ productId: 1, quantity: 10 }])
        .mockReturnValueOnce([makeSupplier()]);

      const sp = makeSupplierProduct({ unitCost: 600 });
      vi.mocked(repo.findAllLinksForBU).mockReturnValue([{
        link: makeLink({ productId: 1, supplierProductId: 1 }),
        supplierProduct: sp,
        supplier: { id: 1, name: 'Textil Norte', shippingCost: null, minimumOrder: null },
      }]);

      const rows = service.getComparatorData(1);

      // margin = (1000 - 600) / 1000 * 100 = 40%
      expect(rows[0]?.links[0]?.margin).toBe(40);
      expect(rows[0]?.links[0]?.marginAmount).toBe(400);
    });

    it('should identify best price supplier (cheapest)', () => {
      vi.mocked(mockDb.all)
        .mockReturnValueOnce([makeProductRow({ basePrice: 1200 })])
        .mockReturnValueOnce([{ productId: 1, quantity: 10 }])
        .mockReturnValueOnce([
          makeSupplier({ id: 1, name: 'Proveedor A' }),
          makeSupplier({ id: 2, name: 'Proveedor B' }),
        ]);

      vi.mocked(repo.findAllLinksForBU).mockReturnValue([
        {
          link: makeLink({ id: 1, supplierProductId: 1 }),
          supplierProduct: makeSupplierProduct({ id: 1, supplierId: 1, unitCost: 800 }),
          supplier: { id: 1, name: 'Proveedor A', shippingCost: null, minimumOrder: null },
        },
        {
          link: makeLink({ id: 2, supplierProductId: 2 }),
          supplierProduct: makeSupplierProduct({ id: 2, supplierId: 2, unitCost: 650 }),
          supplier: { id: 2, name: 'Proveedor B', shippingCost: null, minimumOrder: null },
        },
      ]);

      const rows = service.getComparatorData(1);

      expect(rows[0]?.bestPrice).toBe(650);
      expect(rows[0]?.bestSupplier).toBe('Proveedor B');
    });
  });

  // ── getUnlinkedProducts ─────────────────────────────────────────────────

  describe('getUnlinkedProducts', () => {
    it('should return items from repo when products exist', () => {
      const item = {
        supplierProductId: 5, supplierId: 1, supplierName: 'Textil Norte',
        supplierCode: 'TX-001', name: 'Tela algodón', unitCost: 350, unit: 'metro',
      };
      repo = makeRepo({ findUnlinkedForBU: vi.fn().mockReturnValue([item]) });
      service = new ComparatorService(repo);

      const result = service.getUnlinkedProducts(1);

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('Tela algodón');
      expect(vi.mocked(repo.findUnlinkedForBU)).toHaveBeenCalledWith(1);
    });

    it('should return empty array when all products are linked', () => {
      repo = makeRepo({ findUnlinkedForBU: vi.fn().mockReturnValue([]) });
      service = new ComparatorService(repo);

      const result = service.getUnlinkedProducts(1);

      expect(result).toHaveLength(0);
    });
  });

  // ── createProductFromSupplier ────────────────────────────────────────────

  describe('createProductFromSupplier', () => {
    it('should call repo with correct merged input', () => {
      const createdProduct = makeProductRow({ id: 99, name: 'Tela algodón' });
      const mockCreateFn = vi.fn().mockReturnValue(createdProduct);
      repo = makeRepo({ createProductFromSupplier: mockCreateFn });
      service = new ComparatorService(repo);

      const input = {
        supplierProductId: 5,
        businessUnitId:    1,
        name:              'Tela algodón',
        salePrice:         700,
        costPrice:         350,
        initialStock:      20,
      };

      const result = service.createProductFromSupplier(1, input);

      expect(result.name).toBe('Tela algodón');
      expect(mockCreateFn).toHaveBeenCalledWith(expect.objectContaining({
        supplierProductId: 5,
        businessUnitId:    1,
        name:              'Tela algodón',
        salePrice:         700,
      }));
    });

    it('should propagate error when repo fails', () => {
      repo = makeRepo({
        createProductFromSupplier: vi.fn().mockImplementation(() => {
          throw new Error('DB error');
        }),
      });
      service = new ComparatorService(repo);

      expect(() =>
        service.createProductFromSupplier(1, {
          supplierProductId: 5,
          businessUnitId:    1,
          name:              'X',
          salePrice:         100,
        }),
      ).toThrow('DB error');
    });
  });

  // ── buildPurchaseOrder ──────────────────────────────────────────────────

  describe('buildPurchaseOrder', () => {
    function setupBuildOrder(opts: {
      basePrice?: number;
      unitCost?: number;
      shippingCost?: number | null;
      minimumOrder?: number | null;
      salesHistory?: { qty: number }[];
    }) {
      const product = makeProductRow({ basePrice: opts.basePrice ?? 1000 });
      const supplier = makeSupplier({ shippingCost: opts.shippingCost ?? 0, minimumOrder: opts.minimumOrder ?? null });
      const sp = makeSupplierProduct({ unitCost: opts.unitCost ?? 600 });

      vi.mocked(mockDb.get)
        .mockReturnValueOnce(product)
        .mockReturnValueOnce(supplier);

      vi.mocked(repo.findByProductAndSupplierProduct).mockReturnValue(makeLink());
      vi.mocked(repo.findLinksForProduct).mockReturnValue([{
        link: makeLink(),
        supplierProduct: sp,
        supplier: { id: 1, name: 'Textil Norte', shippingCost: opts.shippingCost ?? 0, minimumOrder: opts.minimumOrder ?? null },
      }]);

      vi.mocked(mockDb.all).mockReturnValue(
        opts.salesHistory?.map((h) => ({ qty: h.qty })) ?? [],
      );
    }

    it('should add shipping cost to supplier total', () => {
      setupBuildOrder({ unitCost: 600, shippingCost: 2500 });

      const order = service.buildPurchaseOrder(1, [{ productId: 1, supplierProductId: 1, quantity: 10 }]);

      // subtotal = 10 * 600 = 6000; total = 6000 + 2500 = 8500
      expect(order.bySupplier[0]?.costoEnvio).toBe(2500);
      expect(order.bySupplier[0]?.total).toBe(8500);
    });

    it('should generate warning when order is below minimum', () => {
      setupBuildOrder({ unitCost: 600, minimumOrder: 10000, shippingCost: 0 });

      // 5 * 600 = $3000, mínimo $10000 → warning, faltan $7000
      const order = service.buildPurchaseOrder(1, [{ productId: 1, supplierProductId: 1, quantity: 5 }]);

      expect(order.warnings).toHaveLength(1);
      expect(order.warnings[0]?.minimumOrder).toBe(10000);
      expect(order.warnings[0]?.currentOrder).toBe(3000);
      expect(order.warnings[0]?.missing).toBe(7000);
    });

    it('should calculate ROI correctly', () => {
      setupBuildOrder({ basePrice: 1000, unitCost: 600, shippingCost: 0, minimumOrder: null });

      // 10 * 600 = 6000 inversión; ganancia = 10 * 400 = 4000; ROI = 66.67%
      const order = service.buildPurchaseOrder(1, [{ productId: 1, supplierProductId: 1, quantity: 10 }]);

      expect(order.totals.totalInversion).toBe(6000);
      expect(order.totals.totalGananciaProyectada).toBe(4000);
      expect(order.totals.roi).toBeCloseTo(66.67, 1);
    });

    it('should return null diasRecupero when no sales history', () => {
      setupBuildOrder({ salesHistory: [] });

      const order = service.buildPurchaseOrder(1, [{ productId: 1, supplierProductId: 1, quantity: 5 }]);

      expect(order.totals.diasRecuperoEstimado).toBeNull();
    });
  });
});
