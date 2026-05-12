import { BusinessRuleError, NotFoundError } from '../../../lib/errors';
import type { SupplierRepository } from '../repositories/SupplierRepository';
import type { Supplier } from '../../../../shared/types';
import type { CreateSupplierInput, UpdateSupplierInput } from '../schemas';

export class SupplierService {
  constructor(private readonly repo: SupplierRepository) {}

  listForBU(businessUnitId: number): Supplier[] {
    return this.repo.findAllForBU(businessUnitId);
  }

  getById(id: number, businessUnitId: number): Supplier {
    const supplier = this.repo.findById(id, businessUnitId);
    if (!supplier) throw new NotFoundError(`Proveedor ${id} no encontrado`);
    return supplier;
  }

  create(data: CreateSupplierInput): Supplier {
    const trimmed = data.name.trim();
    if (!trimmed) throw new BusinessRuleError('El nombre del proveedor no puede estar vacío');

    this.assertNoDuplicate(trimmed, data.businessUnitId, null);
    return this.repo.create({ ...data, name: trimmed });
  }

  update(id: number, businessUnitId: number, data: UpdateSupplierInput): Supplier {
    const existing = this.repo.findById(id, businessUnitId);
    if (!existing) throw new NotFoundError(`Proveedor ${id} no encontrado`);

    if (data.name !== undefined) {
      const trimmed = data.name.trim();
      if (!trimmed) throw new BusinessRuleError('El nombre del proveedor no puede estar vacío');
      this.assertNoDuplicate(trimmed, businessUnitId, id);
      data = { ...data, name: trimmed };
    }

    return this.repo.update(id, data);
  }

  delete(id: number, businessUnitId: number): void {
    const existing = this.repo.findById(id, businessUnitId);
    if (!existing) throw new NotFoundError(`Proveedor ${id} no encontrado`);

    // TODO (Paso 3): validar que no tenga supplier_products asociados antes de borrar
    // const productCount = supplierProductRepo.countBySupplier(id);
    // if (productCount > 0) throw new BusinessRuleError(`Tiene ${productCount} productos — no se puede eliminar`);

    this.repo.softDelete(id);
  }

  private assertNoDuplicate(name: string, businessUnitId: number, excludeId: number | null): void {
    const all = this.repo.findAllForBUIncludingInactive(businessUnitId);
    const dup = all.find(
      (s) => s.name.toLowerCase() === name.toLowerCase() &&
        (excludeId === null || s.id !== excludeId),
    );
    if (dup) {
      throw new BusinessRuleError(
        `Ya existe un proveedor llamado "${dup.name}" en esta unidad de negocio`,
      );
    }
  }
}
