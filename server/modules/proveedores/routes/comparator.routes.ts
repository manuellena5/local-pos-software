import { Router } from 'express';
import { ProductSupplierLinkRepository } from '../repositories/ProductSupplierLinkRepository';
import { ComparatorService } from '../services/ComparatorService';
import { ComparatorController } from '../controllers/ComparatorController';

const linkRepo   = new ProductSupplierLinkRepository();
const service    = new ComparatorService(linkRepo);
const controller = new ComparatorController(service, linkRepo);

export const comparatorRouter = Router();

comparatorRouter.get('/comparator',                  (req, res, next) => controller.getComparatorData(req, res, next));
comparatorRouter.get('/comparator/suggestions',      (req, res, next) => controller.getSuggestions(req, res, next));
comparatorRouter.get('/comparator/unlinked',         (req, res, next) => controller.getUnlinked(req, res, next));
comparatorRouter.post('/comparator/create-from-supplier', (req, res, next) => controller.createFromSupplier(req, res, next));
comparatorRouter.post('/links',                      (req, res, next) => controller.createLink(req, res, next));
comparatorRouter.put('/links/:id/preferred',         (req, res, next) => controller.setPreferred(req, res, next));
comparatorRouter.delete('/links/:id',                (req, res, next) => controller.deleteLink(req, res, next));
comparatorRouter.post('/purchase-order',             (req, res, next) => controller.buildPurchaseOrder(req, res, next));
