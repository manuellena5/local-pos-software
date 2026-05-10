import { eq } from 'drizzle-orm';
import { db } from '../../db/connection';
import { sqlite } from '../../db/connection';
import { installationConfig } from '../../db/schema';
import type { InstallationConfig } from '../../../shared/types';
import { NotFoundError } from '../../lib/errors';
import type { UpdateInstallationDto } from '../schemas/installation.schema';

export class InstallationRepository {
  /**
   * Obtiene la configuración global de la instalación (singleton, id=1).
   * @throws {NotFoundError} Si no hay configuración guardada aún.
   */
  get(): InstallationConfig {
    // Use raw SQL so that additive columns (whatsapp_number, catalog_business_unit_id)
    // that are not in the Drizzle schema are included in the result.
    type RawRow = {
      id: number; business_name: string; cuit: string | null; address: string | null;
      logo_path: string | null; created_at: string; updated_at: string;
      whatsapp_number: string | null; catalog_business_unit_id: number | null;
    };
    const row = sqlite
      .prepare('SELECT * FROM installation_config LIMIT 1')
      .get() as RawRow | undefined;
    if (!row) throw new NotFoundError('Configuración de instalación no encontrada');
    return {
      id:                    row.id,
      businessName:          row.business_name,
      cuit:                  row.cuit ?? '',
      address:               row.address ?? '',
      logoPath:              row.logo_path ?? null,
      createdAt:             row.created_at,
      updatedAt:             row.updated_at,
      whatsappNumber:        row.whatsapp_number ?? null,
      catalogBusinessUnitId: row.catalog_business_unit_id ?? null,
    };
  }

  /**
   * Actualiza la configuración existente (id=1).
   * @throws {NotFoundError} Si no existe configuración previa.
   */
  update(data: UpdateInstallationDto): InstallationConfig {
    // Update core Drizzle-known columns
    const { whatsappNumber, catalogBusinessUnitId, ...coreData } = data;
    db.update(installationConfig)
      .set({ ...coreData, updatedAt: new Date().toISOString() })
      .where(eq(installationConfig.id, 1))
      .run();

    // Update additive columns via raw SQL
    if (whatsappNumber !== undefined) {
      sqlite.prepare('UPDATE installation_config SET whatsapp_number = ? WHERE id = 1').run(whatsappNumber);
    }
    if (catalogBusinessUnitId !== undefined) {
      sqlite.prepare('UPDATE installation_config SET catalog_business_unit_id = ? WHERE id = 1').run(catalogBusinessUnitId);
    }

    return this.get();
  }
}
