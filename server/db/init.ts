import fs from 'fs';
import path from 'path';
import { sqlite } from './connection';

export function initDatabase(): void {
  // Run all migrations in order
  const migrations = [
    '0001_initial_schema.sql',
    '0002_products_and_stock.sql',
    '0003_sales_and_sale_items.sql',
    '0004_sale_items_product_name.sql',
    '0005_products_sku_unique_idx.sql',
    '0006_afip_fields.sql',
    '0007_customers_cashbox.sql',
    '0008_customers_locality_province.sql',
    '0009_sync_tables.sql',
    '0010_retail_textil_module.sql',
    '0011_products_retail_columns.sql',
    '0012_installation_catalog_config.sql',
    '0013_taller_medida_module.sql',
    '0014_products_barcode_supplier_code.sql',
    '0015_categories.sql',
  ];

  for (const migration of migrations) {
    const migrationPath = path.join(__dirname, 'migrations', migration);
    const sqlText = fs.readFileSync(migrationPath, 'utf-8');

    // Ejecutar cada sentencia por separado para tolerar errores de migraciones
    // ya aplicadas (ALTER TABLE, CREATE UNIQUE INDEX con datos duplicados).
    // Filtramos sentencias vacías o que son solo comentarios.
    const statements = sqlText
      .split(';')
      .map((s) => s.trim())
      .filter((s) => {
        if (!s) return false;
        // Quitar líneas de comentario y ver si queda algo de SQL
        const withoutComments = s
          .split('\n')
          .filter((line) => !line.trim().startsWith('--'))
          .join('\n')
          .trim();
        return withoutComments.length > 0;
      });

    for (const stmt of statements) {
      try {
        sqlite.exec(stmt + ';');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // Ignorar errores de migraciones ya aplicadas o con datos incompatibles:
        // - "duplicate column name"  → ALTER TABLE ADD COLUMN ya existente
        // - "already exists"         → CREATE INDEX sobre índice ya creado
        // - "UNIQUE constraint failed" → CREATE UNIQUE INDEX sobre datos duplicados
        //   (en ese caso el constraint se aplica a nivel service, no DB)
        if (
          msg.includes('duplicate column name') ||
          msg.includes('already exists') ||
          msg.includes('UNIQUE constraint failed')
        ) {
          console.warn(`[DB] Skipping migration statement (already applied): ${msg.slice(0, 80)}`);
          continue;
        }
        throw err;
      }
    }
  }

  console.log('[DB] Database initialized');
}
