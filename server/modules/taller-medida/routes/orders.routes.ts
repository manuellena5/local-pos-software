import { Router } from 'express';
import { orderController } from '../controllers/OrderController';

export const ordersRouter = Router();

ordersRouter.get('/orders',                    (req, res) => orderController.list(req, res));
ordersRouter.get('/orders/:id',                (req, res) => orderController.get(req, res));
ordersRouter.post('/orders',                   (req, res) => orderController.create(req, res));
ordersRouter.patch('/orders/:id/status',       (req, res) => orderController.updateStatus(req, res));
ordersRouter.post('/orders/:id/payments',      (req, res) => orderController.addPayment(req, res));
