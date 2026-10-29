import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { eq } from 'drizzle-orm';
import { createRawTestDb, seedInstallation, seedBusinessUnit } from '../helpers/testDb';
import type { RawTestDb } from '../helpers/testDb';

describe('initDatabase (migraciones)', () => {
  let testDb: RawTestDb;

  afterEach(() => {
    testDb?.cleanup();
  });

  it('corrida dos veces seguidas deja la base idéntica (0 pendientes la segunda vez)', async () => {
    testDb = await createRawTestDb();
    testDb.initDatabase();

    const countBefore = testDb.sqlite
      .prepare('SELECT COUNT(*) as n FROM schema_migrations')
      .get() as { n: number };

    testDb.initDatabase();

    const countAfter = testDb.sqlite
      .prepare('SELECT COUNT(*) as n FROM schema_migrations')
      .get() as { n: number };

    expect(countAfter.n).toBe(countBefore.n);
  });

  it('no vuelve a correr backfills: una venta mixta conserva su payment_method tras reiniciar', async () => {
    testDb = await createRawTestDb();
    testDb.initDatabase();
    const { db } = testDb;
    const { cashMovements, sales } = await import('../../server/db/schema');

    const installation = seedInstallation(db);
    const businessUnit = seedBusinessUnit(db, installation.id);

    const saleRows = db
      .insert(sales)
      .values({
        businessUnitId: businessUnit.id,
        saleNumber: 1,
        subtotal: 8000,
        discountAmount: 0,
        discountPercent: 0,
        taxableAmount: 6611.57,
        taxRate: 21,
        taxAmount: 1388.43,
        totalAmount: 8000,
        roundingAdjustment: 0,
        // El efectivo entró primero en el carrito, pero la tarjeta fue el medio dominante.
        paymentMethods: JSON.stringify([
          { method: 'cash', amount: 3000 },
          { method: 'card', amount: 5000 },
        ]),
        status: 'completed',
      })
      .returning()
      .all();
    const sale = saleRows[0]!;

    db.insert(cashMovements)
      .values({
        businessUnitId: businessUnit.id,
        type: 'sale',
        amount: 8000,
        description: `Venta #${sale.saleNumber}`,
        saleId: sale.id,
        paymentMethod: 'card',
      })
      .run();

    testDb.initDatabase();

    const movementRows = db
      .select()
      .from(cashMovements)
      .where(eq(cashMovements.saleId, sale.id))
      .all();
    expect(movementRows[0]!.paymentMethod).toBe('card');
  });

  it('baseline: una base sin schema_migrations pero con sales marca todo como aplicado sin reejecutar', async () => {
    testDb = await createRawTestDb();
    const { sqlite } = testDb;

    // Simula una base preexistente (anterior a esta fase): aplica las migraciones
    // a mano, sin pasar por initDatabase(), y sin crear schema_migrations.
    const migrationsDir = process.env.LOCALPOS_MIGRATIONS_PATH!;
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      sqlite.exec(fs.readFileSync(path.join(migrationsDir, file), 'utf-8'));
    }

    expect(
      sqlite.prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='sales'`).get(),
    ).toBeDefined();
    expect(
      sqlite.prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_migrations'`).get(),
    ).toBeUndefined();

    testDb.initDatabase();

    const applied = sqlite.prepare('SELECT COUNT(*) as n FROM schema_migrations').get() as {
      n: number;
    };
    expect(applied.n).toBe(files.length);
  });

  it('una migración inválida hace rollback y no queda registrada', async () => {
    testDb = await createRawTestDb();
    testDb.initDatabase();

    const tmpMigrationsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'localpos-bad-migrations-'));
    const existingFiles = fs
      .readdirSync(process.env.LOCALPOS_MIGRATIONS_PATH!)
      .filter((f) => f.endsWith('.sql'));
    for (const file of existingFiles) {
      fs.copyFileSync(
        path.join(process.env.LOCALPOS_MIGRATIONS_PATH!, file),
        path.join(tmpMigrationsDir, file),
      );
    }
    const badFile = '9999_broken.sql';
    fs.writeFileSync(
      path.join(tmpMigrationsDir, badFile),
      'CREATE TABLE broken_table (id INTEGER);\nTHIS IS NOT VALID SQL;',
    );
    process.env.LOCALPOS_MIGRATIONS_PATH = tmpMigrationsDir;

    expect(() => testDb.initDatabase()).toThrow();

    const registered = testDb.sqlite
      .prepare('SELECT 1 FROM schema_migrations WHERE filename = ?')
      .get(badFile);
    expect(registered).toBeUndefined();

    const brokenTableExists = testDb.sqlite
      .prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='broken_table'`)
      .get();
    expect(brokenTableExists).toBeUndefined();

    fs.rmSync(tmpMigrationsDir, { recursive: true, force: true });
  });
});
