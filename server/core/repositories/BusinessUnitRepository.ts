import { eq } from 'drizzle-orm';
import { db } from '../../db/connection';
import { businessUnits } from '../../db/schema';
import type { BusinessUnit } from '../../../shared/types';
import { NotFoundError } from '../../lib/errors';

interface CreateBusinessUnitData {
  installationId: number;
  name: string;
  moduleId: string;
  invoicePrefix: string;
}

interface UpdateBusinessUnitData {
  name?: string;
  isActive?: boolean;
  invoicePrefix?: string;
}

export class BusinessUnitRepository {
  getAll(): BusinessUnit[] {
    return db.select().from(businessUnits).all();
  }

  getById(id: number): BusinessUnit | null {
    const rows = db
      .select()
      .from(businessUnits)
      .where(eq(businessUnits.id, id))
      .limit(1)
      .all();
    return rows[0] ?? null;
  }

  create(data: CreateBusinessUnitData): BusinessUnit {
    const rows = db.insert(businessUnits).values(data).returning().all();
    return rows[0];
  }

  /**
   * Actualiza campos de una BU.
   * @throws {NotFoundError} Si la BU no existe.
   */
  update(id: number, data: UpdateBusinessUnitData): BusinessUnit {
    const rows = db
      .update(businessUnits)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(businessUnits.id, id))
      .returning()
      .all();
    const row = rows[0];
    if (!row) throw new NotFoundError(`Unidad de negocio ${id} no encontrada`);
    return row;
  }
}
