import { sqlite } from '../../db/connection';
import type { PrinterConfig } from '../../../shared/types';

export class PrinterRepository {
  /**
   * Obtiene la configuración de impresora desde installation_config (singleton, id=1).
   */
  getConfig(): { config: PrinterConfig | null; enabled: boolean } {
    type RawRow = { printer_config: string | null; printer_enabled: number | null };
    const row = sqlite
      .prepare('SELECT printer_config, printer_enabled FROM installation_config WHERE id = 1')
      .get() as RawRow | undefined;
    if (!row) return { config: null, enabled: false };
    return {
      config: row.printer_config ? (JSON.parse(row.printer_config) as PrinterConfig) : null,
      enabled: Boolean(row.printer_enabled),
    };
  }

  /**
   * Guarda la configuración de impresora sin cambiar el estado de conexión.
   */
  saveConfig(config: PrinterConfig, enabled: boolean): void {
    sqlite
      .prepare(
        'UPDATE installation_config SET printer_config = ?, printer_enabled = ? WHERE id = 1',
      )
      .run(JSON.stringify(config), enabled ? 1 : 0);
  }
}
