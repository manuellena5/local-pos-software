import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'localpos.db');
try {
  const sqlite = new Database(DB_PATH);
  const units = sqlite.prepare('SELECT id, name FROM business_units ORDER BY id').all();
  console.log('Current Business Units:', units);
  sqlite.close();
} catch (err) {
  console.log('Database not ready or error:', err instanceof Error ? err.message : err);
}
