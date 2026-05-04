import fs from 'fs';
import path from 'path';

const files = ['localpos.db', 'localpos.db-shm', 'localpos.db-wal'];

for (const file of files) {
  const filePath = path.join(process.cwd(), file);
  try {
    // Try to delete with a fresh import
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted ${file}`);
    }
  } catch (err) {
    console.error(`Could not delete ${file}:`, err);
  }
}

// Now initialize the database fresh
setTimeout(() => {
  console.log('Database reset. Running npm run db:seed next...');
}, 100);
