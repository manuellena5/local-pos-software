import { eq, and, asc } from 'drizzle-orm';
import { db } from '../../db/connection';
import { categories } from '../../db/schema';
import type { Category } from '../../../shared/types';

function rowToCategory(row: typeof categories.$inferSelect): Category {
  return {
    id: row.id,
    name: row.name,
    businessUnitId: row.businessUnitId,
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

export class CategoryRepository {
  /**
   * Retorna todas las categorías activas de una BU, ordenadas por nombre A-Z.
   */
  findAllForBU(businessUnitId: number): Category[] {
    return db
      .select()
      .from(categories)
      .where(and(eq(categories.businessUnitId, businessUnitId), eq(categories.isActive, true)))
      .orderBy(asc(categories.name))
      .all()
      .map(rowToCategory);
  }

  findById(id: number): Category | null {
    const row = db.select().from(categories).where(eq(categories.id, id)).get();
    return row ? rowToCategory(row) : null;
  }

  /**
   * Busca por nombre exacto (case-sensitive a nivel DB) dentro de una BU.
   * La comparación case-insensitive se hace en el service antes de llamar aquí.
   */
  findByNameForBU(name: string, businessUnitId: number): Category | null {
    const row = db
      .select()
      .from(categories)
      .where(and(eq(categories.name, name), eq(categories.businessUnitId, businessUnitId)))
      .get();
    return row ? rowToCategory(row) : null;
  }

  /**
   * Retorna todas las categorías de la BU (incluidas inactivas) para búsquedas amplias.
   * Usado internamente para validación case-insensitive de duplicados.
   */
  findAllForBUIncludingInactive(businessUnitId: number): Category[] {
    return db
      .select()
      .from(categories)
      .where(eq(categories.businessUnitId, businessUnitId))
      .all()
      .map(rowToCategory);
  }

  create(data: { name: string; businessUnitId: number }): Category {
    const result = db
      .insert(categories)
      .values({ name: data.name, businessUnitId: data.businessUnitId })
      .returning()
      .get();
    return rowToCategory(result);
  }

  update(id: number, name: string): Category {
    const result = db
      .update(categories)
      .set({ name })
      .where(eq(categories.id, id))
      .returning()
      .get();
    return rowToCategory(result);
  }

  /**
   * Soft-delete: marca la categoría como inactiva. No borra físicamente.
   */
  softDelete(id: number): void {
    db.update(categories).set({ isActive: false }).where(eq(categories.id, id)).run();
  }
}
