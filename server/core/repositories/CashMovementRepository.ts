import { db } from '../../db/connection';
import { cashMovements } from '../../db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import type { CashMovement, CashMovementType } from '../../../shared/types';
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
    createdAt: row.createdAt,
  };
}

export class CashMovementRepository {
  create(
    businessUnitId: number,
    data: CreateCashMovementRequest,
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
