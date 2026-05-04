import { createCashMovementSchema, createCashAuditSchema } from '../schemas/cashbox.schema';
import { ValidationError } from '../../lib/errors';
import type { CashMovementRepository } from '../repositories/CashMovementRepository';
import type { CashAuditRepository } from '../repositories/CashAuditRepository';
import type { CashMovement, CashAudit } from '../../../shared/types';
import type { CreateCashMovementRequest, CreateCashAuditRequest } from '../types';

const BALANCE_TOLERANCE = 0.01; // diferencia máxima para considerar "balanced"

export class CashboxService {
  constructor(
    private readonly movementRepo: CashMovementRepository,
    private readonly auditRepo: CashAuditRepository,
  ) {}

  recordMovement(
    businessUnitId: number,
    data: CreateCashMovementRequest,
    userId?: number,
  ): CashMovement {
    const parsed = createCashMovementSchema.safeParse(data);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0]?.message ?? 'Datos inválidos');
    }
    return this.movementRepo.create(businessUnitId, parsed.data, userId);
  }

  getBalance(
    businessUnitId: number,
    upToDate?: string,
  ): { theoretical: number; movements: CashMovement[] } {
    const movements = this.movementRepo.getAll(
      businessUnitId,
      upToDate ? { toDate: upToDate } : undefined,
    );
    const theoretical = movements.reduce((total, m) => {
      if (m.type === 'refund' || m.type === 'withdrawal') return total - m.amount;
      return total + m.amount;
    }, 0);
    return { theoretical: Math.round(theoretical * 100) / 100, movements };
  }

  getMovements(
    businessUnitId: number,
    filters?: { fromDate?: string; toDate?: string },
  ): CashMovement[] {
    return this.movementRepo.getAll(businessUnitId, filters);
  }

  performAudit(
    businessUnitId: number,
    data: CreateCashAuditRequest,
    _userId?: number,
  ): CashAudit {
    const parsed = createCashAuditSchema.safeParse(data);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0]?.message ?? 'Datos inválidos');
    }

    const today = new Date().toISOString().slice(0, 10);
    const { theoretical } = this.getBalance(businessUnitId, today);
    const difference = Math.round((parsed.data.realBalance - theoretical) * 100) / 100;
    const status: CashAudit['status'] =
      Math.abs(difference) <= BALANCE_TOLERANCE ? 'balanced' : 'discrepancy';

    return this.auditRepo.create(businessUnitId, {
      auditDate: today,
      theoreticalBalance: theoretical,
      realBalance: parsed.data.realBalance,
      difference,
      notes: parsed.data.notes,
      status,
    });
  }

  getAuditHistory(businessUnitId: number): CashAudit[] {
    return this.auditRepo.getAll(businessUnitId);
  }

  getLatestAudit(businessUnitId: number): CashAudit | null {
    return this.auditRepo.getLatest(businessUnitId);
  }
}
