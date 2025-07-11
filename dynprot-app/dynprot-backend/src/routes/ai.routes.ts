// Routes pour les services d'intelligence artificielle avancés
import { Router, type Router as ExpressRouter } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { aiAnalysisRateLimit } from '../middleware/rateLimit';
import {
  getNutritionCoachRecommendations,
  getQuickMealSuggestion,
  analyzeNutritionalBalance,
  generateNutritionalAnalysis,
  getQuickNutritionalInsights,
  compareNutritionalPeriods
} from '../controllers/ai.controller';

const router: ExpressRouter = Router();

// =======================
// Nutrition Coach Routes
// =======================

// Obtenir des recommandations de repas personnalisées
router.post('/nutrition-coach', aiAnalysisRateLimit, authenticateToken, getNutritionCoachRecommendations);

// Suggestion rapide de repas
router.post('/nutrition-coach/quick-suggestion', aiAnalysisRateLimit, authenticateToken, getQuickMealSuggestion);

// Analyser l'équilibre nutritionnel récent
router.post('/nutrition-coach/balance-analysis', aiAnalysisRateLimit, authenticateToken, analyzeNutritionalBalance);

// =======================
// Nutritional Analysis Routes
// =======================

// Générer un rapport d'analyse nutritionnelle complet
router.post('/nutritional-analysis', aiAnalysisRateLimit, authenticateToken, generateNutritionalAnalysis);

// Obtenir des insights rapides
router.post('/nutritional-analysis/quick-insights', aiAnalysisRateLimit, authenticateToken, getQuickNutritionalInsights);

// Comparer deux périodes nutritionnelles
router.post('/nutritional-analysis/compare-periods', aiAnalysisRateLimit, authenticateToken, compareNutritionalPeriods);

export default router;