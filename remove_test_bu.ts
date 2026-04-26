import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'localpos.db');
const sqlite = new Database(DB_PATH);

// Delete Test BU
sqlite.prepare('DELETE FROM business_units WHERE name = ?').run('Test');

const units = sqlite.prepare('SELECT id, name FROM business_units ORDER BY id').all();
console.log('Final Business Units:', units);

sqlite.close();
