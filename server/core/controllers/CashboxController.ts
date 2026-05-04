import type { Request, Response, NextFunction } from 'express';
import type { CashboxService } from '../services/CashboxService';

function getBUId(req: Request): number {
  return parseInt(req.query['businessUnitId'] as string, 10);
}

export class CashboxController {
  constructor(private readonly service: CashboxService) {}

  getBalance = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const businessUnitId = getBUId(req);
      const upToDate = req.query['upToDate'] as string | undefined;
      const data = this.service.getBalance(businessUnitId, upToDate);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  getMovements = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const businessUnitId = getBUId(req);
      const fromDate = req.query['fromDate'] as string | undefined;
      const toDate = req.query['toDate'] as string | undefined;
      const data = this.service.getMovements(businessUnitId, { fromDate, toDate });
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  recordMovement = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const businessUnitId = getBUId(req);
      const userId = req.body.userId as number | undefined;
      const data = this.service.recordMovement(businessUnitId, req.body, userId);
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  getAudits = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const businessUnitId = getBUId(req);
      const data = this.service.getAuditHistory(businessUnitId);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  performAudit = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const businessUnitId = getBUId(req);
      const userId = req.body.userId as number | undefined;
      const data = this.service.performAudit(businessUnitId, req.body, userId);
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };
}
