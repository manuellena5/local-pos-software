import { Router } from 'express';
import { ReportService } from '../services/ReportService';
import { ReportsController } from '../controllers/ReportsController';

const service = new ReportService();
const controller = new ReportsController(service);

export const reportsRouter = Router();

reportsRouter.get('/reports/sales', (req, res, next) => controller.getSalesReport(req, res, next));
reportsRouter.get('/reports/top-products', (req, res, next) => controller.getTopProducts(req, res, next));
reportsRouter.get('/reports/top-customers', (req, res, next) => controller.getTopCustomers(req, res, next));
reportsRouter.get('/reports/stock-movements', (req, res, next) => controller.getStockMovements(req, res, next));
reportsRouter.get('/reports/export', (req, res, next) => controller.exportCSV(req, res, next));
