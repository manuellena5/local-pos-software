import { Router } from 'express';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { CustomerService } from '../services/CustomerService';
import { CustomerController } from '../controllers/CustomerController';

const repo = new CustomerRepository();
const service = new CustomerService(repo);
const controller = new CustomerController(service);

export const customersRouter = Router();

customersRouter.get('/customers', (req, res, next) => controller.getAll(req, res, next));
customersRouter.get('/customers/:id/history', (req, res, next) => controller.getHistory(req, res, next));
customersRouter.get('/customers/:id/credit-status', (req, res, next) => controller.getCreditStatus(req, res, next));
customersRouter.get('/customers/:id', (req, res, next) => controller.getById(req, res, next));
customersRouter.post('/customers', (req, res, next) => controller.create(req, res, next));
customersRouter.patch('/customers/:id', (req, res, next) => controller.update(req, res, next));
customersRouter.delete('/customers/:id', (req, res, next) => controller.softDelete(req, res, next));
