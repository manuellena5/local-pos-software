import { Router } from 'express';
import { suppliersRouter } from './routes/suppliers.routes';
import { supplierProductsRouter } from './routes/supplierProducts.routes';
import { comparatorRouter } from './routes/comparator.routes';

export const proveedoresRouter = Router();

proveedoresRouter.use(suppliersRouter);
proveedoresRouter.use(supplierProductsRouter);
proveedoresRouter.use(comparatorRouter);
