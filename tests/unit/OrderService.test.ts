import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../server/db/connection', () => ({
  db: {},
  sqlite: { prepare: vi.fn(() => ({ get: vi.fn(), all: vi.fn(() => []), run: vi.fn() })) },
}));
vi.mock('../../server/db/schemas/modules/taller-medida', () => ({
  tallerOrders: {}, tallerOrderPayments: {}, tallerClientMeasurements: {},
  ORDER_STATUSES: ['presupuestado','confirmado','en_confeccion','en_prueba','listo','entregado','cancelado'],
  PAYMENT_TYPES: ['sena','saldo','parcial'],
}));

import { OrderService } from '../../server/modules/taller-medida/services/OrderService';
import { orderRepository } from '../../server/modules/taller-medida/repositories/OrderRepository';
import { NotFoundError, BusinessRuleError } from '../../server/lib/errors';

const makeOrder = (overrides = {}) => ({
  id: 1, buId: 10, customerId: null, customerName: 'Ana', description: 'Vestido',
  status: 'presupuestado' as const, totalAmount: 5000, estimatedDelivery: null,
  notes: null, createdAt: '2026-01-01', updatedAt: '2026-01-01',
  ...overrides,
});

vi.mock('../../server/modules/taller-medida/repositories/OrderRepository', () => {
  const mock = {
    listByBu:     vi.fn(),
    getById:      vi.fn(),
    create:       vi.fn(),
    updateStatus: vi.fn(),
    addPayment:   vi.fn(),
    getPayments:  vi.fn(),
    getPaidAmount: vi.fn(),
  };
  return { OrderRepository: vi.fn(() => mock), orderRepository: mock };
});

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrderService();
    (orderRepository.getPaidAmount as ReturnType<typeof vi.fn>).mockReturnValue(0);
    (orderRepository.getPayments  as ReturnType<typeof vi.fn>).mockReturnValue([]);
  });

  // ── create ────────────────────────────────────────────────────────────────

  it('create delegates to repository and returns order with payment totals', () => {
    const order = makeOrder();
    (orderRepository.create as ReturnType<typeof vi.fn>).mockReturnValue(order);

    const result = service.create(10, {
      customerName: 'Ana', description: 'Vestido', totalAmount: 5000,
    });

    expect(orderRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      buId: 10, customerName: 'Ana', totalAmount: 5000,
    }));
    expect(result.paidAmount).toBe(0);
    expect(result.pendingAmount).toBe(5000);
  });

  it('create registers initial payment when provided', () => {
    const order = makeOrder();
    (orderRepository.create  as ReturnType<typeof vi.fn>).mockReturnValue(order);
    (orderRepository.addPayment as ReturnType<typeof vi.fn>).mockReturnValue({});

    service.create(10, {
      customerName: 'Ana', description: 'Vestido', totalAmount: 5000,
      initialPayment: { amount: 1000, paymentType: 'sena' },
    });

    expect(orderRepository.addPayment).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 1, amount: 1000, paymentType: 'sena',
    }));
  });

  // ── get ───────────────────────────────────────────────────────────────────

  it('get throws NotFoundError when order does not exist', () => {
    (orderRepository.getById as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    expect(() => service.get(999)).toThrow(NotFoundError);
  });

  it('get returns order with payments and totals', () => {
    const order = makeOrder();
    const payments = [{ id: 1, orderId: 1, amount: 2000, paymentType: 'sena', notes: null, paidAt: '2026-01-01' }];
    (orderRepository.getById   as ReturnType<typeof vi.fn>).mockReturnValue(order);
    (orderRepository.getPayments as ReturnType<typeof vi.fn>).mockReturnValue(payments);

    const result = service.get(1);

    expect(result.payments).toHaveLength(1);
    expect(result.paidAmount).toBe(2000);
    expect(result.pendingAmount).toBe(3000);
  });

  // ── updateStatus ──────────────────────────────────────────────────────────

  it('updateStatus throws NotFoundError when order does not exist', () => {
    (orderRepository.getById as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    expect(() => service.updateStatus(99, { status: 'confirmado' })).toThrow(NotFoundError);
  });

  it('updateStatus allows valid transition presupuestado → confirmado', () => {
    const order = makeOrder({ status: 'presupuestado' });
    (orderRepository.getById     as ReturnType<typeof vi.fn>).mockReturnValue(order);
    (orderRepository.updateStatus as ReturnType<typeof vi.fn>).mockReturnValue({ ...order, status: 'confirmado' });

    const result = service.updateStatus(1, { status: 'confirmado' });

    expect(result.status).toBe('confirmado');
  });

  it('updateStatus rejects invalid transition presupuestado → en_confeccion', () => {
    const order = makeOrder({ status: 'presupuestado' });
    (orderRepository.getById as ReturnType<typeof vi.fn>).mockReturnValue(order);

    expect(() => service.updateStatus(1, { status: 'en_confeccion' })).toThrow(BusinessRuleError);
  });

  it('updateStatus rejects any transition from entregado', () => {
    const order = makeOrder({ status: 'entregado' });
    (orderRepository.getById as ReturnType<typeof vi.fn>).mockReturnValue(order);

    expect(() => service.updateStatus(1, { status: 'confirmado' })).toThrow(BusinessRuleError);
  });

  it('updateStatus allows cancel from confirmado', () => {
    const order = makeOrder({ status: 'confirmado' });
    (orderRepository.getById     as ReturnType<typeof vi.fn>).mockReturnValue(order);
    (orderRepository.updateStatus as ReturnType<typeof vi.fn>).mockReturnValue({ ...order, status: 'cancelado' });

    const result = service.updateStatus(1, { status: 'cancelado' });
    expect(result.status).toBe('cancelado');
  });

  // ── addPayment ────────────────────────────────────────────────────────────

  it('addPayment throws NotFoundError when order does not exist', () => {
    (orderRepository.getById as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
    expect(() => service.addPayment(99, { amount: 500, paymentType: 'saldo' })).toThrow(NotFoundError);
  });

  it('addPayment rejects payment on cancelled order', () => {
    const order = makeOrder({ status: 'cancelado' });
    (orderRepository.getById as ReturnType<typeof vi.fn>).mockReturnValue(order);

    expect(() => service.addPayment(1, { amount: 500, paymentType: 'saldo' })).toThrow(BusinessRuleError);
  });

  it('addPayment rejects payment on delivered order', () => {
    const order = makeOrder({ status: 'entregado' });
    (orderRepository.getById as ReturnType<typeof vi.fn>).mockReturnValue(order);

    expect(() => service.addPayment(1, { amount: 500, paymentType: 'saldo' })).toThrow(BusinessRuleError);
  });

  it('addPayment rejects payment that exceeds pending amount', () => {
    const order = makeOrder({ totalAmount: 5000 });
    (orderRepository.getById    as ReturnType<typeof vi.fn>).mockReturnValue(order);
    (orderRepository.getPaidAmount as ReturnType<typeof vi.fn>).mockReturnValue(4000);

    expect(() => service.addPayment(1, { amount: 2000, paymentType: 'saldo' })).toThrow(BusinessRuleError);
  });

  it('addPayment accepts exact remaining balance', () => {
    const order = makeOrder({ totalAmount: 5000 });
    const payment = { id: 2, orderId: 1, amount: 1000, paymentType: 'saldo' as const, notes: null, paidAt: '' };
    (orderRepository.getById    as ReturnType<typeof vi.fn>).mockReturnValue(order);
    (orderRepository.getPaidAmount as ReturnType<typeof vi.fn>).mockReturnValue(4000);
    (orderRepository.addPayment as ReturnType<typeof vi.fn>).mockReturnValue(payment);

    const result = service.addPayment(1, { amount: 1000, paymentType: 'saldo' });
    expect(result.amount).toBe(1000);
  });
});
