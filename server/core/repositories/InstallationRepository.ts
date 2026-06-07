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
   * Usa SELECT * para incluir todas las columnas aditivas.
   * @throws {NotFoundError} Si no hay configuración guardada aún.
   */
  get(): InstallationConfig {
    type RawRow = {
      id: number; business_name: string; cuit: string | null; address: string | null;
      address_street: string | null; address_city: string | null;
      ing_brutos: string | null; fiscal_condition: string | null;
      logo_path: string | null; created_at: string; updated_at: string;
      whatsapp_number: string | null; catalog_business_unit_id: number | null;
      printer_config: string | null; printer_enabled: number | null;
    };
    const row = sqlite
      .prepare('SELECT * FROM installation_config LIMIT 1')
      .get() as RawRow | undefined;
    if (!row) throw new NotFoundError('Configuración de instalación no encontrada');

    const fiscalRaw = row.fiscal_condition ?? 'monotributo';
    const fiscalCondition: 'monotributo' | 'responsable_inscripto' =
      fiscalRaw === 'responsable_inscripto' ? 'responsable_inscripto' : 'monotributo';

    return {
      id:                    row.id,
      businessName:          row.business_name,
      cuit:                  row.cuit ?? '',
      address:               row.address ?? '',
      addressStreet:         row.address_street ?? '',
      addressCity:           row.address_city ?? '',
      ingBrutos:             row.ing_brutos ?? '',
      fiscalCondition,
      logoPath:              row.logo_path ?? null,
      createdAt:             row.created_at,
      updatedAt:             row.updated_at,
      whatsappNumber:        row.whatsapp_number ?? null,
      catalogBusinessUnitId: row.catalog_business_unit_id ?? null,
      printerConfig:         row.printer_config ? JSON.parse(row.printer_config) : null,
      printerEnabled:        Boolean(row.printer_enabled),
    };
  }

  /**
   * Actualiza la configuración existente (id=1).
   * @throws {NotFoundError} Si no existe configuración previa.
   */
  update(data: UpdateInstallationDto): InstallationConfig {
    // Separar columnas aditivas (fuera del schema Drizzle) de las core
    const {
      whatsappNumber,
      catalogBusinessUnitId,
      ingBrutos,
      fiscalCondition,
      addressStreet,
      addressCity,
      ...coreData
    } = data;

    db.update(installationConfig)
      .set({ ...coreData, updatedAt: new Date().toISOString() })
      .where(eq(installationConfig.id, 1))
      .run();

    // Columnas aditivas via raw SQL
    if (whatsappNumber !== undefined) {
      sqlite.prepare('UPDATE installation_config SET whatsapp_number = ? WHERE id = 1').run(whatsappNumber);
    }
    if (catalogBusinessUnitId !== undefined) {
      sqlite.prepare('UPDATE installation_config SET catalog_business_unit_id = ? WHERE id = 1').run(catalogBusinessUnitId);
    }
    if (ingBrutos !== undefined) {
      sqlite.prepare('UPDATE installation_config SET ing_brutos = ? WHERE id = 1').run(ingBrutos);
    }
    if (fiscalCondition !== undefined) {
      sqlite.prepare('UPDATE installation_config SET fiscal_condition = ? WHERE id = 1').run(fiscalCondition);
    }
    if (addressStreet !== undefined) {
      sqlite.prepare('UPDATE installation_config SET address_street = ? WHERE id = 1').run(addressStreet);
    }
    if (addressCity !== undefined) {
      sqlite.prepare('UPDATE installation_config SET address_city = ? WHERE id = 1').run(addressCity);
    }

    return this.get();
  }
}
