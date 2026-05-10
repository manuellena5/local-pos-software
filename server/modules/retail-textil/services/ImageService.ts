import fs from 'fs';
import path from 'path';
import { imageRepository } from '../repositories/ImageRepository';
import { NotFoundError } from '../../../lib/errors';
import type { ProductImage } from '../../../db/schemas/modules/retail-textil';
import type { ReorderImagesInput } from '../schemas';

const MAX_IMAGES_PER_PRODUCT = 20;

export class ImageService {
  list(productId: number): ProductImage[] {
    return imageRepository.getByProductId(productId);
  }

  /**
   * Registra una imagen ya guardada en disco por multer.
   * Si es la primera imagen del producto, la marca como primaria automáticamente.
   */
  add(productId: number, filePath: string, altText?: string): ProductImage {
    const existing = imageRepository.countByProduct(productId);
    if (existing >= MAX_IMAGES_PER_PRODUCT) {
      throw new Error(`Máximo ${MAX_IMAGES_PER_PRODUCT} imágenes por producto`);
    }
    const isPrimary = existing === 0;
    return imageRepository.create({
      productId,
      filePath,
      altText,
      sortOrder: existing,
      isPrimary,
    });
  }

  /**
   * Elimina una imagen: borra el registro y el archivo en disco.
   */
  delete(productId: number, imageId: number): void {
    const img = imageRepository.findById(imageId);
    if (!img || img.productId !== productId) {
      throw new NotFoundError('Imagen no encontrada');
    }
    // Borrar archivo en disco (best-effort)
    try {
      if (fs.existsSync(img.filePath)) fs.unlinkSync(img.filePath);
    } catch {
      // ignorar si el archivo ya no existe
    }
    imageRepository.delete(imageId);

    // Si era primaria, promover la siguiente
    if (img.isPrimary) {
      const remaining = imageRepository.getByProductId(productId);
      if (remaining.length > 0) {
        imageRepository.setPrimary(productId, remaining[0].id);
      }
    }
  }

  reorder(productId: number, input: ReorderImagesInput): void {
    imageRepository.reorder(productId, input.order);
  }

  setPrimary(productId: number, imageId: number): void {
    const img = imageRepository.findById(imageId);
    if (!img || img.productId !== productId) {
      throw new NotFoundError('Imagen no encontrada');
    }
    imageRepository.setPrimary(productId, imageId);
  }

  /** Ruta base donde se guardan las imágenes de productos. */
  static imagesDir(productId: number): string {
    return path.join(process.cwd(), 'assets', 'products', String(productId));
  }
}

export const imageService = new ImageService();
