import { Router, type Router as ExpressRouter } from 'express';
import {
  getDailySummaries,
  getNutritionSummary,
  getWeeklyTrends,
  getMonthlyStats,
  getProgressInsights,
  createDataExport,
  getUserExports
} from '../controllers/summaries.controller';
import { requireOnboarding } from '../middleware/auth.middleware';

const router: ExpressRouter = Router();

// Summary and analytics routes
router.get('/daily', getDailySummaries);
router.get('/nutrition', getNutritionSummary);
router.get('/weekly-trends', getWeeklyTrends);
router.get('/monthly-stats', getMonthlyStats);
router.get('/insights', requireOnboarding, getProgressInsights);

// Data export routes
router.post('/export', createDataExport);
router.get('/exports', getUserExports);

export default router;