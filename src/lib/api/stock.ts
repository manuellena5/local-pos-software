import { apiClient } from './client';
import type { StockSummary, StockMovement } from '@shared/types';

export const stockApi = {
  getSummary(businessUnitId: number): Promise<StockSummary[]> {
    return apiClient.get(`/api/stock/summary?businessUnitId=${businessUnitId}`);
  },

  getMovements(
    productId: number,
    businessUnitId: number,
    filters?: {
      fromDate?: string;
      toDate?: string;
      type?: 'entry' | 'sale' | 'adjustment';
    }
  ): Promise<StockMovement[]> {
    const params = new URLSearchParams({ businessUnitId: String(businessUnitId) });
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);
    if (filters?.type) params.append('type', filters.type);
    return apiClient.get(`/api/stock/${productId}/movements?${params}`);
  },

  adjust(
    productId: number,
    businessUnitId: number,
    quantity: number,
    reason: string
  ): Promise<StockMovement> {
    return apiClient.post(`/api/stock/${productId}/adjust?businessUnitId=${businessUnitId}`, {
      quantity,
      reason,
    });
  },
};
