import { apiClient } from './client';
import type { SaleWithItems, SaleFilters, SaleListEntry } from '@shared/types';
import type { ConfirmSaleInput } from '@/lib/validations/core/sales';

export interface CancelSaleResponse {
  sale: SaleWithItems;
  cashMovementCreated: boolean;
  hasInvoice: boolean;
}

export const salesApi = {
  list(businessUnitId: number): Promise<SaleListEntry[]> {
    return apiClient.get(`/api/sales?businessUnitId=${businessUnitId}`);
  },

  listFiltered(businessUnitId: number, filters: SaleFilters): Promise<SaleListEntry[]> {
    const params = new URLSearchParams({ businessUnitId: String(businessUnitId) });
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.paymentMethod) params.set('paymentMethod', filters.paymentMethod);
    if (filters.search) params.set('search', filters.search);
    if (filters.cashSessionId) params.set('cashSessionId', String(filters.cashSessionId));
    return apiClient.get(`/api/sales?${params}`);
  },

  get(id: number, businessUnitId: number): Promise<SaleWithItems> {
    return apiClient.get(`/api/sales/${id}?businessUnitId=${businessUnitId}`);
  },

  confirm(data: ConfirmSaleInput): Promise<SaleWithItems> {
    return apiClient.post(`/api/sales/confirm?businessUnitId=${data.businessUnitId}`, data);
  },

  cancel(id: number, businessUnitId: number, reason: string): Promise<CancelSaleResponse> {
    return apiClient.post(`/api/sales/${id}/cancel?businessUnitId=${businessUnitId}`, { reason });
  },

  reprint(id: number, businessUnitId: number): Promise<{ success: boolean; error?: string }> {
    return apiClient.post(`/api/sales/${id}/reprint?businessUnitId=${businessUnitId}`, {});
  },
};
