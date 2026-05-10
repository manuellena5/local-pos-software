import { eq, and } from 'drizzle-orm';
import { db, sqlite } from '../../db/connection';
import { products } from '../../db/schema';
import type { Product } from '../../../shared/types';
import type { CreateProductRequest, UpdateProductRequest } from '../types';
import { NotFoundError } from '../../lib/errors';

type RetailExtra = { code: string | null; show_in_catalog: number; catalog_description: string | null };

/** Enriquece un row de Drizzle con las columnas aditivas del módulo retail-textil. */
function enrich(raw: unknown): Product {
  const p = raw as Product;
  try {
    const extra = sqlite
      .prepare('SELECT code, show_in_catalog, catalog_description FROM products WHERE id = ?')
      .get(p.id) as RetailExtra | undefined;
    if (extra) {
      return { ...p, code: extra.code ?? null, showInCatalog: Boolean(extra.show_in_catalog), catalogDescription: extra.catalog_description ?? null };
    }
  } catch { /* columnas aún no migradas */ }
  return { ...p, code: null, showInCatalog: false, catalogDescription: null };
}

export class ProductRepository {
  getAll(businessUnitId: number): Product[] {
    return db
      .select()
      .from(products)
      .where(and(eq(products.businessUnitId, businessUnitId), eq(products.isActive, true)))
      .all()
      .map(enrich);
  }

  getById(id: number, businessUnitId: number): Product | null {
    const row = db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.businessUnitId, businessUnitId)))
      .limit(1)
      .all()[0];
    return row ? enrich(row) : null;
  }

  create(businessUnitId: number, data: CreateProductRequest): Product {
    const row = db
      .insert(products)
      .values({
        businessUnitId,
        name:        data.name,
        description: data.description,
        category:    data.category,
        sku:         data.sku,
        costPrice:   data.costPrice,
        basePrice:   data.basePrice,
        taxRate:     data.taxRate ?? 21,
        isActive:    true,
      })
      .returning()
      .all()[0]!;
    return enrich(row);
  }

  update(id: number, businessUnitId: number, data: UpdateProductRequest): Product {
    const row = db
      .update(products)
      .set({
        ...(data.name !== undefined        && { name:        data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category !== undefined    && { category:    data.category }),
        ...(data.basePrice !== undefined   && { basePrice:   data.basePrice }),
        ...(data.costPrice !== undefined   && { costPrice:   data.costPrice }),
        ...(data.taxRate !== undefined     && { taxRate:     data.taxRate }),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(products.id, id), eq(products.businessUnitId, businessUnitId)))
      .returning()
      .all()[0];

    if (!row) throw new NotFoundError(`Producto ${id} no encontrado`);

    // Columnas aditivas retail-textil (no están en el schema Drizzle tipado)
    const fields: string[] = [];
    const vals:   unknown[] = [];
    if (data.code               !== undefined) { fields.push('code = ?');                vals.push(data.code); }
    if (data.showInCatalog      !== undefined) { fields.push('show_in_catalog = ?');     vals.push(data.showInCatalog ? 1 : 0); }
    if (data.catalogDescription !== undefined) { fields.push('catalog_description = ?'); vals.push(data.catalogDescription); }
    if (fields.length > 0) {
      sqlite.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...vals, id);
    }

    return this.getById(id, businessUnitId) ?? enrich(row);
  }

  toggleActive(id: number, businessUnitId: number, isActive: boolean): Product {
    const row = db
      .update(products)
      .set({ isActive, updatedAt: new Date().toISOString() })
      .where(and(eq(products.id, id), eq(products.businessUnitId, businessUnitId)))
      .returning()
      .all()[0];

    if (!row) throw new NotFoundError(`Producto ${id} no encontrado`);
    return enrich(row);
  }

  search(businessUnitId: number, query: string): Product[] {
    const all = this.getAll(businessUnitId);
    const strip     = /\p{Mn}/gu;
    const normalize = (s: string) => s.normalize('NFD').replace(strip, '').toLowerCase();
    const q = normalize(query);
    return all.filter(
      (p) => normalize(p.name).includes(q) || p.sku.toLowerCase().includes(q) || normalize(p.category ?? '').includes(q),
    );
  }

  getBySkuInBU(sku: string, businessUnitId: number): Product | null {
    const row = db
      .select()
      .from(products)
      .where(and(eq(products.sku, sku), eq(products.businessUnitId, businessUnitId)))
      .limit(1)
      .all()[0];
    return row ? enrich(row) : null;
  }
}
