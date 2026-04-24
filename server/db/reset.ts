import fs from 'fs';
import path from 'path';

if (process.env['NODE_ENV'] === 'production') {
  console.error('[Reset] ❌ No se puede ejecutar reset en producción');
  process.exit(1);
}

const DB_PATH = path.join(process.cwd(), 'localpos.db');
const WAL_PATH = `${DB_PATH}-wal`;
const SHM_PATH = `${DB_PATH}-shm`;

[DB_PATH, WAL_PATH, SHM_PATH].forEach((p) => {
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log(`[Reset] Eliminado: ${p}`);
  }
});

console.log('[Reset] Base de datos eliminada. Ejecutá npm run db:seed para recrear los datos.');
