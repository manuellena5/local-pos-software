import { eq, asc } from 'drizzle-orm';
import { db } from '../../../db/connection';
import { productImages } from '../../../db/schemas/modules/retail-textil';
import type { ProductImage } from '../../../db/schemas/modules/retail-textil';

export class ImageRepository {
  getByProductId(productId: number): ProductImage[] {
    return db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(asc(productImages.sortOrder))
      .all();
  }

  getPrimary(productId: number): ProductImage | undefined {
    return db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(asc(productImages.sortOrder))
      .all()
      .find((img) => img.isPrimary) ??
      db.select().from(productImages).where(eq(productImages.productId, productId)).get();
  }

  create(data: { productId: number; filePath: string; altText?: string; sortOrder: number; isPrimary: boolean }): ProductImage {
    return db.insert(productImages).values(data).returning().get()!;
  }

  findById(id: number): ProductImage | undefined {
    return db.select().from(productImages).where(eq(productImages.id, id)).get();
  }

  delete(id: number): void {
    db.delete(productImages).where(eq(productImages.id, id)).run();
  }

  /** Marca la imagen indicada como primaria y quita ese flag del resto. */
  setPrimary(productId: number, imageId: number): void {
    db.update(productImages)
      .set({ isPrimary: false })
      .where(eq(productImages.productId, productId))
      .run();
    db.update(productImages)
      .set({ isPrimary: true })
      .where(eq(productImages.id, imageId))
      .run();
  }

  /** Actualiza el sort_order de cada imagen según el array de IDs recibido. */
  reorder(productId: number, orderedIds: number[]): void {
    orderedIds.forEach((id, idx) => {
      db.update(productImages)
        .set({ sortOrder: idx })
        .where(eq(productImages.id, id))
        .run();
    });
  }

  countByProduct(productId: number): number {
    return db.select().from(productImages).where(eq(productImages.productId, productId)).all().length;
  }
}

export const imageRepository = new ImageRepository();
