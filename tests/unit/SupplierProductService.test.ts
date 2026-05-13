import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupplierProductService } from '../../server/modules/proveedores/services/SupplierProductService';
import type { SupplierProductRepository } from '../../server/modules/proveedores/repositories/SupplierProductRepository';
import type { SupplierProduct, RawImportRow } from '../../shared/types';

function makeProduct(overrides: Partial<SupplierProduct> = {}): SupplierProduct {
  return {
    id:             1,
    supplierId:     10,
    businessUnitId: 1,
    name:           'Tela de algodón',
    supplierCode:   'TEX-001',
    unitCost:       850,
    currency:       'ARS',
    unit:           'metro',
    categoryHint:   'Telas',
    isActive:       true,
    lastUpdated:    '2026-05-01 00:00:00',
    createdAt:      '2026-05-01 00:00:00',
    ...overrides,
  };
}

function makeRepo(overrides: Partial<SupplierProductRepository> = {}): SupplierProductRepository {
  return {
    findAllBySupplierId: vi.fn().mockReturnValue([]),
    findById:            vi.fn().mockReturnValue(null),
    findBySupplierCode:  vi.fn().mockReturnValue(null),
    findByName:          vi.fn().mockReturnValue(null),
    create:              vi.fn(),
    update:              vi.fn(),
    softDelete:          vi.fn(),
    countBySupplierId:   vi.fn().mockReturnValue(0),
    upsertMany:          vi.fn().mockReturnValue({ created: 0, updated: 0, unchanged: 0 }),
    ...overrides,
  } as unknown as SupplierProductRepository;
}

describe('SupplierProductService', () => {
  let service: SupplierProductService;
  let repo: SupplierProductRepository;

  beforeEach(() => {
    repo    = makeRepo();
    service = new SupplierProductService(repo);
  });

  // ── importFromData ──────────────────────────────────────────────────────

  describe('importFromData', () => {
    it('should import valid rows and return correct counts', () => {
      vi.mocked(repo.upsertMany).mockReturnValue({ created: 3, updated: 1, unchanged: 2 });

      const rows: RawImportRow[] = [
        { name: 'Tela lisa', unitCost: 500 },
        { name: 'Hilo rojo', supplierCode: 'HIL-01', unitCost: 120 },
        { name: 'Botones', unitCost: 45, unit: 'docena' },
        { name: 'Agujas', unitCost: 30 },
        { name: 'Cierre 20cm', supplierCode: 'CIE-05', unitCost: 80 },
        { name: 'Entretela', unitCost: 200 },
      ];

      const result = service.importFromData(10, 1, rows);

      expect(repo.upsertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Tela lisa', unitCost: 500, supplierId: 10 }),
        ]),
      );
      expect(result.created).toBe(3);
      expect(result.updated).toBe(1);
      expect(result.unchanged).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should accumulate errors for invalid rows without stopping import', () => {
      vi.mocked(repo.upsertMany).mockReturnValue({ created: 2, updated: 0, unchanged: 0 });

      const rows: RawImportRow[] = [
        { name: 'Tela válida', unitCost: 500 },
        { name: '',            unitCost: 300 },           // nombre vacío
        { name: 'Otro válido', unitCost: 100 },
        { name: 'Precio malo', unitCost: NaN },           // precio inválido
        { name: 'Negativo',    unitCost: -50 },           // precio negativo
      ];

      const result = service.importFromData(10, 1, rows);

      expect(result.created).toBe(2);
      expect(result.errors).toHaveLength(3);
      expect(result.errors[0]?.reason).toContain('obligatorio');
      expect(result.errors[1]?.reason).toContain('inválido');
      expect(result.errors[2]?.reason).toContain('inválido');
    });

    it('should update price when product exists with changed cost', () => {
      vi.mocked(repo.upsertMany).mockReturnValue({ created: 0, updated: 1, unchanged: 0 });

      const rows: RawImportRow[] = [
        { name: 'Tela lisa', supplierCode: 'TEX-001', unitCost: 999 },
      ];

      const result = service.importFromData(10, 1, rows);

      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
      expect(result.unchanged).toBe(0);
    });

    it('should mark as unchanged when product exists with same cost', () => {
      vi.mocked(repo.upsertMany).mockReturnValue({ created: 0, updated: 0, unchanged: 1 });

      const rows: RawImportRow[] = [
        { name: 'Tela lisa', supplierCode: 'TEX-001', unitCost: 850 },
      ];

      const result = service.importFromData(10, 1, rows);

      expect(result.unchanged).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.created).toBe(0);
    });
  });

  // ── createOne ────────────────────────────────────────────────────────────

  describe('createOne', () => {
    it('should create a product with trimmed name', () => {
      const expected = makeProduct({ name: 'Tela lisa' });
      vi.mocked(repo.create).mockReturnValue(expected);

      const result = service.createOne({
        supplierId: 10, businessUnitId: 1,
        name: '  Tela lisa  ', unitCost: 500, currency: 'ARS', unit: 'metro',
      });

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Tela lisa' }));
      expect(result.name).toBe('Tela lisa');
    });

    it('should throw on empty name', () => {
      expect(() =>
        service.createOne({ supplierId: 10, businessUnitId: 1, name: '  ', unitCost: 100, currency: 'ARS', unit: 'unidad' }),
      ).toThrow('obligatorio');
    });

    it('should throw on invalid price', () => {
      expect(() =>
        service.createOne({ supplierId: 10, businessUnitId: 1, name: 'Test', unitCost: -10, currency: 'ARS', unit: 'unidad' }),
      ).toThrow('positivo');
    });
  });

  // ── deleteOne ────────────────────────────────────────────────────────────

  describe('deleteOne', () => {
    it('should soft-delete existing product', () => {
      const existing = makeProduct({ id: 5 });
      vi.mocked(repo.findById).mockReturnValue(existing);

      service.deleteOne(5);

      expect(repo.softDelete).toHaveBeenCalledWith(5);
    });

    it('should throw NotFoundError when product does not exist', () => {
      vi.mocked(repo.findById).mockReturnValue(null);

      expect(() => service.deleteOne(99)).toThrow('no encontrado');
    });
  });
});
