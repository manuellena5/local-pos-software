import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { db } from '../../../db/connection';
import { tallerClientMeasurements } from '../../../db/schemas/modules/taller-medida';
import type { TallerClientMeasurements } from '../../../db/schemas/modules/taller-medida';

export class MeasurementRepository {
  getByCustomerAndBu(customerId: number, buId: number): TallerClientMeasurements | undefined {
    return db
      .select()
      .from(tallerClientMeasurements)
      .where(
        and(
          eq(tallerClientMeasurements.customerId, customerId),
          eq(tallerClientMeasurements.buId, buId),
        ),
      )
      .get();
  }

  upsert(customerId: number, buId: number, fields: Record<string, string>): TallerClientMeasurements {
    const fieldsJson = JSON.stringify(fields);
    const existing = this.getByCustomerAndBu(customerId, buId);

    if (existing) {
      return db
        .update(tallerClientMeasurements)
        .set({ fields: fieldsJson, updatedAt: sql`(datetime('now'))` })
        .where(eq(tallerClientMeasurements.id, existing.id))
        .returning()
        .get();
    }

    return db
      .insert(tallerClientMeasurements)
      .values({ customerId, buId, fields: fieldsJson })
      .returning()
      .get();
  }
}

export const measurementRepository = new MeasurementRepository();
