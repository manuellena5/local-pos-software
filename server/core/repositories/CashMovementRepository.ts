import { db, sqlite } from '../../db/connection';
import { cashMovements } from '../../db/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import type { CashMovement, CashMovementType, CashPaymentMethodType } from '../../../shared/types';
import type { CreateCashMovementRequest } from '../types';

function rowToModel(row: typeof cashMovements.$inferSelect): CashMovement {
  return {
    id: row.id,
    businessUnitId: row.businessUnitId,
    type: row.type as CashMovementType,
    amount: row.amount,
    description: row.description,
    saleId: row.saleId,
    userId: row.userId,
    code: row.code ?? null,
    paymentMethod: (row.paymentMethod ?? 'cash') as CashPaymentMethodType,
    createdAt: row.createdAt,
  };
}

export class CashMovementRepository {
  create(
    businessUnitId: number,
    data: CreateCashMovementRequest & { code?: string },
    userId?: number,
  ): CashMovement {
    const row = db
      .insert(cashMovements)
      .values({
        businessUnitId,
        type: data.type,
        amount: data.amount,
        description: data.description,
        saleId: data.saleId ?? null,
        userId: userId ?? null,
        code: data.code ?? null,
        paymentMethod: data.paymentMethod ?? 'cash',
      })
      .returning()
      .get();
    return rowToModel(row);
  }

  getAll(
    businessUnitId: number,
    filters?: { fromDate?: string; toDate?: string },
  ): CashMovement[] {
    const conditions = [eq(cashMovements.businessUnitId, businessUnitId)];

    if (filters?.fromDate) {
      conditions.push(gte(cashMovements.createdAt, filters.fromDate));
    }
    if (filters?.toDate) {
      // Incluir todo el día
      conditions.push(lte(cashMovements.createdAt, filters.toDate + ' 23:59:59'));
    }

    return db
      .select()
      .from(cashMovements)
      .where(and(...conditions))
      .orderBy(cashMovements.createdAt)
      .all()
      .map(rowToModel);
  }

  getByDate(businessUnitId: number, date: string): CashMovement[] {
    return db
      .select()
      .from(cashMovements)
      .where(
        and(
          eq(cashMovements.businessUnitId, businessUnitId),
          sql`DATE(${cashMovements.createdAt}) = ${date}`,
        ),
      )
      .orderBy(cashMovements.createdAt)
      .all()
      .map(rowToModel);
  }

  getBySaleId(saleId: number): CashMovement | null {
    const row = db
      .select()
      .from(cashMovements)
      .where(eq(cashMovements.saleId, saleId))
      .get();
    return row ? rowToModel(row) : null;
  }

  getById(id: number): CashMovement | null {
    const row = db
      .select()
      .from(cashMovements)
      .where(eq(cashMovements.id, id))
      .get();
    return row ? rowToModel(row) : null;
  }

  getAllOpenings(businessUnitId: number): CashMovement[] {
    return db
      .select()
      .from(cashMovements)
      .where(
        and(
          eq(cashMovements.businessUnitId, businessUnitId),
          eq(cashMovements.type, 'opening'),
        ),
      )
      .orderBy(desc(cashMovements.createdAt))
      .all()
      .map(rowToModel);
  }

  /**
   * Cuenta cuántos movimientos de apertura existen para una BU en una fecha dada.
   * Usado para generar el sufijo del código de sesión.
   */
  countSameDayOpenings(businessUnitId: number, date: string): number {
    type Row = { count: number };
    const result = sqlite
      .prepare(
        `SELECT COUNT(*) as count FROM cash_movements
         WHERE type = 'opening'
           AND business_unit_id = ?
           AND DATE(created_at, 'localtime') = ?`,
      )
      .get(businessUnitId, date) as Row;
    return result?.count ?? 0;
  }

  /**
   * Devuelve el último movimiento de un tipo dado, o null si no existe.
   */
  getLatestOfType(businessUnitId: number, type: CashMovementType): CashMovement | null {
    const row = db
      .select()
      .from(cashMovements)
      .where(and(eq(cashMovements.businessUnitId, businessUnitId), eq(cashMovements.type, type)))
      .orderBy(desc(cashMovements.createdAt))
      .get();
    return row ? rowToModel(row) : null;
  }

  /**
   * Calcula el balance neto de la caja:
   * - Suma: sale, deposit, other
   * - Resta: refund, withdrawal
   */
  getBalance(businessUnitId: number, upToDate?: string): number {
    const conditions = [eq(cashMovements.businessUnitId, businessUnitId)];
    if (upToDate) {
      conditions.push(lte(cashMovements.createdAt, upToDate + ' 23:59:59'));
    }

    const rows = db
      .select()
      .from(cashMovements)
      .where(and(...conditions))
      .all();

    return rows.reduce((total, row) => {
      if (row.type === 'refund' || row.type === 'withdrawal') {
        return total - row.amount;
      }
      return total + row.amount;
    }, 0);
  }
}
