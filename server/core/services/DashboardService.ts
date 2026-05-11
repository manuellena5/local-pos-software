import { db } from '../../db/connection';
import { sales, saleItems, products, stockItems, cashMovements, cashAudits } from '../../db/schema';
import { tallerOrders } from '../../db/schema';
import { eq, and, gte, lte, desc, sql, notInArray } from 'drizzle-orm';

export interface SalesTodaySummary {
  count: number;
  total: number;
}

export interface CashboxSummary {
  balance: number;
  lastAuditDate: string | null;
  lastAuditStatus: string | null;
}

export interface CriticalStockItem {
  productId: number;
  name: string;
  current: number;
  threshold: number;
  status: 'low' | 'out';
}

export interface UpcomingOrder {
  id: number;
  customerName: string;
  description: string;
  estimatedDelivery: string;
  daysLeft: number;
  status: string;
}

export interface TopProductWeek {
  productId: number;
  name: string;
  quantity: number;
  revenue: number;
}

export interface DashboardData {
  salesToday: SalesTodaySummary;
  cashbox: CashboxSummary;
  criticalStock: CriticalStockItem[];
  upcomingOrders?: UpcomingOrder[];
  topProductsWeek?: TopProductWeek[];
}

export class DashboardService {
  getData(businessUnitId: number, moduleId: string): DashboardData {
    const today = new Date().toISOString().slice(0, 10);

    return {
      salesToday:      this.getSalesToday(businessUnitId, today),
      cashbox:         this.getCashboxSummary(businessUnitId),
      criticalStock:   this.getCriticalStock(businessUnitId),
      upcomingOrders:  moduleId === 'taller-medida' ? this.getUpcomingOrders(businessUnitId, today) : undefined,
      topProductsWeek: moduleId !== 'taller-medida' ? this.getTopProductsWeek(businessUnitId, today) : undefined,
    };
  }

  private getSalesToday(businessUnitId: number, today: string): SalesTodaySummary {
    const rows = db
      .select({ total: sql<number>`SUM(${sales.totalAmount})`, count: sql<number>`COUNT(*)` })
      .from(sales)
      .where(and(
        eq(sales.businessUnitId, businessUnitId),
        eq(sales.status, 'completed'),
        gte(sales.createdAt, today),
      ))
      .get();

    return {
      count: rows?.count ?? 0,
      total: Math.round((rows?.total ?? 0) * 100) / 100,
    };
  }

  private getCashboxSummary(businessUnitId: number): CashboxSummary {
    const inTypes = ['sale', 'deposit'] as const;

    const movements = db
      .select({ type: cashMovements.type, amount: cashMovements.amount })
      .from(cashMovements)
      .where(eq(cashMovements.businessUnitId, businessUnitId))
      .all();

    const balance = movements.reduce((sum, m) => {
      const isIn = (inTypes as readonly string[]).includes(m.type);
      return sum + (isIn ? m.amount : -m.amount);
    }, 0);

    const latestAudit = db
      .select({ auditDate: cashAudits.auditDate, status: cashAudits.status })
      .from(cashAudits)
      .where(eq(cashAudits.businessUnitId, businessUnitId))
      .orderBy(desc(cashAudits.createdAt))
      .limit(1)
      .get();

    return {
      balance:         Math.round(balance * 100) / 100,
      lastAuditDate:   latestAudit?.auditDate ?? null,
      lastAuditStatus: latestAudit?.status ?? null,
    };
  }

  private getCriticalStock(businessUnitId: number): CriticalStockItem[] {
    const rows = db
      .select({
        productId:  stockItems.productId,
        name:       products.name,
        current:    stockItems.quantity,
        threshold:  stockItems.minimumThreshold,
      })
      .from(stockItems)
      .innerJoin(products, eq(stockItems.productId, products.id))
      .where(and(
        eq(stockItems.businessUnitId, businessUnitId),
        eq(products.isActive, true),
        sql`${stockItems.quantity} <= ${stockItems.minimumThreshold}`,
      ))
      .orderBy(sql`${stockItems.quantity} - ${stockItems.minimumThreshold}`)
      .limit(5)
      .all();

    return rows.map((r) => ({
      productId: r.productId,
      name:      r.name,
      current:   r.current,
      threshold: r.threshold,
      status:    r.current === 0 ? 'out' : 'low',
    }));
  }

  private getUpcomingOrders(businessUnitId: number, today: string): UpcomingOrder[] {
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const toDate = sevenDaysLater.toISOString().slice(0, 10);

    const rows = db
      .select()
      .from(tallerOrders)
      .where(and(
        eq(tallerOrders.buId, businessUnitId),
        notInArray(tallerOrders.status, ['entregado', 'cancelado']),
        sql`${tallerOrders.estimatedDelivery} IS NOT NULL`,
        lte(tallerOrders.estimatedDelivery, toDate),
      ))
      .orderBy(tallerOrders.estimatedDelivery)
      .all();

    return rows.map((r) => {
      const delivery = r.estimatedDelivery!;
      const diffMs = new Date(delivery).getTime() - new Date(today).getTime();
      const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));
      return {
        id:                r.id,
        customerName:      r.customerName,
        description:       r.description,
        estimatedDelivery: delivery,
        daysLeft,
        status:            r.status,
      };
    });
  }

  private getTopProductsWeek(businessUnitId: number, today: string): TopProductWeek[] {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6);
    const fromDate = weekStart.toISOString().slice(0, 10);

    const completedIds = db
      .select({ id: sales.id })
      .from(sales)
      .where(and(
        eq(sales.businessUnitId, businessUnitId),
        eq(sales.status, 'completed'),
        gte(sales.createdAt, fromDate),
      ))
      .all()
      .map((r) => r.id);

    if (completedIds.length === 0) return [];

    return db
      .select({
        productId: saleItems.productId,
        name:      saleItems.productName,
        quantity:  sql<number>`SUM(${saleItems.quantity})`,
        revenue:   sql<number>`SUM(${saleItems.lineTotal})`,
      })
      .from(saleItems)
      .where(sql`${saleItems.saleId} IN (${completedIds.join(',')})`)
      .groupBy(saleItems.productId, saleItems.productName)
      .orderBy(desc(sql`SUM(${saleItems.quantity})`))
      .limit(5)
      .all()
      .map((r) => ({
        productId: r.productId,
        name:      r.name,
        quantity:  r.quantity,
        revenue:   Math.round(r.revenue * 100) / 100,
      }));
  }
}
