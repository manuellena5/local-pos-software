import type { Request, Response, NextFunction } from 'express';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { SalesService } from '../services/SalesService';
import { ValidationError } from '../../lib/errors';
import { printerService } from '../services/PrinterService';
import type { InstallationRepository } from '../repositories/InstallationRepository';
import type { BusinessUnitRepository } from '../repositories/BusinessUnitRepository';
import type { CustomerRepository } from '../repositories/CustomerRepository';
import type { SaleTicketData, Customer } from '../../../shared/types';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  mercadopago: 'Mercado Pago',
  transfer: 'Transferencia',
  modo: 'Modo / Ualá',
};

function buildFiscalCondition(customer: Customer | null): string {
  if (!customer) return 'Consumidor Final';
  if (customer.documentType === 'CUIT') return `${customer.name} - CUIT ${customer.document ?? ''}`;
  return customer.name;
}

function buildCustomerDocFields(
  customer: Customer | null,
): { customerDocType?: number; customerDoc?: number } {
  if (!customer || !customer.document) return { customerDocType: 99, customerDoc: 0 };
  const docNum = parseInt(customer.document.replace(/[-.\s]/g, ''), 10);
  if (isNaN(docNum)) return { customerDocType: 99, customerDoc: 0 };
  if (customer.documentType === 'CUIT') return { customerDocType: 80, customerDoc: docNum };
  if (customer.documentType === 'DNI') return { customerDocType: 96, customerDoc: docNum };
  return { customerDocType: 99, customerDoc: 0 };
}

export class SalesController {
  constructor(
    private readonly service: SalesService,
    private readonly installationRepo: InstallationRepository,
    private readonly buRepo: BusinessUnitRepository,
    private readonly customerRepo: CustomerRepository,
  ) {}

  getAll(req: Request, res: Response, next: NextFunction): void {
    try {
      const businessUnitId = Number(req.query.businessUnitId);
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) {
        throw new ValidationError('businessUnitId debe ser un número válido');
      }

      const { dateFrom, dateTo, status, paymentMethod, search } = req.query;

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
   * Imprime el ticket de una venta usando ESC/POS directo via PrinterService.
   */
  reprint = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const businessUnitId = Number(req.query.businessUnitId);

      if (!Number.isInteger(id) || id <= 0) {
        throw new ValidationError('ID de venta inválido');
      }
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) {
        throw new ValidationError('businessUnitId debe ser un número válido');
      }

      const { sale, items } = this.service.getSaleWithItems(id, businessUnitId);
      const config = this.installationRepo.get();
      const bu = this.buRepo.getById(businessUnitId);
      const customer = sale.customerId ? this.customerRepo.getById(sale.customerId) : null;

      const dateObj = new Date(sale.createdAt);
      const date = format(dateObj, 'dd/MM/yyyy', { locale: es });
      const time = format(dateObj, 'HH:mm', { locale: es });

      const totalPaid = sale.paymentMethods.reduce((acc, p) => acc + p.amount, 0);
      const change = totalPaid > sale.totalAmount
        ? Math.round((totalPaid - sale.totalAmount) * 100) / 100
        : undefined;

      const ticketData: SaleTicketData = {
        saleNumber: String(sale.saleNumber).padStart(4, '0'),
        date,
        time,
        businessName: config.businessName,
        businessAddress: config.address,
        cuit: config.cuit,
        ingBrutos: config.ingBrutos || undefined,
        businessUnitName: bu?.name ?? '',
        fiscalCondition: buildFiscalCondition(customer),
        ...buildCustomerDocFields(customer),
        items: items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.lineTotal,
          itemDiscount: item.discountPercent > 0 ? item.discountPercent : undefined,
        })),
        subtotalBeforeDiscount: sale.discountAmount > 0 ? sale.subtotal : undefined,
        globalDiscount: sale.discountPercent > 0 ? sale.discountPercent : undefined,
        globalDiscountAmount: sale.discountAmount > 0 ? sale.discountAmount : undefined,
        total: sale.totalAmount,
        payments: sale.paymentMethods.map((p) => ({
          method: METHOD_LABELS[p.method] ?? p.method,
          amount: p.amount,
        })),
        change,
        cae: sale.cae ?? undefined,
        caeVto: sale.caeExpiration ?? undefined,
        invoiceNumber: sale.invoiceNumber ?? undefined,
      };

      const result = await printerService.printSaleTicket(ticketData);
      res.json({ data: result, error: null });
    } catch (err) {
      next(err);
    }
  };
}
