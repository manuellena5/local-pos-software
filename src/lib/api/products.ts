import { apiClient, getApiBaseUrl } from './client';
import type {
  Product,
  ProductWithStock,
  ProductSearchResult,
  PurchaseHistoryEntry,
  ProductStats,
  CreateStockMovementRequest,
  BulkPriceUpdateRequest,
  ProductImportResult,
} from '@shared/types';

export const productsApi = {
  list(businessUnitId: number, filters?: { search?: string }): Promise<Product[]> {
    const params = new URLSearchParams({ businessUnitId: String(businessUnitId) });
    if (filters?.search) params.append('search', filters.search);
    return apiClient.get(`/api/products?${params}`);
  },

  listWithStock(businessUnitId: number): Promise<ProductWithStock[]> {
    return apiClient.get(`/api/products-with-stock?businessUnitId=${businessUnitId}`);
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

  inlineUpdate(
    id: number,
    businessUnitId: number,
    data: { costPrice?: number; basePrice?: number; margin?: number },
  ): Promise<Product> {
    return apiClient.patch(`/api/products/${id}/inline?businessUnitId=${businessUnitId}`, data);
  },

  bulkUpdatePrices(data: BulkPriceUpdateRequest, preview = false): Promise<unknown> {
    return apiClient.post(`/api/products/bulk-update-prices?preview=${preview}`, data);
  },

  getPurchaseHistory(id: number, businessUnitId: number): Promise<PurchaseHistoryEntry[]> {
    return apiClient.get(`/api/products/${id}/purchase-history?businessUnitId=${businessUnitId}`);
  },

  getStats(id: number, businessUnitId: number, periodDays?: number | null): Promise<ProductStats> {
    const params = new URLSearchParams({ businessUnitId: String(businessUnitId) });
    if (periodDays) params.append('periodDays', String(periodDays));
    return apiClient.get(`/api/products/${id}/stats?${params}`);
  },

  countTransactions(id: number, businessUnitId: number): Promise<{ count: number }> {
    return apiClient.get(`/api/products/${id}/transaction-count?businessUnitId=${businessUnitId}`);
  },

  archive(id: number, businessUnitId: number): Promise<Product> {
    return apiClient.post(`/api/products/${id}/archive?businessUnitId=${businessUnitId}`, {});
  },

  createStockMovement(
    id: number,
    data: CreateStockMovementRequest,
  ): Promise<{ movement: unknown; newQuantity: number }> {
    return apiClient.post(`/api/products/${id}/stock-movements`, data);
  },

  searchForPOS(businessUnitId: number, query: string): Promise<ProductSearchResult[]> {
    return apiClient.get(
      `/api/products/search?businessUnitId=${businessUnitId}&q=${encodeURIComponent(query)}`,
    );
  },

  getAllForPOS(businessUnitId: number): Promise<ProductSearchResult[]> {
    return apiClient.get(
      `/api/products/search?businessUnitId=${businessUnitId}&q=&all=1`,
    );
  },

  getImportTemplateUrl(): string {
    return `${getApiBaseUrl()}/api/products/import-template`;
  },

  async importCsv(businessUnitId: number, file: File): Promise<ProductImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(
      `${getApiBaseUrl()}/api/products/import?businessUnitId=${businessUnitId}`,
      { method: 'POST', body: formData },
    );
    const json = (await res.json()) as { data: ProductImportResult | null; error: { message: string } | null };
    if (!res.ok || json.error) {
      throw new Error(json.error?.message ?? `Error ${res.status}`);
    }
    return json.data!;
  },

  findByBarcode(
    barcode: string,
    businessUnitId: number,
  ): Promise<{
    found: false;
  } | {
    found: true;
    item: { productId: number; name: string; sku: string; basePrice: number; taxRate: number; stock: number };
  }> {
    return apiClient.get(
      `/api/products/barcode/${encodeURIComponent(barcode)}?businessUnitId=${businessUnitId}`,
    );
  },
};
