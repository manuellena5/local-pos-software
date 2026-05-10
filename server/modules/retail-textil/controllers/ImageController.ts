import type { Request, Response } from 'express';
import path from 'path';
import { imageService } from '../services/ImageService';
import { reorderImagesSchema } from '../schemas';
import { ValidationError } from '../../../lib/errors';

export class ImageController {
  list(req: Request, res: Response): void {
    const productId = Number(req.params['productId']);
    if (isNaN(productId)) {
      res.status(400).json({ data: null, error: { code: 'INVALID_PARAMS', message: 'productId inválido' } });
      return;
    }
    res.json({ data: imageService.list(productId), error: null });
  }

  upload(req: Request, res: Response): void {
    const productId = Number(req.params['productId']);
    if (isNaN(productId)) {
      res.status(400).json({ data: null, error: { code: 'INVALID_PARAMS', message: 'productId inválido' } });
      return;
    }
    if (!req.file) {
      res.status(400).json({ data: null, error: { code: 'NO_FILE', message: 'No se recibió ningún archivo' } });
      return;
    }
    const altText = typeof req.body['altText'] === 'string' ? req.body['altText'] : undefined;
    // Guardar ruta relativa al cwd para portabilidad
    const relativePath = path.relative(process.cwd(), req.file.path).replace(/\\/g, '/');
    const image = imageService.add(productId, relativePath, altText);
    res.status(201).json({ data: image, error: null });
  }

  delete(req: Request, res: Response): void {
    const productId = Number(req.params['productId']);
    const imageId   = Number(req.params['imageId']);
    if (isNaN(productId) || isNaN(imageId)) {
      res.status(400).json({ data: null, error: { code: 'INVALID_PARAMS', message: 'Parámetros inválidos' } });
      return;
    }
    imageService.delete(productId, imageId);
    res.json({ data: { message: 'Imagen eliminada' }, error: null });
  }

  reorder(req: Request, res: Response): void {
    const productId = Number(req.params['productId']);
    if (isNaN(productId)) {
      res.status(400).json({ data: null, error: { code: 'INVALID_PARAMS', message: 'productId inválido' } });
      return;
    }
    const parsed = reorderImagesSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Datos inválidos', parsed.error.flatten());
    imageService.reorder(productId, parsed.data);
    res.json({ data: { message: 'Orden actualizado' }, error: null });
  }

  setPrimary(req: Request, res: Response): void {
    const productId = Number(req.params['productId']);
    const imageId   = Number(req.params['imageId']);
    if (isNaN(productId) || isNaN(imageId)) {
      res.status(400).json({ data: null, error: { code: 'INVALID_PARAMS', message: 'Parámetros inválidos' } });
      return;
    }
    imageService.setPrimary(productId, imageId);
    res.json({ data: { message: 'Imagen primaria actualizada' }, error: null });
  }
}

export const imageController = new ImageController();
