import { Router } from 'express';
import { BusinessUnitController } from '../controllers/businessUnit.controller';
import { BusinessUnitService } from '../services/BusinessUnitService';
import { BusinessUnitRepository } from '../repositories/BusinessUnitRepository';
import { InstallationRepository } from '../repositories/InstallationRepository';

const buRepo = new BusinessUnitRepository();
const installationRepo = new InstallationRepository();
const service = new BusinessUnitService(buRepo, installationRepo);
const controller = new BusinessUnitController(service);

export const businessUnitRouter = Router();

businessUnitRouter.get('/business-units', (req, res, next) => controller.getAll(req, res, next));
businessUnitRouter.post('/business-units', (req, res, next) => controller.create(req, res, next));
businessUnitRouter.patch('/business-units/:id', (req, res, next) =>
  controller.update(req, res, next)
);
