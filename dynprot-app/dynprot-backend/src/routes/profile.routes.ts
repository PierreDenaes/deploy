import { Router, type Router as ExpressRouter } from 'express';
import {
  getUserProfile,
  updateUserProfile,
  calculateRecommendedGoals,
  getDietaryPreferences,
  getProfileStats,
  completeOnboarding,
  resetTodayData,
  updateAnalyticsViewed,
  deleteSelectiveData
} from '../controllers/profiles.controller';

const router: ExpressRouter = Router();

// Profile management
router.get('/', getUserProfile);
router.put('/', updateUserProfile);
router.post('/complete-onboarding', completeOnboarding);
router.post('/reset-today', resetTodayData);
router.post('/analytics-viewed', updateAnalyticsViewed);
router.post('/delete-data', deleteSelectiveData);

// Goal calculation and recommendations
router.post('/calculate-goals', calculateRecommendedGoals);

// Profile statistics and insights
router.get('/stats', getProfileStats);

// Reference data
router.get('/dietary-preferences', getDietaryPreferences);

export default router;