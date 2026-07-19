import type { DashboardDTO } from '../../../shared/types';
import type { DashboardRepository } from '../repositories/DashboardRepository';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  mercadopago: 'Mercado Pago',
};

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// `sales.createdAt` se guarda vía SQLite `datetime('now')`, que es SIEMPRE UTC.
// Los límites de "día calendario" (hoy, semana, mes) deben calcularse en hora
// LOCAL del negocio (Argentina) — no en UTC — porque de lo contrario las
// ventas de las últimas horas del día local (después de las 21:00 ART, ya
// "mañana" en UTC) quedan excluidas de "hoy" apenas cruza la medianoche UTC.
// Por eso todo límite local se convierte a su equivalente UTC antes de usarlo
// en una comparación contra `created_at`.

function todayLocal(): string {
  return formatLocalDate(new Date());
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftDateLocal(base: string, days: number): string {
  const [y, m, d] = base.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

function mondayOfWeekLocal(today: string): string {
  const [y, m, d] = today.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay(); // 0 = domingo
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  date.setDate(date.getDate() - daysFromMonday);
  return formatLocalDate(date);
}

function monthStartLocal(today: string): string {
  return today.slice(0, 7) + '-01';
}

/**
 * Convierte una fecha calendario local (YYYY-MM-DD) al string UTC
 * "YYYY-MM-DD HH:MM:SS" que representa la medianoche de ese día local.
 * Es el formato que usa SQLite `datetime('now')`, así que el resultado
 * se puede comparar directamente contra `created_at`.
 */
function localDateToUtcBoundary(localDate: string): string {
  const [y, m, d] = localDate.split('-').map(Number);
  const localMidnight = new Date(y, m - 1, d, 0, 0, 0, 0);
  return localMidnight.toISOString().replace('T', ' ').slice(0, 19);
}

export class DashboardService {
  constructor(private readonly repo: DashboardRepository) {}

  /**
   * Builds the full DashboardDTO for a given business unit.
   */
  getFullDashboard(businessUnitId: number): DashboardDTO {
    const today = todayLocal();
    const yesterday = shiftDateLocal(today, -1);
    const weekStart = mondayOfWeekLocal(today);
    const sixDaysAgo = shiftDateLocal(today, -6);
    const monthStart = monthStartLocal(today);

    const todayBoundary = localDateToUtcBoundary(today);
    const yesterdayBoundary = localDateToUtcBoundary(yesterday);
    const weekStartBoundary = localDateToUtcBoundary(weekStart);
    const sixDaysAgoBoundary = localDateToUtcBoundary(sixDaysAgo);
    const monthStartBoundary = localDateToUtcBoundary(monthStart);

    const todaySales = this.repo.getSalesToday(businessUnitId, todayBoundary);
    const yesterdayTotal = this.repo.getSalesYesterday(
      businessUnitId,
      yesterdayBoundary,
      todayBoundary,
    );
    const weekSales = this.repo.getSalesWeek(businessUnitId, weekStartBoundary);
    const salesMonth = this.repo.getSalesMonth(businessUnitId, monthStartBoundary);

    const salesTodayDelta =
      yesterdayTotal === 0
        ? null
        : Math.round(((todaySales.total - yesterdayTotal) / yesterdayTotal) * 1000) / 10;

    const avgTicketToday =
      todaySales.count === 0 ? 0 : Math.round((todaySales.total / todaySales.count) * 100) / 100;

    return {
      kpis: {
        salesToday: Math.round(todaySales.total * 100) / 100,
        salesTodayDelta,
        transactionsToday: todaySales.count,
        avgTicketToday,
        salesWeek: Math.round(weekSales.total * 100) / 100,
        transactionsWeek: weekSales.count,
        salesMonth: Math.round(salesMonth * 100) / 100,
      },
      last7Days: this.buildLast7Days(businessUnitId, sixDaysAgoBoundary, today),
      paymentMethods: this.buildPaymentMethods(businessUnitId, todayBoundary),
      cajaActual: this.buildCajaActual(businessUnitId),
      lowStock: this.repo.getLowStockProducts(businessUnitId, 15),
      recentSales: this.buildRecentSales(businessUnitId),
      topProducts: this.buildTopProducts(businessUnitId, monthStartBoundary),
    };
  }

  private buildLast7Days(
    businessUnitId: number,
    from: string,
    today: string,
  ): DashboardDTO['last7Days'] {
    const byDate = new Map<string, number>();
    for (const row of this.repo.getSalesByDate(businessUnitId, from)) {
      byDate.set(row.date, row.total);
    }

    const result: DashboardDTO['last7Days'] = [];
    for (let i = 6; i >= 0; i--) {
      const dateStr = shiftDateLocal(today, -i);
      const [y, m, d] = dateStr.split('-').map(Number);
      const dow = new Date(y, m - 1, d).getDay();
      const label = i === 0 ? 'Hoy' : DAYS_ES[dow];
      result.push({
        date: dateStr,
        label,
        total: Math.round((byDate.get(dateStr) ?? 0) * 100) / 100,
      });
    }
    return result;
  }

  private buildPaymentMethods(
    businessUnitId: number,
    today: string,
  ): DashboardDTO['paymentMethods'] {
    const rows = this.repo.getTodaySalesPaymentMethods(businessUnitId, today);

    const totals = new Map<string, number>();
    for (const row of rows) {
      let parsed: Array<{ method: string; amount: number }>;
      try {
        parsed = JSON.parse(row.paymentMethods) as Array<{ method: string; amount: number }>;
      } catch {
        continue;
      }
      for (const entry of parsed) {
        totals.set(entry.method, (totals.get(entry.method) ?? 0) + entry.amount);
      }
    }

    const grandTotal = Array.from(totals.values()).reduce((s, v) => s + v, 0);

    return Array.from(totals.entries())
      .filter(([, total]) => total > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([method, total]) => ({
        method,
        label: PAYMENT_LABELS[method] ?? method,
        total: Math.round(total * 100) / 100,
        percentage:
          grandTotal === 0 ? 0 : Math.round((total / grandTotal) * 1000) / 10,
      }));
  }

  private buildRecentSales(businessUnitId: number): DashboardDTO['recentSales'] {
    const rows = this.repo.getRecentSales(businessUnitId, 5);
    return rows.map((r) => {
      let paymentMethod = 'cash';
      try {
        const parsed = JSON.parse(r.paymentMethods) as Array<{ method: string; amount: number }>;
        if (parsed[0]?.method) paymentMethod = parsed[0].method;
      } catch {
        // default 'cash'
      }
      return {
        id: r.id,
        createdAt: r.createdAt,
        total: Math.round(r.totalAmount * 100) / 100,
        paymentMethod,
        customerName: r.customerName ?? null,
        itemsCount: r.itemsCount,
      };
    });
  }

  private buildTopProducts(
    businessUnitId: number,
    monthStart: string,
  ): DashboardDTO['topProducts'] {
    return this.repo.getTopProducts(businessUnitId, monthStart, 5).map((r) => ({
      productId: r.productId,
      name: r.name,
      sku: r.sku ?? '',
      totalUnits: r.totalUnits,
      totalRevenue: Math.round(r.totalRevenue * 100) / 100,
    }));
  }

  private buildCajaActual(businessUnitId: number): DashboardDTO['cajaActual'] {
    const session = this.repo.getCajaSession(businessUnitId);
    if (!session) return null;

    const salesToday = this.repo.getSalesSinceTimestamp(businessUnitId, session.openedAt);
    const estimatedCash =
      Math.round(
        (session.openingAmount + session.cashSalesToday + session.manualIncome - session.manualExpense) * 100,
      ) / 100;

    return {
      isOpen: true,
      openedAt: session.openedAt,
      openingAmount: session.openingAmount,
      salesToday: Math.round(salesToday * 100) / 100,
      cashSalesToday: session.cashSalesToday,
      manualIncome: session.manualIncome,
      manualExpense: session.manualExpense,
      estimatedCash,
    };
  }
}
