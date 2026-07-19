import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoist mocks so they are available when vi.mock factory runs ──────────────

const { mockDb, mockPrepare, mockSqlite } = vi.hoisted(() => {
  const mockPrepare = vi.fn();
  const mockSqlite = { prepare: mockPrepare };

  const mockDb = {
    select:  vi.fn(),
    from:    vi.fn(),
    where:   vi.fn(),
    orderBy: vi.fn(),
    limit:   vi.fn(),
    all:     vi.fn(),
  };
  mockDb.select.mockReturnValue(mockDb);
  mockDb.from.mockReturnValue(mockDb);
  mockDb.where.mockReturnValue(mockDb);
  mockDb.orderBy.mockReturnValue(mockDb);
  mockDb.limit.mockReturnValue(mockDb);

  return { mockDb, mockPrepare, mockSqlite };
});

vi.mock('../../server/db/connection', () => ({
  db: mockDb,
  sqlite: mockSqlite,
}));

vi.mock('../../server/db/schema', () => ({
  sales:          {},
  saleItems:      {},
  stockItems:     {},
  stockMovements: {},
  cashMovements:  {},
  cashAudits:     {},
  customers:      {},
}));

import { SaleRepository } from '../../server/core/repositories/SaleRepository';

// ── Fixture data ──────────────────────────────────────────────────────────────

const mockSaleRows = [
  {
    id: 1,
    businessUnitId: 1,
    userId: null,
    customerId: 2,
    saleNumber: 1,
    subtotal: 100,
    discountAmount: 0,
    discountPercent: 0,
    taxableAmount: 82.64,
    taxRate: 21,
    taxAmount: 17.36,
    totalAmount: 100,
    paymentMethods: JSON.stringify([{ method: 'cash', amount: 100 }]),
    status: 'completed',
    cancelledAt: null,
    cancellationReason: null,
    cancelledBy: null,
    invoiceNumber: null,
    cae: null,
    caeExpiration: null,
    invoiceStatus: 'pending',
    invoiceError: null,
    invoiceAttempts: 0,
    lastInvoiceAttemptAt: null,
    createdAt: '2024-01-01 10:00:00',
    updatedAt: '2024-01-01 10:00:00',
  },
  {
    id: 2,
    businessUnitId: 1,
    userId: null,
    customerId: null,
    saleNumber: 2,
    subtotal: 200,
    discountAmount: 0,
    discountPercent: 0,
    taxableAmount: 165.29,
    taxRate: 21,
    taxAmount: 34.71,
    totalAmount: 200,
    paymentMethods: JSON.stringify([{ method: 'transfer', amount: 200 }]),
    status: 'completed',
    cancelledAt: null,
    cancellationReason: null,
    cancelledBy: null,
    invoiceNumber: null,
    cae: null,
    caeExpiration: null,
    invoiceStatus: 'pending',
    invoiceError: null,
    invoiceAttempts: 0,
    lastInvoiceAttemptAt: null,
    createdAt: '2024-01-01 11:00:00',
    updatedAt: '2024-01-01 11:00:00',
  },
];

const mockItemRows = [
  { sale_id: 1, product_name: 'Remera', quantity: 2 },
  { sale_id: 1, product_name: 'Pantalón', quantity: 1 },
  { sale_id: 2, product_name: 'Campera', quantity: 3 },
];

const mockCustomerRows = [
  { id: 2, name: 'Juan Pérez', document: '12345678', document_type: 'DNI' },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SaleRepository.enrichWithPreview', () => {
  let repo: SaleRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new SaleRepository();

    mockDb.all.mockReturnValue(mockSaleRows);

    mockPrepare.mockImplementation((sql: string) => ({
      all: () => {
        if (sql.includes('sale_items')) return mockItemRows;
        if (sql.includes('customers')) return mockCustomerRows;
        return [];
      },
      get: () => null,
      run: () => undefined,
    }));
  });

  it('getAllWithPreview returns correct item totals per sale', () => {
    const result = repo.getAllWithPreview(1);

    expect(result).toHaveLength(2);

    const sale1 = result.find((s) => s.id === 1)!;
    expect(sale1.totalItems).toBe(2);
    expect(sale1.totalUnits).toBe(3); // 2 + 1
    expect(sale1.items).toHaveLength(2);
    expect(sale1.items[0]).toEqual({ productName: 'Remera', quantity: 2 });
    expect(sale1.items[1]).toEqual({ productName: 'Pantalón', quantity: 1 });

    const sale2 = result.find((s) => s.id === 2)!;
    expect(sale2.totalItems).toBe(1);
    expect(sale2.totalUnits).toBe(3);
    expect(sale2.items[0]).toEqual({ productName: 'Campera', quantity: 3 });
  });

  it('getFilteredWithPreview includes customerName when customer is linked', () => {
    const result = repo.getFilteredWithPreview(1, { status: 'all' });

    const sale1 = result.find((s) => s.id === 1)!;
    expect(sale1.customerName).toBe('Juan Pérez');
    expect(sale1.customerDocument).toBe('12345678');
    expect(sale1.customerDocumentType).toBe('DNI');

    const sale2 = result.find((s) => s.id === 2)!;
    expect(sale2.customerName).toBeNull();
    expect(sale2.customerDocument).toBeNull();
  });
});
