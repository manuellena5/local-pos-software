import type { Request, Response, NextFunction } from 'express';
import { resetDemoDataSchema } from '../schemas/system.schema';
import { ValidationError } from '../../lib/errors';
import type { SystemResetService } from '../services/SystemResetService';

export class SystemController {
  constructor(private readonly resetService: SystemResetService) {}

  resetDemoData = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = resetDemoDataSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors[0]?.message ?? 'Datos inválidos');
      }
      this.resetService.resetDemoData(parsed.data.confirm);
      res.json({ data: { reset: true }, error: null });
    } catch (err) {
      next(err);
    }
  };
}
