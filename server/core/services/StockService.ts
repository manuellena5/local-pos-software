import type { StockMovement, StockSummary } from '../../../shared/types';
import type { AdjustStockRequest } from '../types';
import { adjustStockSchema } from '../schemas/products.schema';
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
}
