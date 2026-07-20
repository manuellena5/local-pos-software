import { eq, and } from 'drizzle-orm';
import { db, sqlite } from '../../db/connection';
import { products, stockItems } from '../../db/schema';
import { productVariants } from '../../db/schemas/modules/retail-textil';
import type { ProductRepository } from '../repositories/ProductRepository';
import type { ProductImportRow, ProductImportResult } from '../../../shared/types';

function num(v: string | number | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function syncParentStock(productId: number): void {
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

/**
 * Importación masiva de productos desde filas ya parseadas (CSV/XLSX).
 * Formato largo: una fila = producto simple, o una variante de un producto
 * (agrupadas por `nombre` repetido). Idempotente:
 *  - Producto base: upsert por (businessUnitId, nombre).
 *  - Variante: upsert por (productId, tipo_variante, valor_variante).
 * Usado tanto por el seed de demo (Capa 2) como por el importador manual
 * de la pantalla de Productos.
 */
export class ProductImportService {
  constructor(private readonly productRepo: ProductRepository) {}

  importRows(businessUnitId: number, rows: ProductImportRow[]): ProductImportResult {
    const groups = new Map<string, ProductImportRow[]>();
    for (const row of rows) {
      const name = String(row.nombre ?? '').trim();
      if (!name) continue;
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name)!.push(row);
    }

    let productsCreated = 0;
    let productsExisting = 0;
    let variantsWritten = 0;

    for (const [name, groupRows] of groups) {
      const first = groupRows[0]!;
      const category = String(first.categoria ?? '').trim() || undefined;
      const basePrice = num(first.precio);
      const costPrice = num(first.costo);
      const hasVariants = groupRows.some(
        (r) => String(r.tipo_variante ?? '').trim() && String(r.valor_variante ?? '').trim(),
      );

      let product = db
        .select()
        .from(products)
        .where(and(eq(products.businessUnitId, businessUnitId), eq(products.name, name)))
        .get();

      if (!product) {
        const sku = String(first.sku ?? '').trim() || this.productRepo.generateSku(category ?? '', name, businessUnitId);
        const createdProduct = this.productRepo.create(businessUnitId, {
          name,
          category,
          costPrice,
          basePrice,
          sku,
        });
        db.insert(stockItems)
          .values({
            productId: createdProduct.id,
            businessUnitId,
            quantity: hasVariants ? 0 : num(first.stock),
            minimumThreshold: 5,
          })
          .run();
        product = db.select().from(products).where(eq(products.id, createdProduct.id)).get();
        productsCreated++;
      } else {
        productsExisting++;
      }

      if (!product) continue;
      const productId = product.id;

      if (hasVariants) {
        for (const row of groupRows) {
          const attributeType = String(row.tipo_variante ?? '').trim();
          const attributeValue = String(row.valor_variante ?? '').trim();
          if (!attributeType || !attributeValue) continue;

          const price = num(row.precio) || basePrice;
          const cost = num(row.costo) || costPrice;
          const stock = num(row.stock);
          const sku = String(row.sku ?? '').trim() || null;

          const existingVariant = db
            .select()
            .from(productVariants)
            .where(
              and(
                eq(productVariants.productId, productId),
                eq(productVariants.attributeType, attributeType),
                eq(productVariants.attributeValue, attributeValue),
              ),
            )
            .get();

          if (existingVariant) {
            db.update(productVariants)
              .set({
                price,
                costPrice: cost,
                stock,
                ...(sku ? { sku } : {}),
                updatedAt: new Date().toISOString(),
              })
              .where(eq(productVariants.id, existingVariant.id))
              .run();
          } else {
            db.insert(productVariants)
              .values({ productId, businessUnitId, attributeType, attributeValue, price, costPrice: cost, stock, sku })
              .run();
          }
          variantsWritten++;
        }
        syncParentStock(productId);
      }
    }

    return { productsCreated, productsExisting, variantsWritten, totalRows: rows.length };
  }
}
