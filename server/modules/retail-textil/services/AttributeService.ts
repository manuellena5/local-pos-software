import { attributeRepository } from '../repositories/AttributeRepository';
import type { ProductAttribute } from '../../../db/schemas/modules/retail-textil';
import type { UpsertAttributesInput } from '../schemas';

export class AttributeService {
  /**
   * Reemplaza todos los atributos de un producto.
   * Operación idempotente: elimina los anteriores y crea los nuevos.
   */
  replace(productId: number, input: UpsertAttributesInput): ProductAttribute[] {
    const normalized = input.attributes.map((a, i) => ({
      key:       a.key.trim(),
      value:     a.value.trim(),
      sortOrder: a.sortOrder ?? i,
    }));
    return attributeRepository.replaceAll(productId, normalized);
  }

  list(productId: number): ProductAttribute[] {
    return attributeRepository.getByProductId(productId);
  }
}

export const attributeService = new AttributeService();
