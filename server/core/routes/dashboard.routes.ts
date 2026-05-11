import { Router } from 'express';
import { DashboardService } from '../services/DashboardService';
import type { Request, Response, NextFunction } from 'express';

const service = new DashboardService();
export const dashboardRouter = Router();

dashboardRouter.get('/dashboard', (req: Request, res: Response, next: NextFunction) => {
  try {
    const buId = Number(req.query.buId);
    const moduleId = String(req.query.moduleId ?? '');
    if (!buId || isNaN(buId)) {
      res.status(400).json({ data: null, error: { message: 'buId requerido', code: 'VALIDATION_ERROR' } });
      return;
    }
    const data = service.getData(buId, moduleId);
    res.json({ data, error: null });
  } catch (err) {
    next(err);
  }
});
