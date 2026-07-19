import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DashboardService } from '../services/DashboardService';
import { DashboardRepository } from '../repositories/DashboardRepository';

const querySchema = z.object({
  businessUnitId: z
    .string()
    .regex(/^\d+$/, 'businessUnitId debe ser un número entero positivo')
    .transform(Number),
});

const repo = new DashboardRepository();
const service = new DashboardService(repo);

export function getDashboard(req: Request, res: Response, next: NextFunction): void {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        data: null,
        error: { message: parsed.error.errors[0]?.message ?? 'businessUnitId requerido', code: 'VALIDATION_ERROR' },
      });
      return;
    }
    const data = service.getFullDashboard(parsed.data.businessUnitId);
    res.json({ data, error: null });
  } catch (err) {
    next(err);
  }
}
