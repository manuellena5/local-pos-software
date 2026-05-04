/**
 * Utilidades de precio (server-side).
 * Espejo de src/lib/utils/pricing.ts para uso en el servidor.
 */

export function getDisplayPrice(basePrice: number, taxRate: number): number {
  return Math.round(basePrice * (1 + taxRate / 100) * 100) / 100;
}
