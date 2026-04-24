import type { InstallationConfig } from '../../../shared/types';
import type { InstallationRepository } from '../repositories/InstallationRepository';
import type { UpdateInstallationDto } from '../schemas/installation.schema';

export class InstallationService {
  constructor(private readonly repo: InstallationRepository) {}

  /**
   * Obtiene la configuración global de la instalación.
   */
  getConfig(): InstallationConfig {
    return this.repo.get();
  }

  /**
   * Actualiza la configuración global.
   */
  updateConfig(data: UpdateInstallationDto): InstallationConfig {
    return this.repo.update(data);
  }
}
