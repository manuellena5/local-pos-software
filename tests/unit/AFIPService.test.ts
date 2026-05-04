import { describe, it, expect, beforeEach, vi } from 'vitest';

// Forzar modo mock
vi.stubEnv('AFIP_ENVIRONMENT', 'mock');

import { AFIPService } from '../../server/core/services/AFIPService';
import type { AFIPInvoiceRequest } from '../../server/core/types';

const BASE_REQUEST: AFIPInvoiceRequest = {
  saleId: 1,
  businessUnitId: 1,
  invoiceType: 'B',
  pointOfSale: 1,
  totalAmount: 121,
  taxableAmount: 100,
  taxAmount: 21,
  taxRate: 21,
  date: '20260427',
};

describe('AFIPService (mock mode)', () => {
  let service: AFIPService;

  beforeEach(() => {
    service = new AFIPService();
  });

  it('should return success=true in mock mode', async () => {
    const result = await service.requestCAE(BASE_REQUEST);
    expect(result.success).toBe(true);
  });

  it('should return a 14-digit CAE', async () => {
    const result = await service.requestCAE(BASE_REQUEST);
    expect(result.cae).toBeDefined();
    expect(result.cae).toMatch(/^\d{14}$/);
  });

  it('should return a YYYYMMDD caeExpiration', async () => {
    const result = await service.requestCAE(BASE_REQUEST);
    expect(result.caeExpiration).toBeDefined();
    expect(result.caeExpiration).toMatch(/^\d{8}$/);
  });

  it('should return invoiceNumber formatted as "B-0001-XXXXXXXX"', async () => {
    const result = await service.requestCAE(BASE_REQUEST);
    expect(result.invoiceNumber).toBeDefined();
    expect(result.invoiceNumber).toMatch(/^B-\d{4}-\d{8}$/);
  });

  it('should use invoiceType C for factura C', async () => {
    const result = await service.requestCAE({ ...BASE_REQUEST, invoiceType: 'C' });
    expect(result.invoiceNumber).toMatch(/^C-/);
  });

  it('should encode saleId in invoice number (mock)', async () => {
    const result = await service.requestCAE({ ...BASE_REQUEST, saleId: 42 });
    expect(result.invoiceNumber).toContain('00000042');
  });

  it('should set caeExpiration ~10 days in the future', async () => {
    const result = await service.requestCAE(BASE_REQUEST);
    const exp = result.caeExpiration!;
    const year = parseInt(exp.slice(0, 4), 10);
    const month = parseInt(exp.slice(4, 6), 10) - 1;
    const day = parseInt(exp.slice(6, 8), 10);
    const expDate = new Date(year, month, day);
    const now = new Date();
    const diffDays = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(8);
    expect(diffDays).toBeLessThan(12);
  });
});
