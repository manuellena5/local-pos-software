import { NotFoundError } from '../../../lib/errors';
import { SupplierProductRepository } from '../repositories/SupplierProductRepository';
import type {
  SupplierProduct,
  RawImportRow,
  ImportResult,
  UpsertSupplierProductDTO,
} from '../../../../shared/types';

export class SupplierProductService {
  constructor(private readonly repo: SupplierProductRepository) {}

  listBySupplierId(supplierId: number, businessUnitId?: number): SupplierProduct[] {
    return this.repo.findAllBySupplierId(supplierId, businessUnitId);
  }

  importFromData(
    supplierId: number,
    businessUnitId: number,
    rows: RawImportRow[],
  ): ImportResult {
    const validItems: UpsertSupplierProductDTO[] = [];
    const errors: ImportResult['errors'] = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 1;

      if (!row.name || !row.name.trim()) {
        errors.push({ row: rowNum, reason: 'El nombre es obligatorio', rawData: row as unknown as Record<string, unknown> });
        return;
      }
      if (typeof row.unitCost !== 'number' || isNaN(row.unitCost) || row.unitCost < 0) {
        errors.push({ row: rowNum, reason: `Precio inválido: ${String(row.unitCost)}`, rawData: row as unknown as Record<string, unknown> });
        return;
      }

      validItems.push({
        supplierId,
        businessUnitId,
        name:         row.name.trim(),
        supplierCode: row.supplierCode?.trim() || null,
        unitCost:     row.unitCost,
        currency:     'ARS',
        unit:         row.unit?.trim() || 'unidad',
        categoryHint: row.categoryHint?.trim() || null,
        description:  row.description?.trim() || null,
        imageName:    row.imageName?.trim() || null,
      });
    });

    const { created, updated, unchanged } = this.repo.upsertMany(validItems);
    return { created, updated, unchanged, errors };
  }

  createOne(data: UpsertSupplierProductDTO): SupplierProduct {
    if (!data.name?.trim()) {
      throw new Error('El nombre del producto es obligatorio');
    }
    if (typeof data.unitCost !== 'number' || isNaN(data.unitCost) || data.unitCost < 0) {
      throw new Error('El precio de costo debe ser un número positivo');
    }
    return this.repo.create({
      ...data,
      name:         data.name.trim(),
      supplierCode: data.supplierCode?.trim() ? data.supplierCode.trim() : null,
      unit:         data.unit?.trim() || 'unidad',
      categoryHint: data.categoryHint?.trim() || null,
    });
  }

  updateOne(id: number, data: Partial<UpsertSupplierProductDTO>): SupplierProduct {
    const existing = this.repo.findById(id);
    if (!existing) throw new NotFoundError(`Producto de proveedor ${id} no encontrado`);
    return this.repo.update(id, data);
  }

  deleteOne(id: number): void {
    const existing = this.repo.findById(id);
    if (!existing) throw new NotFoundError(`Producto de proveedor ${id} no encontrado`);
    this.repo.softDelete(id);
  }
}
