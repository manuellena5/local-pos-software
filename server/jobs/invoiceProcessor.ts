import cron from 'node-cron';
import { logger } from '../lib/logger';
import { invoiceQueueService } from '../core/routes/invoices.routes';

const CTX = 'InvoiceProcessor';

/**
 * Cron job: procesa la cola de facturas pendientes cada 5 minutos.
 * Se registra una sola vez al arrancar el servidor.
 */
export function startInvoiceProcessor(): void {
  logger.info(CTX, 'Starting invoice processor cron job (every 5 minutes)');

  cron.schedule('*/5 * * * *', async () => {
    logger.debug(CTX, 'Running pending invoice queue processing');
    try {
      await invoiceQueueService.processPendingQueue();
    } catch (err: unknown) {
      logger.error(CTX, 'Unhandled error in invoice processor', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
