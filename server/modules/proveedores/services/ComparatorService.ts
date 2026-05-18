import { eq, and, gte } from 'drizzle-orm';
import { db } from '../../../db/connection';
import { products, stockItems } from '../../../db/schemas/core/products';
import { saleItems, sales } from '../../../db/schemas/core/sales';
import { suppliers } from '../../../db/schemas/modules/suppliers';
import type {
  ComparatorRow,
  ComparatorLink,
  SuggestedMatch,
  PurchaseOrder,
  PurchaseOrderItem,
  SupplierOrderGroup,
  MinimumOrderWarning,
  Product,
  Supplier,
  UnlinkedSupplierProduct,
  CreateFromSupplierInput,
} from '../../../../shared/types';
import type { ProductSupplierLinkRepository } from '../repositories/ProductSupplierLinkRepository';

// ── helpers ───────────────────────────────────────────────────────────────

function stockStatus(quantity: number): 'ok' | 'low' | 'out' {
  if (quantity <= 0) return 'out';
  if (quantity <= 5) return 'low';
  return 'ok';
}

const STOCK_ORDER: Record<'out' | 'low' | 'ok', number> = { out: 0, low: 1, ok: 2 };

function mapSupplierRow(row: typeof suppliers.$inferSelect): Supplier {
  return {
    id:             row.id,
    businessUnitId: row.businessUnitId,
    name:           row.name,
    contactName:    row.contactName ?? null,
    phone:          row.phone ?? null,
    email:          row.email ?? null,
    paymentTerms:   row.paymentTerms as Supplier['paymentTerms'],
    deliveryDays:   row.deliveryDays ?? null,
    minimumOrder:   row.minimumOrder ?? null,
    shippingCost:   row.shippingCost ?? null,
    city:           row.city ?? null,
    notes:          row.notes ?? null,
    isActive:       row.isActive,
    createdAt:      row.createdAt,
    updatedAt:      row.updatedAt,
  };
}

function mapProductRow(p: typeof products.$inferSelect): Product {
  return {
    id:                 p.id,
    businessUnitId:     p.businessUnitId,
    name:               p.name,
    description:        p.description ?? null,
    category:           p.category ?? null,
    sku:                p.sku,
    costPrice:          p.costPrice,
    basePrice:          p.basePrice,
    taxRate:            p.taxRate,
    isActive:           p.isActive,
    code:               null,
    showInCatalog:      false,
    catalogDescription: null,
    barcode:            p.barcode ?? null,
    supplierCode:       p.supplierCode ?? null,
    minimumSalePrice:   null,
    supplierId:         null,
    supplierLeadTime:   null,
    showCatalogPrice:   true,
    showCatalogStock:   false,
    createdAt:          p.createdAt,
    updatedAt:          p.updatedAt,
  };
}

export class ComparatorService {
  constructor(private linkRepo: ProductSupplierLinkRepository) {}

  /**
   * Devuelve todos los productos de la BU con sus vínculos a proveedores,
   * precios y estado de stock. Ordenados: out → low → ok.
   */
  getComparatorData(businessUnitId: number): ComparatorRow[] {
    const productRows = db
      .select()
      .from(products)
      .where(and(eq(products.businessUnitId, businessUnitId), eq(products.isActive, true)))
      .all();

    const stockRows = db
      .select()
      .from(stockItems)
      .where(eq(stockItems.businessUnitId, businessUnitId))
      .all();
    const stockByProduct = new Map<number, number>();
    for (const s of stockRows) stockByProduct.set(s.productId, s.quantity);

    const allLinks = this.linkRepo.findAllLinksForBU(businessUnitId);

    const supplierRows = db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.businessUnitId, businessUnitId), eq(suppliers.isActive, true)))
      .all();
    const supplierById = new Map<number, Supplier>();
    for (const s of supplierRows) supplierById.set(s.id, mapSupplierRow(s));

    const linksByProduct = new Map<number, typeof allLinks>();
    for (const item of allLinks) {
      const list = linksByProduct.get(item.link.productId) ?? [];
      list.push(item);
      linksByProduct.set(item.link.productId, list);
    }

    const rows: ComparatorRow[] = productRows.map((p) => {
      const currentStock = stockByProduct.get(p.id) ?? 0;
      const status = stockStatus(currentStock);
      const rawLinks = linksByProduct.get(p.id) ?? [];

      const comparatorLinks: ComparatorLink[] = rawLinks.map((item) => {
        const sp = item.supplierProduct;
        const supplier =
          supplierById.get(sp.supplierId) ??
          ({ id: sp.supplierId, name: item.supplier.name, businessUnitId, isActive: true, createdAt: '', updatedAt: '' } as Supplier);
        const margin =
          p.basePrice > 0
            ? Math.round(((p.basePrice - sp.unitCost) / p.basePrice) * 100 * 100) / 100
            : 0;
        const marginAmount = Math.round((p.basePrice - sp.unitCost) * 100) / 100;
        return {
          linkId:          item.link.id,
          supplier,
          supplierProduct: sp,
          isPreferred:     item.link.isPreferred,
          margin,
          marginAmount,
        };
      });

      const bestLink = comparatorLinks.reduce(
        (best, cur) =>
          best === null || cur.supplierProduct.unitCost < best.supplierProduct.unitCost
            ? cur
            : best,
        null as ComparatorLink | null,
      );

      return {
        product: { ...mapProductRow(p), currentStock },
        links:        comparatorLinks,
        bestPrice:    bestLink?.supplierProduct.unitCost ?? null,
        bestSupplier: bestLink?.supplier.name ?? null,
        stockStatus:  status,
      };
    });

    rows.sort((a, b) => STOCK_ORDER[a.stockStatus] - STOCK_ORDER[b.stockStatus]);
    return rows;
  }

  getSuggestedMatches(businessUnitId: number): SuggestedMatch[] {
    return this.linkRepo.suggestMatches(businessUnitId);
  }

  getUnlinkedProducts(businessUnitId: number): UnlinkedSupplierProduct[] {
    return this.linkRepo.findUnlinkedForBU(businessUnitId);
  }

  createProductFromSupplier(businessUnitId: number, input: CreateFromSupplierInput): Product {
    return this.linkRepo.createProductFromSupplier({ ...input, businessUnitId });
  }

  /**
   * Arma un pedido de compra con ROI, warnings de compra mínima y
   * estimación de días de recupero basada en historial de ventas.
   */
  buildPurchaseOrder(
    businessUnitId: number,
    items: Array<{ productId: number; supplierProductId: number; quantity: number }>,
  ): PurchaseOrder {
    const orderItems: PurchaseOrderItem[] = [];

    for (const input of items) {
      if (input.quantity <= 0) continue;

      const product = db
        .select()
        .from(products)
        .where(eq(products.id, input.productId))
        .get();
      if (!product) continue;

      // Verificar que existe el vínculo y obtener datos del supplier_product
      const linksForProduct = this.linkRepo.findLinksForProduct(input.productId);
      const found = linksForProduct.find(
        (l) => l.supplierProduct.id === input.supplierProductId,
      );
      if (!found) continue;

      const supplierFull = db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, found.supplierProduct.supplierId))
        .get();
      if (!supplierFull) continue;

      const spData = found.supplierProduct;
      const supplierData = mapSupplierRow(supplierFull);

      const subtotal = Math.round(input.quantity * spData.unitCost * 100) / 100;
      const gananciaProyectada =
        Math.round(input.quantity * (product.basePrice - spData.unitCost) * 100) / 100;

      orderItems.push({
        product:         mapProductRow(product),
        supplierProduct: spData,
        supplier:        supplierData,
        quantity:        input.quantity,
        unitCost:        spData.unitCost,
        subtotal,
        gananciaProyectada,
      });
    }

    // Agrupar por proveedor
    const bySupplierMap = new Map<number, SupplierOrderGroup>();
    for (const item of orderItems) {
      const supplierId = item.supplier.id;
      if (!bySupplierMap.has(supplierId)) {
        bySupplierMap.set(supplierId, {
          supplier:          item.supplier,
          items:             [],
          subtotalProductos: 0,
          costoEnvio:        item.supplier.shippingCost ?? 0,
          total:             0,
        });
      }
      const group = bySupplierMap.get(supplierId)!;
      group.items.push(item);
      group.subtotalProductos =
        Math.round((group.subtotalProductos + item.subtotal) * 100) / 100;
    }

    const warnings: MinimumOrderWarning[] = [];
    const bySupplier: SupplierOrderGroup[] = [];

    for (const group of bySupplierMap.values()) {
      group.total = Math.round((group.subtotalProductos + group.costoEnvio) * 100) / 100;

      const minOrder = group.supplier.minimumOrder ?? 0;
      if (minOrder > 0 && group.subtotalProductos < minOrder) {
        warnings.push({
          supplierId:   group.supplier.id,
          supplierName: group.supplier.name,
          minimumOrder: minOrder,
          currentOrder: group.subtotalProductos,
          missing:      Math.round((minOrder - group.subtotalProductos) * 100) / 100,
        });
      }

      bySupplier.push(group);
    }

    // Totales globales
    const totalInversion = Math.round(bySupplier.reduce((s, g) => s + g.total, 0) * 100) / 100;
    const totalEnvios = Math.round(bySupplier.reduce((s, g) => s + g.costoEnvio, 0) * 100) / 100;
    const totalGananciaProyectada =
      Math.round(orderItems.reduce((s, i) => s + i.gananciaProyectada, 0) * 100) / 100;
    const roi =
      totalInversion > 0
        ? Math.round((totalGananciaProyectada / totalInversion) * 100 * 100) / 100
        : 0;

    // Días de recupero desde historial de ventas (últimos 30 días, solo lectura)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    let gananciaProyectadaDiaria = 0;
    let hasHistory = false;

    for (const item of orderItems) {
      const salesRows = db
        .select({ qty: saleItems.quantity })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .where(
          and(
            eq(saleItems.productId, item.product.id),
            eq(sales.businessUnitId, businessUnitId),
            eq(sales.status, 'completed'),
            gte(sales.createdAt, cutoffStr),
          ),
        )
        .all();

      if (salesRows.length > 0) {
        hasHistory = true;
        const totalSold = salesRows.reduce((s, r) => s + r.qty, 0);
        const dailyUnits = totalSold / 30;
        const dailyMargin = dailyUnits * (item.product.basePrice - item.unitCost);
        gananciaProyectadaDiaria += dailyMargin;
      }
    }

    const diasRecuperoEstimado =
      hasHistory && gananciaProyectadaDiaria > 0
        ? Math.round(totalInversion / gananciaProyectadaDiaria)
        : null;

    return {
      items:     orderItems,
      bySupplier,
      warnings,
      totals: {
        totalInversion,
        totalEnvios,
        totalGananciaProyectada,
        roi,
        diasRecuperoEstimado,
      },
    };
  }
}
