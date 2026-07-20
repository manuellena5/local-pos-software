import { sqlite } from '../../db/connection';
import { runSystemSeed, runDemoSeedIfEnabled } from '../../db/seed';
import { BusinessRuleError } from '../../lib/errors';
import { logger } from '../../lib/logger';

const CTX = 'SystemResetService';
const CONFIRM_PHRASE = 'BORRAR';

// Orden de borrado respetando FKs (hijos antes que padres). `products`
// cascadea product_variants/product_attributes/product_images por sí solo
// (ON DELETE CASCADE en la migración) — no hace falta borrarlos aparte.
// No se tocan: business_units, users, installation_config, payment_methods,
// suppliers/supplier_products (proveedores) ni taller_orders (otro módulo).
const TABLES_TO_WIPE = [
  'sale_items',
  'pending_invoices',
  'cash_movements',
  'sales',
  'stock_movements',
  'stock_items',
  'cash_audits',
  'products',
  'categories',
  'customers',
  'sync_queue',
  'sync_logs',
];

export class SystemResetService {
  /**
   * Borra todos los datos de prueba (productos, stock, ventas, caja,
   * clientes) y vuelve a correr el seed de sistema (Capa 1) + demo (Capa 2,
   * si SEED_DEMO=true). Requiere `confirm === "BORRAR"` como salvaguarda
   * contra clics accidentales — es una operación destructiva e irreversible.
   */
  resetDemoData(confirm: string): void {
    if (confirm !== CONFIRM_PHRASE) {
      throw new BusinessRuleError(`Escribí "${CONFIRM_PHRASE}" para confirmar el reset`);
    }

    const wipe = sqlite.transaction(() => {
      for (const table of TABLES_TO_WIPE) {
        sqlite.prepare(`DELETE FROM ${table}`).run();
      }
    });

    try {
      wipe();
      logger.warn(CTX, 'Datos de prueba borrados por el usuario');
    } catch (err) {
      logger.error(CTX, 'Error al borrar datos de prueba — rollback aplicado', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    runSystemSeed();
    runDemoSeedIfEnabled();
    logger.info(CTX, 'Re-seed completo tras el reset');
  }
}
