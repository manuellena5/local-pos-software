import { Router } from 'express';
import { SystemResetService } from '../services/SystemResetService';
import { SystemController } from '../controllers/SystemController';

const service = new SystemResetService();
const controller = new SystemController(service);

export const systemRouter = Router();

systemRouter.post('/system/reset-demo', (req, res, next) => controller.resetDemoData(req, res, next));
