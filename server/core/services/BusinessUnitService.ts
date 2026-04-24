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
      moduleId: data.moduleId,
      invoicePrefix: data.invoicePrefix,
    });
  }

  /**
   * Actualiza nombre, estado o prefijo de factura de una BU.
   * @throws {NotFoundError} Si la BU no existe.
   */
  update(id: number, data: UpdateBusinessUnitDto): BusinessUnit {
    this.getById(id);
    return this.buRepo.update(id, data);
  }
}
