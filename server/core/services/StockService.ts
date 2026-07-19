import type { StockMovement, StockSummary } from '../../../shared/types';
import { adjustStockSchema, createStockMovementSchema } from '../schemas/products.schema';
import type { ProductRepository } from '../repositories/ProductRepository';
import type { StockRepository } from '../repositories/StockRepository';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../lib/errors';

export class StockService {
  constructor(
    private readonly stockRepo: StockRepository,
    private readonly productRepo: ProductRepository
  ) {}

  adjustStock(
    productId: number,
    businessUnitId: number,
    quantity: number,
    reason: string,
    userId?: number
  ): { movement: StockMovement; newQuantity: number } {
    // Validar datos
    const parsed = adjustStockSchema.safeParse({ quantity, reason });
    if (!parsed.success) {
      throw new ValidationError('Datos inválidos', parsed.error.errors);
    }

    // Validar que el producto exista
    const product = this.productRepo.getById(productId, businessUnitId);
    if (!product) {
      throw new NotFoundError(`Producto ${productId} no encontrado`);
    }

    // Obtener stock actual
    const stockItem = this.stockRepo.getByProductId(productId, businessUnitId);
    if (!stockItem) {
      throw new NotFoundError(`Stock del producto ${productId} no encontrado`);
    }

    // Calcular nuevo stock
    const newQuantity = stockItem.quantity + parsed.data.quantity;

    // Opcional: validar que no sea negativo
    if (newQuantity < 0) {
      throw new BusinessRuleError(
        `No hay suficiente stock. Actual: ${stockItem.quantity}, Solicitado: ${Math.abs(parsed.data.quantity)}`
      );
    }

    // Registrar movimiento (siempre)
    const movement = this.stockRepo.recordMovement(
      stockItem.id,
      businessUnitId,
      parsed.data.quantity > 0 ? 'entry' : parsed.data.quantity < 0 ? 'sale' : 'adjustment',
      parsed.data.quantity,
      parsed.data.reason,
      userId
    );

    // Actualizar cantidad
    this.stockRepo.updateStockQuantity(stockItem.id, newQuantity);

    return { movement, newQuantity };
  }

  getMovementHistory(
    businessUnitId: number,
    filters?: {
      productId?: number;
      fromDate?: string;
      toDate?: string;
      type?: 'entry' | 'sale' | 'adjustment';
    }
  ): StockMovement[] {
    return this.stockRepo.getMovementHistory(businessUnitId, filters);
  }

  getStockSummary(businessUnitId: number): StockSummary[] {
    return this.stockRepo.getStockSummary(businessUnitId);
  }

  /** Movimientos de un producto, enriquecidos con variante y proveedor. */
  getProductMovements(productId: number, businessUnitId: number): StockMovement[] {
    return this.stockRepo.getMovementsByProduct(productId, businessUnitId);
  }

  /**
   * Crea un movimiento de stock tipado (entrada/salida/ajuste).
   * Con variantId opera sobre el stock de la variante (el padre se resincroniza).
   * Si es entrada con unitCost, actualiza el costo de la variante o del producto.
   */
  createMovement(
    productId: number,
    businessUnitId: number,
    data: {
      type: 'entrada' | 'salida' | 'ajuste';
      quantity: number;
      unitCost?: number;
      reason?: string;
      variantId?: number;
      supplierId?: number;
    },
    userId?: number,
  ): { movement: StockMovement; newQuantity: number } {
    const parsed = createStockMovementSchema.safeParse(data);
    if (!parsed.success) throw new ValidationError('Datos inválidos', parsed.error.errors);

    const product = this.productRepo.getById(productId, businessUnitId);
    if (!product) throw new NotFoundError(`Producto ${productId} no encontrado`);

    try {
      const result = this.stockRepo.createMovement(
        productId,
        businessUnitId,
        parsed.data.type,
        parsed.data.quantity,
        parsed.data.unitCost,
        parsed.data.reason,
        userId,
        parsed.data.variantId,
        parsed.data.supplierId,
      );

      // Entrada con costo unitario: actualizar el costo de la variante o del producto
      if (parsed.data.type === 'entrada' && parsed.data.unitCost && parsed.data.unitCost > 0) {
        if (parsed.data.variantId) {
          this.stockRepo.updateVariantCost(parsed.data.variantId, parsed.data.unitCost);
        } else {
          this.productRepo.inlineUpdate(productId, businessUnitId, parsed.data.unitCost, product.basePrice);
        }
      }

      return result;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Stock insuficiente')) {
        throw new BusinessRuleError(err.message);
      }
      throw err;
    }
  }

  /** Detalle de stock (con variantes) para el modal de movimientos. */
  getStockDetail(productId: number, businessUnitId: number) {
    const detail = this.stockRepo.getStockDetail(productId, businessUnitId);
    if (!detail) throw new NotFoundError(`Producto ${productId} no encontrado`);
    return detail;
  }

  getLastEntryDate(productId: number, businessUnitId: number): string | null {
    return this.stockRepo.getLastEntryDate(productId, businessUnitId);
  }
}
