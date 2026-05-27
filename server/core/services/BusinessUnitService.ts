import type { BusinessUnit } from '../../../shared/types';
import { MODULE_IDS } from '../../../shared/constants';
import type { BusinessUnitRepository } from '../repositories/BusinessUnitRepository';
import type { InstallationRepository } from '../repositories/InstallationRepository';
import { NotFoundError, BusinessRuleError } from '../../lib/errors';
import type { CreateBusinessUnitDto, UpdateBusinessUnitDto } from '../schemas/businessUnit.schema';

const VALID_MODULE_IDS = Object.values(MODULE_IDS) as string[];

export class BusinessUnitService {
  constructor(
    private readonly buRepo: BusinessUnitRepository,
    private readonly installationRepo: InstallationRepository
  ) {}

  /**
   * Devuelve todas las unidades de negocio de la instalación.
   */
  getAll(): BusinessUnit[] {
    return this.buRepo.getAll();
  }

  /**
   * @throws {NotFoundError} Si la BU no existe.
   */
  getById(id: number): BusinessUnit {
    const bu = this.buRepo.getById(id);
    if (!bu) throw new NotFoundError(`Unidad de negocio ${id} no encontrada`);
    return bu;
  }

  /**
   * Crea una nueva unidad de negocio.
   * @throws {BusinessRuleError} Si el moduleId no es válido.
   */
  create(data: CreateBusinessUnitDto): BusinessUnit {
    if (!VALID_MODULE_IDS.includes(data.moduleId)) {
      throw new BusinessRuleError(`Módulo '${data.moduleId}' no válido`);
    }
    const config = this.installationRepo.get();
    return this.buRepo.create({
      installationId: config.id,
      name: data.name,
      description: data.description ?? null,
      moduleId: data.moduleId,
      invoicePrefix: data.invoicePrefix,
    });
  }

  /**
   * Actualiza nombre, descripción, estado o prefijo de factura de una BU.
   * El módulo asignado NO se puede cambiar una vez creada la BU.
   * @throws {NotFoundError} Si la BU no existe.
   */
  update(id: number, data: UpdateBusinessUnitDto): BusinessUnit {
    this.getById(id); // valida existencia
    return this.buRepo.update(id, {
      name: data.name,
      description: data.description,
      isActive: data.isActive,
      invoicePrefix: data.invoicePrefix,
    });
  }

  /**
   * Activa o desactiva una BU (soft toggle).
   * @throws {NotFoundError} Si la BU no existe.
   */
  toggleActive(id: number): BusinessUnit {
    const bu = this.getById(id);
    return this.buRepo.update(id, { isActive: !bu.isActive });
  }
}
