import { Router } from 'express';
import { InstallationController } from '../controllers/installation.controller';
import { InstallationService } from '../services/InstallationService';
import { InstallationRepository } from '../repositories/InstallationRepository';

const repo = new InstallationRepository();
const service = new InstallationService(repo);
const controller = new InstallationController(service);

export const installationRouter = Router();

installationRouter.get('/config', (req, res, next) => controller.getConfig(req, res, next));
installationRouter.patch('/config', (req, res, next) => controller.updateConfig(req, res, next));
