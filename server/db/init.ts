import fs from 'fs';
import path from 'path';
import { sqlite } from './connection';

export function initDatabase(): void {
  const migrationPath = path.join(__dirname, 'migrations', '0001_initial_schema.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  sqlite.exec(sql);
  console.log('[DB] Database initialized');
}
