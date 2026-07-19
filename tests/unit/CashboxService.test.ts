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
    code: null,
    paymentMethod: 'cash',
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
      getLatestOfType: vi.fn().mockReturnValue(null),
      countSameDayOpenings: vi.fn().mockReturnValue(0),
      getAllOpenings: vi.fn().mockReturnValue([]),
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
        otherMethodsTotal: 0, notes: null, status: 'balanced', createdAt: '2026-04-28T12:00:00',
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
        otherMethodsTotal: 0, notes: null, status: 'discrepancy', createdAt: '2026-04-28T12:00:00',
      };
      vi.mocked(auditRepo.create).mockReturnValue(audit);

      const result = service.performAudit(1, { realBalance: 850 });
      expect(result.status).toBe('discrepancy');
    });

    it('should throw if realBalance is negative', () => {
      expect(() => service.performAudit(1, { realBalance: -100 })).toThrow();
    });
  });

  describe('sessionBalance cash vs digital separation', () => {
    it('should calculate cash balance using only cash movements', () => {
      const opening = makeMovement({ id: 1, type: 'opening', amount: 500, paymentMethod: 'cash', createdAt: '2026-06-16T09:00:00' });
      const cashSale = makeMovement({ id: 2, type: 'sale', amount: 300, paymentMethod: 'cash', createdAt: '2026-06-16T10:00:00' });
      const mpSale = makeMovement({ id: 3, type: 'sale', amount: 200, paymentMethod: 'mercadopago', createdAt: '2026-06-16T10:30:00' });

      vi.mocked(movementRepo.getLatestOfType).mockReturnValue(opening);
      vi.mocked(movementRepo.getAll).mockReturnValue([opening, cashSale, mpSale]);

      const { sessionBalance } = service.getSessionData(1);

      expect(sessionBalance.cashBalance).toBe(800);         // 500 + 300
      expect(sessionBalance.byMethod.mercadopago).toBe(200);
    });

    it('should calculate transfer balance separately from cash', () => {
      const opening = makeMovement({ id: 1, type: 'opening', amount: 100, paymentMethod: 'cash', createdAt: '2026-06-16T09:00:00' });
      const transferSale = makeMovement({ id: 2, type: 'sale', amount: 1000, paymentMethod: 'transfer', createdAt: '2026-06-16T10:00:00' });

      vi.mocked(movementRepo.getLatestOfType).mockReturnValue(opening);
      vi.mocked(movementRepo.getAll).mockReturnValue([opening, transferSale]);

      const { sessionBalance } = service.getSessionData(1);

      expect(sessionBalance.cashBalance).toBe(100);           // only opening
      expect(sessionBalance.byMethod.transfer).toBe(1000);    // separate
      expect(sessionBalance.byMethod.cash).toBe(100);
    });

    it('should return negative cash balance when cash outflows exceed cash inflows (valid scenario, not an error)', () => {
      const opening = makeMovement({ id: 1, type: 'opening', amount: 100, paymentMethod: 'cash', createdAt: '2026-06-16T09:00:00' });
      const cashWithdrawal = makeMovement({ id: 2, type: 'withdrawal', amount: 300, paymentMethod: 'cash', createdAt: '2026-06-16T10:00:00' });

      vi.mocked(movementRepo.getLatestOfType).mockReturnValue(opening);
      vi.mocked(movementRepo.getAll).mockReturnValue([opening, cashWithdrawal]);

      const { sessionBalance } = service.getSessionData(1);

      expect(sessionBalance.cashBalance).toBe(-200);   // 100 - 300 = -200, valid
      expect(sessionBalance.byMethod.cash).toBe(-200);
    });

    it('should not include digital payments in cash balance', () => {
      const opening = makeMovement({ id: 1, type: 'opening', amount: 200, paymentMethod: 'cash', createdAt: '2026-06-16T09:00:00' });
      const mpSale = makeMovement({ id: 2, type: 'sale', amount: 500, paymentMethod: 'mercadopago', createdAt: '2026-06-16T10:00:00' });
      const cardSale = makeMovement({ id: 3, type: 'sale', amount: 300, paymentMethod: 'card', createdAt: '2026-06-16T10:30:00' });

      vi.mocked(movementRepo.getLatestOfType).mockReturnValue(opening);
      vi.mocked(movementRepo.getAll).mockReturnValue([opening, mpSale, cardSale]);

      const { sessionBalance } = service.getSessionData(1);

      expect(sessionBalance.cashBalance).toBe(200);          // only opening, digital not included
      expect(sessionBalance.byMethod.mercadopago).toBe(500);
      expect(sessionBalance.byMethod.card).toBe(300);
      expect(sessionBalance.total).toBe(1000);               // 200 + 500 + 300
    });
  });

  describe('payment method differentiation', () => {
    it('should categorize manual movement with specified payment_method', () => {
      const movement = makeMovement({ type: 'deposit', amount: 500, paymentMethod: 'transfer' });
      vi.mocked(movementRepo.create).mockReturnValue(movement);

      service.recordMovement(1, {
        type: 'deposit',
        amount: 500,
        description: 'Depósito por transferencia',
        paymentMethod: 'transfer',
      });

      expect(movementRepo.create).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ paymentMethod: 'transfer' }),
        undefined,
      );
    });

    it('should calculate cash-only theoretical balance (excluding transfers from cash balance)', () => {
      const opening = makeMovement({ id: 1, type: 'opening', amount: 100, paymentMethod: 'cash', createdAt: '2026-06-16T09:00:00' });
      const transferSale = makeMovement({ id: 2, type: 'sale', amount: 500, paymentMethod: 'transfer', createdAt: '2026-06-16T10:00:00' });
      const cashSale = makeMovement({ id: 3, type: 'sale', amount: 200, paymentMethod: 'cash', createdAt: '2026-06-16T11:00:00' });

      vi.mocked(movementRepo.getLatestOfType).mockReturnValue(opening);
      vi.mocked(movementRepo.getAll).mockReturnValue([opening, transferSale, cashSale]);

      const { sessionBalance } = service.getSessionData(1);

      expect(sessionBalance.cashBalance).toBe(300);         // 100 apertura + 200 venta cash
      expect(sessionBalance.total).toBe(800);               // 100 + 500 + 200
      expect(sessionBalance.byMethod.transfer).toBe(500);
    });

    it('should return sessionBalance.byMethod in current cash response', () => {
      const opening = makeMovement({ id: 1, type: 'opening', amount: 200, paymentMethod: 'cash', createdAt: '2026-06-16T09:00:00' });
      const mpSale = makeMovement({ id: 2, type: 'sale', amount: 350, paymentMethod: 'mercadopago', createdAt: '2026-06-16T10:00:00' });

      vi.mocked(movementRepo.getLatestOfType).mockReturnValue(opening);
      vi.mocked(movementRepo.getAll).mockReturnValue([opening, mpSale]);

      const { sessionBalance } = service.getSessionData(1);

      expect(sessionBalance.byMethod).toMatchObject({
        cash: 200,
        mercadopago: 350,
        transfer: 0,
        card: 0,
        other: 0,
      });
    });

    it('arqueo closing: should only compare cash teórico vs cash contado, not total balance', () => {
      const opening = makeMovement({ id: 1, type: 'opening', amount: 500, paymentMethod: 'cash', createdAt: '2026-06-16T09:00:00' });
      const transferSale = makeMovement({ id: 2, type: 'sale', amount: 1000, paymentMethod: 'transfer', createdAt: '2026-06-16T10:00:00' });

      vi.mocked(movementRepo.getLatestOfType).mockReturnValue(opening);
      vi.mocked(movementRepo.getAll).mockReturnValue([opening, transferSale]);

      const auditReturn: CashAudit = {
        id: 1, businessUnitId: 1, auditDate: '2026-06-16',
        theoreticalBalance: 500, realBalance: 500, difference: 0,
        otherMethodsTotal: 1000, notes: null, status: 'balanced',
        createdAt: '2026-06-16T12:00:00',
      };
      vi.mocked(auditRepo.create).mockReturnValue(auditReturn);

      service.performAudit(1, { realBalance: 500 });

      expect(auditRepo.create).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          theoreticalBalance: 500,  // cash only, NOT 1500 (total)
          otherMethodsTotal: 1000,
          difference: 0,
          status: 'balanced',
        }),
      );
    });
  });

  describe('openSession — session code', () => {
    it('should generate code CAJA-YYYYMMDD on cash register open', () => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const expectedCode = 'CAJA-' + today.replace(/-/g, '');
      const expectedMovement = makeMovement({ type: 'opening', code: expectedCode });

      vi.mocked(movementRepo.countSameDayOpenings).mockReturnValue(0);
      vi.mocked(movementRepo.create).mockReturnValue(expectedMovement);

      const result = service.openSession(1, { initialAmount: 0 });

      expect(movementRepo.create).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ code: expectedCode, type: 'opening' }),
        undefined,
      );
      expect(result.code).toBe(expectedCode);
    });

    it('should generate CAJA-YYYYMMDD-2 when same day already has a session for that business unit', () => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const expectedCode = 'CAJA-' + today.replace(/-/g, '') + '-2';
      const expectedMovement = makeMovement({ type: 'opening', code: expectedCode });

      vi.mocked(movementRepo.countSameDayOpenings).mockReturnValue(1);
      vi.mocked(movementRepo.create).mockReturnValue(expectedMovement);

      const result = service.openSession(1, { initialAmount: 500 });

      expect(movementRepo.create).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ code: expectedCode }),
        undefined,
      );
      expect(result.code).toBe(expectedCode);
    });

    it('should return code in current cash register response', () => {
      const code = 'CAJA-20260612';
      const openingMovement = makeMovement({ id: 7, type: 'opening', code, createdAt: '2026-06-12 09:00:00' });

      vi.mocked(movementRepo.getLatestOfType).mockReturnValue(openingMovement);
      vi.mocked(movementRepo.getAll).mockReturnValue([openingMovement]);

      const sessionData = service.getSessionData(1);

      expect(sessionData.openingMovement).not.toBeNull();
      expect(sessionData.openingMovement?.code).toBe(code);
    });
  });
});
