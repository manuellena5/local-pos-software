import { Router } from 'express';
import { CashMovementRepository } from '../repositories/CashMovementRepository';
import { CashAuditRepository } from '../repositories/CashAuditRepository';
import { CashboxService } from '../services/CashboxService';
import { CashboxController } from '../controllers/CashboxController';

const movementRepo = new CashMovementRepository();
const auditRepo = new CashAuditRepository();
export const cashboxService = new CashboxService(movementRepo, auditRepo);
const controller = new CashboxController(cashboxService);

export const cashboxRouter = Router();

cashboxRouter.get('/cashbox/balance', (req, res, next) => controller.getBalance(req, res, next));
cashboxRouter.get('/cashbox/movements', (req, res, next) => controller.getMovements(req, res, next));
cashboxRouter.post('/cashbox/movements', (req, res, next) => controller.recordMovement(req, res, next));
cashboxRouter.get('/cashbox/audits', (req, res, next) => controller.getAudits(req, res, next));
cashboxRouter.post('/cashbox/audit', (req, res, next) => controller.performAudit(req, res, next));
