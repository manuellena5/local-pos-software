import { Router } from 'express';
import { SaleRepository } from '../repositories/SaleRepository';
import { PendingInvoiceRepository } from '../repositories/PendingInvoiceRepository';
import { AFIPService } from '../services/AFIPService';
import { InvoiceQueueService } from '../services/InvoiceQueueService';
import { InvoicesController } from '../controllers/InvoicesController';

const saleRepo = new SaleRepository();
const pendingRepo = new PendingInvoiceRepository();
const afipService = new AFIPService();
export const invoiceQueueService = new InvoiceQueueService(afipService, pendingRepo, saleRepo);
const controller = new InvoicesController(saleRepo, pendingRepo, invoiceQueueService);

export const invoicesRouter = Router();

invoicesRouter.get('/invoices/queue', (req, res) => controller.getQueue(req, res));
invoicesRouter.get('/invoices/stats', (req, res) => controller.getStats(req, res));
invoicesRouter.post('/invoices/:saleId/retry', (req, res) => controller.retryInvoice(req, res));
