import { Router } from 'express';
import { StockController } from '../controllers/StockController';
import { StockService } from '../services/StockService';
import { StockRepository } from '../repositories/StockRepository';
import { ProductRepository } from '../repositories/ProductRepository';

const stockRepo = new StockRepository();
const productRepo = new ProductRepository();
const stockService = new StockService(stockRepo, productRepo);
const stockController = new StockController(stockService);

export const stockRouter = Router();

stockRouter.get('/stock/summary', (req, res, next) => stockController.getSummary(req, res, next));
stockRouter.get('/stock/:productId/movements', (req, res, next) =>
  stockController.getMovements(req, res, next)
);
stockRouter.post('/stock/:productId/adjust', (req, res, next) =>
  stockController.adjust(req, res, next)
);
