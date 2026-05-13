import { Router } from 'express';
import multer from 'multer';
import { SupplierProductRepository } from '../repositories/SupplierProductRepository';
import { SupplierProductService } from '../services/SupplierProductService';
import { SupplierProductController } from '../controllers/SupplierProductController';

// memoryStorage: el buffer queda en RAM, no se escribe en disco
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const repo       = new SupplierProductRepository();
const service    = new SupplierProductService(repo);
const controller = new SupplierProductController(service);

export const supplierProductsRouter = Router();

// Plantilla descargable (sin :id)
supplierProductsRouter.get(
  '/supplier-products/import-template',
  controller.downloadTemplate,
);

// CRUD por proveedor
supplierProductsRouter.get(
  '/suppliers/:id/products',
  controller.list,
);

supplierProductsRouter.post(
  '/suppliers/:id/products',
  controller.create,
);

// Importación masiva
supplierProductsRouter.post(
  '/suppliers/:id/import',
  upload.single('file'),
  controller.import,
);

// Editar / eliminar por id de producto
supplierProductsRouter.put(
  '/supplier-products/:id',
  controller.update,
);

supplierProductsRouter.delete(
  '/supplier-products/:id',
  controller.delete,
);
