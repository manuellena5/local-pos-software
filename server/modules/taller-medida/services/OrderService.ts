import { orderRepository } from '../repositories/OrderRepository';
import { BusinessRuleError, NotFoundError } from '../../../lib/errors';
import {
  ORDER_STATUS_TRANSITIONS,
  type OrderStatus,
  type TallerOrder,
  type TallerOrderPayment,
} from '../../../../shared/types/taller-medida';
import type { CreateOrderInput, UpdateStatusInput, AddPaymentInput } from '../schemas';

export class OrderService {
  list(buId: number, status?: OrderStatus): (TallerOrder & { paidAmount: number; pendingAmount: number })[] {
    const orders = orderRepository.listByBu(buId, status);
    return orders.map((o) => this.withPaymentTotals(o));
  }

  get(id: number): TallerOrder & { paidAmount: number; pendingAmount: number; payments: TallerOrderPayment[] } {
    const order = orderRepository.getById(id);
    if (!order) throw new NotFoundError(`Pedido ${id} no encontrado`);

    const payments = orderRepository.getPayments(id);
    const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      ...order,
      paidAmount,
      pendingAmount: Math.max(0, order.totalAmount - paidAmount),
      payments,
    };
  }

  create(buId: number, input: CreateOrderInput): TallerOrder & { paidAmount: number; pendingAmount: number } {
    const order = orderRepository.create({
      buId,
      customerId:        input.customerId,
      customerName:      input.customerName,
      description:       input.description,
      totalAmount:       input.totalAmount,
      estimatedDelivery: input.estimatedDelivery,
      notes:             input.notes,
    });

    if (input.initialPayment) {
      orderRepository.addPayment({
        orderId:     order.id,
        amount:      input.initialPayment.amount,
        paymentType: input.initialPayment.paymentType,
        notes:       input.initialPayment.notes,
      });
    }

    return this.withPaymentTotals(order);
  }

  updateStatus(id: number, input: UpdateStatusInput): TallerOrder {
    const order = orderRepository.getById(id);
    if (!order) throw new NotFoundError(`Pedido ${id} no encontrado`);

    const validNextStatuses = ORDER_STATUS_TRANSITIONS[order.status];
    if (!validNextStatuses.includes(input.status)) {
      throw new BusinessRuleError(
        `No se puede pasar de '${order.status}' a '${input.status}'. ` +
        `Transiciones válidas: ${validNextStatuses.join(', ') || 'ninguna'}`,
      );
    }

    return orderRepository.updateStatus(id, input.status);
  }

  addPayment(id: number, input: AddPaymentInput): TallerOrderPayment {
    const order = orderRepository.getById(id);
    if (!order) throw new NotFoundError(`Pedido ${id} no encontrado`);

    if (order.status === 'cancelado') {
      throw new BusinessRuleError('No se pueden registrar pagos en un pedido cancelado');
    }
    if (order.status === 'entregado') {
      throw new BusinessRuleError('El pedido ya fue entregado y cobrado');
    }

    const paidAmount = orderRepository.getPaidAmount(id);
    if (paidAmount + input.amount > order.totalAmount) {
      throw new BusinessRuleError(
        `El pago de $${input.amount} excede el saldo pendiente ($${order.totalAmount - paidAmount})`,
      );
    }

    return orderRepository.addPayment({
      orderId:     id,
      amount:      input.amount,
      paymentType: input.paymentType,
      notes:       input.notes,
    });
  }

  private withPaymentTotals(order: TallerOrder): TallerOrder & { paidAmount: number; pendingAmount: number } {
    const paidAmount = orderRepository.getPaidAmount(order.id);
    return {
      ...order,
      paidAmount,
      pendingAmount: Math.max(0, order.totalAmount - paidAmount),
    };
  }
}

export const orderService = new OrderService();
