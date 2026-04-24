import type { Request, Response, NextFunction } from 'express';
import { InstallationService } from '../services/InstallationService';
import { updateInstallationSchema } from '../schemas/installation.schema';
import { ValidationError } from '../../lib/errors';

export class InstallationController {
  constructor(private readonly service: InstallationService) {}

  getConfig(req: Request, res: Response, next: NextFunction): void {
    try {
      const config = this.service.getConfig();
      res.json({ data: config, error: null });
    } catch (err) {
      next(err);
    }
  }

  updateConfig(req: Request, res: Response, next: NextFunction): void {
    try {
      const parsed = updateInstallationSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Datos inválidos', parsed.error.errors);
      }
      const config = this.service.updateConfig(parsed.data);
      res.json({ data: config, error: null });
    } catch (err) {
      next(err);
    }
  }
}
