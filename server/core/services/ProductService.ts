import type { Product } from '../../../shared/types';
import type { CreateProductRequest, UpdateProductRequest } from '../types';
import { createProductSchema, updateProductSchema } from '../schemas/products.schema';
import type { ProductRepository } from '../repositories/ProductRepository';
import { NotFoundError, ValidationError, BusinessRuleError } from '../../lib/errors';
import { stockItems } from '../../db/schema';
import { db } from '../../db/connection';


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

    // Validar SKU único en esta BU
    const existing = this.productRepo.getBySkuInBU(parsed.data.sku, businessUnitId);
    if (existing) {
      throw new BusinessRuleError(`El SKU '${parsed.data.sku}' ya existe en esta unidad de negocio`);
    }

    // Crear producto
    const product = this.productRepo.create(businessUnitId, parsed.data);

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
}
