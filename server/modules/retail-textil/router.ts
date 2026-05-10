import { Router } from 'express';
import { attributesRouter } from './routes/attributes.routes';
import { imagesRouter } from './routes/images.routes';

export const retailTextilRouter = Router();

retailTextilRouter.use(attributesRouter);
retailTextilRouter.use(imagesRouter);
