import type { Request, Response, NextFunction } from 'express';
import type { ReporteZService } from '../services/ReporteZService';

export class ReporteZController {
  constructor(private readonly service: ReporteZService) {}

  getReporteZ = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const auditId = parseInt(req.params['auditId'] ?? '', 10);
      const businessUnitId = parseInt(req.query['businessUnitId'] as string, 10);
      if (isNaN(auditId) || isNaN(businessUnitId)) {
        res.status(400).json({ data: null, error: 'auditId y businessUnitId son requeridos' });
        return;
      }
      const data = this.service.getReporteZData(auditId, businessUnitId);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };
}
