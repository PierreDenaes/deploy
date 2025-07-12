// Contrôleur pour les services d'intelligence artificielle avancés
import { Request, Response } from 'express';
import { AIService } from '../services/ai.service';
import prisma from '../lib/prisma';
import { z } from 'zod';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

// =======================
// SCHEMAS DE VALIDATION
// =======================

const NutritionProfileSchema = z.object({
  age: z.number().min(13).max(120),
  gender: z.enum(['male', 'female', 'other']),
  weight: z.number().min(20).max(500),
  height: z.number().min(100).max(250),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'very_active', 'extremely_active']),
  fitnessGoal: z.enum(['weight_loss', 'muscle_gain', 'maintenance', 'general_health']),
  proteinGoal: z.number().min(20).max(300),
  calorieGoal: z.number().min(800).max(5000),
  allergies: z.array(z.string()).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  cuisinePreferences: z.array(z.string()).optional(),
  cookingTime: z.enum(['quick', 'moderate', 'extensive']).optional(),
  budget: z.enum(['low', 'medium', 'high']).optional(),
  equipment: z.array(z.string()).optional(),
});

const RecommendationRequestSchema = z.object({
  type: z.enum(['meal', 'snack', 'recipe', 'weekly_plan']),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  targetMacros: z.object({
    protein: z.number().optional(),
    calories: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional(),
  }).optional(),
  constraints: z.object({
    ingredients: z.array(z.string()).optional(),
    cookingTime: z.number().optional(),
    servings: z.number().optional(),
    excludeIngredients: z.array(z.string()).optional(),
  }).optional(),
  context: z.string().optional(),
});

const AnalysisRequestSchema = z.object({
  period: z.enum(['week', 'month', '3months', '6months', 'year', 'custom']),
  customRange: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
  focusAreas: z.array(z.enum(['protein', 'calories', 'balance', 'consistency', 'variety', 'timing'])).optional(),
  comparisonPeriod: z.enum(['week', 'month', '3months', '6months', 'year', 'custom']).optional(),
  includeProjections: z.boolean().optional(),
  detailLevel: z.enum(['summary', 'detailed', 'expert']),
});

// =======================
// NUTRITION COACH ENDPOINTS
// =======================

/**
 * POST /api/ai/nutrition-coach
 * Obtenir des recommandations de repas personnalisées
 */
export const getNutritionCoachRecommendations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Non authentifié'
      });
      return;
    }

    // Valider les données d'entrée
    const { userProfile, request, recentMealsIds } = req.body;
    NutritionProfileSchema.parse(userProfile); // Validate input
    const validatedRequest = RecommendationRequestSchema.parse(request);

    // Récupérer les repas récents si spécifiés
    let recentMeals: any[] = [];
    if (recentMealsIds && recentMealsIds.length > 0) {
      recentMeals = await prisma.meal_entries.findMany({
        where: {
          id: { in: recentMealsIds },
          user_id: userId
        },
        orderBy: { meal_timestamp: 'desc' },
        take: 21 // Maximum 3 semaines
      });
    }

    // Construire le contexte nutritionnel pour l'IA
    const userContext = {
      userProfile: userProfile,
      recentMeals: recentMeals.slice(0, 10), // Limiter à 10 repas récents
      request: validatedRequest,
      nutritionalSummary: await calculateNutritionalSummary(recentMeals, userProfile)
    };

    // Construire le prompt système pour ChatGPT
    const systemPrompt = req.body.systemPrompt || `Tu es un coach nutritionniste expert avec 15 ans d'expérience, spécialisé en cuisine française et internationale.

EXPERTISE :
- Nutrition clinique et sportive
- Cuisine équilibrée et savoureuse
- Adaptation aux contraintes réelles (temps, budget, équipement)
- Pédagogie et motivation

PRINCIPES :
- Recommandations scientifiquement fondées
- Plaisir et variété alimentaire prioritaires
- Praticité et faisabilité
- Respect des contraintes individuelles
- Ton professionnel mais accessible et encourageant

RÉPONSE FORMAT OBLIGATOIRE :
Réponds UNIQUEMENT en JSON valide avec cette structure exacte EN FRANÇAIS :
{
  "recommendations": [
    {
      "id": "rec_1",
      "titre": "string",
      "description": "string", 
      "categorie": "petit-dejeuner|dejeuner|diner|collation",
      "nutrition": {
        "calories": number,
        "proteines": number,
        "glucides": number,
        "lipides": number,
        "fibres": number
      },
      "ingredients": [{"nom": "string", "quantite": "string", "unite": "string"}],
      "instructions": ["string"],
      "tempsPreparation": number,
      "tempsCuisson": number,
      "portions": number,
      "difficulte": "facile|moyen|difficile",
      "tags": ["string"],
      "confiance": number,
      "source": "ai_generated"
    }
  ],
  "explanation": "string",
  "tips": ["string"],
  "nutritionalInsights": ["string"]
}

IMPORTANT :
- Utilise UNIQUEMENT les catégories : "petit-dejeuner", "dejeuner", "diner", "collation"
- Tous les champs doivent être en français
- Assure-toi que le JSON est valide
- Inclus toujours 2-4 recommandations variées`;

    // Construire le prompt utilisateur avec les données contextuelles
    const userPrompt = req.body.userPrompt || buildNutritionCoachPrompt(userContext);

    // Appeler l'IA via AIService
    const aiResponse = await AIService.generateChatCompletion(
      systemPrompt,
      userPrompt,
      { 
        maxTokens: req.body.maxTokens || 4000,
        temperature: req.body.temperature || 0.7
      }
    );

    // Log l'utilisation
    console.log('Nutrition coach recommendation generated', {
      userId,
      requestType: validatedRequest.type,
      mealsAnalyzed: recentMeals.length,
      tokensUsed: aiResponse.tokensUsed,
      cost: aiResponse.cost
    });

    // Debug: Log the AI response structure
    console.log('🔍 Structure de aiResponse.data:', {
      hasRecommendations: 'recommendations' in aiResponse.data,
      hasRecommandations: 'recommandations' in aiResponse.data,
      hasResponse: 'response' in aiResponse.data,
      hasWarning: 'warning' in aiResponse.data,
      keys: Object.keys(aiResponse.data),
      dataType: typeof aiResponse.data,
      dataSample: JSON.stringify(aiResponse.data).substring(0, 500)
    });

    // Ensure the response has the expected structure for nutrition coach
    let responseData = aiResponse.data;
    
    // If the AI response doesn't have the expected structure, try to fix it
    if (!responseData.recommendations && responseData.response) {
      // Handle case where AI returned non-structured response
      console.warn('AI returned non-structured response, attempting fallback');
      responseData = {
        recommendations: [],
        explanation: responseData.response || 'Recommandations générées par IA',
        tips: [],
        nutritionalInsights: []
      };
    } else if (!responseData.recommendations) {
      // Check for alternative field names that AI might use
      if (responseData.meal_recommendations && Array.isArray(responseData.meal_recommendations)) {
        console.log('🔄 Converting meal_recommendations to recommendations format');
        responseData.recommendations = responseData.meal_recommendations.map((meal: any, index: number) => ({
          id: `meal_${index}_${Date.now()}`,
          titre: meal.meal_name || meal.title || meal.nom || `Repas ${index + 1}`,
          description: meal.description || 'Repas équilibré et nutritif',
          categorie: extractCategory(meal.meal_name, index),
          nutrition: {
            calories: extractNumber(meal.calories) || extractNumber(meal.nutrition?.calories) || 300,
            proteines: extractNumber(meal.proteines) || extractNumber(meal.nutrition?.proteines) || extractNumber(meal.nutrition?.protein) || 20,
            glucides: extractNumber(meal.glucides) || extractNumber(meal.nutrition?.glucides) || extractNumber(meal.nutrition?.carbs) || 30,
            lipides: extractNumber(meal.lipides) || extractNumber(meal.nutrition?.lipides) || extractNumber(meal.nutrition?.fat) || 10,
            fibres: extractNumber(meal.fibres) || extractNumber(meal.nutrition?.fibres) || extractNumber(meal.nutrition?.fiber) || 5
          },
          ingredients: convertIngredients(meal.ingredients || []),
          instructions: Array.isArray(meal.instructions) ? meal.instructions : ['Instructions disponibles'],
          tempsPreparation: extractNumber(meal.prep_time) || extractNumber(meal.tempsPreparation) || 15,
          tempsCuisson: extractNumber(meal.cook_time) || extractNumber(meal.tempsCuisson) || 15,
          portions: extractNumber(meal.servings) || extractNumber(meal.portions) || 1,
          difficulte: 'facile' as const,
          tags: Array.isArray(meal.tags) ? meal.tags : ['équilibré', 'protéiné'],
          confiance: 0.8,
          source: 'ai_generated' as const
        }));
        
        console.log('✅ Converted meal_recommendations:', {
          count: responseData.recommendations.length,
          titles: responseData.recommendations.map((r: any) => r.titre)
        });
      } else if (responseData.recommandations_de_repas && Array.isArray(responseData.recommandations_de_repas)) {
        console.log('🔄 Converting recommandations_de_repas to recommendations format');
        responseData.recommendations = responseData.recommandations_de_repas.map((meal: any, index: number) => ({
          id: `repas_${index}_${Date.now()}`,
          titre: meal.nom || meal.titre || meal.name || meal.title || `Repas ${index + 1}`,
          description: meal.description || 'Repas équilibré et nutritif',
          categorie: extractCategory(meal.nom || meal.titre, index),
          nutrition: {
            calories: extractNumber(meal.calories) || extractNumber(meal.nutrition?.calories) || 300,
            proteines: extractNumber(meal.proteines) || extractNumber(meal.nutrition?.proteines) || extractNumber(meal.nutrition?.protein) || 20,
            glucides: extractNumber(meal.glucides) || extractNumber(meal.nutrition?.glucides) || extractNumber(meal.nutrition?.carbs) || 30,
            lipides: extractNumber(meal.lipides) || extractNumber(meal.nutrition?.lipides) || extractNumber(meal.nutrition?.fat) || 10,
            fibres: extractNumber(meal.fibres) || extractNumber(meal.nutrition?.fibres) || extractNumber(meal.nutrition?.fiber) || 5
          },
          ingredients: convertIngredients(meal.ingrédients || meal.ingredients || []),
          instructions: Array.isArray(meal.instructions) ? meal.instructions : ['Instructions disponibles'],
          tempsPreparation: extractNumber(meal.prep_time) || extractNumber(meal.tempsPreparation) || 15,
          tempsCuisson: extractNumber(meal.cook_time) || extractNumber(meal.tempsCuisson) || 15,
          portions: extractNumber(meal.servings) || extractNumber(meal.portions) || 1,
          difficulte: 'facile' as const,
          tags: Array.isArray(meal.tags) ? meal.tags : ['équilibré', 'protéiné'],
          confiance: 0.8,
          source: 'ai_generated' as const
        }));
        
        console.log('✅ Converted recommandations_de_repas:', {
          count: responseData.recommendations.length,
          titles: responseData.recommendations.map((r: any) => r.titre)
        });
      } else if (responseData.meal_plan && Array.isArray(responseData.meal_plan)) {
        console.log('🔄 Converting meal_plan to recommendations format');
        responseData.recommendations = responseData.meal_plan.map((meal: any, index: number) => ({
          id: `plan_${index}_${Date.now()}`,
          titre: meal.nom || meal.name || meal.title || `${meal.meal || 'Repas'} ${index + 1}`,
          description: meal.description || `Repas pour ${meal.meal || 'la journée'}`,
          categorie: extractCategory(meal.meal || meal.nom, index),
          nutrition: {
            calories: extractNumber(meal.calories) || extractNumber(meal.nutrition?.calories) || 300,
            proteines: extractNumber(meal.proteines) || extractNumber(meal.protein) || extractNumber(meal.nutrition?.proteines) || 20,
            glucides: extractNumber(meal.glucides) || extractNumber(meal.carbs) || extractNumber(meal.nutrition?.glucides) || 30,
            lipides: extractNumber(meal.lipides) || extractNumber(meal.fat) || extractNumber(meal.nutrition?.lipides) || 10,
            fibres: extractNumber(meal.fibres) || extractNumber(meal.fiber) || extractNumber(meal.nutrition?.fibres) || 5
          },
          ingredients: convertIngredients(meal.ingredients || meal.ingrédients || []),
          instructions: Array.isArray(meal.instructions) ? meal.instructions : ['Instructions disponibles'],
          tempsPreparation: extractNumber(meal.prep_time) || extractNumber(meal.tempsPreparation) || 15,
          tempsCuisson: extractNumber(meal.cook_time) || extractNumber(meal.tempsCuisson) || 15,
          portions: extractNumber(meal.servings) || extractNumber(meal.portions) || 1,
          difficulte: 'facile' as const,
          tags: Array.isArray(meal.tags) ? meal.tags : ['équilibré', 'protéiné'],
          confiance: 0.8,
          source: 'ai_generated' as const
        }));
        
        console.log('✅ Converted meal_plan:', {
          count: responseData.recommendations.length,
          titles: responseData.recommendations.map((r: any) => r.titre)
        });
      } else {
        // Add empty recommendations array if missing
        console.warn('⚠️ Aucun array recommendations trouvé, création array vide');
        responseData.recommendations = [];
      }
    } else {
      console.log('✅ Array recommendations trouvé:', {
        count: Array.isArray(responseData.recommendations) ? responseData.recommendations.length : 'not array',
        firstItem: Array.isArray(responseData.recommendations) && responseData.recommendations.length > 0 
          ? Object.keys(responseData.recommendations[0]) : 'empty'
      });
    }
    
    res.json({
      success: true,
      data: responseData,
      usage: {
        tokensUsed: aiResponse.tokensUsed,
        cost: aiResponse.cost
      }
    });

  } catch (error) {
    console.error('AI nutrition coach error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: error.errors
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération des recommandations'
    });
  }
};

/**
 * POST /api/ai/nutrition-coach/quick-suggestion
 * Obtenir une suggestion rapide de repas
 */
export const getQuickMealSuggestion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Non authentifié'
      });
      return;
    }

    const { userProfile, mealType, constraints } = req.body;
    NutritionProfileSchema.parse(userProfile); // Validate input

    // Créer une requête de recommandation simple
    const request = {
      type: 'meal' as const,
      mealType,
      constraints,
      targetMacros: constraints?.targetProtein ? { protein: constraints.targetProtein } : undefined,
      context: 'Suggestion rapide pour un repas immédiat'
    };

    // Utiliser le endpoint principal avec des paramètres simplifiés
    req.body = {
      userProfile: userProfile,
      request,
      systemPrompt: req.body.systemPrompt,
      userPrompt: req.body.userPrompt,
      maxTokens: 2000, // Moins de tokens pour une réponse rapide
      temperature: 0.7
    };

    await getNutritionCoachRecommendations(req, res);

  } catch (error) {
    console.error('AI quick meal suggestion error:', error);

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération de la suggestion'
    });
  }
};

/**
 * POST /api/ai/nutrition-coach/balance-analysis
 * Analyser l'équilibre nutritionnel récent
 */
export const analyzeNutritionalBalance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Non authentifié'
      });
      return;
    }

    const { userProfile, period = 'week' } = req.body;
    NutritionProfileSchema.parse(userProfile); // Validate input

    // Récupérer les repas sur la période
    const periodDays = {
      today: 1,
      week: 7,
      month: 30
    };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (periodDays[period as keyof typeof periodDays] || 7));

    const meals = await prisma.meal_entries.findMany({
      where: {
        user_id: userId,
        meal_timestamp: { gte: startDate }
      },
      orderBy: { meal_timestamp: 'desc' }
    });

    // Préparer le prompt pour l'analyse
    const systemPrompt = req.body.systemPrompt;
    const userPrompt = req.body.userPrompt;

    const aiResponse = await AIService.generateChatCompletion(
      systemPrompt,
      userPrompt,
      { maxTokens: 2000, temperature: 0.3 }
    );

    console.log('Nutritional balance analyzed', {
      userId,
      period,
      mealsAnalyzed: meals.length
    });

    res.json({
      success: true,
      data: aiResponse.data,
      metadata: {
        period,
        mealsAnalyzed: meals.length,
        tokensUsed: aiResponse.tokensUsed
      }
    });

  } catch (error) {
    console.error('AI nutritional balance error:', error);

    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'analyse de l\'équilibre nutritionnel'
    });
  }
};

// =======================
// NUTRITIONAL ANALYSIS ENDPOINTS
// =======================

/**
 * POST /api/ai/nutritional-analysis
 * Générer un rapport d'analyse nutritionnelle complet
 */
export const generateNutritionalAnalysis = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Non authentifié'
      });
      return;
    }

    const { userProfile, request } = req.body;
    NutritionProfileSchema.parse(userProfile); // Validate input
    const validatedRequest = AnalysisRequestSchema.parse(request);

    // Déterminer la période d'analyse
    let startDate: Date, endDate: Date;
    if (validatedRequest.period === 'custom' && validatedRequest.customRange) {
      startDate = new Date(validatedRequest.customRange.start);
      endDate = new Date(validatedRequest.customRange.end);
    } else {
      endDate = new Date();
      const periodDays = {
        week: 7,
        month: 30,
        '3months': 90,
        '6months': 180,
        year: 365
      };
      const days = periodDays[validatedRequest.period as keyof typeof periodDays] || 7;
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    // Récupérer les repas sur la période
    const meals = await prisma.meal_entries.findMany({
      where: {
        user_id: userId,
        meal_timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { meal_timestamp: 'asc' }
    });

    if (meals.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Aucun repas trouvé sur la période sélectionnée'
      });
      return;
    }

    // Générer l'analyse via OpenAI
    const systemPrompt = req.body.systemPrompt;
    const userPrompt = req.body.userPrompt;
    const maxTokens = req.body.maxTokens || 4000;

    const aiResponse = await AIService.generateChatCompletion(
      systemPrompt,
      userPrompt,
      { maxTokens, temperature: 0.3 } // Température basse pour plus de précision
    );

    console.log('Nutritional analysis generated', {
      userId,
      period: validatedRequest.period,
      mealsAnalyzed: meals.length,
      detailLevel: validatedRequest.detailLevel
    });

    res.json({
      success: true,
      data: aiResponse.data,
      metadata: {
        period: validatedRequest.period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        mealsAnalyzed: meals.length,
        tokensUsed: aiResponse.tokensUsed
      }
    });

  } catch (error) {
    console.error('AI nutritional analysis error:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: error.errors
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération de l\'analyse'
    });
  }
};

/**
 * POST /api/ai/nutritional-analysis/quick-insights
 * Obtenir des insights nutritionnels rapides
 */
export const getQuickNutritionalInsights = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Non authentifié'
      });
      return;
    }

    const { userProfile, period = 'week' } = req.body;
    NutritionProfileSchema.parse(userProfile); // Validate input

    // Utiliser le endpoint principal avec des paramètres simplifiés
    const request = {
      period,
      focusAreas: ['protein', 'balance', 'consistency'],
      detailLevel: 'summary' as const
    };

    req.body = {
      userProfile: userProfile,
      request,
      systemPrompt: req.body.systemPrompt,
      userPrompt: req.body.userPrompt,
      maxTokens: 1500, // Moins de tokens pour des insights rapides
      temperature: 0.3
    };

    await generateNutritionalAnalysis(req, res);

  } catch (error) {
    console.error('AI quick insights error:', error);

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération des insights'
    });
  }
};

/**
 * POST /api/ai/nutritional-analysis/compare-periods
 * Comparer deux périodes nutritionnelles
 */
export const compareNutritionalPeriods = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Non authentifié'
      });
      return;
    }

    const { userProfile, currentPeriod, comparisonPeriod } = req.body;
    NutritionProfileSchema.parse(userProfile); // Validate input

    // Calculer les dates pour les deux périodes
    const now = new Date();
    const periodDays = {
      week: 7,
      month: 30,
      '3months': 90,
      '6months': 180,
      year: 365
    };

    // Période actuelle
    const currentDays = periodDays[currentPeriod as keyof typeof periodDays] || 7;
    const currentStart = new Date();
    currentStart.setDate(currentStart.getDate() - currentDays);

    // Période de comparaison
    const comparisonDays = periodDays[comparisonPeriod as keyof typeof periodDays] || 7;
    const comparisonEnd = new Date(currentStart);
    const comparisonStart = new Date(comparisonEnd);
    comparisonStart.setDate(comparisonStart.getDate() - comparisonDays);

    // Récupérer les repas des deux périodes
    const [currentMeals, previousMeals] = await Promise.all([
      prisma.meal_entries.findMany({
        where: {
          user_id: userId,
          meal_timestamp: {
            gte: currentStart,
            lte: now
          }
        }
      }),
      prisma.meal_entries.findMany({
        where: {
          user_id: userId,
          meal_timestamp: {
            gte: comparisonStart,
            lt: currentStart
          }
        }
      })
    ]);

    if (currentMeals.length === 0 || previousMeals.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Données insuffisantes pour la comparaison'
      });
      return;
    }

    // Générer la comparaison via OpenAI
    const systemPrompt = req.body.systemPrompt;
    const userPrompt = req.body.userPrompt;

    const aiResponse = await AIService.generateChatCompletion(
      systemPrompt,
      userPrompt,
      { maxTokens: 3000, temperature: 0.3 }
    );

    console.log('Period comparison generated', {
      userId,
      currentPeriod,
      comparisonPeriod,
      currentMeals: currentMeals.length,
      previousMeals: previousMeals.length
    });

    res.json({
      success: true,
      data: aiResponse.data,
      metadata: {
        currentPeriod: {
          period: currentPeriod,
          startDate: currentStart.toISOString(),
          endDate: now.toISOString(),
          mealsCount: currentMeals.length
        },
        comparisonPeriod: {
          period: comparisonPeriod,
          startDate: comparisonStart.toISOString(),
          endDate: comparisonEnd.toISOString(),
          mealsCount: previousMeals.length
        },
        tokensUsed: aiResponse.tokensUsed
      }
    });

  } catch (error) {
    console.error('AI period comparison error:', error);

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la comparaison des périodes'
    });
  }
};

// =======================
// FONCTIONS HELPER
// =======================

/**
 * Calculer un résumé nutritionnel des repas récents
 */
async function calculateNutritionalSummary(meals: any[], userProfile: any) {
  if (meals.length === 0) {
    return {
      avgDailyProtein: 0,
      avgDailyCalories: 0,
      proteinGoalAchievement: 0,
      daysAnalyzed: 0,
      trends: 'Aucun historique disponible'
    };
  }

  // Grouper par jour
  const dayGroups = new Map<string, any[]>();
  meals.forEach(meal => {
    const day = new Date(meal.meal_timestamp).toDateString();
    if (!dayGroups.has(day)) dayGroups.set(day, []);
    dayGroups.get(day)!.push(meal);
  });

  // Calculer les moyennes
  const dailyProteins = Array.from(dayGroups.values()).map(dayMeals => 
    dayMeals.reduce((sum, meal) => sum + (meal.protein_grams || 0), 0)
  );
  
  const dailyCalories = Array.from(dayGroups.values()).map(dayMeals => 
    dayMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0)
  );

  const avgDailyProtein = dailyProteins.reduce((sum, p) => sum + p, 0) / dailyProteins.length;
  const avgDailyCalories = dailyCalories.reduce((sum, c) => sum + c, 0) / dailyCalories.length;
  
  const proteinGoalAchievement = userProfile.proteinGoal > 0 
    ? (avgDailyProtein / userProfile.proteinGoal) * 100 
    : 0;

  // Analyser les tendances
  let trends = 'Stable';
  if (dailyProteins.length >= 3) {
    const recent = dailyProteins.slice(-3).reduce((sum, p) => sum + p, 0) / 3;
    const earlier = dailyProteins.slice(0, -3).reduce((sum, p) => sum + p, 0) / Math.max(dailyProteins.length - 3, 1);
    
    if (recent > earlier * 1.1) trends = 'En amélioration';
    else if (recent < earlier * 0.9) trends = 'En déclin';
  }

  return {
    avgDailyProtein: Math.round(avgDailyProtein),
    avgDailyCalories: Math.round(avgDailyCalories),
    proteinGoalAchievement: Math.round(proteinGoalAchievement),
    daysAnalyzed: dayGroups.size,
    trends
  };
}

/**
 * Construire le prompt utilisateur pour le nutrition coach
 */
function buildNutritionCoachPrompt(context: any): string {
  const { userProfile, recentMeals, request, nutritionalSummary } = context;
  
  const profileInfo = `
PROFIL UTILISATEUR :
- ${userProfile.gender === 'male' ? 'Homme' : userProfile.gender === 'female' ? 'Femme' : 'Personne'} de ${userProfile.age} ans
- Poids: ${userProfile.weight}kg, Taille: ${userProfile.height}cm
- Objectif: ${getFitnessGoalLabel(userProfile.fitnessGoal)}
- Activité: ${getActivityLevelLabel(userProfile.activityLevel)}
- Objectif protéines: ${userProfile.proteinGoal}g/jour
- Objectif calories: ${userProfile.calorieGoal} kcal/jour
- Restrictions: ${userProfile.dietaryRestrictions?.join(', ') || 'Aucune'}
- Allergies: ${userProfile.allergies?.join(', ') || 'Aucune'}`;

  const nutritionInfo = `
ANALYSE NUTRITIONNELLE RÉCENTE (${nutritionalSummary.daysAnalyzed} jours) :
- Protéines moyennes: ${nutritionalSummary.avgDailyProtein}g/jour (${nutritionalSummary.proteinGoalAchievement}% de l'objectif)
- Calories moyennes: ${nutritionalSummary.avgDailyCalories} kcal/jour
- Tendance: ${nutritionalSummary.trends}`;

  const recentMealsInfo = recentMeals.length > 0 
    ? `\nREPAS RÉCENTS :\n${recentMeals.slice(0, 5).map((meal: any) => 
        `- ${meal.description} (${meal.protein_grams || 0}g protéines, ${meal.calories || 'N/A'} kcal)`
      ).join('\n')}`
    : '\nREPAS RÉCENTS : Aucun repas enregistré récemment';

  const requestInfo = `
DEMANDE SPÉCIFIQUE :
- Type: ${request.type}
- Repas: ${request.mealType || 'Non spécifié'}
- Contraintes: ${request.constraints ? JSON.stringify(request.constraints) : 'Aucune'}
- Objectifs macros: ${request.targetMacros ? JSON.stringify(request.targetMacros) : 'Standards'}
- Contexte: ${request.context || 'Recommandation générale'}`;

  return `${profileInfo}${nutritionInfo}${recentMealsInfo}${requestInfo}

INSTRUCTIONS :
Génère 2-3 recommandations de repas personnalisées qui :
1. Optimisent l'apport en protéines vers l'objectif ${userProfile.proteinGoal}g
2. Respectent le budget calorique de ${userProfile.calorieGoal} kcal
3. Sont variées et équilibrées nutritionnellement
4. Sont réalisables avec des ingrédients courants
5. Prennent en compte les contraintes et préférences

Propose des recettes complètes avec ingrédients, instructions, temps de préparation et valeurs nutritionnelles précises.`;
}

/**
 * Helpers pour les labels
 */
function getFitnessGoalLabel(goal: string): string {
  const labels = {
    'weight_loss': 'Perte de poids',
    'muscle_gain': 'Prise de masse musculaire', 
    'maintenance': 'Maintien du poids',
    'general_health': 'Santé générale'
  };
  return labels[goal as keyof typeof labels] || goal;
}

function getActivityLevelLabel(level: string): string {
  const labels = {
    'sedentary': 'Sédentaire',
    'light': 'Activité légère',
    'moderate': 'Activité modérée',
    'very_active': 'Très actif',
    'extremely_active': 'Extrêmement actif'
  };
  return labels[level as keyof typeof labels] || level;
}

/**
 * Helper functions for meal_recommendations conversion
 */
function extractCategory(mealName: string, index: number): 'petit-dejeuner' | 'dejeuner' | 'diner' | 'collation' {
  if (!mealName) {
    // Default categories based on index
    const defaultCategories: ('petit-dejeuner' | 'dejeuner' | 'diner' | 'collation')[] = ['petit-dejeuner', 'dejeuner', 'diner', 'collation'];
    return (defaultCategories[index % 4] || 'dejeuner') as 'petit-dejeuner' | 'dejeuner' | 'diner' | 'collation';
  }
  
  const name = mealName.toLowerCase();
  
  // French breakfast terms
  if (name.includes('petit-déjeuner') || name.includes('petit déjeuner') || name.includes('breakfast') || 
      name.includes('café') || name.includes('thé') || name.includes('croissant') || 
      name.includes('céréales') || name.includes('yaourt') || name.includes('tartine')) {
    return 'petit-dejeuner';
  }
  
  // French lunch terms  
  if (name.includes('déjeuner') || name.includes('lunch') || name.includes('midi') ||
      name.includes('salade') || name.includes('sandwich') || name.includes('quiche')) {
    return 'dejeuner';
  }
  
  // French dinner terms
  if (name.includes('dîner') || name.includes('diner') || name.includes('dinner') || name.includes('soir') ||
      name.includes('rôti') || name.includes('gratin') || name.includes('ragoût') || name.includes('soupe')) {
    return 'diner';
  }
  
  // French snack terms
  if (name.includes('collation') || name.includes('snack') || name.includes('encas') || 
      name.includes('goûter') || name.includes('fruit') || name.includes('noix')) {
    return 'collation';
  }
  
  // Default based on index if no keywords match
  const defaultCategories: ('petit-dejeuner' | 'dejeuner' | 'diner' | 'collation')[] = ['petit-dejeuner', 'dejeuner', 'diner', 'collation'];
  return (defaultCategories[index % 4] || 'dejeuner') as 'petit-dejeuner' | 'dejeuner' | 'diner' | 'collation';
}

function extractNumber(value: any): number | null {
  if (typeof value === 'number' && !isNaN(value)) {
    return Math.max(0, Math.round(value));
  }
  
  if (typeof value === 'string') {
    // Extract number from string (e.g., "150g" -> 150, "2.5 portions" -> 2.5)
    const match = value.match(/([0-9]+\.?[0-9]*)/); 
    if (match) {
      if (typeof match[1] === 'string') {
        const num = parseFloat(match[1]);
        return !isNaN(num) ? Math.max(0, Math.round(num)) : null;
      }
    }
  }
  
  return null;
}

function convertIngredients(ingredients: any[]): Array<{nom: string, quantite: string, unite: string}> {
  if (!Array.isArray(ingredients)) {
    return [{ nom: 'Ingrédients disponibles', quantite: '1', unite: 'portion' }];
  }
  
  return ingredients.map((ingredient, index) => {
    // Handle different ingredient formats
    if (typeof ingredient === 'string') {
      // Parse string like "200g de poulet" or "2 oeufs"
      const match = ingredient.match(/^([0-9]+\.?[0-9]*)\s*([a-zA-Z]*)?\s+(?:de\s+)?(.+)$/);
      if (match) {
        return {
          nom: (match[3] ? match[3].trim() : `Ingrédient ${index + 1}`),
          quantite: match[1] || '1',
          unite: match[2] || 'unité'
        };
      }
      return {
        nom: ingredient,
        quantite: '1',
        unite: 'portion'
      };
    }
    
    if (typeof ingredient === 'object' && ingredient !== null) {
      return {
        nom: ingredient.nom || ingredient.name || ingredient.ingredient || ingredient.item || `Ingrédient ${index + 1}`,
        quantite: ingredient.quantite || ingredient.quantity || ingredient.amount || '1',
        unite: ingredient.unite || ingredient.unit || ingredient.mesure || 'portion'
      };
    }
    
    return {
      nom: `Ingrédient ${index + 1}`,
      quantite: '1', 
      unite: 'portion'
    };
  });
}