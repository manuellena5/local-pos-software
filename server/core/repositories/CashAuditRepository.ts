import { db } from '../../db/connection';
import { cashAudits } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { CashAudit } from '../../../shared/types';

function rowToModel(row: typeof cashAudits.$inferSelect): CashAudit {
  return {
    id: row.id,
    businessUnitId: row.businessUnitId,
    auditDate: row.auditDate,
    theoreticalBalance: row.theoreticalBalance,
    realBalance: row.realBalance,
    difference: row.difference,
    notes: row.notes,
    status: row.status as CashAudit['status'],
    createdAt: row.createdAt,
  };
}

export class CashAuditRepository {
  create(
    businessUnitId: number,
    data: {
      auditDate: string;
      theoreticalBalance: number;
      realBalance: number;
      difference: number;
      notes?: string;
      status: CashAudit['status'];
    },
  ): CashAudit {
    const row = db
      .insert(cashAudits)
      .values({
        businessUnitId,
        auditDate: data.auditDate,
        theoreticalBalance: data.theoreticalBalance,
        realBalance: data.realBalance,
        difference: data.difference,
        notes: data.notes ?? null,
        status: data.status,
      })
      .returning()
      .get();
    return rowToModel(row);
  }

  getAll(businessUnitId: number): CashAudit[] {
    return db
      .select()
      .from(cashAudits)
      .where(eq(cashAudits.businessUnitId, businessUnitId))
      .orderBy(desc(cashAudits.auditDate))
      .all()
      .map(rowToModel);
  }

  getLatest(businessUnitId: number): CashAudit | null {
    const row = db
      .select()
      .from(cashAudits)
      .where(eq(cashAudits.businessUnitId, businessUnitId))
      .orderBy(desc(cashAudits.createdAt))
      .limit(1)
      .get();
    return row ? rowToModel(row) : null;
  }

  getByDate(businessUnitId: number, date: string): CashAudit | null {
    const row = db
      .select()
      .from(cashAudits)
      .where(
        and(
          eq(cashAudits.businessUnitId, businessUnitId),
          eq(cashAudits.auditDate, date),
        ),
      )
      .get();
    return row ? rowToModel(row) : null;
  }
}
