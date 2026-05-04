/**
 * Utilidades de precios.
 *
 * En Argentina todos los precios al público incluyen IVA.
 * basePrice en DB = precio SIN IVA (base imponible).
 * displayPrice    = precio CON IVA = basePrice * (1 + taxRate/100)
 *
 * El carrito trabaja con displayPrice como unitPrice.
 * El IVA se muestra como desglose informativo (ya está incluido en el total).
 */

/**
 * Calcula el precio con IVA incluido a partir del precio base.
 * getDisplayPrice(3217, 21) → 3892.57
 */
export function getDisplayPrice(basePrice: number, taxRate: number): number {
  return Math.round(basePrice * (1 + taxRate / 100) * 100) / 100;
}

/**
 * Extrae el precio sin IVA a partir de un precio que ya incluye IVA.
 * getPriceWithoutTax(3892.57, 21) → 3217
 */
export function getPriceWithoutTax(displayPrice: number, taxRate: number): number {
  return Math.round((displayPrice / (1 + taxRate / 100)) * 100) / 100;
}

/**
 * Formatea un número como moneda argentina.
 * formatCurrency(3892.57) → "$3.892,57"
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
