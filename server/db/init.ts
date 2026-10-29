import fs from 'fs';
import path from 'path';
import { sqlite } from './connection';

const MIGRATIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename    TEXT PRIMARY KEY,
    applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )
`;

function getMigrationsDir(): string {
  return process.env.LOCALPOS_MIGRATIONS_PATH ?? path.join(__dirname, 'migrations');
}

function listMigrationFiles(migrationsDir: string): string[] {
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

function tableExists(name: string): boolean {
  const row = sqlite
    .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(name);
  return row !== undefined;
}

function getAppliedMigrations(): Set<string> {
  const rows = sqlite.prepare('SELECT filename FROM schema_migrations').all() as {
    filename: string;
  }[];
  return new Set(rows.map((r) => r.filename));
}

/**
 * Bases creadas antes de que existiera schema_migrations ya tienen aplicado
 * todo lo que hoy está en server/db/migrations/ (el contenido no cambió,
 * solo se le agregó esta tabla de control). Se marcan como aplicadas sin
 * ejecutar su SQL — reejecutarlas pisaría backfills ya hechos a mano desde
 * entonces (ver bug de payment_method en cash_movements).
 */
function markBaseline(migrationFiles: string[]): void {
  const insert = sqlite.prepare(
    'INSERT INTO schema_migrations (filename, applied_at) VALUES (?, datetime(\'now\'))',
  );
  const insertAll = sqlite.transaction((files: string[]) => {
    for (const file of files) insert.run(file);
  });
  insertAll(migrationFiles);
  console.log(`[DB] Baseline: ${migrationFiles.length} migraciones marcadas como ya aplicadas`);
}

export function initDatabase(): void {
  sqlite.exec(MIGRATIONS_TABLE_SQL);

  const migrationsDir = getMigrationsDir();
  const migrationFiles = listMigrationFiles(migrationsDir);

  const isBaseline = getAppliedMigrations().size === 0 && tableExists('sales');
  if (isBaseline) {
    markBaseline(migrationFiles);
    return;
  }

  const applied = getAppliedMigrations();
  const pending = migrationFiles.filter((f) => !applied.has(f));

  for (const filename of pending) {
    const sqlText = fs.readFileSync(path.join(migrationsDir, filename), 'utf-8');

    const applyMigration = sqlite.transaction(() => {
      sqlite.exec(sqlText);
      sqlite
        .prepare('INSERT INTO schema_migrations (filename, applied_at) VALUES (?, datetime(\'now\'))')
        .run(filename);
    });

    try {
      applyMigration();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[DB] Error en migración ${filename}: ${msg}`);
      throw err;
    }
  }

  console.log(`[DB] Migraciones pendientes aplicadas: ${pending.length}`);
}
