import { apiClient } from './client';
import type { Customer, Sale, SaleItem } from '@shared/types';

export interface CustomerHistory {
  customer: Customer;
  purchases: Array<{ sale: Sale; items: SaleItem[] }>;
  totalSpent: number;
}

export interface CreditStatus {
  used: number;
  limit: number;
  available: number;
}

export const customersApi = {
  list(filters?: { q?: string }): Promise<Customer[]> {
    const params = filters?.q ? `?q=${encodeURIComponent(filters.q)}` : '';
    return apiClient.get(`/api/customers${params}`);
  },

  get(id: number): Promise<Customer> {
    return apiClient.get(`/api/customers/${id}`);
  },

  getHistory(id: number): Promise<CustomerHistory> {
    return apiClient.get(`/api/customers/${id}/history`);
  },

  getCreditStatus(id: number): Promise<CreditStatus> {
    return apiClient.get(`/api/customers/${id}/credit-status`);
  },

  create(data: Partial<Customer>): Promise<Customer> {
    return apiClient.post('/api/customers', data);
  },

  update(id: number, data: Partial<Customer>): Promise<Customer> {
    return apiClient.patch(`/api/customers/${id}`, data);
  },

  delete(id: number): Promise<{ deleted: boolean }> {
    return apiClient.delete(`/api/customers/${id}`);
  },
};
