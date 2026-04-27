import { Router } from 'express';
import { SaleRepository } from '../repositories/SaleRepository';
import { SalesService } from '../services/SalesService';
import { SalesController } from '../controllers/SalesController';
import { ProductRepository } from '../repositories/ProductRepository';

const saleRepo = new SaleRepository();
const productRepo = new ProductRepository();
const service = new SalesService(saleRepo, productRepo);
const controller = new SalesController(service);

export const salesRouter = Router();

salesRouter.get('/sales', (req, res, next) => controller.getAll(req, res, next));
salesRouter.get('/sales/:id', (req, res, next) => controller.getById(req, res, next));
salesRouter.post('/sales/confirm', (req, res, next) => controller.confirm(req, res, next));
