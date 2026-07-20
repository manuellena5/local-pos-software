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

/**
 * Parsea un número tipeado por el usuario aceptando tanto "," como "."
 * como separador decimal (es-AR vs. en-US), con o sin separador de miles.
 * parseLocaleNumber("3892,57") → 3892.57
 * parseLocaleNumber("3.892,57") → 3892.57
 * parseLocaleNumber("3892.57") → 3892.57
 */
export function parseLocaleNumber(raw: string): number {
  const cleaned = raw.trim().replace(/[^0-9.,-]/g, '');
  if (!cleaned) return NaN;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized = cleaned;

  if (lastComma > -1 && lastDot > -1) {
    // Ambos presentes: el que aparece último es el separador decimal real
    normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, '').replace(',', '.')
        : cleaned.replace(/,/g, '');
  } else if (lastComma > -1) {
    normalized = cleaned.replace(',', '.');
  }

  return parseFloat(normalized);
}

/**
 * Redondea un monto hacia abajo (floor, a favor del cliente) al múltiplo
 * indicado. multiple <= 0 desactiva el redondeo (devuelve el monto tal cual).
 * roundDownToMultiple(1230, 50) → 1200
 * roundDownToMultiple(1230, 0) → 1230
 */
export function roundDownToMultiple(amount: number, multiple: number): number {
  if (multiple <= 0) return amount;
  return Math.floor(amount / multiple) * multiple;
}

/**
 * Calcula el ajuste de redondeo (siempre <= 0) para un monto y múltiplo dados.
 * calculateRoundingAmount(1230, 50) → -30
 * calculateRoundingAmount(1200, 50) → 0
 */
export function calculateRoundingAmount(amount: number, multiple: number): number {
  const rounded = roundDownToMultiple(amount, multiple);
  return Math.round((rounded - amount) * 100) / 100;
}
