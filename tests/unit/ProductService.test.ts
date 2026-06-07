import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductService } from '../../server/core/services/ProductService';

// Mock de la conexión a la base de datos para tests unitarios
vi.mock('../../server/db/connection', () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ run: vi.fn() }) }),
  },
}));

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

function makeProductRepo(overrides: Record<string, unknown> = {}) {
  return {
    getAll: vi.fn().mockReturnValue([makeProduct()]),
    getById: vi.fn().mockReturnValue(makeProduct()),
    create: vi.fn().mockImplementation((_, data) =>
      makeProduct({ name: data.name, sku: data.sku, costPrice: data.costPrice, basePrice: data.basePrice })
    ),
    update: vi.fn().mockImplementation((id, _buId, data) => makeProduct({ id, ...data })),
    toggleActive: vi.fn().mockImplementation((id, _buId, isActive) => makeProduct({ id, isActive })),
    search: vi.fn().mockReturnValue([makeProduct()]),
    getBySkuInBU: vi.fn().mockReturnValue(null),
    getProductByBarcode: vi.fn().mockReturnValue(null),
    generateSku: vi.fn().mockReturnValue('GEN-ALM-001'),
    ...overrides,
  } as unknown as never;
}

describe('ProductService', () => {
  let service: ProductService;
  let repo: ReturnType<typeof makeProductRepo>;

  beforeEach(() => {
    repo = makeProductRepo();
    service = new ProductService(repo);
  });

  // ── listAll ──────────────────────────────────────────────────────────────
  describe('listAll', () => {
    it('should return products for a BU', () => {
      const result = service.listAll(1);
      expect(result).toHaveLength(1);
      expect(repo.getAll).toHaveBeenCalledWith(1);
    });
  });

  // ── getById ──────────────────────────────────────────────────────────────
  describe('getById', () => {
    it('should return product when found', () => {
      const product = service.getById(1, 1);
      expect(product.id).toBe(1);
    });

    it('should throw NotFoundError when product does not exist', () => {
      repo = makeProductRepo({ getById: vi.fn().mockReturnValue(null) });
      service = new ProductService(repo);
      expect(() => service.getById(99, 1)).toThrow('no encontrado');
    });
  });

  // ── create ───────────────────────────────────────────────────────────────
  describe('create', () => {
    // sku ya no viene del cliente — se genera en el backend via generateSku
    const validData = {
      name: 'Almohada',
      costPrice: 30,
      basePrice: 80,
      taxRate: 21,
    };

    it('should create product with valid data and auto-generated SKU', () => {
      const product = service.create(1, validData);
      expect(product.name).toBe('Almohada');
      expect(repo.generateSku).toHaveBeenCalledWith('', 'Almohada', 1);
      expect(repo.create).toHaveBeenCalledWith(1, expect.objectContaining({ sku: 'GEN-ALM-001' }));
    });

    it('should use category in generateSku when provided', () => {
      service.create(1, { ...validData, category: 'Blanquería' });
      expect(repo.generateSku).toHaveBeenCalledWith('Blanquería', 'Almohada', 1);
    });

    it('should accept costPrice >= basePrice (basePrice is NET without IVA)', () => {
      // costPrice=100, basePrice=80 net, gross=96.8 at 21% — valid scenario
      expect(() =>
        service.create(1, { ...validData, costPrice: 100, basePrice: 80 })
      ).not.toThrow();
    });

    it('should throw ValidationError when name is empty', () => {
      expect(() =>
        service.create(1, { ...validData, name: '' })
      ).toThrow();
    });

    it('should accept costPrice = 0 (producto gratuito / servicio sin costo)', () => {
      // costPrice=0 < basePrice=80 → válido
      const product = service.create(1, { ...validData, costPrice: 0 });
      expect(repo.create).toHaveBeenCalled();
      expect(product).toBeTruthy();
    });
  });

  // ── toggleActive (soft-delete) ───────────────────────────────────────────
  describe('toggleActive', () => {
    it('should soft-delete product (isActive = false)', () => {
      const product = service.toggleActive(1, 1, false);
      expect(product.isActive).toBe(false);
    });

    it('should throw when product not found', () => {
      repo = makeProductRepo({ getById: vi.fn().mockReturnValue(null) });
      service = new ProductService(repo);
      expect(() => service.toggleActive(99, 1, false)).toThrow('no encontrado');
    });
  });

  // ── search ───────────────────────────────────────────────────────────────
  describe('search', () => {
    it('should delegate non-empty query to repo', () => {
      service.search(1, 'sab');
      expect(repo.search).toHaveBeenCalledWith(1, 'sab');
    });

    it('should return all products for empty query', () => {
      service.search(1, '');
      expect(repo.getAll).toHaveBeenCalledWith(1);
      expect(repo.search).not.toHaveBeenCalled();
    });

    it('should trim whitespace before searching', () => {
      service.search(1, '  sab  ');
      expect(repo.search).toHaveBeenCalledWith(1, 'sab');
    });
  });
});
