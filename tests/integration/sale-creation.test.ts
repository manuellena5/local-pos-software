import { describe, it, expect, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, seedInstallation, seedBusinessUnit, seedProductWithStock } from '../helpers/testDb';
import type { TestDb } from '../helpers/testDb';

describe('SaleRepository.create (SQLite real)', () => {
  let testDb: TestDb;

  afterEach(() => {
    testDb?.cleanup();
  });

  it('crea la venta, sus items, y descuenta stock con movimiento registrado', async () => {
    testDb = await createTestDb();
    const { db, sqlite } = testDb;

    const { SaleRepository } = await import('../../server/core/repositories/SaleRepository');
    const { sales, saleItems, stockMovements } = await import('../../server/db/schema');

    const installation = seedInstallation(db);
    const businessUnit = seedBusinessUnit(db, installation.id);
    const { product, stockItem } = seedProductWithStock(db, businessUnit.id, { quantity: 10 });

    const repo = new SaleRepository();

    const result = repo.create({
      businessUnitId: businessUnit.id,
      items: [
        {
          productId: product.id,
          productName: product.name,
          quantity: 3,
          unitPrice: 100,
          taxRate: 21,
          discountPercent: 0,
          lineTotal: 300,
        },
      ],
      subtotal: 300,
      discountAmount: 0,
      discountPercent: 0,
      taxableAmount: 247.93,
      taxRate: 21,
      taxAmount: 52.07,
      totalAmount: 300,
      roundingAdjustment: 0,
      paymentMethods: [{ method: 'cash', amount: 300 }],
    });

    const saleId = result.sale.id;
    const saleRows = db.select().from(sales).where(eq(sales.id, saleId)).all();
    expect(saleRows).toHaveLength(1);
    expect(saleRows[0]!.totalAmount).toBe(300);
    expect(saleRows[0]!.businessUnitId).toBe(businessUnit.id);

    const itemRows = db.select().from(saleItems).where(eq(saleItems.saleId, saleId)).all();
    expect(itemRows).toHaveLength(1);
    expect(itemRows[0]!.quantity).toBe(3);

    const updatedStock = sqlite
      .prepare('SELECT quantity FROM stock_items WHERE id = ?')
      .get(stockItem.id) as { quantity: number };
    expect(updatedStock.quantity).toBe(7);

    const movementRows = db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.stockItemId, stockItem.id))
      .all();
    expect(movementRows).toHaveLength(1);
    expect(movementRows[0]!.type).toBe('sale');
    expect(movementRows[0]!.quantity).toBe(-3);
  });
});
