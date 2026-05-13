import { eq, and } from 'drizzle-orm';
import { db, sqlite } from '../../../db/connection';
import { supplierProducts } from '../../../db/schemas/modules/supplierProducts';
import type { SupplierProduct, UpsertSupplierProductDTO } from '../../../../shared/types';

function mapRow(row: typeof supplierProducts.$inferSelect): SupplierProduct {
  return {
    id:             row.id,
    supplierId:     row.supplierId,
    businessUnitId: row.businessUnitId,
    name:           row.name,
    supplierCode:   row.supplierCode ?? null,
    unitCost:       row.unitCost,
    currency:       row.currency,
    unit:           row.unit,
    categoryHint:   row.categoryHint ?? null,
    isActive:       row.isActive,
    lastUpdated:    row.lastUpdated,
    createdAt:      row.createdAt,
  };
}

export class SupplierProductRepository {
  findAllBySupplierId(supplierId: number): SupplierProduct[] {
    return db
      .select()
      .from(supplierProducts)
      .where(and(eq(supplierProducts.supplierId, supplierId), eq(supplierProducts.isActive, true)))
      .orderBy(supplierProducts.name)
      .all()
      .map(mapRow);
  }

  findById(id: number): SupplierProduct | null {
    const row = db
      .select()
      .from(supplierProducts)
      .where(eq(supplierProducts.id, id))
      .get();
    return row ? mapRow(row) : null;
  }

  findBySupplierCode(supplierId: number, supplierCode: string): SupplierProduct | null {
    const row = db
      .select()
      .from(supplierProducts)
      .where(
        and(
          eq(supplierProducts.supplierId, supplierId),
          eq(supplierProducts.supplierCode, supplierCode),
        ),
      )
      .get();
    return row ? mapRow(row) : null;
  }

  findByName(supplierId: number, name: string): SupplierProduct | null {
    const all = db
      .select()
      .from(supplierProducts)
      .where(eq(supplierProducts.supplierId, supplierId))
      .all();
    const match = all.find(
      (r) => r.name.toLowerCase() === name.toLowerCase() && r.supplierCode == null,
    );
    return match ? mapRow(match) : null;
  }

  create(data: UpsertSupplierProductDTO): SupplierProduct {
    const row = db
      .insert(supplierProducts)
      .values({
        supplierId:     data.supplierId,
        businessUnitId: data.businessUnitId,
        name:           data.name,
        supplierCode:   data.supplierCode ?? null,
        unitCost:       data.unitCost,
        currency:       data.currency ?? 'ARS',
        unit:           data.unit ?? 'unidad',
        categoryHint:   data.categoryHint ?? null,
      })
      .returning()
      .get();
    return mapRow(row);
  }

  update(id: number, data: Partial<UpsertSupplierProductDTO>): SupplierProduct {
    const row = db
      .update(supplierProducts)
      .set({
        ...(data.name        !== undefined && { name: data.name }),
        ...(data.supplierCode !== undefined && { supplierCode: data.supplierCode }),
        ...(data.unitCost    !== undefined && { unitCost: data.unitCost, lastUpdated: new Date().toISOString().slice(0, 19).replace('T', ' ') }),
        ...(data.currency    !== undefined && { currency: data.currency }),
        ...(data.unit        !== undefined && { unit: data.unit }),
        ...(data.categoryHint !== undefined && { categoryHint: data.categoryHint }),
      })
      .where(eq(supplierProducts.id, id))
      .returning()
      .get();
    return mapRow(row);
  }

  softDelete(id: number): void {
    db.update(supplierProducts)
      .set({ isActive: false })
      .where(eq(supplierProducts.id, id))
      .run();
  }

  countBySupplierId(supplierId: number): number {
    const rows = db
      .select()
      .from(supplierProducts)
      .where(and(eq(supplierProducts.supplierId, supplierId), eq(supplierProducts.isActive, true)))
      .all();
    return rows.length;
  }

  upsertMany(
    items: UpsertSupplierProductDTO[],
  ): { created: number; updated: number; unchanged: number } {
    let created = 0;
    let updated = 0;
    let unchanged = 0;

    const doUpsert = sqlite.transaction(() => {
      for (const item of items) {
        // Buscar existente por código o nombre
        const existing = item.supplierCode
          ? this.findBySupplierCode(item.supplierId, item.supplierCode)
          : this.findByName(item.supplierId, item.name);

        if (!existing) {
          this.create(item);
          created++;
        } else if (existing.unitCost !== item.unitCost) {
          this.update(existing.id, { unitCost: item.unitCost });
          updated++;
        } else {
          unchanged++;
        }
      }
    });

    doUpsert();
    return { created, updated, unchanged };
  }
}
