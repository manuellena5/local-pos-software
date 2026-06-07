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
export function toSkuPart(text: string, length: number): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // eliminar diacriticos / tildes
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')          // solo alfanumericos
    .slice(0, length)
    .padEnd(length, 'X');               // rellenar con X si es muy corto
}
