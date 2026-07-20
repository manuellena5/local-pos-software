import { describe, it, expect } from 'vitest';
import {
  getDisplayPrice,
  getPriceWithoutTax,
  formatCurrency,
  parseLocaleNumber,
  roundDownToMultiple,
  calculateRoundingAmount,
} from '../../src/lib/utils/pricing';

describe('getDisplayPrice', () => {
  it('should add 21% IVA', () => {
    expect(getDisplayPrice(3217, 21)).toBe(3892.57);
  });

  it('should add 10.5% IVA', () => {
    expect(getDisplayPrice(1000, 10.5)).toBe(1105);
  });

  it('should return basePrice when taxRate is 0', () => {
    expect(getDisplayPrice(500, 0)).toBe(500);
  });

  it('should round to 2 decimals', () => {
    // 100 * 1.21 = 121 exactly
    expect(getDisplayPrice(100, 21)).toBe(121);
  });

  it('should handle fractional results', () => {
    // 1 * 1.21 = 1.21
    expect(getDisplayPrice(1, 21)).toBe(1.21);
  });
});

describe('getPriceWithoutTax', () => {
  it('should extract base price from IVA-inclusive price', () => {
    expect(getPriceWithoutTax(3892.57, 21)).toBe(3217);
  });

  it('should be inverse of getDisplayPrice', () => {
    const base = 2500;
    const taxRate = 21;
    const display = getDisplayPrice(base, taxRate);
    expect(getPriceWithoutTax(display, taxRate)).toBe(base);
  });

  it('should return displayPrice when taxRate is 0', () => {
    expect(getPriceWithoutTax(500, 0)).toBe(500);
  });
});

describe('formatCurrency', () => {
  it('should format with $ sign and thousands separator', () => {
    const result = formatCurrency(3892.57);
    expect(result).toContain('3.892');
    expect(result).toContain('57');
    expect(result).toContain('$');
  });

  it('should format zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });

  it('should format large amounts', () => {
    const result = formatCurrency(1000000);
    expect(result).toContain('1.000.000');
  });
});

describe('parseLocaleNumber', () => {
  it('should parse a plain integer', () => {
    expect(parseLocaleNumber('3892')).toBe(3892);
  });

  it('should parse en-US style decimal (period)', () => {
    expect(parseLocaleNumber('3892.57')).toBe(3892.57);
  });

  it('should parse es-AR style decimal (comma)', () => {
    expect(parseLocaleNumber('3892,57')).toBe(3892.57);
  });

  it('should parse es-AR style with thousands separator', () => {
    expect(parseLocaleNumber('3.892,57')).toBe(3892.57);
  });

  it('should parse en-US style with thousands separator', () => {
    expect(parseLocaleNumber('3,892.57')).toBe(3892.57);
  });

  it('should handle negative numbers', () => {
    expect(parseLocaleNumber('-150,50')).toBe(-150.5);
  });

  it('should return NaN for empty string', () => {
    expect(parseLocaleNumber('')).toBeNaN();
  });

  it('should return NaN for non-numeric garbage', () => {
    expect(parseLocaleNumber('abc')).toBeNaN();
  });

  it('should ignore stray currency symbols', () => {
    expect(parseLocaleNumber('$ 3892,57')).toBe(3892.57);
  });
});

describe('roundDownToMultiple', () => {
  it('should round down to the nearest multiple of 50', () => {
    expect(roundDownToMultiple(1230, 50)).toBe(1200);
  });

  it('should round down to the nearest multiple of 10', () => {
    expect(roundDownToMultiple(1237, 10)).toBe(1230);
  });

  it('should round down to the nearest multiple of 100', () => {
    expect(roundDownToMultiple(1299, 100)).toBe(1200);
  });

  it('should return the amount unchanged when already a multiple', () => {
    expect(roundDownToMultiple(1200, 50)).toBe(1200);
  });

  it('should not round when multiple is 0 (disabled)', () => {
    expect(roundDownToMultiple(1234.56, 0)).toBe(1234.56);
  });

  it('should not round when multiple is negative', () => {
    expect(roundDownToMultiple(1234.56, -10)).toBe(1234.56);
  });
});

describe('calculateRoundingAmount', () => {
  it('should return a negative adjustment for a non-multiple amount', () => {
    expect(calculateRoundingAmount(1230, 50)).toBe(-30);
  });

  it('should return 0 when the amount is already a multiple', () => {
    expect(calculateRoundingAmount(1200, 50)).toBe(0);
  });

  it('should return 0 when multiple is 0 (disabled)', () => {
    expect(calculateRoundingAmount(1234.56, 0)).toBe(0);
  });

  it('should handle small multiples of 10', () => {
    expect(calculateRoundingAmount(1237, 10)).toBe(-7);
  });
});
