import { Router } from 'express';
import { db } from '../../../db/connection';
import { tallerOrders, tallerOrderPayments } from '../../../db/schema';
import { eq, sql } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';

export const tallerReportsRouter = Router();

tallerReportsRouter.get('/reports/orders', (req: Request, res: Response, next: NextFunction) => {
  try {
    const buId = Number(req.query.buId);
    if (!buId || isNaN(buId)) {
      res.status(400).json({ data: null, error: { message: 'buId requerido', code: 'VALIDATION_ERROR' } });
      return;
    }

    const rows = db
      .select({
        status:        tallerOrders.status,
        count:         sql<number>`COUNT(*)`,
        totalAmount:   sql<number>`SUM(${tallerOrders.totalAmount})`,
      })
      .from(tallerOrders)
      .where(eq(tallerOrders.buId, buId))
      .groupBy(tallerOrders.status)
      .all();

    // Payments sum per order for paid/pending
    const paymentTotals = db
      .select({
        orderId:    tallerOrderPayments.orderId,
        paidTotal:  sql<number>`SUM(${tallerOrderPayments.amount})`,
      })
      .from(tallerOrderPayments)
      .groupBy(tallerOrderPayments.orderId)
      .all();

    const paidByOrder = new Map(paymentTotals.map((p) => [p.orderId, p.paidTotal]));

    const orders = db
      .select({
        id:                tallerOrders.id,
        customerName:      tallerOrders.customerName,
        description:       tallerOrders.description,
        status:            tallerOrders.status,
        totalAmount:       tallerOrders.totalAmount,
        estimatedDelivery: tallerOrders.estimatedDelivery,
        createdAt:         tallerOrders.createdAt,
      })
      .from(tallerOrders)
      .where(eq(tallerOrders.buId, buId))
      .orderBy(tallerOrders.createdAt)
      .all()
      .map((o) => ({
        ...o,
        paidAmount:    paidByOrder.get(o.id) ?? 0,
        pendingAmount: o.totalAmount - (paidByOrder.get(o.id) ?? 0),
      }));

    res.json({ data: { byStatus: rows, orders }, error: null });
  } catch (err) {
    next(err);
  }
});
