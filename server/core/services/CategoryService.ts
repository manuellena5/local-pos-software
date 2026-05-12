import { eq, and, count } from 'drizzle-orm';
import { db } from '../../db/connection';
import { products } from '../../db/schema';
import { BusinessRuleError, NotFoundError } from '../../lib/errors';
import type { CategoryRepository } from '../repositories/CategoryRepository';
import type { Category } from '../../../shared/types';

/**
 * Normaliza un nombre de categoría: trim + primera letra mayúscula + resto minúsculas.
 * Ejemplos: "blanqueria" → "Blanqueria", "DECO  " → "Deco"
 */
function normalizeName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export class CategoryService {
  constructor(private readonly repo: CategoryRepository) {}

  /**
   * Lista todas las categorías activas de una BU, ordenadas por nombre A-Z.
   */
  listForBU(businessUnitId: number): Category[] {
    return this.repo.findAllForBU(businessUnitId);
  }

  /**
   * Crea una categoría normalizando el nombre.
   * @throws {BusinessRuleError} si ya existe una categoría con ese nombre (case-insensitive) en la BU.
   */
  create(name: string, businessUnitId: number): Category {
    const normalized = normalizeName(name);
    if (!normalized) {
      throw new BusinessRuleError('El nombre de la categoría no puede estar vacío');
    }
    this.assertNoDuplicate(normalized, businessUnitId, null);
    return this.repo.create({ name: normalized, businessUnitId });
  }

  /**
   * Edita el nombre de una categoría normalizando el nombre.
   * @throws {NotFoundError} si la categoría no existe.
   * @throws {BusinessRuleError} si el nombre nuevo ya está en uso en la BU.
   */
  update(id: number, name: string): Category {
    const existing = this.repo.findById(id);
    if (!existing) throw new NotFoundError(`Categoría ${id} no encontrada`);

    const normalized = normalizeName(name);
    if (!normalized) {
      throw new BusinessRuleError('El nombre de la categoría no puede estar vacío');
    }
    this.assertNoDuplicate(normalized, existing.businessUnitId, id);
    return this.repo.update(id, normalized);
  }

  /**
   * Soft-delete de una categoría.
   * @throws {NotFoundError} si la categoría no existe.
   * @throws {BusinessRuleError} si hay productos que usan esta categoría.
   */
  delete(id: number): void {
    const existing = this.repo.findById(id);
    if (!existing) throw new NotFoundError(`Categoría ${id} no encontrada`);

    // Contar productos que usan este nombre de categoría en la misma BU
    const result = db
      .select({ total: count() })
      .from(products)
      .where(
        and(
          eq(products.category, existing.name),
          eq(products.businessUnitId, existing.businessUnitId),
          eq(products.isActive, true),
        ),
      )
      .get();

    const productCount = result?.total ?? 0;
    if (productCount > 0) {
      throw new BusinessRuleError(
        `No se puede eliminar: ${productCount} ${productCount === 1 ? 'producto usa' : 'productos usan'} esta categoría`,
      );
    }

    this.repo.softDelete(id);
  }

  /**
   * Verifica que no exista ya una categoría con el mismo nombre (case-insensitive)
   * en la BU. Excluye el id actual si se pasa (para edición).
   */
  private assertNoDuplicate(
    normalizedName: string,
    businessUnitId: number,
    excludeId: number | null,
  ): void {
    const all = this.repo.findAllForBUIncludingInactive(businessUnitId);
    const duplicate = all.find(
      (c) =>
        c.name.toLowerCase() === normalizedName.toLowerCase() &&
        (excludeId === null || c.id !== excludeId),
    );
    if (duplicate) {
      throw new BusinessRuleError(
        `Ya existe una categoría llamada "${duplicate.name}" en esta unidad de negocio`,
      );
    }
  }
}
