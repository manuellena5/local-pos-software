import { randomUUID } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { vi } from 'vitest';
import {
  installationConfig,
  businessUnits,
  products,
  stockItems,
  type InstallationConfigRow,
  type BusinessUnitRow,
  type Product,
  type StockItem,
} from '../../server/db/schema';
import type { db as DbInstance, sqlite as SqliteInstance } from '../../server/db/connection';

type Db = typeof DbInstance;
type Sqlite = typeof SqliteInstance;

export interface TestDb {
  db: Db;
  sqlite: Sqlite;
  cleanup: () => void;
}

/**
 * Crea una base SQLite real (archivo temporal) con todas las migraciones aplicadas.
 *
 * connection.ts crea su singleton de better-sqlite3 al importarse, así que para
 * aislar cada test hay que fijar LOCALPOS_DB_PATH/LOCALPOS_MIGRATIONS_PATH y recién
 * después importar el módulo dinámicamente (un import estático se hoistea y
 * correría antes de poder cambiar la variable de entorno). vi.resetModules()
 * asegura que el import dinámico cree una instancia nueva en vez de reusar el
 * singleton cacheado por un test anterior del mismo archivo.
 */
export async function createTestDb(): Promise<TestDb> {
  const { db, sqlite, initDatabase, cleanup } = await createRawTestDb();
  initDatabase();
  return { db, sqlite, cleanup };
}

export interface RawTestDb extends TestDb {
  initDatabase: () => void;
}

/**
 * Como createTestDb(), pero NO corre initDatabase() — para tests que
 * necesitan controlar manualmente cuándo y cuántas veces se migra
 * (doble arranque, baseline sobre una base preexistente, etc.).
 */
export async function createRawTestDb(): Promise<RawTestDb> {
  const dbPath = path.join(os.tmpdir(), `localpos-test-${randomUUID()}.db`);
  process.env.LOCALPOS_DB_PATH = dbPath;
  process.env.LOCALPOS_MIGRATIONS_PATH = path.join(__dirname, '../../server/db/migrations');

  vi.resetModules();

  const { db, sqlite } = await import('../../server/db/connection');
  const { initDatabase } = await import('../../server/db/init');

  const cleanup = (): void => {
    sqlite.close();
    for (const suffix of ['', '-wal', '-shm']) {
      const file = dbPath + suffix;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  };

  return { db, sqlite, initDatabase, cleanup };
}

export function seedInstallation(
  db: Db,
  overrides: Partial<typeof installationConfig.$inferInsert> = {},
): InstallationConfigRow {
  const rows = db
    .insert(installationConfig)
    .values({ id: 1, businessName: 'Instalación de prueba', ...overrides })
    .returning()
    .all();
  return rows[0]!;
}

export function seedBusinessUnit(
  db: Db,
  installationId: number,
  overrides: Partial<typeof businessUnits.$inferInsert> = {},
): BusinessUnitRow {
  const rows = db
    .insert(businessUnits)
    .values({
      installationId,
      name: 'BU de prueba',
      moduleId: 'retail-general',
      ...overrides,
    })
    .returning()
    .all();
  return rows[0]!;
}

export function seedProductWithStock(
  db: Db,
  businessUnitId: number,
  overrides: { product?: Partial<typeof products.$inferInsert>; quantity?: number } = {},
): { product: Product; stockItem: StockItem } {
  const productRows = db
    .insert(products)
    .values({
      businessUnitId,
      name: 'Producto de prueba',
      sku: `TEST-${randomUUID().slice(0, 8)}`,
      costPrice: 50,
      basePrice: 100,
      ...overrides.product,
    })
    .returning()
    .all();
  const product = productRows[0]!;

  const stockRows = db
    .insert(stockItems)
    .values({
      productId: product.id,
      businessUnitId,
      quantity: overrides.quantity ?? 10,
    })
    .returning()
    .all();
  const stockItem = stockRows[0]!;

  return { product, stockItem };
}
