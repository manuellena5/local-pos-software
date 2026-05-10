import { eq } from 'drizzle-orm';
import { db } from '../../../db/connection';
import { productAttributes } from '../../../db/schemas/modules/retail-textil';
import type { ProductAttribute } from '../../../db/schemas/modules/retail-textil';

export class AttributeRepository {
  /** Devuelve todos los atributos de un producto, ordenados por sort_order. */
  getByProductId(productId: number): ProductAttribute[] {
    return db
      .select()
      .from(productAttributes)
      .where(eq(productAttributes.productId, productId))
      .orderBy(productAttributes.sortOrder)
      .all();
  }

  /** Reemplaza todos los atributos de un producto (delete + insert). */
  replaceAll(
    productId: number,
    items: Array<{ key: string; value: string; sortOrder: number }>,
  ): ProductAttribute[] {
    db.delete(productAttributes).where(eq(productAttributes.productId, productId)).run();

    if (items.length === 0) return [];

    return db
      .insert(productAttributes)
      .values(items.map((it) => ({ productId, key: it.key, value: it.value, sortOrder: it.sortOrder })))
      .returning()
      .all();
  }

  /** Elimina todos los atributos de un producto. */
  deleteAll(productId: number): void {
    db.delete(productAttributes).where(eq(productAttributes.productId, productId)).run();
  }
}

export const attributeRepository = new AttributeRepository();
