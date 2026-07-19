/**
 * Normaliza un string para usar como parte de un SKU:
 * elimina tildes, convierte a mayúsculas, elimina caracteres
 * no alfanuméricos y toma los primeros N caracteres.
 * Rellena con 'X' si el resultado es más corto que .
 *
 * @example
 * toSkuPart('Aromas', 3)      // 'ARM'
 * toSkuPart('Blanqueria', 3)  // 'BLA'
 * toSkuPart('Home Spray', 3)  // 'HOM'
 * toSkuPart('Sabanas', 3)     // 'SAB'
 * toSkuPart('Te', 3)          // 'TEX'  (TE + padding X)
 */
import type BetterSqlite3 from 'better-sqlite3';

/**
 * Genera un SKU con formato {CAT}-{PROD}-{NNN} sin depender de una instancia
 * de repositorio — acepta la conexión `sqlite` directamente para poder usarse
 * desde cualquier módulo.
 */
export function generateSkuCore(
  categoryName: string,
  productName: string,
  businessUnitId: number,
  sqlite: BetterSqlite3.Database,
): string {
  const catPart  = toSkuPart(categoryName || 'GEN', 3);
  const prodPart = toSkuPart(productName  || 'PRD', 3);
  const prefix   = `${catPart}-${prodPart}`;

  type Row = { sku: string };
  const existing = sqlite
    .prepare(`SELECT sku FROM products WHERE business_unit_id = ? AND sku LIKE ? || '-%'`)
    .all(businessUnitId, prefix) as Row[];

  let maxNum = 0;
  for (const { sku } of existing) {
    const suffix = sku.slice(prefix.length + 1);
    const n = parseInt(suffix, 10);
    if (!isNaN(n) && n > maxNum) maxNum = n;
  }

  let candidate: string;
  let attempt = maxNum + 1;
  do {
    candidate = `${prefix}-${String(attempt).padStart(3, '0')}`;
    attempt++;
  } while (
    sqlite
      .prepare(`SELECT 1 FROM products WHERE business_unit_id = ? AND sku = ?`)
      .get(businessUnitId, candidate) !== undefined
  );

  return candidate;
}

export function toSkuPart(text: string, length: number): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // eliminar diacriticos / tildes
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')          // solo alfanumericos
    .slice(0, length)
    .padEnd(length, 'X');               // rellenar con X si es muy corto
}
