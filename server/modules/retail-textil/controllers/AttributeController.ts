import type { Request, Response } from 'express';
import { attributeService } from '../services/AttributeService';
import { upsertAttributesSchema } from '../schemas';
import { ValidationError } from '../../../lib/errors';

export class AttributeController {
  list(req: Request, res: Response): void {
    const productId = Number(req.params['productId']);
    if (isNaN(productId)) {
      res.status(400).json({ data: null, error: { code: 'INVALID_PARAMS', message: 'productId inválido' } });
      return;
    }
    const data = attributeService.list(productId);
    res.json({ data, error: null });
  }

  replace(req: Request, res: Response): void {
    const productId = Number(req.params['productId']);
    if (isNaN(productId)) {
      res.status(400).json({ data: null, error: { code: 'INVALID_PARAMS', message: 'productId inválido' } });
      return;
    }
    const parsed = upsertAttributesSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Datos inválidos', parsed.error.flatten());
    }
    const data = attributeService.replace(productId, parsed.data);
    res.json({ data, error: null });
  }
}

export const attributeController = new AttributeController();
