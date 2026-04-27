import { describe, it, expect } from 'vitest';
import { confirmSaleSchema, cartItemSchema, paymentMethodSchema } from '../../src/lib/validations/core/sales';

describe('cartItemSchema', () => {
  it('should accept valid cart item', () => {
    const result = cartItemSchema.safeParse({
      productId: 1,
      productName: 'Sábana',
      quantity: 2,
      unitPrice: 120,
      taxRate: 21,
      discountPercent: 0,
    });
    expect(result.success).toBe(true);
  });

  it('should reject quantity less than 1', () => {
    const result = cartItemSchema.safeParse({
      productId: 1,
      productName: 'Test',
      quantity: 0,
      unitPrice: 100,
      taxRate: 21,
      discountPercent: 0,
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative quantity', () => {
    const result = cartItemSchema.safeParse({
      productId: 1,
      productName: 'Test',
      quantity: -1,
      unitPrice: 100,
      taxRate: 21,
      discountPercent: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('paymentMethodSchema', () => {
  it('should accept valid payment method', () => {
    const result = paymentMethodSchema.safeParse({ method: 'cash', amount: 500 });
    expect(result.success).toBe(true);
  });

  it('should reject negative amount', () => {
    const result = paymentMethodSchema.safeParse({ method: 'cash', amount: -100 });
    expect(result.success).toBe(false);
  });

  it('should reject empty method', () => {
    const result = paymentMethodSchema.safeParse({ method: '', amount: 100 });
    expect(result.success).toBe(false);
  });
});

describe('confirmSaleSchema', () => {
  const validItem = {
    productId: 1,
    productName: 'Test',
    quantity: 1,
    unitPrice: 100,
    taxRate: 21,
    discountPercent: 0,
  };

  it('should accept valid sale', () => {
    const result = confirmSaleSchema.safeParse({
      businessUnitId: 1,
      items: [validItem],
      paymentMethods: [{ method: 'cash', amount: 121 }],
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty items', () => {
    const result = confirmSaleSchema.safeParse({
      businessUnitId: 1,
      items: [],
      paymentMethods: [{ method: 'cash', amount: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty payment methods', () => {
    const result = confirmSaleSchema.safeParse({
      businessUnitId: 1,
      items: [validItem],
      paymentMethods: [],
    });
    expect(result.success).toBe(false);
  });

  it('should accept discount percent', () => {
    const result = confirmSaleSchema.safeParse({
      businessUnitId: 1,
      items: [validItem],
      discountPercent: 10,
      paymentMethods: [{ method: 'cash', amount: 108.9 }],
    });
    expect(result.success).toBe(true);
  });
});
