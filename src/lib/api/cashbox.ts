import { apiClient } from './client';
import type { CashMovement, CashAudit } from '@shared/types';

export interface CashBalance {
  theoretical: number;
  movements: CashMovement[];
}

export const cashboxApi = {
  getBalance(businessUnitId: number, upToDate?: string): Promise<CashBalance> {
    const params = new URLSearchParams({ businessUnitId: String(businessUnitId) });
    if (upToDate) params.set('upToDate', upToDate);
    return apiClient.get(`/api/cashbox/balance?${params}`);
  },

  getMovements(
    businessUnitId: number,
    filters?: { fromDate?: string; toDate?: string },
  ): Promise<CashMovement[]> {
    const params = new URLSearchParams({ businessUnitId: String(businessUnitId) });
    if (filters?.fromDate) params.set('fromDate', filters.fromDate);
    if (filters?.toDate) params.set('toDate', filters.toDate);
    return apiClient.get(`/api/cashbox/movements?${params}`);
  },

  recordMovement(
    businessUnitId: number,
    data: { type: string; amount: number; description: string; saleId?: number },
  ): Promise<CashMovement> {
    const params = new URLSearchParams({ businessUnitId: String(businessUnitId) });
    return apiClient.post(`/api/cashbox/movements?${params}`, data);
  },

  getAudits(businessUnitId: number): Promise<CashAudit[]> {
    return apiClient.get(`/api/cashbox/audits?businessUnitId=${businessUnitId}`);
  },

  performAudit(
    businessUnitId: number,
    realBalance: number,
    notes?: string,
  ): Promise<CashAudit> {
    const params = new URLSearchParams({ businessUnitId: String(businessUnitId) });
    return apiClient.post(`/api/cashbox/audit?${params}`, { realBalance, notes });
  },
};
