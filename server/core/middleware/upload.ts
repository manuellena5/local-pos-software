/**
 * Configuración de multer para subida de imágenes de productos.
 * Guarda en assets/products/{productId}/ relativo al cwd.
 */
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import type { Request } from 'express';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination(req: Request, _file, cb) {
    const productId = req.params['productId'] ?? 'unknown';
    const dir = path.join(process.cwd(), 'assets', 'products', productId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const ext  = path.extname(file.originalname).toLowerCase() || '.jpg';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato no permitido. Usar JPG, PNG, WEBP o GIF.'));
  }
}

export const uploadProductImage = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE_BYTES } });
