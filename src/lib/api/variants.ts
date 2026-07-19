import type { ProductVariant, UpsertProductVariantsRequest } from '@shared/types';

const BASE = '/api/modules/retail-textil';

export const variantsApi = {
  getByProduct(productId: number): Promise<ProductVariant[]> {
    return fetch(`${BASE}/products/${productId}/variants`)
      .then((r) => r.json())
      .then((j: { data: ProductVariant[] }) => j.data);
  },

  upsert(
    productId: number,
    businessUnitId: number,
    payload: UpsertProductVariantsRequest
  ): Promise<ProductVariant[]> {
    return fetch(`${BASE}/products/${productId}/variants?businessUnitId=${businessUnitId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((j: { data: ProductVariant[]; error: { message: string } | null }) => {
        if (j.error) throw new Error(j.error.message);
        return j.data;
      });
  },

  archive(variantId: number): Promise<void> {
    return fetch(`${BASE}/variants/${variantId}/archive`, { method: 'POST' }).then(() => undefined);
  },

  remove(variantId: number): Promise<void> {
    return fetch(`${BASE}/variants/${variantId}`, { method: 'DELETE' }).then(() => undefined);
  },
};
