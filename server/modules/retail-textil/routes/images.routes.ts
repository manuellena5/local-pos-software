import { Router } from 'express';
import { imageController } from '../controllers/ImageController';
import { uploadProductImage } from '../../../core/middleware/upload';

const router = Router();

router.get('/products/:productId/images',                   (req, res) => imageController.list(req, res));
router.post('/products/:productId/images',                  uploadProductImage.single('image'), (req, res) => imageController.upload(req, res));
router.delete('/products/:productId/images/:imageId',       (req, res) => imageController.delete(req, res));
router.put('/products/:productId/images/reorder',           (req, res) => imageController.reorder(req, res));
router.patch('/products/:productId/images/:imageId/primary',(req, res) => imageController.setPrimary(req, res));

export { router as imagesRouter };
