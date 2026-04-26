import { eq, and, like } from 'drizzle-orm';
import { db } from '../../db/connection';
import { products } from '../../db/schema';
import type { Product } from '../../../shared/types';
import type { CreateProductRequest, UpdateProductRequest } from '../types';
import { NotFoundError } from '../../lib/errors';

export class ProductRepository {
  getAll(businessUnitId: number): Product[] {
    return db
      .select()
      .from(products)
      .where(and(eq(products.businessUnitId, businessUnitId), eq(products.isActive, true)))
      .all();
  }

  getById(id: number, businessUnitId: number): Product | null {
    const rows = db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.businessUnitId, businessUnitId)))
      .limit(1)
      .all();
    return rows[0] ?? null;
  }

  create(businessUnitId: number, data: CreateProductRequest): Product {
    const rows = db
      .insert(products)
      .values({
        businessUnitId,
        name: data.name,
        description: data.description,
        category: data.category,
        sku: data.sku,
        costPrice: data.costPrice,
        basePrice: data.basePrice,
        taxRate: data.taxRate ?? 21,
        isActive: true,
      })
      .returning()
      .all();
    return rows[0]!;
  }

  update(id: number, businessUnitId: number, data: UpdateProductRequest): Product {
    const rows = db
      .update(products)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
        ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(products.id, id), eq(products.businessUnitId, businessUnitId)))
      .returning()
      .all();

    const row = rows[0];
    if (!row) throw new NotFoundError(`Producto ${id} no encontrado`);
    return row;
  }

  toggleActive(id: number, businessUnitId: number, isActive: boolean): Product {
    const rows = db
      .update(products)
      .set({
        isActive,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(products.id, id), eq(products.businessUnitId, businessUnitId)))
      .returning()
      .all();

    const row = rows[0];
    if (!row) throw new NotFoundError(`Producto ${id} no encontrado`);
    return row;
  }

  search(businessUnitId: number, query: string): Product[] {
    const searchPattern = `%${query}%`;
    return db
      .select()
      .from(products)
      .where(
        and(
          eq(products.businessUnitId, businessUnitId),
          eq(products.isActive, true),
          like(products.name, searchPattern)
        )
      )
      .all();
  }

  getBySkuInBU(sku: string, businessUnitId: number): Product | null {
    const rows = db
      .select()
      .from(products)
      .where(and(eq(products.sku, sku), eq(products.businessUnitId, businessUnitId)))
      .limit(1)
      .all();
    return rows[0] ?? null;
  }
}
