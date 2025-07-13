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

    // Fonction pour générer un appel IA avec retry et validation
    const generateAIRecommendationsWithRetry = async (attempt = 1): Promise<any> => {
      const maxAttempts = 3;
      
      // Prompt système ultra-direct selon la tentative
      let systemPrompt;
      if (attempt === 1) {
        systemPrompt = `Réponds UNIQUEMENT avec ce JSON EXACT en français :
{"recommendations":[{"id":"rec_1","titre":"nom plat","description":"description","categorie":"petit-dejeuner","nutrition":{"calories":300,"proteines":25,"glucides":20,"lipides":10,"fibres":5},"ingredients":[{"nom":"ingredient","quantite":"100","unite":"g"}],"instructions":["étape 1"],"tempsPreparation":10,"tempsCuisson":5,"portions":1,"difficulte":"facile","tags":["tag"],"confiance":0.9,"source":"ai_generated"}],"explanation":"explication","tips":["conseil"],"nutritionalInsights":["insight"]}

COPIE EXACTEMENT cette structure. Remplace uniquement les valeurs par de vraies recettes en français. 4 recommandations.`;
      } else if (attempt === 2) {
        systemPrompt = `ATTENTION: Tu as échoué au premier essai. 
OBLIGATION ABSOLUE: Commencer ta réponse par {"recommendations":
RIEN D'AUTRE. Pas de texte avant le JSON.
Utilise exactement: "recommendations", "titre", "categorie", "nutrition", "ingredients" avec objets {nom,quantite,unite}
4 recettes françaises complètes.`;
      } else {
        systemPrompt = `DERNIER ESSAI. Format exact obligatoire:
{"recommendations":[{"id":"r1","titre":"Plat","description":"desc","categorie":"dejeuner","nutrition":{"calories":400,"proteines":30,"glucides":25,"lipides":15,"fibres":6},"ingredients":[{"nom":"Ingrédient","quantite":"150","unite":"g"}],"instructions":["Faire X"],"tempsPreparation":15,"tempsCuisson":10,"portions":1,"difficulte":"facile","tags":["équilibré"],"confiance":0.8,"source":"ai_generated"}],"explanation":"Recommandations adaptées","tips":["Conseil utile"],"nutritionalInsights":["Analyse nutritionnelle"]}`;
      }

      const aiResponse = await AIService.generateChatCompletion(
        systemPrompt,
        req.body.userPrompt || buildNutritionCoachPrompt(userContext),
        { 
          maxTokens: req.body.maxTokens || 4000,
          temperature: req.body.temperature || 0.3  // Température plus basse pour plus de précision
        }
      );

      // Validation stricte de la réponse
      const responseData = aiResponse.data;
      
      if (!responseData.recommendations || !Array.isArray(responseData.recommendations) || responseData.recommendations.length === 0) {
        console.error(`❌ Tentative ${attempt} échouée - Structure incorrecte:`, Object.keys(responseData));
        
        if (attempt < maxAttempts) {
          console.log(`🔄 Nouvelle tentative ${attempt + 1}/${maxAttempts}`);
          return generateAIRecommendationsWithRetry(attempt + 1);
        } else {
          throw new Error(`IA n'a pas respecté le format après ${maxAttempts} tentatives`);
        }
      }

      // Validation des champs obligatoires
      const firstRec = responseData.recommendations[0];
      const requiredFields = ['titre', 'categorie', 'nutrition', 'ingredients', 'instructions'];
      const missingFields = requiredFields.filter(field => !firstRec[field]);
      
      if (missingFields.length > 0) {
        console.error(`❌ Tentative ${attempt} - Champs manquants:`, missingFields);
        
        if (attempt < maxAttempts) {
          console.log(`🔄 Nouvelle tentative ${attempt + 1}/${maxAttempts}`);
          return generateAIRecommendationsWithRetry(attempt + 1);
        } else {
          throw new Error(`Champs obligatoires manquants: ${missingFields.join(', ')}`);
        }
      }

      console.log(`✅ Tentative ${attempt} réussie - Format correct avec ${responseData.recommendations.length} recommandations`);
      return aiResponse;
    };

    // Appeler l'IA avec retry automatique jusqu'à obtenir le bon format
    const aiResponse = await generateAIRecommendationsWithRetry();

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

    // La fonction retry garantit que nous avons le bon format
    let responseData = aiResponse.data;
    
    console.log('✅ Format validé par retry - Recommandations prêtes:', {
      count: responseData.recommendations.length,
      titles: responseData.recommendations.map((r: any) => r.titre).slice(0, 3)
    });
    
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

