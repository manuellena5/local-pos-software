import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { ComparatorService } from '../services/ComparatorService';
import type { ProductSupplierLinkRepository } from '../repositories/ProductSupplierLinkRepository';

const createLinkSchema = z.object({
  productId:         z.number().int().positive(),
  supplierProductId: z.number().int().positive(),
  businessUnitId:    z.number().int().positive(),
});

const createFromSupplierSchema = z.object({
  supplierProductId: z.number().int().positive(),
  businessUnitId:    z.number().int().positive(),
  name:              z.string().min(1).max(200).trim(),
  salePrice:         z.number().positive(),
  costPrice:         z.number().min(0).optional().nullable(),
  initialStock:      z.number().int().min(0).optional().nullable(),
});

const purchaseOrderSchema = z.object({
  businessUnitId: z.number().int().positive(),
  items: z.array(
    z.object({
      productId:         z.number().int().positive(),
      supplierProductId: z.number().int().positive(),
      quantity:          z.number().positive(),
    }),
  ).min(1),
});

export class ComparatorController {
  constructor(
    private comparatorService: ComparatorService,
    private linkRepo: ProductSupplierLinkRepository,
  ) {}

  getComparatorData(req: Request, res: Response, next: NextFunction): void {
    try {
      const buId = parseInt(req.query['buId'] as string, 10);
      if (isNaN(buId)) { res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'buId inválido' } }); return; }
      const data = this.comparatorService.getComparatorData(buId);
      res.json({ data, error: null });
    } catch (err) { next(err); }
  }

  getSuggestions(req: Request, res: Response, next: NextFunction): void {
    try {
      const buId = parseInt(req.query['buId'] as string, 10);
      if (isNaN(buId)) { res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'buId inválido' } }); return; }
      const suggestions = this.comparatorService.getSuggestedMatches(buId);
      res.json({ data: suggestions, error: null });
    } catch (err) { next(err); }
  }

  createLink(req: Request, res: Response, next: NextFunction): void {
    try {
      const parsed = createLinkSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Datos inválidos' } });
        return;
      }
      // Verificar si ya existe el vínculo
      const existing = this.linkRepo.findByProductAndSupplierProduct(
        parsed.data.productId,
        parsed.data.supplierProductId,
      );
      if (existing) {
        res.status(409).json({ data: null, error: { code: 'CONFLICT', message: 'El vínculo ya existe' } });
        return;
      }
      const link = this.linkRepo.createLink(parsed.data);
      res.status(201).json({ data: link, error: null });
    } catch (err) { next(err); }
  }

  setPreferred(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = parseInt(req.params['id'] ?? '', 10);
      if (isNaN(id)) { res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'id inválido' } }); return; }
      const existing = this.linkRepo.findById(id);
      if (!existing) { res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Vínculo no encontrado' } }); return; }
      this.linkRepo.setPreferred(id);
      res.json({ data: { ok: true }, error: null });
    } catch (err) { next(err); }
  }

  deleteLink(req: Request, res: Response, next: NextFunction): void {
    try {
      const id = parseInt(req.params['id'] ?? '', 10);
      if (isNaN(id)) { res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'id inválido' } }); return; }
      const existing = this.linkRepo.findById(id);
      if (!existing) { res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Vínculo no encontrado' } }); return; }
      this.linkRepo.deleteLink(id);
      res.json({ data: { ok: true }, error: null });
    } catch (err) { next(err); }
  }

  getUnlinked(req: Request, res: Response, next: NextFunction): void {
    try {
      const buId = parseInt(req.query['buId'] as string, 10);
      if (isNaN(buId)) { res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'buId inválido' } }); return; }
      const data = this.comparatorService.getUnlinkedProducts(buId);
      res.json({ data, error: null });
    } catch (err) { next(err); }
  }

  createFromSupplier(req: Request, res: Response, next: NextFunction): void {
    try {
      const parsed = createFromSupplierSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Datos inválidos' } });
        return;
      }
      const product = this.comparatorService.createProductFromSupplier(
        parsed.data.businessUnitId,
        parsed.data,
      );
      res.status(201).json({ data: product, error: null });
    } catch (err) { next(err); }
  }

  buildPurchaseOrder(req: Request, res: Response, next: NextFunction): void {
    try {
      const parsed = purchaseOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Datos inválidos' } });
        return;
      }
      const order = this.comparatorService.buildPurchaseOrder(
        parsed.data.businessUnitId,
        parsed.data.items,
      );
      res.json({ data: order, error: null });
    } catch (err) { next(err); }
  }
}
