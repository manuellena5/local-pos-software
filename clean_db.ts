import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'localpos.db');
const sqlite = new Database(DB_PATH);

console.log('Before cleanup:');
const unitsBefore = sqlite.prepare('SELECT id, name FROM business_units ORDER BY id').all();
console.log(unitsBefore);

// Delete duplicates, keeping only the first occurrence of each (installation_id, name)
const deleteQuery = `
  DELETE FROM business_units 
  WHERE id NOT IN (
    SELECT MIN(id) 
    FROM business_units 
    GROUP BY installation_id, name
  )
`;

const result = sqlite.prepare(deleteQuery).run();
console.log(`\nDeleted ${result.changes} duplicate rows`);

console.log('\nAfter cleanup:');
const unitsAfter = sqlite.prepare('SELECT id, name FROM business_units ORDER BY id').all();
console.log(unitsAfter);

sqlite.close();
