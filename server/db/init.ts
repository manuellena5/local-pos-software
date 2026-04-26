import fs from 'fs';
import path from 'path';
import { sqlite } from './connection';

export function initDatabase(): void {
  // Run all migrations in order
  const migrations = ['0001_initial_schema.sql', '0002_products_and_stock.sql'];

  for (const migration of migrations) {
    const migrationPath = path.join(__dirname, 'migrations', migration);
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    sqlite.exec(sql);
  }

  console.log('[DB] Database initialized');
}
