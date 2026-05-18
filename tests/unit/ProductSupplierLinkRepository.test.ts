import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock db before importing the repository
vi.mock('../../server/db/connection', () => {
  const mockDb = {
    select:    vi.fn(),
    from:      vi.fn(),
    where:     vi.fn(),
    innerJoin: vi.fn(),
    insert:    vi.fn(),
    update:    vi.fn(),
    delete:    vi.fn(),
    set:       vi.fn(),
    values:    vi.fn(),
    returning: vi.fn(),
    all:       vi.fn(),
    get:       vi.fn(),
    run:       vi.fn(),
  };
  mockDb.select.mockReturnValue(mockDb);
  mockDb.from.mockReturnValue(mockDb);
  mockDb.where.mockReturnValue(mockDb);
  mockDb.innerJoin.mockReturnValue(mockDb);
  mockDb.insert.mockReturnValue(mockDb);
  mockDb.update.mockReturnValue(mockDb);
  mockDb.delete.mockReturnValue(mockDb);
  mockDb.set.mockReturnValue(mockDb);
  mockDb.values.mockReturnValue(mockDb);
  mockDb.returning.mockReturnValue(mockDb);
  mockDb.all.mockReturnValue([]);
  mockDb.get.mockReturnValue(null);
  return { db: mockDb, sqlite: {} };
});

import { db } from '../../server/db/connection';
import {
  ProductSupplierLinkRepository,
} from '../../server/modules/proveedores/repositories/ProductSupplierLinkRepository';

type MockDb = {
  select:    ReturnType<typeof vi.fn>;
  from:      ReturnType<typeof vi.fn>;
  where:     ReturnType<typeof vi.fn>;
  innerJoin: ReturnType<typeof vi.fn>;
  update:    ReturnType<typeof vi.fn>;
  set:       ReturnType<typeof vi.fn>;
  get:       ReturnType<typeof vi.fn>;
  run:       ReturnType<typeof vi.fn>;
};
const mockDb = db as unknown as MockDb;

// ── Jaccard helpers (static) ──────────────────────────────────────────────

describe('ProductSupplierLinkRepository.jaccardScore', () => {
  const { jaccardScore, tokenize } = ProductSupplierLinkRepository;

  it('should calculate Jaccard similarity correctly for identical token sets', () => {
    const a = tokenize('Toalla de baño azul');
    const b = tokenize('Toalla azul de baño');
    expect(jaccardScore(a, b)).toBe(1);
  });

  it('should score 0.5 for half-overlapping sets', () => {
    const a = tokenize('Sabana blanca doble');
    const b = tokenize('Sabana blanca simple');
    // intersection = {sabana, blanca} = 2; union = 4 → 0.5
    expect(jaccardScore(a, b)).toBe(0.5);
  });

  it('should return 0 for completely different sets', () => {
    const a = tokenize('Toalla de baño');
    const b = tokenize('Jabon liquido');
    expect(jaccardScore(a, b)).toBe(0);
  });

  it('should strip accents so accented and unaccented tokens match', () => {
    const a = tokenize('Sábana matrimonial');
    const b = tokenize('Sabana matrimonial');
    expect(jaccardScore(a, b)).toBe(1);
  });
});

// ── suggestion threshold ──────────────────────────────────────────────────

describe('ProductSupplierLinkRepository — suggestion score >= 0.4 rule', () => {
  it('should return only suggestions with score >= 0.4', () => {
    const { jaccardScore, tokenize } = ProductSupplierLinkRepository;

    // score < 0.4 → NOT a suggestion
    expect(jaccardScore(tokenize('Toalla'), tokenize('Jabon'))).toBeLessThan(0.4);

    // score = 1.0 → IS a suggestion
    expect(
      jaccardScore(tokenize('Toalla de baño'), tokenize('Toalla de baño')),
    ).toBeGreaterThanOrEqual(0.4);

    // partial (1/3 ≈ 0.33) → NOT a suggestion
    const scorePartial = jaccardScore(tokenize('Toalla azul fina'), tokenize('Toalla'));
    expect(scorePartial).toBeLessThan(0.4);

    // partial (2/3 ≈ 0.67) → IS a suggestion
    const scoreGood = jaccardScore(tokenize('Toalla azul'), tokenize('Toalla azul fina'));
    expect(scoreGood).toBeGreaterThanOrEqual(0.4);
  });
});

// ── setPreferred ──────────────────────────────────────────────────────────

describe('ProductSupplierLinkRepository.setPreferred', () => {
  let repo: ProductSupplierLinkRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ProductSupplierLinkRepository();
    vi.mocked(mockDb.get).mockReturnValue(null);
    vi.mocked(mockDb.select).mockReturnValue(mockDb);
    vi.mocked(mockDb.from).mockReturnValue(mockDb);
    vi.mocked(mockDb.where).mockReturnValue(mockDb);
    vi.mocked(mockDb.update).mockReturnValue(mockDb);
    vi.mocked(mockDb.set).mockReturnValue(mockDb);
    vi.mocked(mockDb.run).mockReturnValue(undefined);
  });

  it('should call update twice: unset others and set this link as preferred', () => {
    vi.mocked(mockDb.get).mockReturnValue({
      id: 3, productId: 10, supplierProductId: 2, businessUnitId: 1,
      isPreferred: 0, createdAt: '2026-01-01',
    });

    repo.setPreferred(3);

    expect(vi.mocked(mockDb.update)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(mockDb.run)).toHaveBeenCalledTimes(2);
  });

  it('should do nothing when link is not found', () => {
    vi.mocked(mockDb.get).mockReturnValue(null);

    repo.setPreferred(999);

    expect(vi.mocked(mockDb.update)).not.toHaveBeenCalled();
  });
});
