import type { Config } from 'drizzle-kit';

// Las migraciones reales son los archivos SQL a mano en server/db/migrations/,
// aplicadas y trackeadas por server/db/init.ts (tabla schema_migrations).
// `db:generate` y `db:studio` quedan solo para inspeccionar el schema con
// drizzle-kit; su carpeta meta/_journal.json no refleja esas migraciones.
export default {
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  driver: 'better-sqlite',
  dbCredentials: {
    url: './localpos.db',
  },
} satisfies Config;
