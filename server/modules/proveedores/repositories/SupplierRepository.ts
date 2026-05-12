import { eq, and, asc } from 'drizzle-orm';
import { db } from '../../../db/connection';
import { suppliers } from '../../../db/schema';
import type { Supplier } from '../../../../shared/types';
import type { CreateSupplierInput, UpdateSupplierInput } from '../schemas';

function rowToSupplier(row: typeof suppliers.$inferSelect): Supplier {
  return {
    id:             row.id,
    businessUnitId: row.businessUnitId,
    name:           row.name,
    contactName:    row.contactName ?? null,
    phone:          row.phone ?? null,
    email:          row.email ?? null,
    paymentTerms:   (row.paymentTerms as Supplier['paymentTerms']) ?? null,
    deliveryDays:   row.deliveryDays ?? null,
    notes:          row.notes ?? null,
    isActive:       row.isActive,
    createdAt:      row.createdAt,
    updatedAt:      row.updatedAt,
  };
}

export class SupplierRepository {
  findAllForBU(businessUnitId: number): Supplier[] {
    return db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.businessUnitId, businessUnitId), eq(suppliers.isActive, true)))
      .orderBy(asc(suppliers.name))
      .all()
      .map(rowToSupplier);
  }

  findById(id: number, businessUnitId: number): Supplier | null {
    const row = db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.businessUnitId, businessUnitId)))
      .get();
    return row ? rowToSupplier(row) : null;
  }

  /** Para validación de duplicados — incluye inactivos */
  findAllForBUIncludingInactive(businessUnitId: number): Supplier[] {
    return db
      .select()
      .from(suppliers)
      .where(eq(suppliers.businessUnitId, businessUnitId))
      .all()
      .map(rowToSupplier);
  }

  create(data: CreateSupplierInput): Supplier {
    const result = db
      .insert(suppliers)
      .values({
        businessUnitId: data.businessUnitId,
        name:           data.name,
        contactName:    data.contactName ?? null,
        phone:          data.phone ?? null,
        email:          data.email || null,
        paymentTerms:   data.paymentTerms ?? null,
        deliveryDays:   data.deliveryDays ?? null,
        notes:          data.notes ?? null,
      })
      .returning()
      .get();
    return rowToSupplier(result);
  }

  update(id: number, data: UpdateSupplierInput): Supplier {
    const result = db
      .update(suppliers)
      .set({
        ...(data.name          !== undefined && { name:          data.name }),
        ...(data.contactName   !== undefined && { contactName:   data.contactName ?? null }),
        ...(data.phone         !== undefined && { phone:         data.phone ?? null }),
        ...(data.email         !== undefined && { email:         data.email || null }),
        ...(data.paymentTerms  !== undefined && { paymentTerms:  data.paymentTerms ?? null }),
        ...(data.deliveryDays  !== undefined && { deliveryDays:  data.deliveryDays ?? null }),
        ...(data.notes         !== undefined && { notes:         data.notes ?? null }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(suppliers.id, id))
      .returning()
      .get();
    return rowToSupplier(result);
  }

  softDelete(id: number): void {
    db.update(suppliers)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(suppliers.id, id))
      .run();
  }
}
