import type { Request, Response } from 'express';
import type { SaleRepository } from '../repositories/SaleRepository';
import type { PendingInvoiceRepository } from '../repositories/PendingInvoiceRepository';
import type { InvoiceQueueService } from '../services/InvoiceQueueService';
import { NotFoundError, ValidationError } from '../../lib/errors';
import { logger } from '../../lib/logger';

const CTX = 'InvoicesController';

export class InvoicesController {
  constructor(
    private readonly saleRepo: SaleRepository,
    private readonly pendingRepo: PendingInvoiceRepository,
    private readonly invoiceQueueService: InvoiceQueueService,
  ) {}

  /**
   * GET /api/invoices/queue?businessUnitId=1
   * Retorna todas las facturas pendientes de una BU.
   */
  getQueue = (req: Request, res: Response): void => {
    const businessUnitId = parseInt(req.query['businessUnitId'] as string, 10);
    if (!businessUnitId || isNaN(businessUnitId)) {
      res.status(400).json({ data: null, error: { code: 'INVALID_PARAM', message: 'businessUnitId requerido' } });
      return;
    }

    const pending = this.pendingRepo.getPending(10); // traer todas, filtrar por BU
    const filtered = pending.filter((p) => p.businessUnitId === businessUnitId);
    res.json({ data: filtered, error: null });
  };

  /**
   * POST /api/invoices/:saleId/retry?businessUnitId=1
   * Fuerza un reintento inmediato de facturación para una venta.
   */
  retryInvoice = async (req: Request, res: Response): Promise<void> => {
    const saleId = parseInt(req.params['saleId'] ?? '', 10);
    const businessUnitId = parseInt(req.query['businessUnitId'] as string, 10);

    if (isNaN(saleId) || isNaN(businessUnitId)) {
      res.status(400).json({ data: null, error: { code: 'INVALID_PARAM', message: 'saleId y businessUnitId requeridos' } });
      return;
    }

    const saleWithItems = this.saleRepo.getById(saleId, businessUnitId);
    if (!saleWithItems) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Venta no encontrada' } });
      return;
    }

    const { sale } = saleWithItems;
    if (sale.invoiceStatus === 'issued') {
      res.status(409).json({ data: null, error: { code: 'ALREADY_ISSUED', message: 'La factura ya fue emitida' } });
      return;
    }

    logger.info(CTX, 'Manual retry requested', { saleId, businessUnitId });

    // Reset de reintentos en pending_invoices si está en estado failed
    const pi = this.pendingRepo.getBySaleId(saleId);
    if (!pi) {
      this.pendingRepo.enqueue(saleId, businessUnitId, 'B');
    }

    // Ejecutar de forma async — devolver 202 de inmediato
    this.invoiceQueueService.tryIssueAfterSale(sale).catch((err: unknown) => {
      logger.error(CTX, 'Manual retry failed', { saleId, error: err instanceof Error ? err.message : String(err) });
    });

    res.status(202).json({ data: { message: 'Reintento iniciado' }, error: null });
  };

  /**
   * GET /api/invoices/stats?businessUnitId=1
   * Retorna contadores de estado de facturación para el badge de la UI.
   */
  getStats = (req: Request, res: Response): void => {
    const businessUnitId = parseInt(req.query['businessUnitId'] as string, 10);
    if (!businessUnitId || isNaN(businessUnitId)) {
      res.status(400).json({ data: null, error: { code: 'INVALID_PARAM', message: 'businessUnitId requerido' } });
      return;
    }

    const sales = this.saleRepo.getAll(businessUnitId);
    const stats = {
      total: sales.length,
      issued: sales.filter((s) => s.invoiceStatus === 'issued').length,
      pending: sales.filter((s) => s.invoiceStatus === 'pending').length,
      failed: sales.filter((s) => s.invoiceStatus === 'failed' || s.invoiceStatus === 'error').length,
    };

    res.json({ data: stats, error: null });
  };
}
