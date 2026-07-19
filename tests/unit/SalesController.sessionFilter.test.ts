import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock heavy dependencies before any imports
vi.mock('../../server/core/services/PrinterService', () => ({
  printerService: { printSaleTicket: vi.fn() },
}));

vi.mock('../../server/db/connection', () => ({
  db: {},
  sqlite: { prepare: vi.fn() },
}));

vi.mock('../../server/db/schema', () => ({
  sales: {},
  saleItems: {},
  stockItems: {},
  stockMovements: {},
  cashMovements: {},
  cashAudits: {},
  customers: {},
}));

import { SalesController } from '../../server/core/controllers/SalesController';
import type { SalesService } from '../../server/core/services/SalesService';

function makeReq(query: Record<string, string>) {
  return { query, body: {}, params: {} } as unknown as import('express').Request;
}
function makeRes() {
  return { json: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as import('express').Response;
}

describe('SalesController — session filter', () => {
  let service: SalesService;
  let controller: SalesController;

  beforeEach(() => {
    service = {
      getSalesFilteredWithPreview: vi.fn().mockReturnValue([]),
      getAllSalesWithPreview: vi.fn().mockReturnValue([]),
    } as unknown as SalesService;

    controller = new SalesController(
      service,
      { get: vi.fn().mockReturnValue({}) } as never,
      { getById: vi.fn().mockReturnValue(null) } as never,
      { getById: vi.fn().mockReturnValue(null) } as never,
    );
  });

  it('should filter sales by cash_register_id when param provided', () => {
    const req = makeReq({ businessUnitId: '1', cashSessionId: '5' });
    const res = makeRes();
    const next = vi.fn();

    controller.getAll(req, res, next);

    expect(service.getSalesFilteredWithPreview).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ cashSessionId: 5 }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
