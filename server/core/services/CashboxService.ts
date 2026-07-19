import { createCashMovementSchema, createCashAuditSchema, openSessionSchema } from '../schemas/cashbox.schema';
import { ValidationError } from '../../lib/errors';
import type { CashMovementRepository } from '../repositories/CashMovementRepository';
import type { CashAuditRepository } from '../repositories/CashAuditRepository';
import type {
  CashMovement,
  CashAudit,
  CashSessionStatus,
  CashSessionSummary,
  CashPaymentMethodType,
  SessionBalance,
} from '../../../shared/types';
import type { CreateCashMovementRequest, CreateCashAuditRequest } from '../types';
import type { OpenSessionRequest } from '../schemas/cashbox.schema';

const BALANCE_TOLERANCE = 0.01;

const EMPTY_BY_METHOD: Record<CashPaymentMethodType, number> = {
  cash: 0,
  transfer: 0,
  mercadopago: 0,
  card: 0,
  other: 0,
};

function generateSessionCode(date: string, count: number): string {
  const day = date.replace(/-/g, '');
  return count === 0 ? `CAJA-${day}` : `CAJA-${day}-${count + 1}`;
}

// El código de sesión y la fecha de auditoría son fechas de calendario que
// el operador reconoce por su día LOCAL. Calcularlas en UTC hace que abrir
// o cerrar caja después de las ~21:00 ART les asigne la fecha del día
// siguiente, ya que ese es el momento en que UTC cruza la medianoche.
function getTodayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calcula el saldo desglosado por medio de pago para una lista de movimientos.
 * Las aperturas siempre suman a 'cash' independientemente del campo paymentMethod.
 * Los movimientos sin payment_method (legacy) se tratan como cash.
 */
function calculateSessionBalance(movements: CashMovement[]): SessionBalance {
  const byMethod: Record<CashPaymentMethodType, number> = { ...EMPTY_BY_METHOD };
  let totalSales = 0;
  let totalVoids = 0;
  let totalManualOut = 0;
  let totalManualIn = 0;

  for (const m of movements) {
    const method: CashPaymentMethodType = m.type === 'opening' ? 'cash' : (m.paymentMethod ?? 'cash');
    const isNegative = m.type === 'refund' || m.type === 'withdrawal';
    const sign = isNegative ? -1 : 1;
    byMethod[method] = Math.round((byMethod[method] + sign * m.amount) * 100) / 100;

    if (m.type === 'sale')       totalSales     = Math.round((totalSales + m.amount) * 100) / 100;
    if (m.type === 'refund')     totalVoids     = Math.round((totalVoids + m.amount) * 100) / 100;
    if (m.type === 'withdrawal') totalManualOut = Math.round((totalManualOut + m.amount) * 100) / 100;
    if (m.type === 'deposit' || m.type === 'other')
      totalManualIn = Math.round((totalManualIn + m.amount) * 100) / 100;
  }

  const total =
    Math.round(Object.values(byMethod).reduce((a, b) => a + b, 0) * 100) / 100;

  return { total, cashBalance: byMethod.cash, byMethod, totalSales, totalVoids, totalManualOut, totalManualIn };
}

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

    const today = getTodayLocal();
    const { sessionBalance } = this.getSessionData(businessUnitId);
    const cashTheoretical = sessionBalance.cashBalance;
    const otherMethodsTotal =
      Math.round((sessionBalance.total - cashTheoretical) * 100) / 100;
    const difference = Math.round((parsed.data.realBalance - cashTheoretical) * 100) / 100;
    const status: CashAudit['status'] =
      Math.abs(difference) <= BALANCE_TOLERANCE ? 'balanced' : 'discrepancy';

    return this.auditRepo.create(businessUnitId, {
      auditDate: today,
      theoreticalBalance: cashTheoretical,
      realBalance: parsed.data.realBalance,
      difference,
      otherMethodsTotal,
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
   * Genera automáticamente el código de sesión: CAJA-YYYYMMDD[-N].
   */
  openSession(businessUnitId: number, data: OpenSessionRequest, userId?: number): CashMovement {
    const parsed = openSessionSchema.safeParse(data);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0]?.message ?? 'Datos inválidos');
    }

    const today = getTodayLocal();
    const existingCount = this.movementRepo.countSameDayOpenings(businessUnitId, today);
    const code = generateSessionCode(today, existingCount);

    return this.movementRepo.create(
      businessUnitId,
      { type: 'opening', amount: parsed.data.initialAmount, description: 'Apertura de caja', code },
      userId,
    );
  }

  /**
   * Devuelve el balance y los movimientos de la sesión activa (desde el último opening).
   * Incluye sessionBalance con desglose por medio de pago.
   */
  getSessionData(businessUnitId: number): {
    balance: number;
    sessionBalance: SessionBalance;
    movements: CashMovement[];
    openingMovement: CashMovement | null;
  } {
    const emptyBalance: SessionBalance = {
      total: 0,
      cashBalance: 0,
      byMethod: { ...EMPTY_BY_METHOD },
      totalSales: 0,
      totalVoids: 0,
      totalManualOut: 0,
      totalManualIn: 0,
    };

    const lastOpening = this.movementRepo.getLatestOfType(businessUnitId, 'opening');
    if (!lastOpening) {
      return { balance: 0, sessionBalance: emptyBalance, movements: [], openingMovement: null };
    }

    const movements = this.movementRepo.getAll(businessUnitId, { fromDate: lastOpening.createdAt });
    const sessionBalance = calculateSessionBalance(movements);

    return {
      balance: sessionBalance.total,
      sessionBalance,
      movements,
      openingMovement: lastOpening,
    };
  }

  /**
   * Devuelve el historial de arqueos enriquecido con hora de apertura, cierre y código de sesión.
   */
  getAuditHistoryWithTimes(
    businessUnitId: number,
  ): Array<CashAudit & { openingAt: string | null; closingAt: string; code: string | null }> {
    const audits = this.auditRepo.getAll(businessUnitId);
    const openings = this.movementRepo.getAllOpenings(businessUnitId);

    return audits.map((audit) => {
      const openingForSession = openings.find((o) => o.createdAt <= audit.createdAt) ?? null;
      return {
        ...audit,
        openingAt: openingForSession?.createdAt ?? null,
        closingAt: audit.createdAt,
        code: openingForSession?.code ?? null,
      };
    });
  }

  /**
   * Devuelve el listado de sesiones (apertura + cierre) para una BU.
   * Cada sesión es un opening movement; closedAt es el createdAt del audit posterior (o null si abierta).
   */
  getSessions(businessUnitId: number): CashSessionSummary[] {
    const openings = this.movementRepo.getAllOpenings(businessUnitId);
    const audits = this.auditRepo.getAll(businessUnitId);

    return openings.map((opening) => {
      const closingAudit = audits.find((a) => a.createdAt > opening.createdAt) ?? null;
      return {
        id: opening.id,
        code: opening.code ?? opening.id.toString(),
        openedAt: opening.createdAt,
        closedAt: closingAudit?.createdAt ?? null,
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
