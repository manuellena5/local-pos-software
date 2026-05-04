/**
 * Scheduler de sincronización con Supabase.
 * Se ejecuta cada 5 minutos (configurable con SYNC_INTERVAL_MINUTES).
 * Si Supabase no está configurado, el cron corre pero no hace nada.
 */

import cron from 'node-cron';
import { syncService } from '../core/services/SyncService';
import { isSupabaseConfigured } from '../config/supabase';
import { logger } from '../lib/logger';

const CTX = 'SyncScheduler';

export function startSyncScheduler(): void {
  const intervalMinutes = Number(process.env['SYNC_INTERVAL_MINUTES'] ?? 5);
  const cronExpr = `*/${intervalMinutes} * * * *`;

  if (!isSupabaseConfigured()) {
    logger.info(CTX, 'Supabase not configured — sync scheduler disabled');
    return;
  }

  logger.info(CTX, `Sync scheduler started (every ${intervalMinutes} min)`);

  cron.schedule(cronExpr, async () => {
    logger.info(CTX, 'Running scheduled sync...');
    try {
      const result = await syncService.syncAll();
      if (!result.skipped) {
        logger.info(CTX, 'Scheduled sync done', result as unknown as Record<string, unknown>);
      }
    } catch (err) {
      logger.error(CTX, 'Scheduled sync failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
