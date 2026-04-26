import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { ProductService } from '../services/ProductService';
import { ProductRepository } from '../repositories/ProductRepository';

const productRepo = new ProductRepository();
const productService = new ProductService(productRepo);
const productController = new ProductController(productService);

export const productsRouter = Router();

productsRouter.get('/products', (req, res, next) => productController.getAll(req, res, next));
productsRouter.get('/products/:id', (req, res, next) => productController.getById(req, res, next));
productsRouter.post('/products', (req, res, next) => productController.create(req, res, next));
productsRouter.patch('/products/:id', (req, res, next) => productController.update(req, res, next));
productsRouter.delete('/products/:id', (req, res, next) => productController.delete(req, res, next));
