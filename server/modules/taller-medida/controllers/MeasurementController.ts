import type { Request, Response } from 'express';
import { measurementService } from '../services/MeasurementService';
import { upsertMeasurementsSchema } from '../schemas';
import { ValidationError } from '../../../lib/errors';

export class MeasurementController {
  get(req: Request, res: Response): void {
    const customerId = Number(req.params['customerId']);
    const buId       = Number(req.query['buId']);
    if (isNaN(customerId) || isNaN(buId)) {
      res.status(400).json({ data: null, error: { code: 'INVALID_PARAMS', message: 'customerId y buId requeridos' } });
      return;
    }
    const data = measurementService.get(customerId, buId);
    res.json({ data, error: null });
  }

  upsert(req: Request, res: Response): void {
    const customerId = Number(req.params['customerId']);
    const buId       = Number(req.query['buId'] ?? req.body.buId);
    if (isNaN(customerId) || isNaN(buId)) {
      res.status(400).json({ data: null, error: { code: 'INVALID_PARAMS', message: 'customerId y buId requeridos' } });
      return;
    }
    const parsed = upsertMeasurementsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Datos inválidos', parsed.error.flatten());
    }
    const data = measurementService.upsert(customerId, buId, parsed.data);
    res.json({ data, error: null });
  }
}

export const measurementController = new MeasurementController();
