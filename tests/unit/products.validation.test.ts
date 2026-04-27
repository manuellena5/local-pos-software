import { describe, it, expect } from 'vitest';
import {
  createProductSchema,
  updateProductSchema,
  adjustStockSchema,
} from '../../server/core/schemas/products.schema';

describe('createProductSchema', () => {
  const valid = {
    name: 'Sábana 144 hilos',
    sku: 'SAB-144',
    costPrice: 45,
    basePrice: 120,
    taxRate: 21,
  };

  it('should accept valid product', () => {
    expect(createProductSchema.safeParse(valid).success).toBe(true);
  });

  it('should reject empty name', () => {
    expect(createProductSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('should reject empty SKU', () => {
    expect(createProductSchema.safeParse({ ...valid, sku: '' }).success).toBe(false);
  });

  it('should reject costPrice >= basePrice', () => {
    expect(
      createProductSchema.safeParse({ ...valid, costPrice: 120, basePrice: 120 }).success
    ).toBe(false);
  });

  it('should reject costPrice > basePrice', () => {
    expect(
      createProductSchema.safeParse({ ...valid, costPrice: 200, basePrice: 120 }).success
    ).toBe(false);
  });

  it('should reject negative costPrice', () => {
    expect(createProductSchema.safeParse({ ...valid, costPrice: -1 }).success).toBe(false);
  });

  it('should accept taxRate = 0 (exento)', () => {
    expect(createProductSchema.safeParse({ ...valid, taxRate: 0 }).success).toBe(true);
  });

  it('should reject taxRate > 100', () => {
    expect(createProductSchema.safeParse({ ...valid, taxRate: 101 }).success).toBe(false);
  });

  it('should default taxRate to 21 when not provided', () => {
    const result = createProductSchema.safeParse({ ...valid, taxRate: undefined });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.taxRate).toBe(21);
    }
  });
});

describe('updateProductSchema', () => {
  it('should accept partial update (only name)', () => {
    expect(updateProductSchema.safeParse({ name: 'Nuevo nombre' }).success).toBe(true);
  });

  it('should accept empty object (no changes)', () => {
    expect(updateProductSchema.safeParse({}).success).toBe(true);
  });

  it('should reject costPrice >= basePrice when both provided', () => {
    expect(
      updateProductSchema.safeParse({ costPrice: 150, basePrice: 100 }).success
    ).toBe(false);
  });
});

describe('adjustStockSchema', () => {
  it('should accept positive quantity with reason', () => {
    expect(
      adjustStockSchema.safeParse({ quantity: 10, reason: 'Compra a proveedor' }).success
    ).toBe(true);
  });

  it('should accept negative quantity (salida)', () => {
    expect(
      adjustStockSchema.safeParse({ quantity: -5, reason: 'Salida por rotura' }).success
    ).toBe(true);
  });

  it('should reject quantity = 0', () => {
    expect(
      adjustStockSchema.safeParse({ quantity: 0, reason: 'Sin cambio' }).success
    ).toBe(false);
  });

  it('should reject reason shorter than 5 characters', () => {
    expect(
      adjustStockSchema.safeParse({ quantity: 5, reason: 'ok' }).success
    ).toBe(false);
  });

  it('should reject reason longer than 500 characters', () => {
    expect(
      adjustStockSchema.safeParse({ quantity: 5, reason: 'x'.repeat(501) }).success
    ).toBe(false);
  });
});
