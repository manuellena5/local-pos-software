import { eq } from 'drizzle-orm';
import { db } from '../../db/connection';
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
    const rows = db.select().from(installationConfig).limit(1).all();
    const row = rows[0];
    if (!row) throw new NotFoundError('Configuración de instalación no encontrada');
    return row;
  }

  /**
   * Actualiza la configuración existente (id=1).
   * @throws {NotFoundError} Si no existe configuración previa.
   */
  update(data: UpdateInstallationDto): InstallationConfig {
    const rows = db
      .update(installationConfig)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(installationConfig.id, 1))
      .returning()
      .all();
    const row = rows[0];
    if (!row) throw new NotFoundError('Configuración no encontrada para actualizar');
    return row;
  }
}
