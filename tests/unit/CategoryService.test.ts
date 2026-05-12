import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CategoryService } from '../../server/core/services/CategoryService';
import type { CategoryRepository } from '../../server/core/repositories/CategoryRepository';
import type { Category } from '../../shared/types';

// Mock drizzle db used by CategoryService.delete() for product count query
vi.mock('../../server/db/connection', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockReturnValue({ total: 0 }),
        }),
      }),
    }),
  },
  sqlite: {},
}));

// Mock drizzle-orm operators used in the service
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return { ...actual };
});

// Mock products schema (not needed for unit test logic)
vi.mock('../../server/db/schema', () => ({
  products: {},
}));

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 1,
    name: 'Blanqueria',
    businessUnitId: 1,
    isActive: true,
    createdAt: '2026-05-01T00:00:00',
    ...overrides,
  };
}

function makeRepo(overrides: Partial<CategoryRepository> = {}): CategoryRepository {
  return {
    findAllForBU: vi.fn().mockReturnValue([]),
    findById: vi.fn().mockReturnValue(null),
    findByNameForBU: vi.fn().mockReturnValue(null),
    findAllForBUIncludingInactive: vi.fn().mockReturnValue([]),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    ...overrides,
  } as unknown as CategoryRepository;
}

describe('CategoryService', () => {
  let service: CategoryService;
  let repo: CategoryRepository;

  beforeEach(() => {
    repo = makeRepo();
    service = new CategoryService(repo);
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a category with normalized name', () => {
      const expected = makeCategory({ name: 'Blanqueria' });
      vi.mocked(repo.create).mockReturnValue(expected);

      const result = service.create('blanqueria', 1);

      expect(repo.create).toHaveBeenCalledWith({ name: 'Blanqueria', businessUnitId: 1 });
      expect(result.name).toBe('Blanqueria');
    });

    it('should normalize name with trim and capitalize', () => {
      const expected = makeCategory({ name: 'Deco' });
      vi.mocked(repo.create).mockReturnValue(expected);

      service.create('  DECO  ', 1);

      expect(repo.create).toHaveBeenCalledWith({ name: 'Deco', businessUnitId: 1 });
    });

    it('should reject duplicate category name case-insensitive', () => {
      const existing = makeCategory({ name: 'Blanqueria' });
      vi.mocked(repo.findAllForBUIncludingInactive).mockReturnValue([existing]);

      expect(() => service.create('BLANQUERIA', 1)).toThrow(
        'Ya existe una categoría llamada "Blanqueria"',
      );
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('should reject duplicate even with different casing and extra spaces', () => {
      const existing = makeCategory({ name: 'Blanqueria' });
      vi.mocked(repo.findAllForBUIncludingInactive).mockReturnValue([existing]);

      expect(() => service.create('  blanqueria  ', 1)).toThrow();
    });

    it('should allow same name in different business units', () => {
      // BU 1 ya tiene "Blanqueria", BU 2 no tiene nada
      vi.mocked(repo.findAllForBUIncludingInactive).mockReturnValue([]);
      const expected = makeCategory({ businessUnitId: 2 });
      vi.mocked(repo.create).mockReturnValue(expected);

      expect(() => service.create('Blanqueria', 2)).not.toThrow();
    });

    it('should throw on empty name', () => {
      expect(() => service.create('   ', 1)).toThrow('no puede estar vacío');
    });
  });

  // ── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update with normalized name', () => {
      const existing = makeCategory({ id: 1, name: 'Blanqueria' });
      vi.mocked(repo.findById).mockReturnValue(existing);
      const updated = makeCategory({ name: 'Textiles' });
      vi.mocked(repo.update).mockReturnValue(updated);

      const result = service.update(1, 'textiles');

      expect(repo.update).toHaveBeenCalledWith(1, 'Textiles');
      expect(result.name).toBe('Textiles');
    });

    it('should reject duplicate name on update (case-insensitive, excluding self)', () => {
      const existing = makeCategory({ id: 1, name: 'Blanqueria' });
      const other = makeCategory({ id: 2, name: 'Deco' });
      vi.mocked(repo.findById).mockReturnValue(existing);
      vi.mocked(repo.findAllForBUIncludingInactive).mockReturnValue([existing, other]);

      // Trying to rename cat 1 to "deco" (which is cat 2's name)
      expect(() => service.update(1, 'deco')).toThrow('Ya existe una categoría');
    });

    it('should allow keeping the same name on update', () => {
      const existing = makeCategory({ id: 1, name: 'Blanqueria' });
      vi.mocked(repo.findById).mockReturnValue(existing);
      // findAllForBUIncludingInactive includes itself — should be excluded by id check
      vi.mocked(repo.findAllForBUIncludingInactive).mockReturnValue([existing]);
      vi.mocked(repo.update).mockReturnValue(existing);

      expect(() => service.update(1, 'blanqueria')).not.toThrow();
    });

    it('should throw NotFoundError if category does not exist', () => {
      vi.mocked(repo.findById).mockReturnValue(null);

      expect(() => service.update(99, 'Algo')).toThrow('no encontrada');
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('should soft-delete a category with no associated products', () => {
      const existing = makeCategory({ id: 1 });
      vi.mocked(repo.findById).mockReturnValue(existing);
      // db mock returns { total: 0 } by default (see top of file)

      service.delete(1);

      expect(repo.softDelete).toHaveBeenCalledWith(1);
    });

    it('should not delete a category with associated products', async () => {
      const existing = makeCategory({ id: 1 });
      vi.mocked(repo.findById).mockReturnValue(existing);

      // Override the db mock to return products count > 0
      const { db } = await import('../../server/db/connection');
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue({ total: 3 }),
          }),
        }),
      } as ReturnType<typeof db.select>);

      expect(() => service.delete(1)).toThrow('3 productos usan esta categoría');
      expect(repo.softDelete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when deleting non-existent category', () => {
      vi.mocked(repo.findById).mockReturnValue(null);

      expect(() => service.delete(99)).toThrow('no encontrada');
    });
  });

  // ── listForBU ────────────────────────────────────────────────────────────

  describe('listForBU', () => {
    it('should return categories sorted alphabetically', () => {
      const cats = [
        makeCategory({ id: 3, name: 'Textiles' }),
        makeCategory({ id: 1, name: 'Blanqueria' }),
        makeCategory({ id: 2, name: 'Deco' }),
      ];
      // Repository already returns sorted (sorted at DB level), but service just delegates
      vi.mocked(repo.findAllForBU).mockReturnValue(
        [...cats].sort((a, b) => a.name.localeCompare(b.name)),
      );

      const result = service.listForBU(1);

      expect(result.map((c) => c.name)).toEqual(['Blanqueria', 'Deco', 'Textiles']);
    });

    it('should only return active categories (delegated to repo)', () => {
      const active = makeCategory({ id: 1, name: 'Blanqueria', isActive: true });
      vi.mocked(repo.findAllForBU).mockReturnValue([active]);

      const result = service.listForBU(1);

      expect(result).toHaveLength(1);
      expect(repo.findAllForBU).toHaveBeenCalledWith(1);
    });
  });
});
