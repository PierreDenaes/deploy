import { Router, type Router as ExpressRouter } from 'express';
import {
  createMealEntry,
  getMealEntries,
  getMealEntry,
  updateMealEntry,
  deleteMealEntry,
  analyzeMealInput,
  createMealFromAnalysis
} from '../controllers/meals.controller';
import {
  createFavoriteMeal,
  getFavoriteMeals,
  getFavoriteMeal,
  updateFavoriteMeal,
  deleteFavoriteMeal,
  useFavoriteMeal
} from '../controllers/favorites.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { aiAnalysisRateLimit, visionAnalysisRateLimit } from '../middleware/rateLimit';

const router: ExpressRouter = Router();

// Favorite Meals Routes (using authenticateToken for dev - TODO: change back to requireOnboarding)
// NOTE: These must come BEFORE the generic /:id routes to avoid conflicts
router.get('/favorites', authenticateToken, getFavoriteMeals);
router.post('/favorites', authenticateToken, createFavoriteMeal);
router.get('/favorites/:id', authenticateToken, getFavoriteMeal);
router.put('/favorites/:id', authenticateToken, updateFavoriteMeal);
router.delete('/favorites/:id', authenticateToken, deleteFavoriteMeal);
router.post('/favorites/:id/use', authenticateToken, useFavoriteMeal);

// AI Analysis Routes (with rate limiting)
router.post('/analyze', aiAnalysisRateLimit, visionAnalysisRateLimit, authenticateToken, analyzeMealInput);
router.post('/analysis/:analysisId/create-meal', authenticateToken, createMealFromAnalysis);

// Meal Entries Routes (using authenticateToken for dev - TODO: change back to requireOnboarding)
// NOTE: Generic /:id routes must come AFTER specific routes like /favorites
router.post('/', authenticateToken, createMealEntry);
router.get('/', authenticateToken, getMealEntries);
router.get('/:id', authenticateToken, getMealEntry);
router.put('/:id', authenticateToken, updateMealEntry);
router.delete('/:id', authenticateToken, deleteMealEntry);

export default router;