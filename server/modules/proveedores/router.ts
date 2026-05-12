import { Router } from 'express';
import { suppliersRouter } from './routes/suppliers.routes';

export const proveedoresRouter = Router();

proveedoresRouter.use(suppliersRouter);
