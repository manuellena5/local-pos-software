import path from 'path';
import * as XLSX from 'xlsx';
import type { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../../../lib/errors';
import { ParseError, parseExcel, parseCSV } from '../lib/catalogParser';
import type { SupplierProductService } from '../services/SupplierProductService';
import type { UpsertSupplierProductDTO } from '../../../../shared/types';

export class SupplierProductController {
  constructor(private readonly service: SupplierProductService) {}

  list = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const supplierId = parseInt(req.params['id'] ?? '', 10);
      if (isNaN(supplierId)) {
        res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'id de proveedor inválido' } });
        return;
      }
      const data = this.service.listBySupplierId(supplierId);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  create = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const supplierId = parseInt(req.params['id'] ?? '', 10);
      const buId       = parseInt((req.body as { businessUnitId?: string }).businessUnitId as string, 10);
      if (isNaN(supplierId) || isNaN(buId)) {
        throw new ValidationError('supplierId y businessUnitId son requeridos');
      }
      const body = req.body as Partial<UpsertSupplierProductDTO>;
      const data = this.service.createOne({
        supplierId,
        businessUnitId: buId,
        name:           String(body.name ?? ''),
        supplierCode:   body.supplierCode ?? null,
        unitCost:       Number(body.unitCost),
        currency:       body.currency ?? 'ARS',
        unit:           body.unit ?? 'unidad',
        categoryHint:   body.categoryHint ?? null,
      });
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  update = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const id   = parseInt(req.params['id'] ?? '', 10);
      if (isNaN(id)) {
        throw new ValidationError('id inválido');
      }
      const body = req.body as Partial<UpsertSupplierProductDTO>;
      const data = this.service.updateOne(id, {
        ...(body.name         !== undefined && { name: body.name }),
        ...(body.supplierCode !== undefined && { supplierCode: body.supplierCode }),
        ...(body.unitCost     !== undefined && { unitCost: Number(body.unitCost) }),
        ...(body.unit         !== undefined && { unit: body.unit }),
        ...(body.categoryHint !== undefined && { categoryHint: body.categoryHint }),
      });
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  };

  delete = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const id = parseInt(req.params['id'] ?? '', 10);
      if (isNaN(id)) {
        throw new ValidationError('id inválido');
      }
      this.service.deleteOne(id);
      res.json({ data: { deleted: true }, error: null });
    } catch (err) {
      next(err);
    }
  };

  import = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const supplierId = parseInt(req.params['id'] ?? '', 10);
      const buId       = parseInt(req.query['buId'] as string, 10);
      if (isNaN(supplierId) || isNaN(buId)) {
        res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'supplierId y buId son requeridos' } });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'No se recibió ningún archivo' } });
        return;
      }

      const ext = path.extname(file.originalname).toLowerCase();
      if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
        res.status(400).json({ data: null, error: { code: 'VALIDATION_ERROR', message: 'Formato no válido. Usar .xlsx, .xls o .csv' } });
        return;
      }

      let parsed;
      try {
        if (ext === '.csv') {
          parsed = parseCSV(file.buffer.toString('utf8'));
        } else {
          parsed = parseExcel(file.buffer);
        }
      } catch (parseErr) {
        if (parseErr instanceof ParseError) {
          res.status(422).json({ data: null, error: { code: 'PARSE_ERROR', message: parseErr.message } });
          return;
        }
        throw parseErr;
      }

      const result = this.service.importFromData(supplierId, buId, parsed.rows);
      // Agregar errores del parser a los del service
      result.errors.push(
        ...parsed.errors.map((e) => ({
          row:     e.row,
          reason:  e.reason,
          rawData: e.rawData,
        })),
      );
      res.json({ data: result, error: null });
    } catch (err) {
      next(err);
    }
  };

  downloadTemplate = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ['Nombre', 'Codigo', 'Precio', 'Unidad', 'Categoria'],
        ['Tela de algodón 150cm', 'TEX-0001', 850.00, 'metro', 'Telas'],
        ['Hilo poliéster 500m', 'HIL-0042', 120.50, 'unidad', 'Insumos'],
        ['Botones nácar x12', 'BOT-0007', 45.00, 'docena', 'Mercería'],
      ]);

      // Ancho de columnas
      ws['!cols'] = [
        { wch: 30 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 18 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Catálogo');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="plantilla-catalogo.xlsx"');
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  };
}
