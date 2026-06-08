import { db } from '../../db/connection';
import { sales, businessUnits, installationConfig, users } from '../../db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { NotFoundError, BusinessRuleError } from '../../lib/errors';
import type { CashAuditRepository } from '../repositories/CashAuditRepository';
import type { CashMovementRepository } from '../repositories/CashMovementRepository';
import type { ReporteZData } from '../../../shared/types';

export class ReporteZService {
  constructor(
    private readonly auditRepo: CashAuditRepository,
    private readonly movementRepo: CashMovementRepository,
  ) {}

  /**
   * Construye el ReporteZData para una sesión identificada por su audit id.
   * La sesión debe estar cerrada (audit existe).
   */
  getReporteZData(auditId: number, businessUnitId: number): ReporteZData {
    const audit = this.auditRepo.getById(auditId);
    if (!audit) {
      throw new NotFoundError(`Sesión de caja ${auditId} no encontrada`);
    }
    if (audit.businessUnitId !== businessUnitId) {
      throw new NotFoundError(`Sesión de caja ${auditId} no pertenece a esta unidad de negocio`);
    }

    // Encontrar el opening movement de esta sesión (el más reciente anterior al audit)
    const allMovements = this.movementRepo.getAll(businessUnitId);
    const openings = allMovements
      .filter((m) => m.type === 'opening')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const openingMovement = openings.find((o) => o.createdAt <= audit.createdAt) ?? null;

    if (!openingMovement) {
      throw new BusinessRuleError('No se encontró el movimiento de apertura para esta sesión');
    }

    // Movimientos de la sesión
    const sessionMovements = allMovements.filter(
      (m) => m.createdAt >= openingMovement.createdAt && m.createdAt <= audit.createdAt,
    );

    const openingBalance = openingMovement.amount;
    const manualIncome = sessionMovements
      .filter((m) => m.type === 'deposit')
      .reduce((s, m) => s + m.amount, 0);
    const manualExpense = sessionMovements
      .filter((m) => m.type === 'withdrawal')
      .reduce((s, m) => s + m.amount, 0);
    const cashSalesTotal = sessionMovements
      .filter((m) => m.type === 'sale')
      .reduce((s, m) => s + m.amount, 0);

    // Ventas de la sesión
    const sessionSales = db
      .select()
      .from(sales)
      .where(
        and(
          eq(sales.businessUnitId, businessUnitId),
          gte(sales.createdAt, openingMovement.createdAt),
          lte(sales.createdAt, audit.createdAt),
        ),
      )
      .all();

    const completedSales = sessionSales.filter((s) => s.status === 'completed');
    const cancelledCount = sessionSales.filter((s) => s.status === 'cancelled').length;
    const salesTotal = completedSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const salesCount = completedSales.length;
    const averageTicket = salesCount > 0 ? Math.round((salesTotal / salesCount) * 100) / 100 : 0;

    // Desglose por medio de pago
    const paymentTotals = new Map<string, number>();
    for (const sale of completedSales) {
      let methods: Array<{ method: string; amount: number }> = [];
      try {
        methods = JSON.parse(sale.paymentMethods) as typeof methods;
      } catch {
        continue;
      }
      for (const pm of methods) {
        paymentTotals.set(pm.method, (paymentTotals.get(pm.method) ?? 0) + pm.amount);
      }
    }
    const byPaymentMethod = Array.from(paymentTotals.entries())
      .filter(([, amount]) => amount > 0)
      .map(([method, amount]) => ({ method, amount: Math.round(amount * 100) / 100 }));

    // AFIP: emitidas vs pendientes en la sesión
    const afipEmitted = sessionSales.filter((s) => s.invoiceStatus === 'issued').length;
    const afipPending = sessionSales.filter((s) => s.invoiceStatus !== 'issued').length;

    // Datos del negocio y BU
    const buRow = db
      .select()
      .from(businessUnits)
      .where(eq(businessUnits.id, businessUnitId))
      .get();
    const configRow = db.select().from(installationConfig).get();
    const businessName = configRow?.businessName ?? '';
    const businessUnitName = buRow?.name ?? '';

    // Operador (email del usuario que abrió la sesión)
    let operatorEmail: string | null = null;
    if (openingMovement.userId) {
      const userRow = db
        .select()
        .from(users)
        .where(eq(users.id, openingMovement.userId))
        .get();
      operatorEmail = userRow?.email ?? null;
    }

    return {
      sessionId: auditId,
      businessUnitName,
      businessName,
      openedAt: openingMovement.createdAt,
      closedAt: audit.createdAt,
      operatorEmail,
      sales: {
        total: Math.round(salesTotal * 100) / 100,
        count: salesCount,
        cancelledCount,
        averageTicket,
        byPaymentMethod,
      },
      cash: {
        openingBalance,
        manualIncome: Math.round(manualIncome * 100) / 100,
        manualExpense: Math.round(manualExpense * 100) / 100,
        cashSalesTotal: Math.round(cashSalesTotal * 100) / 100,
        theoreticalBalance: audit.theoreticalBalance,
        declaredBalance: audit.realBalance,
        difference: audit.difference,
      },
      afip: {
        emitted: afipEmitted,
        pending: afipPending,
      },
      generatedAt: format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: es }),
    };
  }
}
