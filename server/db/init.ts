import fs from 'fs';
import path from 'path';
import { sqlite } from './connection';

export function initDatabase(): void {
  // Todas las migraciones en orden de aplicación.
  // Los errores de "ya aplicado" (duplicate column, already exists) se ignoran
  // para que initDatabase() sea idempotente en reinicios.
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
    '0016_suppliers.sql',
    '0017_supplier_products.sql',
    '0018_suppliers_new_fields.sql',
    '0019_product_supplier_links.sql',
    '0020_products_extended_fields.sql',
    '0021_sales_cancellation.sql',
    '0022_business_units_description.sql',
    '0023_printer_config.sql',
    '0024_installation_ing_brutos.sql',
    '0024_product_variants.sql',
    '0025_products_brand.sql',
    '0025_stock_movements_extended.sql',
    '0026_installation_fiscal_fields.sql',
    '0026_sale_items_variant_id.sql',
    '0027_stock_movements_variant_supplier.sql',
    '0028_product_supplier_links_supplier_code.sql',
    '0029_supplier_products_description_image.sql',
    '0030_cash_movements_code.sql',
    '0031_cash_payment_methods.sql',
    '0032_payment_methods.sql',
  ];

  const migrationsDir =
    process.env.LOCALPOS_MIGRATIONS_PATH ?? path.join(__dirname, 'migrations');

  let applied = 0;
  for (const migration of migrations) {
    const migrationPath = path.join(migrationsDir, migration);
    const sqlText = fs.readFileSync(migrationPath, 'utf-8');

    const statements = sqlText
      .split(';')
      .map((s) => s.trim())
      .filter((s) => {
        if (!s) return false;
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
        applied++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes('duplicate column name') ||
          msg.includes('already exists') ||
          msg.includes('UNIQUE constraint failed')
        ) {
          // Migración ya aplicada — silencioso en arranques normales
          continue;
        }
        console.error(`[DB] Error en migración ${migration}: ${msg}`);
        throw err;
      }
    }
  }

  console.log(`[DB] Migraciones aplicadas: ${applied} sentencias`);
}
