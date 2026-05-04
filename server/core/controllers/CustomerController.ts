import type { Request, Response, NextFunction } from 'express';
import type { CustomerService } from '../services/CustomerService';

export class CustomerController {
  constructor(private readonly service: CustomerService) {}

  getAll = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const search = req.query['q'] as string | undefined;
      const data = search ? this.service.search(search) : this.service.listAll();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  getById = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const id = parseInt(req.params['id'] ?? '', 10);
      const data = this.service.getById(id);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  getHistory = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const id = parseInt(req.params['id'] ?? '', 10);
      const data = this.service.getWithHistory(id);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  getCreditStatus = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const id = parseInt(req.params['id'] ?? '', 10);
      const data = this.service.getCreditStatus(id);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  create = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = this.service.create(req.body);
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  update = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const id = parseInt(req.params['id'] ?? '', 10);
      const data = this.service.update(id, req.body);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  softDelete = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const id = parseInt(req.params['id'] ?? '', 10);
      this.service.softDelete(id);
      res.json({ data: { deleted: true }, error: null });
    } catch (err) {
      next(err);
    }
  };
}
