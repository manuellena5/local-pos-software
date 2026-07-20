import { apiClient } from './client';
import type { PaymentMethodConfig } from '@shared/types';

export const paymentMethodsApi = {
  list(): Promise<PaymentMethodConfig[]> {
    return apiClient.get('/api/payment-methods');
  },

  listActive(): Promise<PaymentMethodConfig[]> {
    return apiClient.get('/api/payment-methods/active');
  },

  setActive(id: number, isActive: boolean): Promise<PaymentMethodConfig> {
    return apiClient.patch(`/api/payment-methods/${id}`, { isActive });
  },
};
