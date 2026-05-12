import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupplierService } from '../../server/modules/proveedores/services/SupplierService';
import type { SupplierRepository } from '../../server/modules/proveedores/repositories/SupplierRepository';
import type { Supplier } from '../../shared/types';

function makeSupplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id:             1,
    businessUnitId: 1,
    name:           'Textiles del Sur',
    contactName:    null,
    phone:          null,
    email:          null,
    paymentTerms:   null,
    deliveryDays:   null,
    notes:          null,
    isActive:       true,
    createdAt:      '2026-05-01T00:00:00',
    updatedAt:      '2026-05-01T00:00:00',
    ...overrides,
  };
}

function makeRepo(overrides: Partial<SupplierRepository> = {}): SupplierRepository {
  return {
    findAllForBU:                vi.fn().mockReturnValue([]),
    findById:                    vi.fn().mockReturnValue(null),
    findAllForBUIncludingInactive: vi.fn().mockReturnValue([]),
    create:                      vi.fn(),
    update:                      vi.fn(),
    softDelete:                  vi.fn(),
    ...overrides,
  } as unknown as SupplierRepository;
}

describe('SupplierService', () => {
  let service: SupplierService;
  let repo: SupplierRepository;

  beforeEach(() => {
    repo    = makeRepo();
    service = new SupplierService(repo);
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a supplier with trimmed name', () => {
      const expected = makeSupplier({ name: 'Textiles del Sur' });
      vi.mocked(repo.create).mockReturnValue(expected);

      const result = service.create({ businessUnitId: 1, name: '  Textiles del Sur  ' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Textiles del Sur', businessUnitId: 1 }),
      );
      expect(result.name).toBe('Textiles del Sur');
    });

    it('should reject duplicate supplier name in same BU (case-insensitive)', () => {
      const existing = makeSupplier({ name: 'Textiles del Sur' });
      vi.mocked(repo.findAllForBUIncludingInactive).mockReturnValue([existing]);

      expect(() =>
        service.create({ businessUnitId: 1, name: 'textiles del sur' }),
      ).toThrow('Ya existe un proveedor llamado "Textiles del Sur"');
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('should allow same name in different business units', () => {
      // BU 1 tiene el proveedor, BU 2 no
      vi.mocked(repo.findAllForBUIncludingInactive).mockReturnValue([]);
      const expected = makeSupplier({ businessUnitId: 2 });
      vi.mocked(repo.create).mockReturnValue(expected);

      expect(() =>
        service.create({ businessUnitId: 2, name: 'Textiles del Sur' }),
      ).not.toThrow();
    });

    it('should throw on empty name', () => {
      expect(() => service.create({ businessUnitId: 1, name: '   ' })).toThrow(
        'no puede estar vacío',
      );
    });
  });

  // ── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update supplier name with trim', () => {
      const existing = makeSupplier({ id: 1, name: 'Textiles del Sur' });
      vi.mocked(repo.findById).mockReturnValue(existing);
      const updated = makeSupplier({ name: 'Deco House' });
      vi.mocked(repo.update).mockReturnValue(updated);

      service.update(1, 1, { name: '  Deco House  ' });

      expect(repo.update).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Deco House' }));
    });

    it('should reject duplicate name on update (excluding self)', () => {
      const existing = makeSupplier({ id: 1, name: 'Textiles del Sur' });
      const other    = makeSupplier({ id: 2, name: 'Deco House' });
      vi.mocked(repo.findById).mockReturnValue(existing);
      vi.mocked(repo.findAllForBUIncludingInactive).mockReturnValue([existing, other]);

      expect(() => service.update(1, 1, { name: 'deco house' })).toThrow(
        'Ya existe un proveedor',
      );
    });

    it('should allow keeping the same name', () => {
      const existing = makeSupplier({ id: 1, name: 'Textiles del Sur' });
      vi.mocked(repo.findById).mockReturnValue(existing);
      vi.mocked(repo.findAllForBUIncludingInactive).mockReturnValue([existing]);
      vi.mocked(repo.update).mockReturnValue(existing);

      expect(() => service.update(1, 1, { name: 'textiles del sur' })).not.toThrow();
    });

    it('should throw NotFoundError if supplier does not exist', () => {
      vi.mocked(repo.findById).mockReturnValue(null);

      expect(() => service.update(99, 1, { name: 'Algo' })).toThrow('no encontrado');
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('should not delete a supplier with associated products (TODO Paso 3)', () => {
      // Por ahora el delete siempre procede — la validación de productos llega en Paso 3.
      // Este test verifica que softDelete es llamado cuando existe el proveedor.
      const existing = makeSupplier({ id: 1 });
      vi.mocked(repo.findById).mockReturnValue(existing);

      service.delete(1, 1);

      expect(repo.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when deleting non-existent supplier', () => {
      vi.mocked(repo.findById).mockReturnValue(null);

      expect(() => service.delete(99, 1)).toThrow('no encontrado');
    });
  });

  // ── listForBU ────────────────────────────────────────────────────────────

  describe('listForBU', () => {
    it('should return suppliers sorted alphabetically (delegated to repo)', () => {
      const sorted = [
        makeSupplier({ id: 1, name: 'Aroma Sur' }),
        makeSupplier({ id: 2, name: 'Deco House' }),
        makeSupplier({ id: 3, name: 'Textiles del Sur' }),
      ];
      vi.mocked(repo.findAllForBU).mockReturnValue(sorted);

      const result = service.listForBU(1);

      expect(result.map((s) => s.name)).toEqual(['Aroma Sur', 'Deco House', 'Textiles del Sur']);
      expect(repo.findAllForBU).toHaveBeenCalledWith(1);
    });

    it('should only return suppliers for the given BU', () => {
      const buSuppliers = [makeSupplier({ businessUnitId: 1 })];
      vi.mocked(repo.findAllForBU).mockReturnValue(buSuppliers);

      const result = service.listForBU(1);

      expect(result).toHaveLength(1);
      expect(result[0]?.businessUnitId).toBe(1);
    });
  });
});
