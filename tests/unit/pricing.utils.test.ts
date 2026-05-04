import { describe, it, expect } from 'vitest';
import { getDisplayPrice, getPriceWithoutTax, formatCurrency } from '../../src/lib/utils/pricing';

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
