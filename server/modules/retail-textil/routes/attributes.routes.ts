import { Router } from 'express';
import { attributeController } from '../controllers/AttributeController';

const router = Router();

router.get('/products/:productId/attributes',  (req, res) => attributeController.list(req, res));
router.put('/products/:productId/attributes',  (req, res) => attributeController.replace(req, res));

export { router as attributesRouter };
