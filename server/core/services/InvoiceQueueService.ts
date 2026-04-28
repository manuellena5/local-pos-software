import { logger } from '../../lib/logger';
import type { AFIPService } from './AFIPService';
import type { PendingInvoiceRepository } from '../repositories/PendingInvoiceRepository';
import type { SaleRepository } from '../repositories/SaleRepository';
import type { Sale } from '../../../shared/types';
import type { AFIPInvoiceRequest } from '../types';

const CTX = 'InvoiceQueueService';
const MAX_RETRIES = 3;
const AFIP_TIMEOUT_MS = 10_000;

export class InvoiceQueueService {
  constructor(
    private readonly afipService: AFIPService,
    private readonly pendingRepo: PendingInvoiceRepository,
    private readonly saleRepo: SaleRepository,
  ) {}

  /**
   * Llamado inmediatamente después de confirmar una venta (non-blocking).
   * Intenta emitir la factura con un timeout de 10 s.
   * Si falla, encola en pending_invoices para reintentos automáticos.
   */
  async tryIssueAfterSale(sale: Sale): Promise<void> {
    logger.info(CTX, 'Attempting immediate invoice after sale', { saleId: sale.id });

    const req = this.buildRequest(sale);

    try {
      const result = await withTimeout(this.afipService.requestCAE(req), AFIP_TIMEOUT_MS);

      if (result.success && result.cae) {
        this.saleRepo.updateInvoiceFields(sale.id, {
          cae: result.cae,
          caeExpiration: result.caeExpiration,
          invoiceNumber: result.invoiceNumber,
          invoiceStatus: 'issued',
          invoiceError: null,
          invoiceAttempts: 1,
          lastInvoiceAttemptAt: new Date().toISOString(),
        });
        logger.info(CTX, 'Invoice issued immediately', {
          saleId: sale.id,
          cae: result.cae,
          invoiceNumber: result.invoiceNumber,
        });
        return;
      }

      // AFIP devolvió error de validación (no reintentable si ya alcanzó max)
      logger.warn(CTX, 'AFIP returned error, queuing for retry', {
        saleId: sale.id,
        error: result.error,
      });
      this.saleRepo.updateInvoiceFields(sale.id, {
        invoiceStatus: 'pending',
        invoiceError: result.error ?? 'Unknown AFIP error',
        invoiceAttempts: 1,
        lastInvoiceAttemptAt: new Date().toISOString(),
      });
      this.pendingRepo.enqueue(sale.id, sale.businessUnitId, 'B');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(CTX, 'Immediate invoice failed (timeout or crash), queuing', {
        saleId: sale.id,
        error: message,
      });
      this.saleRepo.updateInvoiceFields(sale.id, {
        invoiceStatus: 'pending',
        invoiceError: message,
        invoiceAttempts: 1,
        lastInvoiceAttemptAt: new Date().toISOString(),
      });
      this.pendingRepo.enqueue(sale.id, sale.businessUnitId, 'B');
    }
  }

  /**
   * Procesa la cola de facturas pendientes.
   * Llamado por el cron job cada 5 minutos.
   */
  async processPendingQueue(): Promise<void> {
    const pending = this.pendingRepo.getPending(MAX_RETRIES);

    if (pending.length === 0) {
      logger.debug(CTX, 'No pending invoices to process');
      return;
    }

    logger.info(CTX, `Processing ${pending.length} pending invoice(s)`);

    for (const pi of pending) {
      // Obtener la venta completa
      const saleWithItems = this.saleRepo.getById(pi.saleId, pi.businessUnitId);
      if (!saleWithItems) {
        logger.error(CTX, 'Pending invoice references unknown sale', { saleId: pi.saleId });
        this.pendingRepo.recordFailure(pi.id, 'Sale not found');
        continue;
      }

      const { sale } = saleWithItems;
      const req = this.buildRequest(sale);
      const attemptNumber = pi.retryCount + 1;

      try {
        const result = await withTimeout(this.afipService.requestCAE(req), AFIP_TIMEOUT_MS);

        if (result.success && result.cae) {
          this.saleRepo.updateInvoiceFields(sale.id, {
            cae: result.cae,
            caeExpiration: result.caeExpiration,
            invoiceNumber: result.invoiceNumber,
            invoiceStatus: 'issued',
            invoiceError: null,
            invoiceAttempts: attemptNumber,
            lastInvoiceAttemptAt: new Date().toISOString(),
          });
          this.pendingRepo.remove(pi.id);
          logger.info(CTX, 'Pending invoice issued', {
            saleId: sale.id,
            cae: result.cae,
            attempt: attemptNumber,
          });
        } else {
          const isLastAttempt = attemptNumber >= MAX_RETRIES;
          this.saleRepo.updateInvoiceFields(sale.id, {
            invoiceStatus: isLastAttempt ? 'failed' : 'pending',
            invoiceError: result.error ?? 'Unknown AFIP error',
            invoiceAttempts: attemptNumber,
            lastInvoiceAttemptAt: new Date().toISOString(),
          });
          this.pendingRepo.recordFailure(pi.id, result.error ?? 'Unknown AFIP error');

          if (isLastAttempt) {
            logger.error(CTX, 'Pending invoice exhausted retries', {
              saleId: sale.id,
              error: result.error,
            });
          } else {
            logger.warn(CTX, 'Pending invoice retry failed', {
              saleId: sale.id,
              attempt: attemptNumber,
              error: result.error,
            });
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const isLastAttempt = attemptNumber >= MAX_RETRIES;
        this.saleRepo.updateInvoiceFields(sale.id, {
          invoiceStatus: isLastAttempt ? 'failed' : 'pending',
          invoiceError: message,
          invoiceAttempts: attemptNumber,
          lastInvoiceAttemptAt: new Date().toISOString(),
        });
        this.pendingRepo.recordFailure(pi.id, message);
        logger.warn(CTX, 'Pending invoice retry threw exception', {
          saleId: sale.id,
          attempt: attemptNumber,
          error: message,
        });
      }
    }
  }

  private buildRequest(sale: Sale): AFIPInvoiceRequest {
    return {
      saleId: sale.id,
      businessUnitId: sale.businessUnitId,
      invoiceType: 'B',
      pointOfSale: parseInt(process.env.AFIP_POINT_OF_SALE ?? '1', 10),
      totalAmount: sale.totalAmount,
      taxableAmount: sale.taxableAmount,
      taxAmount: sale.taxAmount,
      taxRate: sale.taxRate,
      date: sale.createdAt.slice(0, 10).replace(/-/g, ''),
    };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`AFIP timeout after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}
