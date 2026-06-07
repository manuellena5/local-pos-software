import { Router } from 'express';
import { PrinterRepository } from '../repositories/PrinterRepository';
import { PrinterController } from '../controllers/PrinterController';

const repo = new PrinterRepository();
const controller = new PrinterController(repo);

export const printerRouter = Router();

printerRouter.get('/printer/status', (req, res, next) => void controller.getStatus(req, res, next));
printerRouter.post('/printer/detect', (req, res, next) => void controller.detectPorts(req, res, next));
printerRouter.post('/printer/connect', (req, res, next) => void controller.connect(req, res, next));
printerRouter.post('/printer/test', (req, res, next) => void controller.testPrint(req, res, next));
printerRouter.post('/printer/disconnect', (req, res, next) => controller.disconnect(req, res, next));
printerRouter.put('/printer/config', (req, res, next) => controller.saveConfig(req, res, next));
