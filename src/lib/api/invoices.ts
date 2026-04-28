import { apiClient } from './client';
import type { PendingInvoice } from '@shared/types';

export interface InvoiceStats {
  total: number;
  issued: number;
  pending: number;
  failed: number;
}

export const invoicesApi = {
  getQueue(businessUnitId: number): Promise<PendingInvoice[]> {
    return apiClient.get(`/api/invoices/queue?businessUnitId=${businessUnitId}`);
  },

  getStats(businessUnitId: number): Promise<InvoiceStats> {
    return apiClient.get(`/api/invoices/stats?businessUnitId=${businessUnitId}`);
  },

  retry(saleId: number, businessUnitId: number): Promise<{ message: string }> {
    return apiClient.post(`/api/invoices/${saleId}/retry?businessUnitId=${businessUnitId}`, {});
  },
};
