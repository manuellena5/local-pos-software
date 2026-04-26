import { apiClient } from './client';
import type { Product } from '@shared/types';

export const productsApi = {
  list(businessUnitId: number, filters?: { search?: string }): Promise<Product[]> {
    const params = new URLSearchParams({ businessUnitId: String(businessUnitId) });
    if (filters?.search) params.append('search', filters.search);
    return apiClient.get(`/api/products?${params}`);
  },

  get(id: number, businessUnitId: number): Promise<Product> {
    return apiClient.get(`/api/products/${id}?businessUnitId=${businessUnitId}`);
  },

  create(businessUnitId: number, data: unknown): Promise<Product> {
    return apiClient.post(`/api/products?businessUnitId=${businessUnitId}`, data);
  },

  update(id: number, businessUnitId: number, data: unknown): Promise<Product> {
    return apiClient.patch(`/api/products/${id}?businessUnitId=${businessUnitId}`, data);
  },

  delete(id: number, businessUnitId: number): Promise<void> {
    return apiClient.post(`/api/products/${id}?businessUnitId=${businessUnitId}`, {});
  },

  search(businessUnitId: number, query: string): Promise<Product[]> {
    return apiClient.get(
      `/api/products?businessUnitId=${businessUnitId}&search=${encodeURIComponent(query)}`
    );
  },
};
