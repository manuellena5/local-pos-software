import { Router } from 'express';
import { ordersRouter } from './routes/orders.routes';
import { measurementsRouter } from './routes/measurements.routes';

export const tallerMedidaRouter = Router();

tallerMedidaRouter.use(ordersRouter);
tallerMedidaRouter.use(measurementsRouter);
