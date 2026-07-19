import { productVariantRepository } from '../repositories/ProductVariantRepository';
import type { ProductVariant, ProductVariantInput } from '../../../../shared/types';
import { BusinessRuleError } from '../../../lib/errors';

export class ProductVariantService {
  /**
   * Devuelve las variantes activas de un producto con indicador de ventas.
   */
  getVariants(productId: number): ProductVariant[] {
    const rows = productVariantRepository.findByProductIdWithSalesInfo(productId);
    return rows
      .filter((r) => r.isActive)
      .map((r) => ({
        id: r.id,
        productId: r.productId,
        businessUnitId: r.businessUnitId,
        attributeType: r.attributeType,
        attributeValue: r.attributeValue,
        price: r.price,
        costPrice: r.costPrice,
        sku: r.sku,
        barcode: r.barcode,
        stock: r.stock,
        isActive: r.isActive,
        hasSales: r.hasSales,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
  }

  /**
   * Crea o actualiza el lote de variantes de un producto.
   * - Items con id → se actualiza precio/costo/barcode
   * - Items sin id → se crean nuevas
   */
  upsertVariants(
    productId: number,
    businessUnitId: number,
    attributeType: string,
    variants: ProductVariantInput[],
  ): ProductVariant[] {
    if (!attributeType.trim()) {
      throw new BusinessRuleError('El tipo de atributo es obligatorio');
    }
    if (variants.length === 0) {
      throw new BusinessRuleError('Debe haber al menos una variante');
    }

    // Validar duplicados en el input
    const values = variants.map((v) => v.attributeValue.trim().toLowerCase());
    const unique = new Set(values);
    if (unique.size !== values.length) {
      throw new BusinessRuleError('No puede haber dos variantes con el mismo valor de atributo');
    }

    // Validar precios
    for (const v of variants) {
      if (v.price <= 0) {
        throw new BusinessRuleError(`La variante "${v.attributeValue}" debe tener precio mayor a 0`);
      }
    }

    const toCreate = variants.filter((v) => !v.id);
    const toUpdate = variants.filter((v) => !!v.id);

    productVariantRepository.upsertBatch(
      productId,
      businessUnitId,
      attributeType,
      toCreate.map((v) => ({
        attributeValue: v.attributeValue,
        price: v.price,
        costPrice: v.costPrice,
        barcode: v.barcode ?? null,
        stock: v.stock ?? 0,
      })),
      toUpdate.map((v) => ({
        id: v.id!,
        attributeValue: v.attributeValue,
        price: v.price,
        costPrice: v.costPrice,
        barcode: v.barcode ?? null,
        stock: v.stock,
      })),
    );

    return this.getVariants(productId);
  }

  /**
   * Archiva una variante (no se puede eliminar si tiene ventas).
   * Por ahora siempre archiva; en el futuro puede verificar ventas reales.
   */
  archiveVariant(variantId: number): void {
    const variant = productVariantRepository.findById(variantId);
    if (!variant) throw new BusinessRuleError('Variante no encontrada');
    productVariantRepository.archive(variantId);
  }

  /**
   * Elimina una variante físicamente.
   * En producción esto solo debería llamarse si no hay ventas asociadas.
   */
  deleteVariant(variantId: number): void {
    const variant = productVariantRepository.findById(variantId);
    if (!variant) throw new BusinessRuleError('Variante no encontrada');
    productVariantRepository.delete(variantId);
  }
}

export const productVariantService = new ProductVariantService();
