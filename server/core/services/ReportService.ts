import { db, sqlite } from '../../db/connection';
import { sales, saleItems, products, customers, stockMovements, stockItems } from '../../db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import type {
  SalesReport,
  TopProductsReport,
  TopCustomersReport,
  StockMovement,
  PaymentMethod,
} from '../../../shared/types';

// sales.createdAt se guarda vía SQLite datetime('now'), que es siempre UTC.
// fromDate/toDate llegan como "YYYY-MM-DD" en hora LOCAL (así los interpreta
// un <input type="date"> o el usuario). Comparar esos strings directamente
// contra created_at asume que ambos están en el mismo huso horario, lo cual
// es falso: hay que convertir el día calendario local a su equivalente UTC
// antes de filtrar, y agrupar por día local (no por el substring UTC crudo).
function localDateToUtcBoundary(localDate: string): string {
  const [y, m, d] = localDate.split('-').map(Number);
  const localMidnight = new Date(y!, m! - 1, d!, 0, 0, 0, 0);
  return localMidnight.toISOString().replace('T', ' ').slice(0, 19);
}

function localDateToUtcEndOfDayBoundary(localDate: string): string {
  const [y, m, d] = localDate.split('-').map(Number);
  const localEndOfDay = new Date(y!, m! - 1, d!, 23, 59, 59, 999);
  return localEndOfDay.toISOString().replace('T', ' ').slice(0, 19);
}

function utcTimestampToLocalDateKey(utcTimestamp: string): string {
  const iso = utcTimestamp.includes('Z') ? utcTimestamp : utcTimestamp.replace(' ', 'T') + 'Z';
  return formatLocalDate(new Date(iso));
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export class ReportService {
  /**
   * Reporte de ventas para un rango de fechas.
   * Devuelve un entry por cada día que tiene ventas.
   */
  getSalesByRange(
    businessUnitId: number,
    fromDate: string,
    toDate: string,
  ): SalesReport[] {
    const rows = db
      .select()
      .from(sales)
      .where(
        and(
          eq(sales.businessUnitId, businessUnitId),
          eq(sales.status, 'completed'),
          gte(sales.createdAt, localDateToUtcBoundary(fromDate)),
          lte(sales.createdAt, localDateToUtcEndOfDayBoundary(toDate)),
        ),
      )
      .orderBy(sales.createdAt)
      .all();

    // Agrupar por día calendario local (no por el substring UTC crudo)
    const byDay = new Map<string, typeof rows>();
    for (const row of rows) {
      const day = utcTimestampToLocalDateKey(row.createdAt);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(row);
    }

    const result: SalesReport[] = [];
    for (const [date, daySales] of byDay) {
      const totalAmount = daySales.reduce((s, r) => s + r.totalAmount, 0);
      const totalSales = daySales.length;
      const avgTicket = totalSales > 0 ? totalAmount / totalSales : 0;

      // Desglose por medio de pago
      const paymentMap = new Map<string, { count: number; amount: number }>();
      for (const sale of daySales) {
        const methods: PaymentMethod[] = JSON.parse(sale.paymentMethods);
        for (const pm of methods) {
          const existing = paymentMap.get(pm.method) ?? { count: 0, amount: 0 };
          paymentMap.set(pm.method, {
            count: existing.count + 1,
            amount: existing.amount + pm.amount,
          });
        }
      }

      result.push({
        date,
        totalSales,
        totalAmount: Math.round(totalAmount * 100) / 100,
        avgTicket: Math.round(avgTicket * 100) / 100,
        paymentBreakdown: Array.from(paymentMap.entries()).map(([method, data]) => ({
          method,
          count: data.count,
          amount: Math.round(data.amount * 100) / 100,
        })),
      });
    }

    return result;
  }

  getSalesByDate(businessUnitId: number, date: string): SalesReport {
    const [report] = this.getSalesByRange(businessUnitId, date, date);
    return report ?? {
      date,
      totalSales: 0,
      totalAmount: 0,
      avgTicket: 0,
      paymentBreakdown: [],
    };
  }

  /**
   * Top N productos más vendidos (por cantidad).
   */
  getTopProducts(businessUnitId: number, limit = 10): TopProductsReport[] {
    // Obtener ventas completadas de la BU
    const completedSaleIds = db
      .select({ id: sales.id })
      .from(sales)
      .where(and(eq(sales.businessUnitId, businessUnitId), eq(sales.status, 'completed')))
      .all()
      .map((r) => r.id);

    if (completedSaleIds.length === 0) return [];

    // Agrupar sale_items por producto
    const itemRows = db
      .select({
        productId: saleItems.productId,
        productName: saleItems.productName,
        totalQty: sql<number>`SUM(${saleItems.quantity})`,
        totalRevenue: sql<number>`SUM(${saleItems.lineTotal})`,
      })
      .from(saleItems)
      .groupBy(saleItems.productId, saleItems.productName)
      .orderBy(desc(sql`SUM(${saleItems.quantity})`))
      .limit(limit)
      .all();

    // Obtener nombre y categoría actuales de cada producto.
    // Usamos products.name en lugar del productName desnormalizado en sale_items
    // porque el campo histórico puede tener encoding incorrecto (guardado en el momento de venta).
    return itemRows.map((row) => {
      const product = db
        .select({ name: products.name, category: products.category })
        .from(products)
        .where(eq(products.id, row.productId))
        .get();
      return {
        productId: row.productId,
        name:      product?.name ?? row.productName, // fallback si el producto fue eliminado
        category:  product?.category ?? null,
        quantity:  row.totalQty,
        revenue:   Math.round(row.totalRevenue * 100) / 100,
      };
    });
  }

  /**
   * Top N clientes por monto total gastado.
   */
  getTopCustomers(businessUnitId: number, limit = 10): TopCustomersReport[] {
    const rows = db
      .select({
        customerId: sales.customerId,
        totalSpent: sql<number>`SUM(${sales.totalAmount})`,
        purchaseCount: sql<number>`COUNT(*)`,
      })
      .from(sales)
      .where(and(eq(sales.businessUnitId, businessUnitId), eq(sales.status, 'completed')))
      .groupBy(sales.customerId)
      .orderBy(desc(sql`SUM(${sales.totalAmount})`))
      .limit(limit)
      .all();

    return rows.map((row) => {
      let name = 'Consumidor final';
      if (row.customerId) {
        const customer = db
          .select({ name: customers.name })
          .from(customers)
          .where(eq(customers.id, row.customerId))
          .get();
        if (customer) name = customer.name;
      }
      return {
        customerId: row.customerId,
        name,
        purchaseCount: row.purchaseCount,
        totalSpent: Math.round(row.totalSpent * 100) / 100,
      };
    });
  }

  /**
   * Movimientos de stock de una BU en un rango de fechas, con nombre/SKU del
   * producto (join con stock_items → products) y etiqueta de variante si
   * corresponde (join "suave" con la tabla del módulo retail-textil — puede
   * no estar migrada, de ahí el try/catch).
   */
  getStockMovements(
    businessUnitId: number,
    filters?: { fromDate?: string; toDate?: string },
  ): StockMovement[] {
    const conditions = [eq(stockMovements.businessUnitId, businessUnitId)];
    if (filters?.fromDate) {
      conditions.push(gte(stockMovements.createdAt, localDateToUtcBoundary(filters.fromDate)));
    }
    if (filters?.toDate) {
      conditions.push(lte(stockMovements.createdAt, localDateToUtcEndOfDayBoundary(filters.toDate)));
    }

    const rows = db
      .select({
        id:             stockMovements.id,
        stockItemId:    stockMovements.stockItemId,
        businessUnitId: stockMovements.businessUnitId,
        type:           stockMovements.type,
        quantity:       stockMovements.quantity,
        reason:         stockMovements.reason,
        reasonLabel:    stockMovements.reasonLabel,
        unitCost:       stockMovements.unitCost,
        userId:         stockMovements.userId,
        quantityBefore: stockMovements.quantityBefore,
        quantityAfter:  stockMovements.quantityAfter,
        notes:          stockMovements.notes,
        variantId:      stockMovements.variantId,
        supplierId:     stockMovements.supplierId,
        createdAt:      stockMovements.createdAt,
        productName:    products.name,
        productSku:     products.sku,
      })
      .from(stockMovements)
      .leftJoin(stockItems, eq(stockMovements.stockItemId, stockItems.id))
      .leftJoin(products, eq(stockItems.productId, products.id))
      .where(and(...conditions))
      .orderBy(desc(stockMovements.createdAt))
      .all();

    return rows.map((m) => {
      let variantLabel: string | null = null;
      if (m.variantId) {
        try {
          type VRow = { attribute_type: string; attribute_value: string };
          const v = sqlite
            .prepare('SELECT attribute_type, attribute_value FROM product_variants WHERE id = ?')
            .get(m.variantId) as VRow | undefined;
          if (v) variantLabel = `${v.attribute_type}: ${v.attribute_value}`;
        } catch { /* tabla del módulo retail-textil no migrada */ }
      }
      if (!variantLabel && m.notes?.startsWith('Variante: ')) {
        variantLabel = m.notes.slice('Variante: '.length);
      }
      return { ...m, variantLabel } as StockMovement;
    });
  }

  /**
   * Genera string CSV a partir de un array de objetos.
   * Incluye BOM para compatibilidad con Excel en Windows.
   */
  generateCSV(data: Record<string, unknown>[], headers: { key: string; label: string }[]): string {
    const BOM = '﻿';
    const escape = (val: unknown): string => {
      const str = val === null || val === undefined ? '' : String(val);
      // Escapar comillas dobles duplicándolas, y encerrar si contiene coma/salto
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerRow = headers.map((h) => escape(h.label)).join(',');
    const dataRows = data.map((row) =>
      headers.map((h) => escape(row[h.key])).join(','),
    );

    return BOM + [headerRow, ...dataRows].join('\n');
  }
}
