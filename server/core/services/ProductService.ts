import type { Product, ProductWithStock, ProductSearchResult, PurchaseHistoryEntry, ProductStats, BulkPricePreviewItem } from '../../../shared/types';
import type { CreateProductRequest, UpdateProductRequest } from '../types';
import { createProductSchema, updateProductSchema, inlineUpdateSchema } from '../schemas/products.schema';
import type { ProductRepository } from '../repositories/ProductRepository';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../lib/errors';
import { stockItems } from '../../db/schema';
import { db, sqlite } from '../../db/connection';


export class ProductService {
  constructor(private readonly productRepo: ProductRepository) {}

  listAll(businessUnitId: number): Product[] {
    return this.productRepo.getAll(businessUnitId);
  }

  getById(id: number, businessUnitId: number): Product {
    const product = this.productRepo.getById(id, businessUnitId);
    if (!product) {
      throw new NotFoundError(`Producto ${id} no encontrado`);
    }
    return product;
  }

  create(businessUnitId: number, data: CreateProductRequest): Product {
    // Validar con Zod
    const parsed = createProductSchema.safeParse(data);
    if (!parsed.success) {
      throw new ValidationError('Datos inválidos', parsed.error.errors);
    }

    // Generar SKU automáticamente (el cliente ya no lo envía)
    const generatedSku = this.productRepo.generateSku(
      parsed.data.category ?? '',
      parsed.data.name,
      businessUnitId,
    );

    // Validar barcode único en esta BU (si se proporcionó)
    if (parsed.data.barcode) {
      const barcodeOwner = this.productRepo.getProductByBarcode(parsed.data.barcode, businessUnitId);
      if (barcodeOwner) {
        throw new BusinessRuleError(
          `El código '${parsed.data.barcode}' ya está asignado al producto '${barcodeOwner.name}'`,
        );
      }
    }

    // Crear producto con SKU generado
    const product = this.productRepo.create(businessUnitId, { ...parsed.data, sku: generatedSku });

    // Crear stock_item con cantidad 0
    db.insert(stockItems)
      .values({
        productId: product.id,
        businessUnitId,
        quantity: 0,
        minimumThreshold: 5,
      })
      .run();

    return product;
  }

  update(id: number, businessUnitId: number, data: UpdateProductRequest): Product {
    // Validar que exista
    this.getById(id, businessUnitId);

    // Validar con Zod
    const parsed = updateProductSchema.safeParse(data);
    if (!parsed.success) {
      throw new ValidationError('Datos inválidos', parsed.error.errors);
    }

    // Validar barcode único en esta BU (excluyendo el producto que se edita)
    if (parsed.data.barcode) {
      const barcodeOwner = this.productRepo.getProductByBarcode(parsed.data.barcode, businessUnitId, id);
      if (barcodeOwner) {
        throw new BusinessRuleError(
          `El código '${parsed.data.barcode}' ya está asignado al producto '${barcodeOwner.name}'`,
        );
      }
    }

    return this.productRepo.update(id, businessUnitId, parsed.data);
  }

  toggleActive(id: number, businessUnitId: number, isActive: boolean): Product {
    // Validar que exista
    this.getById(id, businessUnitId);

    return this.productRepo.toggleActive(id, businessUnitId, isActive);
  }

  search(businessUnitId: number, query: string): Product[] {
    if (!query || query.trim().length === 0) {
      return this.listAll(businessUnitId);
    }
    return this.productRepo.search(businessUnitId, query.trim());
  }

  /**
   * Búsqueda exacta por código de barras. Retorna el ítem listo para agregar
   * al carrito (con stock actual) o null si no existe.
   */
  findByBarcode(
    barcode: string,
    businessUnitId: number,
  ): ReturnType<typeof this.productRepo.findByBarcode> {
    return this.productRepo.findByBarcode(barcode.trim(), businessUnitId);
  }

  listAllWithStock(businessUnitId: number): ProductWithStock[] {
    return this.productRepo.getAllWithStock(businessUnitId);
  }

  /**
   * Actualización inline de costo/precio desde la tabla.
   * Recalcula basePrice a partir del campo editado (campo puede ser cost, price o margin).
   */
  inlineUpdate(
    id: number,
    businessUnitId: number,
    data: { costPrice?: number; basePrice?: number; margin?: number },
  ): Product {
    const parsed = inlineUpdateSchema.safeParse(data);
    if (!parsed.success) throw new ValidationError('Datos inválidos', parsed.error.errors);

    const existing = this.getById(id, businessUnitId);
    let { costPrice, basePrice } = existing;

    if (parsed.data.costPrice !== undefined) {
      costPrice = parsed.data.costPrice;
      // Mantener margen actual
      const currentMargin = existing.costPrice > 0
        ? (existing.basePrice - existing.costPrice) / existing.costPrice
        : 0;
      basePrice = Math.round(costPrice * (1 + currentMargin) * 100) / 100;
    } else if (parsed.data.basePrice !== undefined) {
      basePrice = parsed.data.basePrice;
    } else if (parsed.data.margin !== undefined) {
      basePrice = Math.round(costPrice * (1 + parsed.data.margin / 100) * 100) / 100;
    }

    return this.productRepo.inlineUpdate(id, businessUnitId, costPrice, basePrice);
  }

  /**
   * Actualización masiva de precios. Retorna preview antes de aplicar o aplica directo.
   */
  bulkUpdatePrices(
    businessUnitId: number,
    adjustmentType: 'increase_price_pct' | 'increase_cost_pct' | 'set_margin_pct',
    value: number,
    category?: string | null,
    preview = false,
  ): { updated?: number; preview?: BulkPricePreviewItem[] } {
    if (preview) {
      return { preview: this.productRepo.bulkUpdatePreview(businessUnitId, adjustmentType, value, category) };
    }
    const updated = this.productRepo.bulkUpdatePrices(businessUnitId, adjustmentType, value, category);
    return { updated };
  }

  getPurchaseHistory(id: number, businessUnitId: number): PurchaseHistoryEntry[] {
    this.getById(id, businessUnitId);
    return this.productRepo.getPurchaseHistory(id, businessUnitId);
  }

  getStats(id: number, businessUnitId: number, periodDays: number | null): ProductStats {
    this.getById(id, businessUnitId);
    return this.productRepo.getStats(id, businessUnitId, periodDays);
  }

  archive(id: number, businessUnitId: number): Product {
    return this.toggleActive(id, businessUnitId, false);
  }

  restore(id: number, businessUnitId: number): Product {
    const row = this.productRepo.getById(id, businessUnitId);
    if (!row) throw new NotFoundError(`Producto ${id} no encontrado`);
    return this.productRepo.toggleActive(id, businessUnitId, true);
  }

  searchForPOS(businessUnitId: number, query: string, limit?: number): ProductSearchResult[] {
    if (!limit && (!query || query.trim().length === 0)) return [];
    return this.productRepo.searchForPOS(businessUnitId, query.trim(), limit);
  }

  countTransactions(id: number, _businessUnitId: number): number {
    type Row = { cnt: number };
    const row = sqlite
      .prepare('SELECT COUNT(*) as cnt FROM sale_items WHERE product_id = ?')
      .get(id) as Row | undefined;
    return row?.cnt ?? 0;
  }
}
