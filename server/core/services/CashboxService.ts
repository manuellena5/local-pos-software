import { createCashMovementSchema, createCashAuditSchema, openSessionSchema } from '../schemas/cashbox.schema';
import { ValidationError } from '../../lib/errors';
import type { CashMovementRepository } from '../repositories/CashMovementRepository';
import type { CashAuditRepository } from '../repositories/CashAuditRepository';
import type { CashMovement, CashAudit, CashSessionStatus } from '../../../shared/types';
import type { CreateCashMovementRequest, CreateCashAuditRequest } from '../types';
import type { OpenSessionRequest } from '../schemas/cashbox.schema';

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
    const { balance: theoretical } = this.getSessionData(businessUnitId);
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

  /**
   * Abre una nueva sesión de caja registrando un movimiento de tipo 'opening'.
   */
  openSession(businessUnitId: number, data: OpenSessionRequest, userId?: number): CashMovement {
    const parsed = openSessionSchema.safeParse(data);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0]?.message ?? 'Datos inválidos');
    }
    return this.movementRepo.create(
      businessUnitId,
      { type: 'opening', amount: parsed.data.initialAmount, description: 'Apertura de caja' },
      userId,
    );
  }

  /**
   * Devuelve el balance y los movimientos de la sesión activa (desde el último opening).
   */
  getSessionData(businessUnitId: number): {
    balance: number;
    movements: CashMovement[];
    openingMovement: CashMovement | null;
  } {
    const lastOpening = this.movementRepo.getLatestOfType(businessUnitId, 'opening');
    if (!lastOpening) {
      return { balance: 0, movements: [], openingMovement: null };
    }

    const movements = this.movementRepo.getAll(businessUnitId, { fromDate: lastOpening.createdAt });
    const balance = movements.reduce((total, m) => {
      if (m.type === 'refund' || m.type === 'withdrawal') return total - m.amount;
      return total + m.amount;
    }, 0);

    return {
      balance: Math.round(balance * 100) / 100,
      movements,
      openingMovement: lastOpening,
    };
  }

  /**
   * Devuelve el historial de arqueos enriquecido con hora de apertura y cierre de cada sesión.
   * La hora de apertura se correlaciona buscando el último opening anterior a cada arqueo.
   * La hora de cierre es el createdAt del arqueo (momento en que se registró).
   */
  getAuditHistoryWithTimes(
    businessUnitId: number,
  ): Array<CashAudit & { openingAt: string | null; closingAt: string }> {
    const audits = this.auditRepo.getAll(businessUnitId);
    const allMovements = this.movementRepo.getAll(businessUnitId);
    const openings = allMovements
      .filter((m) => m.type === 'opening')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return audits.map((audit) => {
      const openingForSession = openings.find((o) => o.createdAt <= audit.createdAt) ?? null;
      return {
        ...audit,
        openingAt: openingForSession?.createdAt ?? null,
        closingAt: audit.createdAt,
      };
    });
  }

  /**
   * Determina el estado actual de la sesión de caja para una BU.
   * - 'never_opened': nunca se abrió una sesión
   * - 'open': hay un 'opening' más reciente que el último arqueo (o no hay arqueo)
   * - 'closed': el último arqueo es más reciente que el último 'opening'
   */
  getSessionStatus(businessUnitId: number): CashSessionStatus {
    const lastOpening = this.movementRepo.getLatestOfType(businessUnitId, 'opening');
    if (!lastOpening) return 'never_opened';

    const lastAudit = this.auditRepo.getLatest(businessUnitId);
    if (!lastAudit) return 'open';

    return lastOpening.createdAt > lastAudit.createdAt ? 'open' : 'closed';
  }
}
