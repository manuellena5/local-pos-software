import { apiClient } from './client';
import type { PrinterConfig, PrinterStatus } from '@shared/types';

export const printerApi = {
  getStatus(): Promise<{ status: PrinterStatus; config: PrinterConfig | null }> {
    return apiClient.get('/api/printer/status');
  },
  detectPorts(): Promise<{ ports: string[] }> {
    return apiClient.post('/api/printer/detect', {});
  },
  connect(config: PrinterConfig): Promise<{ success: boolean; error?: string }> {
    return apiClient.post('/api/printer/connect', config);
  },
  testPrint(): Promise<{ success: boolean; error?: string }> {
    return apiClient.post('/api/printer/test', {});
  },
  disconnect(): Promise<{ success: boolean }> {
    return apiClient.post('/api/printer/disconnect', {});
  },
  saveConfig(config: PrinterConfig): Promise<{ success: boolean }> {
    return apiClient.put('/api/printer/config', config);
  },
};
