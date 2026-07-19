import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoist mocks ────────────────────────────────────────────────────────────────

const { mockDb } = vi.hoisted(() => {
  const mockDb = {
    select:  vi.fn(),
    from:    vi.fn(),
    where:   vi.fn(),
    orderBy: vi.fn(),
    limit:   vi.fn(),
    update:  vi.fn(),
    insert:  vi.fn(),
    set:     vi.fn(),
    get:     vi.fn(),
    all:     vi.fn(),
    run:     vi.fn(),
    returning: vi.fn(),
  };
  const chain = mockDb as Record<string, ReturnType<typeof vi.fn>>;
  for (const key of ['select','from','where','orderBy','limit','update','insert','set','returning']) {
    (chain[key] as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
  }
  return { mockDb };
});

vi.mock('../../server/db/connection', () => ({ db: mockDb }));

vi.mock('../../server/db/schema', () => ({
  customers:  {},
  sales:      {},
  saleItems:  {},
}));

// Use drizzle-orm operators as pass-through
vi.mock('drizzle-orm', () => ({
  eq:   vi.fn((_col: unknown, _val: unknown) => 'eq-condition'),
  desc: vi.fn((_col: unknown) => 'desc-order'),
}));

import { CustomerRepository } from '../../server/core/repositories/CustomerRepository';

// ── Fixtures ───────────────────────────────────────────────────────────────────

const baseCustomerRow = {
  id: 3,
  name: 'Laura López',
  documentType: 'DNI',
  document: '32111222',
  email: null,
  phone: null,
  address: null,
  locality: null,
  province: null,
  notes: null,
  creditLimit: 0,
  creditUsed: 0,
  isActive: true,
  createdAt: '2024-01-01T00:00:00',
  updatedAt: '2024-01-01T00:00:00',
};

const saleMixin = {
  businessUnitId: 1,
  userId: null,
  customerId: 3,
  subtotal: 0,
  discountAmount: 0,
  discountPercent: 0,
  taxableAmount: 0,
  taxRate: 21,
  taxAmount: 0,
  paymentMethods: JSON.stringify([{ method: 'cash', amount: 100 }]),
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
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('CustomerRepository.getWithPurchaseHistory', () => {
  let repo: CustomerRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new CustomerRepository();
  });

  it('should return customer purchase history filtered by customer_id', () => {
    const saleRows = [
      { ...saleMixin, id: 10, saleNumber: 1, totalAmount: 300, status: 'completed' },
      { ...saleMixin, id: 11, saleNumber: 2, totalAmount: 150, status: 'completed' },
    ];

    // getById uses .get(), so first .all() is the sales query; thereafter item queries
    let callCount = 0;
    mockDb.all.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return saleRows; // sales query
      return [];                             // sale_items queries per sale
    });
    mockDb.get.mockReturnValue(baseCustomerRow); // used by getById

    const result = repo.getWithPurchaseHistory(3);
    expect(result).not.toBeNull();
    expect(result!.customer.id).toBe(3);
    expect(result!.purchases).toHaveLength(2);
  });

  it('should exclude cancelled sales from totalSpent', () => {
    const saleRows = [
      { ...saleMixin, id: 20, saleNumber: 3, totalAmount: 500, status: 'completed' },
      { ...saleMixin, id: 21, saleNumber: 4, totalAmount: 200, status: 'cancelled' },
    ];

    let callCount = 0;
    mockDb.all.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return saleRows; // sales query
      return [];                             // sale_items queries per sale
    });
    mockDb.get.mockReturnValue(baseCustomerRow); // used by getById

    const result = repo.getWithPurchaseHistory(3);
    expect(result).not.toBeNull();
    // totalSpent debe ser solo 500 (excluye la venta anulada de $200)
    expect(result!.totalSpent).toBe(500);
  });
});
