import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'localpos.db');
const sqlite = new Database(DB_PATH);

console.log('=== Business Units ===');
const units = sqlite.prepare('SELECT id, name, is_active FROM business_units').all();
console.log(JSON.stringify(units, null, 2));

console.log('\n=== Products Count by BU ===');
const productsByBU = sqlite.prepare(`
  SELECT business_unit_id, COUNT(*) as count FROM products WHERE is_active = 1 GROUP BY business_unit_id
`).all();
console.log(JSON.stringify(productsByBU, null, 2));

sqlite.close();
