import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';
import { ProductService } from '../services/ProductService';
import { ProductRepository } from '../repositories/ProductRepository';
import { StockController } from '../controllers/StockController';
import { StockService } from '../services/StockService';
import { StockRepository } from '../repositories/StockRepository';

const productRepo    = new ProductRepository();
const stockRepo      = new StockRepository();
const productService = new ProductService(productRepo);
const stockService   = new StockService(stockRepo, productRepo);
const productController = new ProductController(productService);
const stockController   = new StockController(stockService);

export const productsRouter = Router();

// Existentes
productsRouter.get('/products',     (req, res, next) => productController.getAll(req, res, next));
productsRouter.get('/products/:id', (req, res, next) => productController.getById(req, res, next));
productsRouter.post('/products',    (req, res, next) => productController.create(req, res, next));
productsRouter.patch('/products/:id', (req, res, next) => productController.update(req, res, next));
productsRouter.delete('/products/:id', (req, res, next) => productController.delete(req, res, next));

// Nuevos endpoints
productsRouter.get('/products-with-stock',
  (req, res, next) => productController.listWithStock(req, res, next));
productsRouter.patch('/products/:id/inline',
  (req, res, next) => productController.inlineUpdate(req, res, next));
productsRouter.post('/products/bulk-update-prices',
  (req, res, next) => productController.bulkUpdatePrices(req, res, next));
productsRouter.get('/products/:id/purchase-history',
  (req, res, next) => productController.getPurchaseHistory(req, res, next));
productsRouter.get('/products/:id/stats',
  (req, res, next) => productController.getStats(req, res, next));
productsRouter.get('/products/:id/transaction-count',
  (req, res, next) => productController.countTransactions(req, res, next));
productsRouter.post('/products/:id/archive',
  (req, res, next) => productController.archive(req, res, next));
productsRouter.post('/products/:id/stock-movements',
  (req, res, next) => stockController.createMovement(req, res, next));
