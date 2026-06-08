import { apiClient } from './client';
import type { CashMovement, CashAudit, CashSessionStatus, ReporteZData } from '@shared/types';

export interface CashBalance {
  theoretical: number;
  movements: CashMovement[];
}

export interface CashSessionData {
  balance: number;
  movements: CashMovement[];
  openingMovement: CashMovement | null;
}

export interface AuditWithTimes extends CashAudit {
  openingAt: string | null;
  closingAt: string;
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

  getStatus(businessUnitId: number): Promise<{ status: CashSessionStatus }> {
    return apiClient.get(`/api/cashbox/status?businessUnitId=${businessUnitId}`);
  },

  openSession(businessUnitId: number, initialAmount: number): Promise<CashMovement> {
    const params = new URLSearchParams({ businessUnitId: String(businessUnitId) });
    return apiClient.post(`/api/cashbox/open?${params}`, { initialAmount });
  },

  getSessionData(businessUnitId: number): Promise<CashSessionData> {
    return apiClient.get(`/api/cashbox/session-data?businessUnitId=${businessUnitId}`);
  },

  getAuditHistoryWithTimes(businessUnitId: number): Promise<AuditWithTimes[]> {
    return apiClient.get(`/api/cashbox/audit-history?businessUnitId=${businessUnitId}`);
  },

  getReporteZ(auditId: number, businessUnitId: number): Promise<ReporteZData> {
    return apiClient.get(
      `/api/cashbox/audits/${auditId}/reporte-z?businessUnitId=${businessUnitId}`,
    );
  },

  printReporteZ(data: ReporteZData): Promise<{ success: boolean; error?: string }> {
    return apiClient.post('/api/printer/print-reporte-z', data);
  },
};
