import { db } from '../../db/connection';
import { sales, saleItems, products, stockItems, cashMovements, cashAudits, productVariants, customers } from '../../db/schema';
import { eq, and, gte, lt, sql, desc } from 'drizzle-orm';

export interface DaySalesSummary {
  total: number;
  count: number;
}

export interface SalePaymentRow {
  paymentMethods: string;
}

export interface CajaSessionData {
  openedAt: string;
  openingAmount: number;
  cashSalesToday: number;
  manualIncome: number;
  manualExpense: number;
}

export interface LowStockRow {
  productId: number;
  variantId?: number;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  minStock: number;
  isCritical: boolean;
}

export class DashboardRepository {
  getSalesToday(businessUnitId: number, today: string): DaySalesSummary {
    const row = db
      .select({
        total: sql<number>`COALESCE(SUM(${sales.totalAmount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(sales)
      .where(
        and(
          eq(sales.businessUnitId, businessUnitId),
          eq(sales.status, 'completed'),
          gte(sales.createdAt, today),
        ),
      )
      .get();
    return { total: row?.total ?? 0, count: row?.count ?? 0 };
  }

  getSalesYesterday(businessUnitId: number, yesterday: string, today: string): number {
    const row = db
      .select({ total: sql<number>`COALESCE(SUM(${sales.totalAmount}), 0)` })
      .from(sales)
      .where(
        and(
          eq(sales.businessUnitId, businessUnitId),
          eq(sales.status, 'completed'),
          gte(sales.createdAt, yesterday),
          lt(sales.createdAt, today),
        ),
      )
      .get();
    return row?.total ?? 0;
  }

  getSalesWeek(businessUnitId: number, weekStart: string): DaySalesSummary {
    const row = db
      .select({
        total: sql<number>`COALESCE(SUM(${sales.totalAmount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(sales)
      .where(
        and(
          eq(sales.businessUnitId, businessUnitId),
          eq(sales.status, 'completed'),
          gte(sales.createdAt, weekStart),
        ),
      )
      .get();
    return { total: row?.total ?? 0, count: row?.count ?? 0 };
  }

  getSalesByDate(businessUnitId: number, from: string): Array<{ date: string; total: number }> {
    // `created_at` está en UTC — se convierte a hora local antes de agrupar
    // para que una venta de última hora de la tarde/noche (ya "mañana" en
    // UTC) se atribuya al día calendario local correcto.
    return db
      .select({
        date: sql<string>`date(${sales.createdAt}, 'localtime')`,
        total: sql<number>`COALESCE(SUM(${sales.totalAmount}), 0)`,
      })
      .from(sales)
      .where(
        and(
          eq(sales.businessUnitId, businessUnitId),
          eq(sales.status, 'completed'),
          gte(sales.createdAt, from),
        ),
      )
      .groupBy(sql`date(${sales.createdAt}, 'localtime')`)
      .all();
  }

  getTodaySalesPaymentMethods(businessUnitId: number, today: string): SalePaymentRow[] {
    return db
      .select({ paymentMethods: sales.paymentMethods })
      .from(sales)
      .where(
        and(
          eq(sales.businessUnitId, businessUnitId),
          eq(sales.status, 'completed'),
          gte(sales.createdAt, today),
        ),
      )
      .all();
  }

  getSalesSinceTimestamp(businessUnitId: number, fromTimestamp: string): number {
    const row = db
      .select({ total: sql<number>`COALESCE(SUM(${sales.totalAmount}), 0)` })
      .from(sales)
      .where(
        and(
          eq(sales.businessUnitId, businessUnitId),
          eq(sales.status, 'completed'),
          gte(sales.createdAt, fromTimestamp),
        ),
      )
      .get();
    return row?.total ?? 0;
  }

  /**
   * Returns the active cash session data if there is an open session.
   * A session is considered open when the last 'opening' movement is newer
   * than the last cash audit (or no audit exists for this BU).
   */
  getCajaSession(businessUnitId: number): CajaSessionData | null {
    const lastOpening = db
      .select({
        createdAt: cashMovements.createdAt,
        amount: cashMovements.amount,
      })
      .from(cashMovements)
      .where(
        and(
          eq(cashMovements.businessUnitId, businessUnitId),
          eq(cashMovements.type, 'opening'),
        ),
      )
      .orderBy(desc(cashMovements.createdAt))
      .limit(1)
      .get();

    if (!lastOpening) return null;

    const lastAudit = db
      .select({ createdAt: cashAudits.createdAt })
      .from(cashAudits)
      .where(eq(cashAudits.businessUnitId, businessUnitId))
      .orderBy(desc(cashAudits.createdAt))
      .limit(1)
      .get();

    const isOpen = !lastAudit || lastOpening.createdAt > lastAudit.createdAt;
    if (!isOpen) return null;

    const movements = db
      .select({ type: cashMovements.type, amount: cashMovements.amount })
      .from(cashMovements)
      .where(
        and(
          eq(cashMovements.businessUnitId, businessUnitId),
          gte(cashMovements.createdAt, lastOpening.createdAt),
        ),
      )
      .all();

    const cashSalesToday = movements
      .filter((m) => m.type === 'sale')
      .reduce((sum, m) => sum + m.amount, 0);
    const manualIncome = movements
      .filter((m) => m.type === 'deposit')
      .reduce((sum, m) => sum + m.amount, 0);
    const manualExpense = movements
      .filter((m) => m.type === 'withdrawal')
      .reduce((sum, m) => sum + m.amount, 0);

    return {
      openedAt: lastOpening.createdAt,
      openingAmount: lastOpening.amount,
      cashSalesToday: Math.round(cashSalesToday * 100) / 100,
      manualIncome: Math.round(manualIncome * 100) / 100,
      manualExpense: Math.round(manualExpense * 100) / 100,
    };
  }

  getLowStockProducts(businessUnitId: number, limit: number): LowStockRow[] {
    // Products that do not have any active variant (retail-general style)
    const plainProducts = db
      .select({
        productId: products.id,
        name: products.name,
        sku: products.sku,
        category: products.category,
        currentStock: stockItems.quantity,
        minStock: stockItems.minimumThreshold,
      })
      .from(products)
      .innerJoin(
        stockItems,
        and(
          eq(stockItems.productId, products.id),
          eq(stockItems.businessUnitId, businessUnitId),
        ),
      )
      .where(
        and(
          eq(products.businessUnitId, businessUnitId),
          eq(products.isActive, true),
          sql`${stockItems.quantity} <= ${stockItems.minimumThreshold}`,
          sql`NOT EXISTS (
            SELECT 1 FROM product_variants pv
            WHERE pv.product_id = ${products.id} AND pv.is_active = 1
          )`,
        ),
      )
      .all()
      .map(
        (r): LowStockRow => ({
          productId: r.productId,
          name: r.name,
          sku: r.sku,
          category: r.category ?? 'Sin categoría',
          currentStock: r.currentStock,
          minStock: r.minStock,
          isCritical: r.currentStock === 0,
        }),
      );

    // Variants whose stock is at or below the parent product's minimum threshold
    const variantProducts = db
      .select({
        productId: products.id,
        variantId: productVariants.id,
        productName: products.name,
        variantSku: productVariants.sku,
        productSku: products.sku,
        category: products.category,
        currentStock: productVariants.stock,
        minThreshold: stockItems.minimumThreshold,
        attrValue: productVariants.attributeValue,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .leftJoin(
        stockItems,
        and(
          eq(stockItems.productId, products.id),
          eq(stockItems.businessUnitId, businessUnitId),
        ),
      )
      .where(
        and(
          eq(products.businessUnitId, businessUnitId),
          eq(products.isActive, true),
          eq(productVariants.isActive, true),
          sql`${productVariants.stock} <= COALESCE(${stockItems.minimumThreshold}, 5)`,
        ),
      )
      .all()
      .map(
        (r): LowStockRow => ({
          productId: r.productId,
          variantId: r.variantId,
          name: `${r.productName} — ${r.attrValue}`,
          sku: r.variantSku ?? r.productSku,
          category: r.category ?? 'Sin categoría',
          currentStock: r.currentStock,
          minStock: r.minThreshold ?? 5,
          isCritical: r.currentStock === 0,
        }),
      );

    const all = [...plainProducts, ...variantProducts];
    all.sort((a, b) => {
      if (a.isCritical && !b.isCritical) return -1;
      if (!a.isCritical && b.isCritical) return 1;
      return a.currentStock - a.minStock - (b.currentStock - b.minStock);
    });
    return all.slice(0, limit);
  }

  getSalesMonth(businessUnitId: number, monthStart: string): number {
    const row = db
      .select({ total: sql<number>`COALESCE(SUM(${sales.totalAmount}), 0)` })
      .from(sales)
      .where(
        and(
          eq(sales.businessUnitId, businessUnitId),
          eq(sales.status, 'completed'),
          gte(sales.createdAt, monthStart),
        ),
      )
      .get();
    return row?.total ?? 0;
  }

  getRecentSales(
    businessUnitId: number,
    limit: number,
  ): Array<{
    id: number;
    createdAt: string;
    totalAmount: number;
    paymentMethods: string;
    customerName: string | null;
    itemsCount: number;
  }> {
    return db
      .select({
        id: sales.id,
        createdAt: sales.createdAt,
        totalAmount: sales.totalAmount,
        paymentMethods: sales.paymentMethods,
        customerName: customers.name,
        itemsCount: sql<number>`(
          SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = ${sales.id}
        )`,
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(
        and(
          eq(sales.businessUnitId, businessUnitId),
          eq(sales.status, 'completed'),
        ),
      )
      .orderBy(desc(sales.createdAt))
      .limit(limit)
      .all();
  }

  getTopProducts(
    businessUnitId: number,
    monthStart: string,
    limit: number,
  ): Array<{
    productId: number;
    name: string;
    sku: string;
    totalUnits: number;
    totalRevenue: number;
  }> {
    return db
      .select({
        productId: products.id,
        name: products.name,
        sku: products.sku,
        totalUnits: sql<number>`COALESCE(SUM(${saleItems.quantity}), 0)`,
        totalRevenue: sql<number>`COALESCE(SUM(${saleItems.lineTotal}), 0)`,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(
        and(
          eq(sales.businessUnitId, businessUnitId),
          eq(sales.status, 'completed'),
          gte(sales.createdAt, monthStart),
        ),
      )
      .groupBy(products.id, products.name, products.sku)
      .orderBy(sql`SUM(${saleItems.quantity}) DESC`)
      .limit(limit)
      .all();
  }
}
