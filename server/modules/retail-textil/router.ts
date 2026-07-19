import { Router } from 'express';
import { attributesRouter } from './routes/attributes.routes';
import { imagesRouter } from './routes/images.routes';
import { productVariantsRouter } from './routes/productVariants.routes';

export const retailTextilRouter = Router();

retailTextilRouter.use(attributesRouter);
retailTextilRouter.use(imagesRouter);
retailTextilRouter.use(productVariantsRouter);
