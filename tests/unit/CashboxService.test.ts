import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CashboxService } from '../../server/core/services/CashboxService';
import type { CashMovementRepository } from '../../server/core/repositories/CashMovementRepository';
import type { CashAuditRepository } from '../../server/core/repositories/CashAuditRepository';
import type { CashMovement, CashAudit } from '../../shared/types';

function makeMovement(overrides: Partial<CashMovement> = {}): CashMovement {
  return {
    id: 1,
    businessUnitId: 1,
    type: 'sale',
    amount: 1000,
    description: 'Venta #1',
    saleId: null,
    userId: null,
    createdAt: '2026-04-28T10:00:00',
    ...overrides,
  };
}

describe('CashboxService', () => {
  let service: CashboxService;
  let movementRepo: CashMovementRepository;
  let auditRepo: CashAuditRepository;

  beforeEach(() => {
    movementRepo = {
      create: vi.fn(),
      getAll: vi.fn().mockReturnValue([]),
      getByDate: vi.fn().mockReturnValue([]),
      getBySaleId: vi.fn().mockReturnValue(null),
      getBalance: vi.fn().mockReturnValue(0),
    } as unknown as CashMovementRepository;

    auditRepo = {
      create: vi.fn(),
      getAll: vi.fn().mockReturnValue([]),
      getLatest: vi.fn().mockReturnValue(null),
      getByDate: vi.fn().mockReturnValue(null),
    } as unknown as CashAuditRepository;

    service = new CashboxService(movementRepo, auditRepo);
  });

  describe('recordMovement', () => {
    it('should create a valid movement', () => {
      const movement = makeMovement();
      vi.mocked(movementRepo.create).mockReturnValue(movement);

      const result = service.recordMovement(1, { type: 'sale', amount: 1000, description: 'Venta #1' });
      expect(result).toEqual(movement);
      expect(movementRepo.create).toHaveBeenCalledWith(1, expect.any(Object), undefined);
    });

    it('should throw if amount is 0', () => {
      expect(() =>
        service.recordMovement(1, { type: 'deposit', amount: 0, description: 'Test' }),
      ).toThrow();
    });

    it('should throw if description is too short', () => {
      expect(() =>
        service.recordMovement(1, { type: 'deposit', amount: 100, description: 'ab' }),
      ).toThrow();
    });

    it('should throw on invalid type', () => {
      expect(() =>
        service.recordMovement(1, { type: 'invalid' as never, amount: 100, description: 'Test' }),
      ).toThrow();
    });
  });

  describe('getBalance', () => {
    it('should sum sales and deposits as positive', () => {
      vi.mocked(movementRepo.getAll).mockReturnValue([
        makeMovement({ type: 'sale', amount: 1000 }),
        makeMovement({ type: 'deposit', amount: 500 }),
      ]);
      const { theoretical } = service.getBalance(1);
      expect(theoretical).toBe(1500);
    });

    it('should subtract refunds and withdrawals', () => {
      vi.mocked(movementRepo.getAll).mockReturnValue([
        makeMovement({ type: 'sale', amount: 2000 }),
        makeMovement({ type: 'withdrawal', amount: 300 }),
        makeMovement({ type: 'refund', amount: 200 }),
      ]);
      const { theoretical } = service.getBalance(1);
      expect(theoretical).toBe(1500);
    });

    it('should return 0 for empty caja', () => {
      vi.mocked(movementRepo.getAll).mockReturnValue([]);
      const { theoretical } = service.getBalance(1);
      expect(theoretical).toBe(0);
    });
  });

  describe('performAudit', () => {
    it('should create balanced audit when amounts match', () => {
      vi.mocked(movementRepo.getAll).mockReturnValue([
        makeMovement({ type: 'sale', amount: 1000 }),
      ]);
      const audit: CashAudit = {
        id: 1, businessUnitId: 1, auditDate: '2026-04-28',
        theoreticalBalance: 1000, realBalance: 1000, difference: 0,
        notes: null, status: 'balanced', createdAt: '2026-04-28T12:00:00',
      };
      vi.mocked(auditRepo.create).mockReturnValue(audit);

      const result = service.performAudit(1, { realBalance: 1000 });
      expect(result.status).toBe('balanced');
      expect(result.difference).toBe(0);
    });

    it('should create discrepancy audit when amounts differ', () => {
      vi.mocked(movementRepo.getAll).mockReturnValue([
        makeMovement({ type: 'sale', amount: 1000 }),
      ]);
      const audit: CashAudit = {
        id: 1, businessUnitId: 1, auditDate: '2026-04-28',
        theoreticalBalance: 1000, realBalance: 850, difference: -150,
        notes: null, status: 'discrepancy', createdAt: '2026-04-28T12:00:00',
      };
      vi.mocked(auditRepo.create).mockReturnValue(audit);

      const result = service.performAudit(1, { realBalance: 850 });
      expect(result.status).toBe('discrepancy');
    });

    it('should throw if realBalance is negative', () => {
      expect(() => service.performAudit(1, { realBalance: -100 })).toThrow();
    });
  });
});
