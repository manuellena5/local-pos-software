import path from 'path';
import * as XLSX from 'xlsx';
import type { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../../lib/errors';
import type { ProductImportService } from '../services/ProductImportService';
import type { ProductImportRow } from '../../../shared/types';

export class ProductImportController {
  constructor(private readonly service: ProductImportService) {}

  import = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const businessUnitId = Number(req.query['businessUnitId']);
      if (!Number.isInteger(businessUnitId) || businessUnitId <= 0) {
        throw new ValidationError('businessUnitId debe ser un número válido');
      }

      const file = req.file;
      if (!file) {
        throw new ValidationError('No se recibió ningún archivo');
      }

      const ext = path.extname(file.originalname).toLowerCase();
      if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
        throw new ValidationError('Formato no válido. Usar .xlsx, .xls o .csv');
      }

      // XLSX.read con buffer no detecta UTF-8 de forma confiable para .csv
      // sin BOM (tildes/ñ se leen como Latin1) — se decodifica como texto
      // UTF-8 explícito antes de parsear. Los .xlsx son binarios y no tienen
      // este problema.
      const workbook =
        ext === '.csv'
          ? XLSX.read(file.buffer.toString('utf-8'), { type: 'string' })
          : XLSX.read(file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
      const rows = XLSX.utils.sheet_to_json<ProductImportRow>(sheet, { defval: '' });

      if (rows.length === 0) {
        throw new ValidationError('El archivo no tiene filas para importar');
      }

      const result = this.service.importRows(businessUnitId, rows);
      res.json({ data: result, error: null });
    } catch (err) {
      next(err);
    }
  };

  downloadTemplate = (_req: Request, res: Response, next: NextFunction): void => {
    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ['nombre', 'categoria', 'precio', 'costo', 'stock', 'sku', 'tipo_variante', 'valor_variante'],
        ['Difusor de ambiente', 'Aromas', 4500, 2200, 10, 'DIF-001', '', ''],
        ['Home Spray Lavanda', 'Aromas', 3200, 1500, 15, 'HS-LAV', 'Fragancia', 'Lavanda'],
        ['Home Spray Lavanda', 'Aromas', 3200, 1500, 12, 'HS-CIT', 'Fragancia', 'Citrus'],
      ]);
      ws['!cols'] = [
        { wch: 28 },
        { wch: 14 },
        { wch: 10 },
        { wch: 10 },
        { wch: 8 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Productos');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="plantilla-productos.xlsx"');
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  };
}
