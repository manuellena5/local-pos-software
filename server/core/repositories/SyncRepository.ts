import { db } from '../../db/connection';
import { syncQueue, syncLogs } from '../../db/schema';
import { eq, asc, lte } from 'drizzle-orm';
import type { SyncQueueRow, SyncLogRow } from '../../db/schemas/core/sync';

export type SyncEntityType = 'product' | 'sale' | 'stock';
export type SyncAction = 'upsert' | 'delete';

export interface SyncQueueItem {
  id: number;
  entityType: SyncEntityType;
  entityId: number;
  action: SyncAction;
  businessUnitId: number;
  payload: Record<string, unknown>;
  attempts: number;
  lastError: string | null;
  createdAt: string;
}

const MAX_ATTEMPTS = 3;

function rowToItem(row: SyncQueueRow): SyncQueueItem {
  return {
    id: row.id,
    entityType: row.entityType as SyncEntityType,
    entityId: row.entityId,
    action: row.action as SyncAction,
    businessUnitId: row.businessUnitId,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    attempts: row.attempts,
    lastError: row.lastError ?? null,
    createdAt: row.createdAt,
  };
}

export class SyncRepository {
  // ── Cola ──────────────────────────────────────────────────────────────────

  enqueue(
    entityType: SyncEntityType,
    entityId: number,
    action: SyncAction,
    businessUnitId: number,
    payload: Record<string, unknown>,
  ): void {
    db.insert(syncQueue)
      .values({
        entityType,
        entityId,
        action,
        businessUnitId,
        payload: JSON.stringify(payload),
        attempts: 0,
      })
      .run();
  }

  /** Items con menos de MAX_ATTEMPTS, ordenados por creación */
  getPendingItems(): SyncQueueItem[] {
    return db
      .select()
      .from(syncQueue)
      .where(lte(syncQueue.attempts, MAX_ATTEMPTS))
      .orderBy(asc(syncQueue.createdAt))
      .all()
      .map(rowToItem);
  }

  markSuccess(id: number): void {
    db.delete(syncQueue).where(eq(syncQueue.id, id)).run();
  }

  markFailed(id: number, error: string): void {
    const row = db.select().from(syncQueue).where(eq(syncQueue.id, id)).get();
    if (!row) return;
    db.update(syncQueue)
      .set({ attempts: row.attempts + 1, lastError: error.slice(0, 500) })
      .where(eq(syncQueue.id, id))
      .run();
  }

  clearAll(): void {
    db.delete(syncQueue).run();
  }

  countPending(): number {
    return db.select().from(syncQueue).all().length;
  }

  // ── Logs ──────────────────────────────────────────────────────────────────

  addLog(
    status: 'ok' | 'error' | 'partial',
    synced: number,
    failed: number,
    durationMs: number,
    errorMsg?: string,
  ): SyncLogRow {
    return db
      .insert(syncLogs)
      .values({ status, synced, failed, durationMs, errorMsg: errorMsg ?? null })
      .returning()
      .get();
  }

  getRecentLogs(limit = 20): SyncLogRow[] {
    return db.select().from(syncLogs).all().slice(-limit);
  }
}
