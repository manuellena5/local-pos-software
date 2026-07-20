import { Router } from 'express';
import { PaymentMethodRepository } from '../repositories/PaymentMethodRepository';
import { PaymentMethodService } from '../services/PaymentMethodService';
import { PaymentMethodController } from '../controllers/PaymentMethodController';

const repo = new PaymentMethodRepository();
const service = new PaymentMethodService(repo);
const controller = new PaymentMethodController(service);

export const paymentMethodsRouter = Router();

paymentMethodsRouter.get('/payment-methods', (req, res, next) => controller.list(req, res, next));
paymentMethodsRouter.get('/payment-methods/active', (req, res, next) =>
  controller.listActive(req, res, next),
);
paymentMethodsRouter.patch('/payment-methods/:id', (req, res, next) =>
  controller.setActive(req, res, next),
);
