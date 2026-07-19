import { eq, and } from 'drizzle-orm';
import { db, sqlite } from '../../../db/connection';
import { productVariants } from '../../../db/schemas/modules/retail-textil';
import type { ProductVariantRow } from '../../../db/schemas/modules/retail-textil';
import { nanoid } from 'nanoid';

export class ProductVariantRepository {
  findByProductId(productId: number): ProductVariantRow[] {
    return db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.productId, productId), eq(productVariants.isActive, true)))
      .all();
  }

  findByProductIdWithSalesInfo(productId: number): (ProductVariantRow & { hasSales: boolean })[] {
    const rows = db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId))
      .all();

    return rows.map((r) => ({ ...r, hasSales: false }));
  }

  findById(id: number): ProductVariantRow | undefined {
    return db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, id))
      .get();
  }

  create(data: {
    productId: number;
    businessUnitId: number;
    attributeType: string;
    attributeValue: string;
    price: number;
    costPrice: number;
    barcode?: string | null;
    stock?: number;
  }): ProductVariantRow {
    const sku = `VAR-${nanoid(6).toUpperCase()}`;
    return db
      .insert(productVariants)
      .values({ ...data, sku })
      .returning()
      .get();
  }

  createBatch(
    productId: number,
    businessUnitId: number,
    attributeType: string,
    items: Array<{
      attributeValue: string;
      price: number;
      costPrice: number;
      barcode?: string | null;
      stock?: number;
    }>,
  ): ProductVariantRow[] {
    if (items.length === 0) return [];
    const rows = items.map((item) => ({
      productId,
      businessUnitId,
      attributeType,
      attributeValue: item.attributeValue,
      price: item.price,
      costPrice: item.costPrice,
      barcode: item.barcode ?? null,
      stock: item.stock ?? 0,
      sku: `VAR-${nanoid(6).toUpperCase()}`,
    }));
    return db.insert(productVariants).values(rows).returning().all();
  }

  upsertBatch(
    productId: number,
    businessUnitId: number,
    attributeType: string,
    toCreate: Array<{
      attributeValue: string;
      price: number;
      costPrice: number;
      barcode?: string | null;
      stock?: number;
    }>,
    toUpdate: Array<{
      id: number;
      attributeValue: string;
      price: number;
      costPrice: number;
      barcode?: string | null;
      stock?: number;
    }>,
  ): void {
    sqlite.transaction(() => {
      // Las variantes heredan la BU del producto — NO la BU activa del cliente,
      // que puede ser otra si el usuario navega entre unidades de negocio.
      type BuRow = { business_unit_id: number };
      const prod = sqlite
        .prepare('SELECT business_unit_id FROM products WHERE id = ?')
        .get(productId) as BuRow | undefined;
      const buId = prod?.business_unit_id ?? businessUnitId;

      // stock_item del producto padre: ancla de los movimientos de trazabilidad
      type SiRow = { id: number };
      const si = sqlite
        .prepare('SELECT id FROM stock_items WHERE product_id = ? LIMIT 1')
        .get(productId) as SiRow | undefined;
      const stockItemId = si?.id;

      const insertMovement = (
        type: 'entry' | 'adjustment',
        quantity: number,
        reason: string,
        reasonLabel: string,
        before: number,
        after: number,
        notes: string,
        variantId: number,
      ): void => {
        if (!stockItemId) return;
        sqlite
          .prepare(
            `INSERT INTO stock_movements
               (stock_item_id, business_unit_id, type, quantity, reason,
                reason_label, quantity_before, quantity_after, notes, variant_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(stockItemId, buId, type, quantity, reason, reasonLabel, before, after, notes, variantId);
      };

      if (toCreate.length > 0) {
        const rows = toCreate.map((item) => ({
          productId,
          businessUnitId: buId,
          attributeType,
          attributeValue: item.attributeValue,
          price: item.price,
          costPrice: item.costPrice,
          barcode: item.barcode ?? null,
          stock: item.stock ?? 0,
          sku: `VAR-${nanoid(6).toUpperCase()}`,
        }));
        const created = db.insert(productVariants).values(rows).returning().all();

        for (const variant of created) {
          if (variant.stock > 0) {
            insertMovement(
              'entry',
              variant.stock,
              'stock_inicial',
              'Stock inicial al crear variante',
              0,
              variant.stock,
              `Variante: ${variant.attributeValue}`,
              variant.id,
            );
          }
        }
      }

      for (const v of toUpdate) {
        type StockRow = { stock: number };
        const current = sqlite
          .prepare('SELECT stock FROM product_variants WHERE id = ?')
          .get(v.id) as StockRow | undefined;

        db.update(productVariants)
          .set({
            attributeValue: v.attributeValue,
            price: v.price,
            costPrice: v.costPrice,
            barcode: v.barcode ?? null,
            businessUnitId: buId,
            ...(v.stock !== undefined && { stock: v.stock }),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(productVariants.id, v.id))
          .run();

        if (v.stock !== undefined && current && v.stock !== current.stock) {
          insertMovement(
            'adjustment',
            v.stock - current.stock,
            'ajuste_variante',
            'Ajuste de stock de variante',
            current.stock,
            v.stock,
            `Variante: ${v.attributeValue}`,
            v.id,
          );
        }
      }

      this.syncParentStock(productId);
    })();
  }

  /**
   * Sincroniza el stock del producto padre con la suma de sus variantes activas.
   * Solo aplica si el producto tiene al menos una variante activa — de lo
   * contrario el stock del padre se gestiona manualmente y no debe tocarse.
   */
  syncParentStock(productId: number): void {
    type CountRow = { cnt: number };
    const row = sqlite
      .prepare('SELECT COUNT(*) AS cnt FROM product_variants WHERE product_id = ? AND is_active = 1')
      .get(productId) as CountRow | undefined;
    if (!row || row.cnt === 0) return;

    sqlite
      .prepare(
        `UPDATE stock_items
         SET quantity = (
           SELECT COALESCE(SUM(stock), 0) FROM product_variants
           WHERE product_id = ? AND is_active = 1
         ),
         updated_at = datetime('now')
         WHERE product_id = ?`,
      )
      .run(productId, productId);
  }

  update(id: number, data: Partial<Pick<ProductVariantRow, 'attributeValue' | 'price' | 'costPrice' | 'barcode'>>): ProductVariantRow | undefined {
    return db
      .update(productVariants)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(productVariants.id, id))
      .returning()
      .get();
  }

  archive(id: number): void {
    const variant = this.findById(id);
    db.update(productVariants)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(productVariants.id, id))
      .run();
    if (variant) this.syncParentStock(variant.productId);
  }

  delete(id: number): void {
    const variant = this.findById(id);
    db.delete(productVariants).where(eq(productVariants.id, id)).run();
    if (variant) this.syncParentStock(variant.productId);
  }

  deleteByProductId(productId: number): void {
    db.delete(productVariants).where(eq(productVariants.productId, productId)).run();
  }

  hasVariants(productId: number): boolean {
    const row = db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.productId, productId), eq(productVariants.isActive, true)))
      .get();
    return row !== undefined;
  }
}

export const productVariantRepository = new ProductVariantRepository();
