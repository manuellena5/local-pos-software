import { apiClient } from './client';
import type { Sale, SaleWithItems } from '@shared/types';
import type { ConfirmSaleInput } from '@/lib/validations/core/sales';

export const salesApi = {
  list(businessUnitId: number): Promise<Sale[]> {
    return apiClient.get(`/api/sales?businessUnitId=${businessUnitId}`);
  },

  get(id: number, businessUnitId: number): Promise<SaleWithItems> {
    return apiClient.get(`/api/sales/${id}?businessUnitId=${businessUnitId}`);
  },

  confirm(data: ConfirmSaleInput): Promise<SaleWithItems> {
    return apiClient.post(`/api/sales/confirm?businessUnitId=${data.businessUnitId}`, data);
  },
};
