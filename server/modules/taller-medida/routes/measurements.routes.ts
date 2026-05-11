import { Router } from 'express';
import { measurementController } from '../controllers/MeasurementController';

export const measurementsRouter = Router();

measurementsRouter.get('/customers/:customerId/measurements',  (req, res) => measurementController.get(req, res));
measurementsRouter.put('/customers/:customerId/measurements',  (req, res) => measurementController.upsert(req, res));
