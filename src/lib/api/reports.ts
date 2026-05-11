import { apiClient } from './client';
import type { SalesReport, TopProductsReport, TopCustomersReport, StockMovement, DashboardData } from '@shared/types';

export const reportsApi = {
  getSalesReport(
    businessUnitId: number,
    fromDate: string,
    toDate: string,
  ): Promise<SalesReport[]> {
    const params = new URLSearchParams({ businessUnitId: String(businessUnitId), fromDate, toDate });
    return apiClient.get(`/api/reports/sales?${params}`);
  },

  getTopProducts(businessUnitId: number, limit = 10): Promise<TopProductsReport[]> {
    return apiClient.get(`/api/reports/top-products?businessUnitId=${businessUnitId}&limit=${limit}`);
  },

  getTopCustomers(businessUnitId: number, limit = 10): Promise<TopCustomersReport[]> {
    return apiClient.get(`/api/reports/top-customers?businessUnitId=${businessUnitId}&limit=${limit}`);
  },

  getStockMovements(
    businessUnitId: number,
    filters?: { fromDate?: string; toDate?: string },
  ): Promise<StockMovement[]> {
    const params = new URLSearchParams({ businessUnitId: String(businessUnitId) });
    if (filters?.fromDate) params.set('fromDate', filters.fromDate);
    if (filters?.toDate) params.set('toDate', filters.toDate);
    return apiClient.get(`/api/reports/stock-movements?${params}`);
  },

  getDashboard(businessUnitId: number, moduleId: string): Promise<DashboardData> {
    return apiClient.get(`/api/dashboard?buId=${businessUnitId}&moduleId=${encodeURIComponent(moduleId)}`);
  },

  getTallerOrdersReport(businessUnitId: number): Promise<{ byStatus: { status: string; count: number; totalAmount: number }[]; orders: unknown[] }> {
    return apiClient.get(`/api/modules/taller-medida/reports/orders?buId=${businessUnitId}`);
  },

  /** Retorna la URL de descarga CSV (para usar con window.open o <a href>) */
  getExportURL(
    businessUnitId: number,
    reportType: 'sales' | 'top-products' | 'top-customers',
    filters?: { fromDate?: string; toDate?: string; limit?: number },
  ): string {
    const params = new URLSearchParams({
      businessUnitId: String(businessUnitId),
      reportType,
    });
    if (filters?.fromDate) params.set('fromDate', filters.fromDate);
    if (filters?.toDate) params.set('toDate', filters.toDate);
    if (filters?.limit) params.set('limit', String(filters.limit));
    return `http://localhost:3001/api/reports/export?${params}`;
  },
};
