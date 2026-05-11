import type { ProductAttribute, ProductImage, UpsertAttributesRequest } from '../types';

const SERVER = window.location.protocol === 'file:' ? 'http://localhost:3001' : '';
const BASE = `${SERVER}/api/modules/retail-textil`;

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json() as { data: T; error: { message: string } | null };
  if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Error desconocido');
  return json.data;
}

export const retailTextilApi = {
  // ── Atributos ──────────────────────────────────────────────────────────────
  async getAttributes(productId: number): Promise<ProductAttribute[]> {
    const res = await fetch(`${BASE}/products/${productId}/attributes`);
    return handleResponse<ProductAttribute[]>(res);
  },

  async replaceAttributes(productId: number, data: UpsertAttributesRequest): Promise<ProductAttribute[]> {
    const res = await fetch(`${BASE}/products/${productId}/attributes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<ProductAttribute[]>(res);
  },

  // ── Imágenes ───────────────────────────────────────────────────────────────
  async getImages(productId: number): Promise<ProductImage[]> {
    const res = await fetch(`${BASE}/products/${productId}/images`);
    return handleResponse<ProductImage[]>(res);
  },

  async uploadImage(productId: number, file: File, altText?: string): Promise<ProductImage> {
    const form = new FormData();
    form.append('image', file);
    if (altText) form.append('altText', altText);
    const res = await fetch(`${BASE}/products/${productId}/images`, { method: 'POST', body: form });
    return handleResponse<ProductImage>(res);
  },

  async deleteImage(productId: number, imageId: number): Promise<void> {
    const res = await fetch(`${BASE}/products/${productId}/images/${imageId}`, { method: 'DELETE' });
    await handleResponse<unknown>(res);
  },

  async reorderImages(productId: number, order: number[]): Promise<void> {
    const res = await fetch(`${BASE}/products/${productId}/images/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    });
    await handleResponse<unknown>(res);
  },

  async setPrimaryImage(productId: number, imageId: number): Promise<void> {
    const res = await fetch(`${BASE}/products/${productId}/images/${imageId}/primary`, { method: 'PATCH' });
    await handleResponse<unknown>(res);
  },

  imageUrl(filePath: string): string {
    return `${SERVER}/${filePath}`;
  },
};
