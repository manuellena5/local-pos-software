import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvoiceQueueService } from '../../server/core/services/InvoiceQueueService';
import type { AFIPService } from '../../server/core/services/AFIPService';
import type { PendingInvoiceRepository } from '../../server/core/repositories/PendingInvoiceRepository';
import type { SaleRepository } from '../../server/core/repositories/SaleRepository';
import type { Sale, SaleWithItems } from '../../shared/types';

function makeSale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: 1,
    businessUnitId: 1,
    userId: null,
    saleNumber: 1,
    subtotal: 100,
    discountAmount: 0,
    discountPercent: 0,
    taxableAmount: 100,
    taxRate: 21,
    taxAmount: 21,
    totalAmount: 121,
    paymentMethods: [{ method: 'cash', amount: 121 }],
    status: 'completed',
    invoiceNumber: null,
    cae: null,
    caeExpiration: null,
    invoiceStatus: 'pending',
    invoiceError: null,
    invoiceAttempts: 0,
    lastInvoiceAttemptAt: null,
    createdAt: '2026-04-27T10:00:00.000Z',
    ...overrides,
  };
}

describe('InvoiceQueueService', () => {
  let afipService: AFIPService;
  let pendingRepo: PendingInvoiceRepository;
  let saleRepo: SaleRepository;
  let service: InvoiceQueueService;

  beforeEach(() => {
    afipService = {
      requestCAE: vi.fn(),
    } as unknown as AFIPService;

    pendingRepo = {
      enqueue: vi.fn(),
      getPending: vi.fn().mockReturnValue([]),
      recordFailure: vi.fn(),
      remove: vi.fn(),
      removeBySaleId: vi.fn(),
      getBySaleId: vi.fn().mockReturnValue(null),
    } as unknown as PendingInvoiceRepository;

    saleRepo = {
      getById: vi.fn(),
      getAll: vi.fn(),
      updateInvoiceFields: vi.fn(),
    } as unknown as SaleRepository;

    service = new InvoiceQueueService(afipService, pendingRepo, saleRepo);
  });

  describe('tryIssueAfterSale', () => {
    it('should update sale as issued when AFIP succeeds', async () => {
      vi.mocked(afipService.requestCAE).mockResolvedValue({
        success: true,
        cae: '12345678901234',
        caeExpiration: '20260507',
        invoiceNumber: 'B-0001-00000001',
      });

      const sale = makeSale();
      await service.tryIssueAfterSale(sale);

      expect(saleRepo.updateInvoiceFields).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ invoiceStatus: 'issued', cae: '12345678901234' })
      );
      expect(pendingRepo.enqueue).not.toHaveBeenCalled();
    });

    it('should enqueue when AFIP returns error', async () => {
      vi.mocked(afipService.requestCAE).mockResolvedValue({
        success: false,
        error: 'Error de validación AFIP',
      });

      const sale = makeSale();
      await service.tryIssueAfterSale(sale);

      expect(saleRepo.updateInvoiceFields).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ invoiceStatus: 'pending' })
      );
      expect(pendingRepo.enqueue).toHaveBeenCalledWith(1, 1, 'B');
    });

    it('should enqueue when AFIP times out', async () => {
      vi.mocked(afipService.requestCAE).mockRejectedValue(new Error('AFIP timeout after 10000ms'));

      const sale = makeSale();
      await service.tryIssueAfterSale(sale);

      expect(pendingRepo.enqueue).toHaveBeenCalledWith(1, 1, 'B');
    });
  });

  describe('processPendingQueue', () => {
    it('should do nothing when queue is empty', async () => {
      vi.mocked(pendingRepo.getPending).mockReturnValue([]);
      await service.processPendingQueue();
      expect(afipService.requestCAE).not.toHaveBeenCalled();
    });

    it('should process pending invoices and mark as issued', async () => {
      const pi = { id: 10, saleId: 1, businessUnitId: 1, invoiceType: 'B' as const, retryCount: 0, lastRetryAt: null, errorMessage: null, createdAt: '2026-04-27' };
      vi.mocked(pendingRepo.getPending).mockReturnValue([pi]);
      vi.mocked(saleRepo.getById).mockReturnValue({ sale: makeSale(), items: [] } as SaleWithItems);
      vi.mocked(afipService.requestCAE).mockResolvedValue({ success: true, cae: '99999999999999', caeExpiration: '20260507', invoiceNumber: 'B-0001-00000001' });

      await service.processPendingQueue();

      expect(saleRepo.updateInvoiceFields).toHaveBeenCalledWith(1, expect.objectContaining({ invoiceStatus: 'issued' }));
      expect(pendingRepo.remove).toHaveBeenCalledWith(10);
    });

    it('should record failure and mark as failed after max retries', async () => {
      const pi = { id: 10, saleId: 1, businessUnitId: 1, invoiceType: 'B' as const, retryCount: 2, lastRetryAt: null, errorMessage: null, createdAt: '2026-04-27' };
      vi.mocked(pendingRepo.getPending).mockReturnValue([pi]);
      vi.mocked(saleRepo.getById).mockReturnValue({ sale: makeSale(), items: [] } as SaleWithItems);
      vi.mocked(afipService.requestCAE).mockResolvedValue({ success: false, error: 'AFIP error' });

      await service.processPendingQueue();

      expect(saleRepo.updateInvoiceFields).toHaveBeenCalledWith(1, expect.objectContaining({ invoiceStatus: 'failed' }));
      expect(pendingRepo.recordFailure).toHaveBeenCalledWith(10, 'AFIP error');
    });
  });
});
