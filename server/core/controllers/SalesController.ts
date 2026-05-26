import type { Request, Response, NextFunction } from 'express';
import type { SalesService } from '../services/SalesService';
import { ValidationError } from '../../lib/errors';

export class SalesController {
  constructor(private readonly service: SalesService) {}

  getAll(req: Request, res: Response, next: NextFunction): void {
    try {
      const businessUnitId = Number(req.query.businessUnitId);
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) {
        throw new ValidationError('businessUnitId debe ser un número válido');
      }

      const { dateFrom, dateTo, status, paymentMethod, search } = req.query;

      // Si hay algún filtro activo usamos getFiltered; si no, getAll (retrocompat)
      const hasFilters = dateFrom || dateTo || status || paymentMethod || search;

      const sales = hasFilters
        ? this.service.getSalesFiltered(businessUnitId, {
            dateFrom: dateFrom as string | undefined,
            dateTo: dateTo as string | undefined,
            status: (status as 'all' | 'completed' | 'cancelled' | undefined) ?? 'all',
            paymentMethod: paymentMethod as string | undefined,
            search: search as string | undefined,
          })
        : this.service.getAllSales(businessUnitId);

      res.json({ data: sales, error: null });
    } catch (err) {
      next(err);
    }
  }

  getById(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = Number(req.params.id);
      const businessUnitId = Number(req.query.businessUnitId);

      if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError('ID de venta inválido');
      }
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) {
        throw new ValidationError('businessUnitId debe ser un número válido');
      }

      const result = this.service.getSaleWithItems(id, businessUnitId);
      res.json({ data: result, error: null });
    } catch (err) {
      next(err);
    }
  }

  confirm(req: Request, res: Response, next: NextFunction): void {
    try {
      const businessUnitId = Number(req.query.businessUnitId ?? req.body.businessUnitId);
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) {
        throw new ValidationError('businessUnitId debe ser un número válido');
      }

      const { items, discountPercent, discountAmount, paymentMethods, userId } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        throw new ValidationError('Se requiere al menos un item en el carrito');
      }
      if (!Array.isArray(paymentMethods) || paymentMethods.length === 0) {
        throw new ValidationError('Se requiere al menos un medio de pago');
      }

      const result = this.service.confirmSale({
        businessUnitId,
        userId: userId ? Number(userId) : undefined,
        items,
        discountPercent: discountPercent ? Number(discountPercent) : 0,
        discountAmount: discountAmount ? Number(discountAmount) : 0,
        paymentMethods,
      });

      res.status(201).json({ data: result, error: null });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /sales/:id/cancel
   * Body: { reason: string, userId?: number }
   */
  cancel(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = Number(req.params.id);
      const businessUnitId = Number(req.query.businessUnitId);

      if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError('ID de venta inválido');
      }
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) {
        throw new ValidationError('businessUnitId debe ser un número válido');
      }

      const { reason, userId } = req.body as { reason: string; userId?: number };

      const { result, cashMovementCreated, hasInvoice } = this.service.cancelSale(
        id,
        businessUnitId,
        { reason, userId: userId ? Number(userId) : undefined },
      );

      res.json({
        data: {
          sale: result,
          cashMovementCreated,
          hasInvoice,
        },
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /sales/:id/reprint
   * Registra la intención de reimprimir — la impresión real es responsabilidad
   * del PrinterService (a conectar en Fase 11 cuando se implemente RF-CA-04).
   * Por ahora devuelve success: true como stub funcional.
   */
  reprint(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = Number(req.params.id);
      const businessUnitId = Number(req.query.businessUnitId);

      if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError('ID de venta inválido');
      }
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) {
        throw new ValidationError('businessUnitId debe ser un número válido');
      }

      // Verificar que la venta exista y pertenezca a la BU
      this.service.getSaleWithItems(id, businessUnitId);

      // TODO (Fase 11): conectar con PrinterService.reprintTicket(saleId)
      res.json({ data: { success: true }, error: null });
    } catch (err) {
      next(err);
    }
  }
}
