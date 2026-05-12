import { apiClient } from './client';
import type { Category } from '@shared/types';

export const categoriesApi = {
  list(businessUnitId: number): Promise<Category[]> {
    return apiClient.get(`/api/categories?buId=${businessUnitId}`);
  },

  create(data: { name: string; businessUnitId: number }): Promise<Category> {
    return apiClient.post('/api/categories', data);
  },

  update(id: number, name: string): Promise<Category> {
    return apiClient.put(`/api/categories/${id}`, { name });
  },

  delete(id: number): Promise<{ deleted: boolean }> {
    return apiClient.delete(`/api/categories/${id}`);
  },
};
