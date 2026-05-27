import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BusinessUnitService } from '../../server/core/services/BusinessUnitService';
import type { BusinessUnitRepository } from '../../server/core/repositories/BusinessUnitRepository';
import type { InstallationRepository } from '../../server/core/repositories/InstallationRepository';
import type { BusinessUnit, InstallationConfig } from '../../shared/types';

// ── helpers ─────────────────────────────────────────────────────────────────

function makeBU(overrides: Partial<BusinessUnit> = {}): BusinessUnit {
  return {
    id: 1,
    installationId: 1,
    name: 'Front',
    description: null,
    moduleId: 'retail-textil',
    isActive: true,
    invoicePrefix: 'A',
    lastInvoiceNumber: 0,
    createdAt: '2026-05-01 08:00:00',
    updatedAt: '2026-05-01 08:00:00',
    ...overrides,
  };
}

function makeConfig(): InstallationConfig {
  return {
    id: 1,
    businessName: 'Test Shop',
    cuit: '20111111111',
    address: 'Calle 123',
    logoPath: null,
    whatsappNumber: null,
    catalogBusinessUnitId: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };
}

function makeBURepo(overrides: Partial<BusinessUnitRepository> = {}): BusinessUnitRepository {
  return {
    getAll: vi.fn().mockReturnValue([]),
    getById: vi.fn().mockReturnValue(null),
    create: vi.fn(),
    update: vi.fn(),
    ...overrides,
  } as unknown as BusinessUnitRepository;
}

function makeInstallationRepo(): InstallationRepository {
  return {
    get: vi.fn().mockReturnValue(makeConfig()),
  } as unknown as InstallationRepository;
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('BusinessUnitService', () => {
  let service: BusinessUnitService;
  let buRepo: BusinessUnitRepository;
  let installationRepo: InstallationRepository;

  beforeEach(() => {
    buRepo = makeBURepo();
    installationRepo = makeInstallationRepo();
    service = new BusinessUnitService(buRepo, installationRepo);
  });

  // ── getAll ────────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('should return all business units', () => {
      const units = [makeBU({ id: 1 }), makeBU({ id: 2, name: 'Back' })];
      vi.mocked(buRepo.getAll).mockReturnValue(units);

      const result = service.getAll();

      expect(result).toHaveLength(2);
      expect(buRepo.getAll).toHaveBeenCalledOnce();
    });

    it('should return empty array when no units exist', () => {
      vi.mocked(buRepo.getAll).mockReturnValue([]);
      expect(service.getAll()).toEqual([]);
    });
  });

  // ── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('should return the business unit when found', () => {
      const unit = makeBU({ id: 5 });
      vi.mocked(buRepo.getById).mockReturnValue(unit);

      const result = service.getById(5);

      expect(result).toEqual(unit);
      expect(buRepo.getById).toHaveBeenCalledWith(5);
    });

    it('should throw NotFoundError when BU does not exist', () => {
      vi.mocked(buRepo.getById).mockReturnValue(null);

      expect(() => service.getById(99)).toThrow('no encontrada');
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a business unit with valid moduleId', () => {
      const created = makeBU({ name: 'Taller', moduleId: 'taller-medida' });
      vi.mocked(buRepo.create).mockReturnValue(created);

      const result = service.create({
        name: 'Taller',
        moduleId: 'taller-medida',
        invoicePrefix: 'B',
      });

      expect(buRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Taller',
          moduleId: 'taller-medida',
          invoicePrefix: 'B',
          installationId: 1,
        }),
      );
      expect(result.name).toBe('Taller');
    });

    it('should pass description when provided', () => {
      const created = makeBU({ description: 'Unidad de blanqueria' });
      vi.mocked(buRepo.create).mockReturnValue(created);

      service.create({
        name: 'Front',
        description: 'Unidad de blanqueria',
        moduleId: 'retail-textil',
        invoicePrefix: 'A',
      });

      expect(buRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Unidad de blanqueria' }),
      );
    });

    it('should default description to null when not provided', () => {
      const created = makeBU({ description: null });
      vi.mocked(buRepo.create).mockReturnValue(created);

      service.create({ name: 'Front', moduleId: 'retail-textil', invoicePrefix: 'A' });

      expect(buRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: null }),
      );
    });

    it('should throw BusinessRuleError for invalid moduleId', () => {
      expect(() =>
        service.create({ name: 'Test', moduleId: 'modulo-inexistente', invoicePrefix: 'A' }),
      ).toThrow("Módulo 'modulo-inexistente' no válido");
      expect(buRepo.create).not.toHaveBeenCalled();
    });

    it('should accept all valid module IDs', () => {
      const validModules = ['retail-general', 'retail-textil', 'taller-medida'];
      const created = makeBU();
      vi.mocked(buRepo.create).mockReturnValue(created);

      for (const moduleId of validModules) {
        expect(() =>
          service.create({ name: 'Test', moduleId, invoicePrefix: 'A' }),
        ).not.toThrow();
      }
      expect(buRepo.create).toHaveBeenCalledTimes(validModules.length);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update name and description', () => {
      const existing = makeBU({ id: 1 });
      const updated = makeBU({ id: 1, name: 'Nuevo Nombre', description: 'Nueva desc' });
      vi.mocked(buRepo.getById).mockReturnValue(existing);
      vi.mocked(buRepo.update).mockReturnValue(updated);

      const result = service.update(1, { name: 'Nuevo Nombre', description: 'Nueva desc' });

      expect(buRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: 'Nuevo Nombre', description: 'Nueva desc' }),
      );
      expect(result.name).toBe('Nuevo Nombre');
    });

    it('should throw NotFoundError when BU does not exist', () => {
      vi.mocked(buRepo.getById).mockReturnValue(null);

      expect(() => service.update(99, { name: 'X' })).toThrow('no encontrada');
      expect(buRepo.update).not.toHaveBeenCalled();
    });

    it('should update only provided fields (partial update)', () => {
      const existing = makeBU({ id: 1 });
      const updated = makeBU({ id: 1, invoicePrefix: 'B' });
      vi.mocked(buRepo.getById).mockReturnValue(existing);
      vi.mocked(buRepo.update).mockReturnValue(updated);

      service.update(1, { invoicePrefix: 'B' });

      expect(buRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ invoicePrefix: 'B' }),
      );
    });
  });

  // ── toggleActive ──────────────────────────────────────────────────────────

  describe('toggleActive', () => {
    it('should deactivate an active BU', () => {
      const active = makeBU({ id: 1, isActive: true });
      const deactivated = makeBU({ id: 1, isActive: false });
      vi.mocked(buRepo.getById).mockReturnValue(active);
      vi.mocked(buRepo.update).mockReturnValue(deactivated);

      const result = service.toggleActive(1);

      expect(buRepo.update).toHaveBeenCalledWith(1, { isActive: false });
      expect(result.isActive).toBe(false);
    });

    it('should activate an inactive BU', () => {
      const inactive = makeBU({ id: 1, isActive: false });
      const activated = makeBU({ id: 1, isActive: true });
      vi.mocked(buRepo.getById).mockReturnValue(inactive);
      vi.mocked(buRepo.update).mockReturnValue(activated);

      const result = service.toggleActive(1);

      expect(buRepo.update).toHaveBeenCalledWith(1, { isActive: true });
      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundError when BU does not exist', () => {
      vi.mocked(buRepo.getById).mockReturnValue(null);

      expect(() => service.toggleActive(99)).toThrow('no encontrada');
      expect(buRepo.update).not.toHaveBeenCalled();
    });
  });
});
