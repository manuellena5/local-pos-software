import { Router } from 'express';
import { SupplierRepository } from '../repositories/SupplierRepository';
import { SupplierService } from '../services/SupplierService';
import { SupplierController } from '../controllers/SupplierController';

const repo       = new SupplierRepository();
const service    = new SupplierService(repo);
const controller = new SupplierController(service);

export const suppliersRouter = Router();

suppliersRouter.get('/suppliers',     (req, res, next) => controller.list(req, res, next));
suppliersRouter.post('/suppliers',    (req, res, next) => controller.create(req, res, next));
suppliersRouter.put('/suppliers/:id', (req, res, next) => controller.update(req, res, next));
suppliersRouter.delete('/suppliers/:id', (req, res, next) => controller.delete(req, res, next));
