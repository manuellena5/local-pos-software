import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../../db/connection';
import { tallerOrders, tallerOrderPayments } from '../../../db/schemas/modules/taller-medida';
import type { TallerOrder, TallerOrderPayment } from '../../../db/schemas/modules/taller-medida';
import type { OrderStatus, PaymentType } from '../../../../shared/types/taller-medida';

export class OrderRepository {
  getById(id: number): TallerOrder | undefined {
    return db.select().from(tallerOrders).where(eq(tallerOrders.id, id)).get();
  }

  listByBu(buId: number, status?: OrderStatus): TallerOrder[] {
    if (status) {
      return db
        .select()
        .from(tallerOrders)
        .where(and(eq(tallerOrders.buId, buId), eq(tallerOrders.status, status)))
        .orderBy(tallerOrders.createdAt)
        .all();
    }
    return db
      .select()
      .from(tallerOrders)
      .where(eq(tallerOrders.buId, buId))
      .orderBy(tallerOrders.createdAt)
      .all();
  }

  create(data: {
    buId: number;
    customerId?: number;
    customerName: string;
    description: string;
    totalAmount: number;
    estimatedDelivery?: string;
    notes?: string;
  }): TallerOrder {
    return db.insert(tallerOrders).values(data).returning().get();
  }

  updateStatus(id: number, status: OrderStatus): TallerOrder {
    return db
      .update(tallerOrders)
      .set({ status, updatedAt: sql`(datetime('now'))` })
      .where(eq(tallerOrders.id, id))
      .returning()
      .get();
  }

  getPaidAmount(orderId: number): number {
    const result = db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(tallerOrderPayments)
      .where(eq(tallerOrderPayments.orderId, orderId))
      .get();
    return result?.total ?? 0;
  }

  addPayment(data: {
    orderId: number;
    amount: number;
    paymentType: PaymentType;
    notes?: string;
  }): TallerOrderPayment {
    return db.insert(tallerOrderPayments).values(data).returning().get();
  }

  getPayments(orderId: number): TallerOrderPayment[] {
    return db
      .select()
      .from(tallerOrderPayments)
      .where(eq(tallerOrderPayments.orderId, orderId))
      .orderBy(tallerOrderPayments.paidAt)
      .all();
  }
}

export const orderRepository = new OrderRepository();
