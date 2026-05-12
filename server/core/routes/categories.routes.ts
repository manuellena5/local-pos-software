import { Router } from 'express';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { CategoryService } from '../services/CategoryService';
import { CategoryController } from '../controllers/CategoryController';

const repo = new CategoryRepository();
const service = new CategoryService(repo);
const controller = new CategoryController(service);

export const categoriesRouter = Router();

categoriesRouter.get('/categories', (req, res, next) => controller.list(req, res, next));
categoriesRouter.post('/categories', (req, res, next) => controller.create(req, res, next));
categoriesRouter.put('/categories/:id', (req, res, next) => controller.update(req, res, next));
categoriesRouter.delete('/categories/:id', (req, res, next) => controller.delete(req, res, next));
