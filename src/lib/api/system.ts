import { apiClient } from './client';

export const systemApi = {
  resetDemoData(confirm: string): Promise<{ reset: boolean }> {
    return apiClient.post('/api/system/reset-demo', { confirm });
  },
};
