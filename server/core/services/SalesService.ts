import type { SaleWithItems } from '../../../shared/types';
import type { ConfirmSaleRequest, SaleItemInput } from '../types';
import type { SaleRepository } from '../repositories/SaleRepository';
import type { ProductRepository } from '../repositories/ProductRepository';
import type { InvoiceQueueService } from './InvoiceQueueService';
import type { CashboxService } from './CashboxService';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../lib/errors';
import { logger } from '../../lib/logger';

const CTX = 'SalesService';

export class SalesService {
  constructor(
    private readonly saleRepo: SaleRepository,
    private readonly productRepo: ProductRepository,
    private readonly invoiceQueueService?: InvoiceQueueService,
    private readonly cashboxService?: CashboxService,
  ) {}

  /**
   * Calcula el total de una línea aplicando descuento por ítem.
   * Fórmula: quantity * unitPrice * (1 - discountPercent / 100)
   */
  calculateLineTotal(quantity: number, unitPrice: number, discountPercent: number): number {
    const raw = quantity * unitPrice * (1 - discountPercent / 100);
    return Math.round(raw * 100) / 100;
  }

  /**
   * Calcula todos los totales de la venta.
   * IVA único sobre el total (no por producto) — decisión Fase 3.
   *
   * @param lineTotals    - Array de lineTotal de cada ítem (ya con descuento de ítem)
   * @param taxRate       - Alícuota de IVA en % (ej: 21)
   * @param discountPercent - Descuento global en % (0 si no hay)
   * @param discountAmount  - Descuento global en $ (0 si no hay; tiene prioridad)
   */
  calculateTotals(
    lineTotals: number[],
    taxRate: number,
    discountPercent: number,
    discountAmount: number
  ): {
    subtotal: number;
    discountAmount: number;
    discountPercent: number;
    taxableAmount: number;
    taxAmount: number;
    totalAmount: number;
  } {
    const subtotal = Math.round(lineTotals.reduce((a, b) => a + b, 0) * 100) / 100;

    // discountAmount tiene prioridad; si viene discountPercent se calcula desde subtotal
    let resolvedDiscountAmount: number;
    let resolvedDiscountPercent: number;

    if (discountAmount > 0) {
      resolvedDiscountAmount = Math.round(discountAmount * 100) / 100;
      resolvedDiscountPercent = Math.round((discountAmount / subtotal) * 10000) / 100;
    } else if (discountPercent > 0) {
      resolvedDiscountPercent = discountPercent;
      resolvedDiscountAmount = Math.round((subtotal * discountPercent) / 100 * 100) / 100;
    } else {
      resolvedDiscountAmount = 0;
      resolvedDiscountPercent = 0;
    }

    // lineTotals ya llegan CON IVA incluido (unitPrice = displayPrice del frontend)
    // → totalAmount = subtotal - descuento (IVA no se suma de nuevo)
    // → taxableAmount y taxAmount se obtienen extrayendo IVA del total
    const totalAmount = Math.round((subtotal - resolvedDiscountAmount) * 100) / 100;
    const taxableAmount = Math.round((totalAmount / (1 + taxRate / 100)) * 100) / 100;
    const taxAmount = Math.round((totalAmount - taxableAmount) * 100) / 100;

    return {
      subtotal,
      discountAmount: resolvedDiscountAmount,
      discountPercent: resolvedDiscountPercent,
      taxableAmount,
      taxAmount,
      totalAmount,
    };
  }

  /**
   * Valida que la suma de medios de pago cubra el total.
   * Permite overpayment (vuelto). Tolerancia $1 para redondeos de centavos.
   */
  validatePaymentMethods(
    paymentMethods: Array<{ method: string; amount: number }>,
    totalAmount: number
  ): void {
    if (!paymentMethods.length) {
      throw new ValidationError('Debe indicar al menos un medio de pago');
    }

    const paid = paymentMethods.reduce((sum, p) => sum + p.amount, 0);

    // Solo rechazar si falta dinero (underpayment). El vuelto es válido.
    if (paid < totalAmount - 1) {
      throw new BusinessRuleError(
        `Los medios de pago ($${paid.toFixed(2)}) no cubren el total ($${totalAmount.toFixed(2)})`
      );
    }
  }

  /**
   * Confirma una venta: valida, calcula, persiste y descuenta stock.
   * Si cualquier producto no tiene stock suficiente, rechaza toda la venta.
   */
  confirmSale(data: ConfirmSaleRequest): SaleWithItems {
    if (!data.items.length) {
      throw new ValidationError('El carrito no puede estar vacío');
    }

    // Validar que todos los productos existan en esta BU
    for (const item of data.items) {
      const product = this.productRepo.getById(item.productId, data.businessUnitId);
      if (!product) {
        throw new NotFoundError(
          `Producto ${item.productId} no encontrado en esta unidad de negocio`
        );
      }
    }

    // Calcular lineTotal de cada ítem
    const itemInputs: SaleItemInput[] = data.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      discountPercent: item.discountPercent,
      lineTotal: this.calculateLineTotal(item.quantity, item.unitPrice, item.discountPercent),
    }));

    // Usar el taxRate del primer ítem para el IVA global (decisión Fase 3)
    const taxRate = data.items[0]!.taxRate;

    // Calcular totales
    const totals = this.calculateTotals(
      itemInputs.map((i) => i.lineTotal),
      taxRate,
      data.discountPercent ?? 0,
      data.discountAmount ?? 0
    );

    // Validar medios de pago
    this.validatePaymentMethods(data.paymentMethods, totals.totalAmount);

    // Persistir en transacción (el repo maneja el rollback)
    const result = this.saleRepo.create({
      businessUnitId: data.businessUnitId,
      userId: data.userId,
      customerId: data.customerId,
      items: itemInputs,
      ...totals,
      taxRate,
      paymentMethods: data.paymentMethods,
    });

    // ── Fase 5: Registrar movimiento de caja automáticamente ─────────────────
    if (this.cashboxService) {
      try {
        this.cashboxService.recordMovement(
          data.businessUnitId,
          {
            type: 'sale',
            amount: result.sale.totalAmount,
            description: `Venta #${result.sale.saleNumber}`,
            saleId: result.sale.id,
          },
          data.userId,
        );
      } catch (err: unknown) {
        logger.warn(CTX, 'Could not record cash movement for sale', {
          saleId: result.sale.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // ── Fase 4: Intentar facturación AFIP de forma no bloqueante ─────────────
    if (this.invoiceQueueService) {
      this.invoiceQueueService.tryIssueAfterSale(result.sale).catch((err: unknown) => {
        logger.error(CTX, 'Unhandled error in tryIssueAfterSale', {
          saleId: result.sale.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }

    return result;
  }

  getAllSales(businessUnitId: number) {
    return this.saleRepo.getAll(businessUnitId);
  }

  getSaleWithItems(id: number, businessUnitId: number): SaleWithItems {
    const result = this.saleRepo.getById(id, businessUnitId);
    if (!result) {
      throw new NotFoundError(`Venta ${id} no encontrada`);
    }
    return result;
  }
}
