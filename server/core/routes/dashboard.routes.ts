import { Router } from 'express';
import { getDashboard } from '../controllers/DashboardController';

export const dashboardRouter = Router();

dashboardRouter.get('/dashboard', getDashboard);
