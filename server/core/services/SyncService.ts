/**
 * SyncService — sincroniza datos locales con Supabase.
 *
 * Diseño:
 * - SQLite local es la fuente de verdad.
 * - Supabase es réplica/backup (nunca bloquea operaciones locales).
 * - Si Supabase no está configurado o falla: se logea y se continúa.
 * - Conflictos: last-write-wins por updatedAt/createdAt.
 *
 * Qué se sincroniza:
 * - Productos (catálogo público, sin costPrice)
 * - Resumen de ventas por día (sin items individuales)
 * - Stock actual por producto
 *
 * Qué NO se sincroniza:
 * - Caja / arqueos (datos sensibles, 100% locales)
 * - Credenciales / usuarios
 * - Items de venta individuales (privacidad)
 */

import { db } from '../../db/connection';
import { products, stockItems, sales } from '../../db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { getSupabaseClient, isSupabaseConfigured } from '../../config/supabase';
import { SyncRepository } from '../repositories/SyncRepository';
import { logger } from '../../lib/logger';
import { getDisplayPrice } from './pricing.utils';

const CTX = 'SyncService';

export interface SyncResult {
  synced: number;
  failed: number;
  durationMs: number;
  skipped?: boolean;
}

export class SyncService {
  private repo: SyncRepository;

  constructor() {
    this.repo = new SyncRepository();
  }

  // ── Productos ─────────────────────────────────────────────────────────────

  async syncProducts(businessUnitId: number): Promise<SyncResult> {
    const start = Date.now();
    let synced = 0;
    let failed = 0;

    const rows = db
      .select()
      .from(products)
      .where(and(eq(products.businessUnitId, businessUnitId), eq(products.isActive, true)))
      .all();

    for (const p of rows) {
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.from('products').upsert(
          {
            local_id:        p.id,
            business_unit_id: p.businessUnitId,
            name:            p.name,
            description:     p.description ?? null,
            category:        p.category ?? null,
            sku:             p.sku,
            display_price:   getDisplayPrice(p.basePrice, p.taxRate),
            tax_rate:        p.taxRate,
            is_active:       p.isActive,
            updated_at:      p.updatedAt,
          },
          { onConflict: 'local_id,business_unit_id', ignoreDuplicates: false },
        );
        if (error) throw new Error(error.message);
        synced++;
      } catch (err) {
        failed++;
        logger.warn(CTX, 'Failed to sync product', {
          productId: p.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { synced, failed, durationMs: Date.now() - start };
  }

  // ── Resumen de ventas ─────────────────────────────────────────────────────

  async syncSalesSummary(businessUnitId: number): Promise<SyncResult> {
    const start = Date.now();
    let synced = 0;
    let failed = 0;

    // Agrupar ventas por día (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = thirtyDaysAgo.toISOString().split('T')[0]!;

    const saleRows = db
      .select()
      .from(sales)
      .where(
        and(
          eq(sales.businessUnitId, businessUnitId),
          gte(sales.createdAt, fromDate),
        ),
      )
      .all();

    // Agregar por día
    const byDay = new Map<string, { count: number; total: number }>();
    for (const s of saleRows) {
      const day = s.createdAt.split('T')[0]!;
      const existing = byDay.get(day) ?? { count: 0, total: 0 };
      byDay.set(day, {
        count: existing.count + 1,
        total: Math.round((existing.total + s.totalAmount) * 100) / 100,
      });
    }

    for (const [day, summary] of byDay.entries()) {
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.from('sales_summary').upsert(
          {
            business_unit_id: businessUnitId,
            sale_date:        day,
            total_sales:      summary.count,
            total_amount:     summary.total,
          },
          { onConflict: 'business_unit_id,sale_date', ignoreDuplicates: false },
        );
        if (error) throw new Error(error.message);
        synced++;
      } catch (err) {
        failed++;
        logger.warn(CTX, 'Failed to sync sales summary', {
          day,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { synced, failed, durationMs: Date.now() - start };
  }

  // ── Stock ─────────────────────────────────────────────────────────────────

  async syncStock(businessUnitId: number): Promise<SyncResult> {
    const start = Date.now();
    let synced = 0;
    let failed = 0;

    const rows = db
      .select()
      .from(stockItems)
      .where(eq(stockItems.businessUnitId, businessUnitId))
      .all();

    for (const item of rows) {
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.from('stock_summary').upsert(
          {
            local_id:         item.id,
            product_id:       item.productId,
            business_unit_id: businessUnitId,
            quantity:         item.quantity,
            minimum_threshold: item.minimumThreshold,
            updated_at:       item.updatedAt,
          },
          { onConflict: 'local_id', ignoreDuplicates: false },
        );
        if (error) throw new Error(error.message);
        synced++;
      } catch (err) {
        failed++;
        logger.warn(CTX, 'Failed to sync stock item', {
          stockItemId: item.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { synced, failed, durationMs: Date.now() - start };
  }

  // ── Sync completo ─────────────────────────────────────────────────────────

  async syncAll(businessUnitId?: number): Promise<SyncResult> {
    if (!isSupabaseConfigured()) {
      logger.info(CTX, 'Supabase not configured — skipping sync');
      return { synced: 0, failed: 0, durationMs: 0, skipped: true };
    }

    const start = Date.now();
    let totalSynced = 0;
    let totalFailed = 0;

    // Obtener BUs a sincronizar
    const buIds: number[] = businessUnitId
      ? [businessUnitId]
      : db
          .select()
          .from(products)
          .all()
          .map((p) => p.businessUnitId)
          .filter((v, i, a) => a.indexOf(v) === i);

    for (const buId of buIds) {
      const [pResult, sResult, stResult] = await Promise.allSettled([
        this.syncProducts(buId),
        this.syncSalesSummary(buId),
        this.syncStock(buId),
      ]);

      for (const r of [pResult, sResult, stResult]) {
        if (r.status === 'fulfilled') {
          totalSynced += r.value.synced;
          totalFailed += r.value.failed;
        } else {
          totalFailed++;
          logger.error(CTX, 'Sync task failed', { reason: String(r.reason) });
        }
      }
    }

    // También procesar cola de pendientes offline
    await this.processQueue();

    const durationMs = Date.now() - start;
    const status = totalFailed === 0 ? 'ok' : totalSynced > 0 ? 'partial' : 'error';
    this.repo.addLog(status, totalSynced, totalFailed, durationMs);

    logger.info(CTX, 'Sync completed', { synced: totalSynced, failed: totalFailed, durationMs });
    return { synced: totalSynced, failed: totalFailed, durationMs };
  }

  // ── Cola offline ──────────────────────────────────────────────────────────

  async processQueue(): Promise<void> {
    const items = this.repo.getPendingItems();
    if (items.length === 0) return;

    logger.info(CTX, `Processing sync queue: ${items.length} items`);

    for (const item of items) {
      try {
        const supabase = getSupabaseClient();
        const table = item.entityType === 'product'
          ? 'products'
          : item.entityType === 'stock'
          ? 'stock_summary'
          : 'sales_summary';

        if (item.action === 'upsert') {
          const { error } = await supabase.from(table).upsert(item.payload);
          if (error) throw new Error(error.message);
        } else {
          const { error } = await supabase.from(table).delete().eq('local_id', item.entityId);
          if (error) throw new Error(error.message);
        }

        this.repo.markSuccess(item.id);
      } catch (err) {
        this.repo.markFailed(item.id, err instanceof Error ? err.message : String(err));
      }
    }
  }

  // ── Utilidades ────────────────────────────────────────────────────────────

  getRecentLogs() {
    return this.repo.getRecentLogs(20);
  }

  countPending(): number {
    return this.repo.countPending();
  }
}

// Singleton para uso en routes y jobs
export const syncService = new SyncService();
