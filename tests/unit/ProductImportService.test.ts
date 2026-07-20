import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'fs';

// Usa una DB SQLite real (archivo temporal) en vez de mockear Drizzle —
// esta lógica tiene demasiadas ramas de upsert secuenciales para mockear
// de forma confiable, y ya se verificó manualmente contra datos reales
// durante el desarrollo de la función original (seedDemoProducts).
//
// process.env se setea dentro de vi.hoisted() usando require() (no import):
// bajo ESM, los `import` estáticos de abajo se evalúan ANTES que cualquier
// statement de este archivo, así que una asignación normal de process.env
// llegaría tarde — `server/db/connection.ts` ya habría leído
// LOCALPOS_DB_PATH con el valor por defecto (¡la DB real de desarrollo!)
// antes de que corriera. Ya pasó una vez y contaminó localpos.db con datos
// de test — por eso el require() explícito acá, no es un capricho de estilo.
const TMP_DB_PATH = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const os = require('os') as typeof import('os');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path') as typeof import('path');
  const dbPath = path.join(os.tmpdir(), `test-product-import-${Date.now()}.db`);
  process.env['LOCALPOS_DB_PATH'] = dbPath;
  process.env['LOCALPOS_MIGRATIONS_PATH'] = path.join(__dirname, '../../server/db/migrations');
  return dbPath;
});

import { eq } from 'drizzle-orm';
import { initDatabase } from '../../server/db/init';
import { db, sqlite } from '../../server/db/connection';
import { businessUnits, installationConfig } from '../../server/db/schema';
import { ProductRepository } from '../../server/core/repositories/ProductRepository';
import { ProductImportService } from '../../server/core/services/ProductImportService';
import type { ProductImportRow } from '../../shared/types';

describe('ProductImportService', () => {
  let businessUnitId: number;
  let service: ProductImportService;

  beforeAll(() => {
    initDatabase();

    if (!db.select().from(installationConfig).where(eq(installationConfig.id, 1)).get()) {
      db.insert(installationConfig).values({ id: 1, businessName: 'Test' }).run();
    }

    const existingBU = db.select().from(businessUnits).where(eq(businessUnits.name, 'Test BU')).get();
    businessUnitId = existingBU
      ? existingBU.id
      : db
          .insert(businessUnits)
          .values({ installationId: 1, name: 'Test BU', moduleId: 'retail-textil', isActive: true })
          .returning()
          .get().id;

    service = new ProductImportService(new ProductRepository());
  });

  afterAll(() => {
    sqlite.close();
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(TMP_DB_PATH + suffix); } catch { /* best effort */ }
    }
  });

  it('should create a simple product without variants', () => {
    const rows: ProductImportRow[] = [
      { nombre: 'Difusor de ambiente', categoria: 'Aromas', precio: 4500, costo: 2200, stock: 10, sku: 'DIF-001' },
    ];

    const result = service.importRows(businessUnitId, rows);

    expect(result).toEqual({ productsCreated: 1, productsExisting: 0, variantsWritten: 0, totalRows: 1 });

    const row = sqlite
      .prepare('SELECT name, sku, base_price FROM products WHERE business_unit_id = ? AND name = ?')
      .get(businessUnitId, 'Difusor de ambiente') as { name: string; sku: string; base_price: number };
    expect(row.sku).toBe('DIF-001');
    expect(row.base_price).toBe(4500);

    const stock = sqlite
      .prepare('SELECT quantity FROM stock_items si JOIN products p ON p.id = si.product_id WHERE p.sku = ?')
      .get('DIF-001') as { quantity: number };
    expect(stock.quantity).toBe(10);
  });

  it('should group repeated rows into one product with multiple variants', () => {
    const rows: ProductImportRow[] = [
      { nombre: 'Home Spray Lavanda', categoria: 'Aromas', precio: 3200, costo: 1500, stock: 15, sku: 'HS-LAV', tipo_variante: 'Fragancia', valor_variante: 'Lavanda' },
      { nombre: 'Home Spray Lavanda', categoria: 'Aromas', precio: 3200, costo: 1500, stock: 12, sku: 'HS-CIT', tipo_variante: 'Fragancia', valor_variante: 'Citrus' },
    ];

    const result = service.importRows(businessUnitId, rows);

    expect(result.productsCreated).toBe(1);
    expect(result.variantsWritten).toBe(2);

    const productCount = sqlite
      .prepare('SELECT COUNT(*) c FROM products WHERE business_unit_id = ? AND name = ?')
      .get(businessUnitId, 'Home Spray Lavanda') as { c: number };
    expect(productCount.c).toBe(1);

    const totalStock = sqlite
      .prepare(`SELECT si.quantity FROM stock_items si
                JOIN products p ON p.id = si.product_id
                WHERE p.name = ? AND p.business_unit_id = ?`)
      .get('Home Spray Lavanda', businessUnitId) as { quantity: number };
    expect(totalStock.quantity).toBe(27); // suma de variantes: 15 + 12
  });

  it('should be idempotent — re-importing the same rows does not duplicate', () => {
    const rows: ProductImportRow[] = [
      { nombre: 'Difusor de ambiente', categoria: 'Aromas', precio: 4800, costo: 2200, stock: 10, sku: 'DIF-001' },
      { nombre: 'Home Spray Lavanda', categoria: 'Aromas', precio: 3200, costo: 1500, stock: 20, sku: 'HS-LAV', tipo_variante: 'Fragancia', valor_variante: 'Lavanda' },
      { nombre: 'Home Spray Lavanda', categoria: 'Aromas', precio: 3200, costo: 1500, stock: 12, sku: 'HS-CIT', tipo_variante: 'Fragancia', valor_variante: 'Citrus' },
    ];

    const result = service.importRows(businessUnitId, rows);

    expect(result.productsCreated).toBe(0);
    expect(result.productsExisting).toBe(2);
    expect(result.variantsWritten).toBe(2);

    const productCount = sqlite
      .prepare('SELECT COUNT(*) c FROM products WHERE business_unit_id = ?')
      .get(businessUnitId) as { c: number };
    expect(productCount.c).toBe(2); // sigue habiendo solo 2 productos, no se duplicaron

    const variantCount = sqlite
      .prepare('SELECT COUNT(*) c FROM product_variants')
      .get() as { c: number };
    expect(variantCount.c).toBe(2); // sigue habiendo solo 2 variantes, se actualizaron in-place
  });

  it('should skip rows with an empty nombre', () => {
    const rows: ProductImportRow[] = [{ nombre: '', precio: 100 }];
    const result = service.importRows(businessUnitId, rows);
    expect(result).toEqual({ productsCreated: 0, productsExisting: 0, variantsWritten: 0, totalRows: 1 });
  });
});
