// Service de coaching nutritionnel intelligent avec ChatGPT
import { z } from 'zod';
import { apiClient, ApiResponse } from './api.service';
import { MealEntry } from '@/context/AppContext';

// =====================================================
// TYPES ET SCHÉMAS DE VALIDATION
// =====================================================

// Profil utilisateur pour recommandations
export interface UserNutritionProfile {
  age: number;
  gender: 'male' | 'female' | 'other';
  weight: number; // kg
  height: number; // cm
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extremely_active';
  fitnessGoal: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'general_health';
  proteinGoal: number; // g/jour
  calorieGoal: number; // kcal/jour
  allergies?: string[];
  dietaryRestrictions?: string[];
  cuisinePreferences?: string[];
  cookingTime?: 'quick' | 'moderate' | 'extensive'; // <30min, 30-60min, >60min
  budget?: 'low' | 'medium' | 'high';
  equipment?: string[]; // four, mixeur, etc.
}

// Demande de recommandations
export interface RecommendationRequest {
  type: 'meal' | 'snack' | 'recipe' | 'weekly_plan';
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  targetMacros?: {
    protein?: number;
    calories?: number;
    carbs?: number;
    fat?: number;
  };
  constraints?: {
    ingredients?: string[]; // ingrédients disponibles
    cookingTime?: number; // minutes
    servings?: number;
    excludeIngredients?: string[];
  };
  context?: string; // demande libre de l'utilisateur
}

// Recommandation de repas
export interface MealRecommendation {
  id: string;
  title: string;
  description: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
  ingredients: Array<{
    name: string;
    quantity: string;
    unit: string;
  }>;
  instructions: string[];
  prepTime: number; // minutes
  cookTime: number; // minutes
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[]; // 'vegetarian', 'gluten-free', etc.
  tips?: string[];
  variations?: string[];
  cost?: 'low' | 'medium' | 'high';
  seasonality?: string[]; // ['spring', 'summer']
  equipment?: string[];
  confidence: number; // 0-1
  source: 'ai_generated' | 'adapted_recipe';
}

// Réponse du service
export interface CoachRecommendationResponse {
  recommendations: MealRecommendation[];
  explanation: string; // Pourquoi ces recommandations
  tips: string[];
  nutritionalInsights: string[];
  weeklyGoalProgress?: {
    proteinProgress: number; // %
    calorieProgress: number; // %
    balanceScore: number; // 0-100
  };
  nextSteps?: string[];
}

// Schémas de validation
const UserProfileSchema = z.object({
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

// =====================================================
// SERVICE PRINCIPAL
// =====================================================

export class NutritionCoachService {
  private static instance: NutritionCoachService;
  
  private readonly COACH_PROMPTS = {
    systemPrompt: `Tu es un coach nutritionniste expert avec 15 ans d'expérience, spécialisé en cuisine française et internationale. 

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

    RÉPONSE FORMAT :
    Toujours répondre en JSON valide avec la structure exacte demandée.
    Calculs nutritionnels précis et réalistes.
    Instructions claires et détaillées.
    Conseils pratiques et astuces de chef.`,

    mealRecommendation: `Génère des recommandations de repas personnalisées basées sur :

    PROFIL UTILISATEUR : {userProfile}
    HISTORIQUE RÉCENT : {recentMeals}
    DEMANDE SPÉCIFIQUE : {request}

    OBJECTIFS :
    - Atteindre {proteinGoal}g de protéines/jour
    - Respecter {calorieGoal} kcal/jour
    - Varier les sources de protéines
    - Équilibrer les macronutriments
    - Optimiser la satiété et le plaisir

    CONTRAINTES À RESPECTER :
    - Budget : {budget}
    - Temps de préparation : {cookingTime}
    - Équipement disponible : {equipment}
    - Allergies/restrictions : {restrictions}

    Propose 3-5 recommandations variées avec recettes complètes.`,

    weeklyPlan: `Crée un plan alimentaire hebdomadaire équilibré :

    PROFIL : {userProfile}
    OBJECTIFS HEBDOMADAIRES :
    - Protéines : {weeklyProtein}g
    - Calories : {weeklyCalories} kcal
    - Équilibre nutritionnel optimal

    CONTRAINTES :
    - Variété obligatoire (pas de répétition)
    - Gestion des restes alimentaires
    - Budget maîtrisé
    - Praticité quotidienne

    Structure : 7 jours avec petit-déjeuner, déjeuner, dîner et collations.`,

    quickSuggestion: `Suggestion rapide pour :
    TYPE : {mealType}
    CONTRAINTES : {constraints}
    OBJECTIF IMMÉDIAT : {immediateGoal}

    Propose 1-2 options simples et rapides avec ingrédients courants.`
  };

  public static getInstance(): NutritionCoachService {
    if (!NutritionCoachService.instance) {
      NutritionCoachService.instance = new NutritionCoachService();
    }
    return NutritionCoachService.instance;
  }

  /**
   * Obtenir des recommandations de repas personnalisées
   */
  async getRecommendations(
    userProfile: UserNutritionProfile,
    request: RecommendationRequest,
    recentMeals: MealEntry[] = []
  ): Promise<CoachRecommendationResponse> {
    try {
      // Validation des entrées
      UserProfileSchema.parse(userProfile);
      RecommendationRequestSchema.parse(request);

      // Préparer le contexte pour l'IA
      const context = this.buildCoachContext(userProfile, request, recentMeals);
      
      // Sélectionner le prompt approprié
      const prompt = this.selectPrompt(request.type);
      const fullPrompt = this.interpolatePrompt(prompt, context);

      // Appel à l'API backend qui gère OpenAI
      const response = await apiClient.post<any>('/ai/nutrition-coach', {
        userProfile,
        request,
        recentMealsIds: recentMeals.map(meal => meal.id),
        systemPrompt: this.COACH_PROMPTS.systemPrompt,
        userPrompt: fullPrompt,
        maxTokens: 4000,
        temperature: 0.7,
      });

      console.log('API Response:', response);

      // Extraire les données de la réponse
      let rawData: any;
      
      if (response.success && response.data) {
        // La réponse a une structure { success: true, data: aiResponse.data }
        // où aiResponse.data contient la réponse JSON de l'IA
        rawData = response.data;
      } else if (response.recommendations || response.recommandations) {
        // Si la réponse est directement les recommandations
        rawData = response;
      } else {
        console.error('Structure de réponse inattendue:', response);
        throw new Error('Format de réponse API invalide');
      }

      console.log('Extracted raw data:', rawData);

      // Transformer la réponse française en format anglais attendu
      const recommendationsData: CoachRecommendationResponse = this.transformFrenchResponse(rawData);

      console.log('After transformation:', JSON.stringify(recommendationsData, null, 2));

      // Validation et enrichissement de la réponse
      console.log('Before validation - recommendations count:', recommendationsData.recommendations.length);
      const recommendations = this.validateAndEnrichRecommendations(recommendationsData);
      console.log('After validation - recommendations count:', recommendations.recommendations.length);
      
      return recommendations;

    } catch (error) {
      console.error('Erreur NutritionCoachService:', error);
      
      // Fournir des messages d'erreur plus spécifiques
      if (error instanceof Error) {
        if (error.message.includes('Structure de réponse invalide')) {
          throw new Error('Erreur de format de réponse IA. Veuillez réessayer.');
        } else if (error.message.includes('Format de réponse API invalide')) {
          throw new Error('Erreur de communication avec l\'IA. Veuillez réessayer.');
        }
        throw error;
      }
      
      throw new Error('Impossible de générer les recommandations. Veuillez réessayer.');
    }
  }

  /**
   * Suggestion rapide pour un repas immédiat
   */
  async getQuickSuggestion(
    userProfile: UserNutritionProfile,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    constraints?: {
      timeLimit?: number; // minutes
      availableIngredients?: string[];
      targetProtein?: number;
    }
  ): Promise<MealRecommendation[]> {
    const request: RecommendationRequest = {
      type: 'meal',
      mealType,
      constraints: {
        cookingTime: constraints?.timeLimit,
        ingredients: constraints?.availableIngredients,
      },
      targetMacros: {
        protein: constraints?.targetProtein,
      },
      context: 'Suggestion rapide pour un repas immédiat'
    };

    const response = await this.getRecommendations(userProfile, request);
    return response.recommendations.slice(0, 2); // Max 2 suggestions rapides
  }

  /**
   * Analyser l'équilibre nutritionnel récent
   */
  async analyzeRecentBalance(
    userProfile: UserNutritionProfile,
    recentMeals: MealEntry[],
    period: 'today' | 'week' | 'month' = 'week'
  ): Promise<{
    analysis: string;
    recommendations: string[];
    balanceScore: number;
    improvements: string[];
  }> {
    try {
      const response = await apiClient.post('/ai/nutrition-balance', {
        systemPrompt: this.COACH_PROMPTS.systemPrompt,
        userPrompt: this.buildBalanceAnalysisPrompt(userProfile, recentMeals, period),
        maxTokens: 2000,
        temperature: 0.3, // Plus déterministe pour l'analyse
      });

      if (!response.success || !response.data) {
        throw new Error('Erreur lors de l\'analyse nutritionnelle');
      }

      return response.data;

    } catch (error) {
      console.error('Erreur analyse équilibre:', error);
      throw new Error('Impossible d\'analyser l\'équilibre nutritionnel');
    }
  }

  // =====================================================
  // MÉTHODES PRIVÉES
  // =====================================================

  /**
   * Transformer la réponse française de l'IA en format anglais attendu
   */
  private transformFrenchResponse(frenchData: any): CoachRecommendationResponse {
    console.log('Transforming French response:', frenchData);
    console.log('Total nutrition from API:', frenchData.total_nutrition);
    
    // Mapper les recommandations vers le format attendu
    const recommendations: MealRecommendation[] = [];
    
    // Support à la fois de l'ancien format (recommandations) et du nouveau (recommendations)
    const recList = frenchData.recommendations || frenchData.recommandations || frenchData.repas_recommandations || frenchData.meal_recommendations || frenchData.recommandations_de_repas || frenchData.recommandations_repas || frenchData.repas;
    
    console.log('Looking for recommendations in fields:', Object.keys(frenchData));
    console.log('Found recommendations field with', recList?.length || 0, 'items');
    
    if (recList && Array.isArray(recList)) {
      recList.forEach((item: any, index: number) => {
        console.log('Processing recommendation:', item);
        
        // L'API renvoie maintenant nutrition: {calories, proteins, carbs, fats} OU directement sur l'item
        const nutritionValues = item.recipe?.nutrition || item.nutrition || item.apport_nutritionnel || item.valeurs_nutritionnelles || item || {};
        console.log('Raw nutritionValues object:', nutritionValues);
        console.log('All available keys in nutritionValues:', Object.keys(nutritionValues));
        console.log('Type of nutritionValues:', typeof nutritionValues);
        
        // Extraire les valeurs numériques en supprimant les unités (ex: "350 kcal" -> 350)
        const extractNumber = (value: any): number => {
          console.log('extractNumber called with:', value, 'type:', typeof value);
          if (typeof value === 'number') {
            console.log('extractNumber returning number:', value);
            return value;
          }
          if (typeof value === 'string') {
            const match = value.match(/(\d+(?:\.\d+)?)/);
            const result = match ? parseFloat(match[1]) : 0;
            console.log('extractNumber parsed string:', value, '-> result:', result);
            return result;
          }
          console.log('extractNumber fallback to 0 for:', value);
          return 0;
        };
        
        // Try all possible field names for each nutrition value
        const caloriesValue = extractNumber(nutritionValues.calories) || 
                             extractNumber(nutritionValues.kcal) || 
                             extractNumber(nutritionValues.calorie) || 
                             extractNumber(nutritionValues.energie) || 
                             extractNumber(nutritionValues.energy) || 0;
                             
        const proteinsValue = extractNumber(nutritionValues.proteins) || 
                             extractNumber(nutritionValues.protein) || 
                             extractNumber(nutritionValues.protéines) || 
                             extractNumber(nutritionValues.proteine) || 0;
                             
        const carbsValue = extractNumber(nutritionValues.carbs) || 
                          extractNumber(nutritionValues.carbohydrates) || 
                          extractNumber(nutritionValues.glucides) || 
                          extractNumber(nutritionValues.glucide) || 0;
                          
        const fatsValue = extractNumber(nutritionValues.fats) || 
                         extractNumber(nutritionValues.fat) || 
                         extractNumber(nutritionValues.lipides) || 
                         extractNumber(nutritionValues.lipide) || 0;

        // Mapper les valeurs anglaises vers françaises pour la suite du code
        const mappedNutrition = {
          calories: caloriesValue,
          protéines: proteinsValue,
          glucides: carbsValue,
          lipides: fatsValue
        };
        
        console.log('Individual nutrition extractions:');
        console.log('  calories:', caloriesValue, 'from fields:', ['calories', 'kcal', 'calorie', 'energie', 'energy']);
        console.log('  proteins:', proteinsValue, 'from fields:', ['proteins', 'protein', 'protéines', 'proteine']);
        console.log('  carbs:', carbsValue, 'from fields:', ['carbs', 'carbohydrates', 'glucides', 'glucide']);
        console.log('  fats:', fatsValue, 'from fields:', ['fats', 'fat', 'lipides', 'lipide']);
        console.log('Final mapped nutrition:', mappedNutrition);
        
        // Validation warning
        if (mappedNutrition.calories === 0 && mappedNutrition.protéines === 0 && mappedNutrition.glucides === 0 && mappedNutrition.lipides === 0) {
          console.warn('WARNING: All nutrition values are 0 for item:', item.recipe?.name || item.title || 'Unknown recipe');
          console.warn('Raw nutrition object was:', nutritionValues);
          console.warn('Available keys were:', Object.keys(nutritionValues));
        }
        
        console.log('Nutrition values:', mappedNutrition);
        console.log('Full item structure:', JSON.stringify(item, null, 2));
        
        const recommendation: MealRecommendation = {
          id: `rec_${index + 1}`,
          title: String(item.nom || item.recipe?.name || item.nom_du_repas || item.nom_repas || item.title || item.meal || item.meal_name || `Repas ${index + 1}`),
          description: String(item.description || this.generateDescription(item.meal || item.meal_name, item.meal || item.meal_name || item.nom || item.recipe?.name)),
          category: this.mapMealCategory(item.meal || item.meal_name || item.nom || item.nom_du_repas || item.nom_repas || ''),
          nutrition: {
            calories: mappedNutrition.calories || 0,
            protein: mappedNutrition.protéines || 0,
            carbs: mappedNutrition.glucides || this.estimateCarbs(mappedNutrition),
            fat: mappedNutrition.lipides || this.estimateFat(mappedNutrition),
            fiber: 0, // No fiber in nutritionValues, fallback to 0
          },
          ingredients: this.mapIngredients(item.recipe?.ingredients || item.ingredients || item.ingrédients || item.recette || []),
          instructions: Array.isArray(item.recipe?.instructions) ? item.recipe.instructions.map(String) : Array.isArray(item.instructions) ? item.instructions.map(String) : (item.instructions ? [String(item.instructions)] : ['Instructions détaillées disponibles']),
          prepTime: item.temps_préparation || item.prepTime || 15,
          cookTime: item.temps_cuisson || item.cookTime || 15,
          servings: item.portions || item.servings || 1,
          difficulty: this.mapDifficulty(item.difficulté || item.difficulty || 'easy'),
          tags: this.generateTags(item),
          confidence: 0.85,
          source: 'ai_generated' as const
        };
        
        console.log('Created recommendation:', recommendation);
        recommendations.push(recommendation);
      });
    }

    // Collecter les tips depuis les recommandations individuelles OU depuis la structure globale
    const globalTips = frenchData.conseils_pratiques || frenchData.astuces || frenchData.tips || [];
    const individualTips = recommendations.map(rec => rec.tags).filter(Boolean).flat();
    const mealTips = recList?.map((item: any) => item.tips).filter(Boolean) || [];
    const tips = Array.isArray(globalTips) ? globalTips : (globalTips ? [globalTips] : mealTips);
    
    // Calculer les totaux depuis les recommandations individuelles ou utiliser ceux de l'API
    console.log('Calculating totals from', recommendations.length, 'recommendations');
    console.log('First recommendation nutrition:', recommendations[0]?.nutrition);
    
    // Utiliser les totaux fournis par l'API dans total_nutrition ou total_journalier
    const apiTotals = frenchData.total_nutrition || frenchData.total_journalier || frenchData.total_daily_nutrition || {};
    
    const totalProteins = apiTotals.proteins || apiTotals.protéines ||
                         frenchData.total_protéines_journalières || 
                         frenchData.total_protéines || 
                         recommendations.reduce((sum, rec) => sum + (rec.nutrition.protein || 0), 0);
    const totalCalories = apiTotals.calories || apiTotals.kcal ||
                         frenchData.total_calories_journalières || 
                         frenchData.total_calories || 
                         recommendations.reduce((sum, rec) => sum + (rec.nutrition.calories || 0), 0);
    const totalCarbs = apiTotals.carbs || apiTotals.glucides ||
                      frenchData.total_glucides_journalières || 
                      frenchData.total_glucides || 
                      recommendations.reduce((sum, rec) => sum + (rec.nutrition.carbs || 0), 0);
    const totalFats = apiTotals.fats || apiTotals.lipides ||
                     frenchData.total_lipides_journalières || 
                     frenchData.total_lipides || 
                     recommendations.reduce((sum, rec) => sum + (rec.nutrition.fat || 0), 0);
    
    console.log('Totals - Proteins:', totalProteins, 'Calories:', totalCalories, 'Carbs:', totalCarbs, 'Fats:', totalFats);
    console.log('API totals object:', apiTotals);
    console.log('Calculating progress with totalProteins:', totalProteins, 'totalCalories:', totalCalories);
    
    const proteinPercent = totalProteins > 0 ? Math.round((totalProteins) / 195 * 100) : 0;
    const caloriePercent = totalCalories > 0 ? Math.round((totalCalories) / 2140 * 100) : 0;
    
    console.log('Calculated progress - Protein:', proteinPercent + '%', 'Calorie:', caloriePercent + '%');
    
    return {
      recommendations,
      explanation: frenchData.notes || frenchData.conseils || frenchData.commentaires || frenchData.explanation || 'Voici vos recommandations de repas personnalisées, conçues pour vous aider à atteindre vos objectifs nutritionnels.',
      tips: Array.isArray(tips) ? tips : [],
      nutritionalInsights: frenchData.insights || frenchData.nutritionalInsights || [
        `Total protéines : ${totalProteins}g`,
        `Total calories : ${totalCalories} kcal`,
        `Total glucides : ${totalCarbs}g`,
        `Total lipides : ${totalFats}g`
      ],
      weeklyGoalProgress: {
        proteinProgress: proteinPercent,
        calorieProgress: caloriePercent,
        balanceScore: 88
      }
    };
  }

  /**
   * Générer une description basée sur le type de repas et le nom
   */
  private generateDescription(meal: string, recipeName: string): string {
    const descriptions = {
      'Petit Déjeuner': 'Un petit-déjeuner équilibré pour bien commencer la journée',
      'Déjeuner': 'Un déjeuner nutritif et savoureux pour maintenir votre énergie',
      'Dîner': 'Un dîner léger et équilibré pour finir la journée en beauté',
      'Snack': 'Une collation saine pour combler vos petites faims',
      'Collation': 'Une collation nutritive entre les repas'
    };
    
    return descriptions[meal as keyof typeof descriptions] || `${recipeName || 'Repas'} équilibré riche en protéines`;
  }

  /**
   * Extraire les ingrédients depuis le champ recette
   */
  private extractIngredientsFromRecette(recette: any[]): Array<{ name: string; quantity: string; unit: string }> {
    if (!Array.isArray(recette) || recette.length === 0) return [];
    
    // Essayer de trouver la section ingrédients dans la recette
    const recetteText = recette.join(' ').toLowerCase();
    const ingredients: Array<{ name: string; quantity: string; unit: string }> = [];
    
    // Rechercher des patterns d'ingrédients courants
    const commonIngredients = [
      'poulet', 'saumon', 'thon', 'œufs', 'yaourt', 'fromage', 'lait', 'avocat',
      'quinoa', 'riz', 'pâtes', 'pain', 'légumes', 'tomates', 'concombre',
      'huile', 'beurre', 'sel', 'poivre', 'ail', 'oignon'
    ];
    
    commonIngredients.forEach(ingredient => {
      if (recetteText.includes(ingredient)) {
        ingredients.push({
          name: ingredient,
          quantity: '1',
          unit: 'portion'
        });
      }
    });
    
    return ingredients.length > 0 ? ingredients : [
      { name: 'Ingrédients variés', quantity: '1', unit: 'portion' }
    ];
  }

  /**
   * Extraire les instructions depuis le champ recette
   */
  private extractInstructionsFromRecette(recette: any[]): string[] {
    if (!Array.isArray(recette)) return ['Instructions détaillées disponibles'];
    
    return recette.length > 0 ? recette.map(String) : ['Instructions détaillées disponibles'];
  }

  /**
   * Générer des tags automatiques basé sur le repas
   */
  private generateTags(item: any): string[] {
    const tags: string[] = [];
    const name = (item.recipe?.name || item.nom_du_repas || item.nom_repas || item.nom || '').toLowerCase();
    const meal = (item.meal || '').toLowerCase();
    
    // Tags basés sur le nom de la recette
    if (name.includes('smoothie') || name.includes('protéiné')) tags.push('protéiné');
    if (name.includes('grillé') || name.includes('four')) tags.push('cuisine saine');
    if (name.includes('légumes') || name.includes('épinards') || name.includes('brocolis')) tags.push('riche en légumes');
    if (name.includes('saumon') || name.includes('poisson')) tags.push('oméga-3');
    if (name.includes('omelette') || name.includes('œufs')) tags.push('riche en protéines');
    if (name.includes('yaourt') || name.includes('fromage')) tags.push('produits laitiers');
    
    // Tags basés sur le type de repas
    if (meal.includes('petit déjeuner') || meal.includes('petit-déjeuner')) tags.push('petit-déjeuner');
    if (meal.includes('snack') || meal.includes('collation')) tags.push('collation');
    
    return tags;
  }

  /**
   * Mapper le nom du repas vers une catégorie
   */
  private mapMealCategory(name: string): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('petit-déjeuner') || lowerName.includes('petit déjeuner') || lowerName.includes('breakfast')) return 'breakfast';
    if (lowerName.includes('déjeuner') && !lowerName.includes('petit')) return 'lunch';
    if (lowerName.includes('lunch')) return 'lunch';
    if (lowerName.includes('dîner') || lowerName.includes('diner') || lowerName.includes('dinner')) return 'dinner';
    if (lowerName.includes('snack') || lowerName.includes('collation')) return 'snack';
    return 'lunch'; // Par défaut
  }

  /**
   * Estimer les glucides à partir des calories et protéines
   */
  private estimateCarbs(nutritionValues: any): number {
    const calories = nutritionValues.calories || nutritionValues.énergie || 0;
    const protein = nutritionValues.protéines || nutritionValues.proteins || nutritionValues.protein || 0;
    // Estimation: 40% des calories viennent des glucides
    // 1g glucides = 4 calories
    const carbCalories = calories * 0.4;
    return Math.round(carbCalories / 4);
  }

  /**
   * Estimer les lipides à partir des calories et protéines
   */
  private estimateFat(nutritionValues: any): number {
    const calories = nutritionValues.calories || nutritionValues.énergie || 0;
    const protein = nutritionValues.protéines || nutritionValues.proteins || nutritionValues.protein || 0;
    // Calories des protéines (4 cal/g)
    const proteinCalories = protein * 4;
    // Estimation: 30% des calories viennent des lipides
    // 1g lipides = 9 calories
    const fatCalories = calories * 0.3;
    return Math.round(fatCalories / 9);
  }

  /**
   * Mapper les ingrédients français vers le format attendu
   */
  private mapIngredients(ingredients: any[]): Array<{ name: string; quantity: string; unit: string }> {
    if (!Array.isArray(ingredients)) {
      console.log('mapIngredients: not an array, got:', ingredients);
      return [];
    }
    
    console.log('mapIngredients: processing', ingredients.length, 'ingredients');
    console.log('mapIngredients: raw ingredients data:', ingredients);
    
    const mapped = ingredients.map((ingredient: any, index: number) => {
      console.log(`mapIngredients: processing ingredient ${index}:`, ingredient, 'type:', typeof ingredient);
      if (typeof ingredient === 'string') {
        // Parser intelligent pour les formats français
        
        // Format: "200g de poulet" ou "30g de fromage râpé"
        const matchWithDe = ingredient.match(/^(\d+(?:\.\d+)?)\s*([a-zA-ZÀ-ÿ]+)\s+(?:de\s+|d')(.+)$/);
        if (matchWithDe) {
          return {
            name: matchWithDe[3].trim(),
            quantity: matchWithDe[1],
            unit: matchWithDe[2]
          };
        }
        
        // Format: "1 cuillère à soupe d'huile d'olive"
        const matchCuillere = ingredient.match(/^(\d+(?:\.\d+)?)\s+(cuillère[s]?\s+à\s+\w+)\s+(?:de\s+|d')(.+)$/);
        if (matchCuillere) {
          return {
            name: matchCuillere[3].trim(),
            quantity: matchCuillere[1],
            unit: matchCuillere[2]
          };
        }
        
        // Format: "1 poignée d'épinards" ou "1 tasse de quinoa"
        const matchMeasure = ingredient.match(/^(\d+(?:\.\d+)?)\s+([^d]+?)\s+(?:de\s+|d')(.+)$/);
        if (matchMeasure) {
          return {
            name: matchMeasure[3].trim(),
            quantity: matchMeasure[1],
            unit: matchMeasure[2].trim()
          };
        }
        
        // Format simple: "1 banane" ou "3 œufs"
        const simpleMatch = ingredient.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
        if (simpleMatch) {
          return {
            name: simpleMatch[2].trim(),
            quantity: simpleMatch[1],
            unit: 'unité'
          };
        }
        
        // Pas de quantité: "Sel et poivre"
        return {
          name: ingredient.trim(),
          quantity: '1',
          unit: 'portion'
        };
      } else if (typeof ingredient === 'object') {
        // L'API renvoie des objets comme {"oeufs": 3, "protéines": 21, "calories": 234}
        // Le nom est la première clé qui n'est pas protéines/calories
        const keys = Object.keys(ingredient);
        const nameKey = keys.find(key => !['protéines', 'calories', 'proteins', 'glucides', 'lipides', 'carbs', 'fat'].includes(key));
        
        if (nameKey) {
          return {
            name: String(nameKey),
            quantity: String(ingredient[nameKey]),
            unit: 'g' // Par défaut, assumer grammes
          };
        }
        
        return {
          name: String(ingredient.nom || ingredient.name || 'Ingrédient'),
          quantity: String(ingredient.quantite || ingredient.quantité || ingredient.quantity || '1'),
          unit: String(ingredient.unite || ingredient.unité || ingredient.unit || 'unité')
        };
      }
      
      // Fallback: if we can't parse the ingredient, at least keep the raw text
      console.log('mapIngredients: fallback for ingredient:', ingredient);
      return {
        name: String(ingredient).trim() || 'Ingrédient',
        quantity: '1',
        unit: 'portion'
      };
    });
    
    console.log('Mapped ingredients:', mapped);
    console.log('mapIngredients: returning', mapped.length, 'mapped ingredients');
    
    // Safety check: if we had ingredients but mapped to empty, create fallback
    if (ingredients.length > 0 && mapped.length === 0) {
      console.log('mapIngredients: WARNING - had ingredients but mapped to empty, creating fallback');
      return [{
        name: 'Ingrédients disponibles (voir instructions)',
        quantity: '1',
        unit: 'portion'
      }];
    }
    
    return mapped;
  }

  /**
   * Mapper la difficulté française vers le format attendu
   */
  private mapDifficulty(difficulty: any): 'easy' | 'medium' | 'hard' {
    if (typeof difficulty === 'string') {
      const lower = difficulty.toLowerCase();
      if (lower.includes('facile') || lower.includes('easy')) return 'easy';
      if (lower.includes('moyen') || lower.includes('medium')) return 'medium';
      if (lower.includes('difficile') || lower.includes('hard')) return 'hard';
    }
    return 'easy'; // Par défaut
  }

  private buildCoachContext(
    profile: UserNutritionProfile,
    request: RecommendationRequest,
    recentMeals: MealEntry[]
  ): Record<string, any> {
    // Analyser les repas récents
    const recentNutrition = this.analyzeRecentNutrition(recentMeals);
    
    return {
      userProfile: this.formatUserProfile(profile),
      request: request,
      recentMeals: this.formatRecentMeals(recentMeals),
      recentNutrition,
      proteinGoal: profile.proteinGoal,
      calorieGoal: profile.calorieGoal,
      budget: profile.budget || 'medium',
      cookingTime: profile.cookingTime || 'moderate',
      equipment: profile.equipment?.join(', ') || 'équipement de base',
      restrictions: [
        ...(profile.allergies || []),
        ...(profile.dietaryRestrictions || [])
      ].join(', ') || 'aucune',
    };
  }

  private selectPrompt(type: RecommendationRequest['type']): string {
    switch (type) {
      case 'weekly_plan':
        return this.COACH_PROMPTS.weeklyPlan;
      case 'meal':
      case 'snack':
      case 'recipe':
        return this.COACH_PROMPTS.mealRecommendation;
      default:
        return this.COACH_PROMPTS.quickSuggestion;
    }
  }

  private interpolatePrompt(template: string, context: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(context)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
    return result;
  }

  private formatUserProfile(profile: UserNutritionProfile): string {
    const goalLabels = {
      weight_loss: 'Perte de poids',
      muscle_gain: 'Prise de masse musculaire',
      maintenance: 'Maintien du poids',
      general_health: 'Santé générale'
    };

    const activityLabels = {
      sedentary: 'Sédentaire',
      light: 'Activité légère',
      moderate: 'Activité modérée',
      very_active: 'Très actif',
      extremely_active: 'Extrêmement actif'
    };

    return `${profile.gender === 'male' ? 'Homme' : profile.gender === 'female' ? 'Femme' : 'Personne'} de ${profile.age} ans, ${profile.weight}kg, ${profile.height}cm. Objectif: ${goalLabels[profile.fitnessGoal]}. Activité: ${activityLabels[profile.activityLevel]}.`;
  }

  private formatRecentMeals(meals: MealEntry[]): string {
    if (meals.length === 0) return 'Aucun repas récent enregistré';
    
    return meals.slice(0, 10).map(meal => 
      `${meal.description} (${meal.protein}g protéines, ${meal.calories || 'N/A'} kcal)`
    ).join('; ');
  }

  private analyzeRecentNutrition(meals: MealEntry[]): {
    avgDailyProtein: number;
    avgDailyCalories: number;
    proteinSources: string[];
    patterns: string[];
  } {
    if (meals.length === 0) {
      return {
        avgDailyProtein: 0,
        avgDailyCalories: 0,
        proteinSources: [],
        patterns: ['Aucun historique disponible']
      };
    }

    const recentMeals = meals.slice(0, 21); // 3 semaines max
    const totalProtein = recentMeals.reduce((sum, meal) => sum + meal.protein, 0);
    const totalCalories = recentMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    
    // Grouper par jour pour calculer les moyennes
    const dayGroups = new Map<string, MealEntry[]>();
    recentMeals.forEach(meal => {
      const day = new Date(meal.timestamp).toDateString();
      if (!dayGroups.has(day)) dayGroups.set(day, []);
      dayGroups.get(day)!.push(meal);
    });

    const avgDailyProtein = Math.round(totalProtein / Math.max(dayGroups.size, 1));
    const avgDailyCalories = Math.round(totalCalories / Math.max(dayGroups.size, 1));

    // Identifier les sources de protéines fréquentes
    const proteinSources = this.extractProteinSources(recentMeals);
    
    // Identifier des patterns alimentaires
    const patterns = this.identifyEatingPatterns(recentMeals);

    return {
      avgDailyProtein,
      avgDailyCalories,
      proteinSources,
      patterns
    };
  }

  private extractProteinSources(meals: MealEntry[]): string[] {
    const sources = new Set<string>();
    const proteinKeywords = [
      'poulet', 'bœuf', 'porc', 'poisson', 'saumon', 'thon', 'crevettes',
      'œuf', 'fromage', 'yaourt', 'lait', 'tofu', 'quinoa', 'lentilles',
      'haricots', 'pois chiches', 'amandes', 'noix', 'graines'
    ];

    meals.forEach(meal => {
      const description = meal.description.toLowerCase();
      proteinKeywords.forEach(keyword => {
        if (description.includes(keyword)) {
          sources.add(keyword);
        }
      });
    });

    return Array.from(sources).slice(0, 8); // Top 8 sources
  }

  private identifyEatingPatterns(meals: MealEntry[]): string[] {
    const patterns: string[] = [];
    
    // Analyser la fréquence des repas
    const dayGroups = new Map<string, MealEntry[]>();
    meals.forEach(meal => {
      const day = new Date(meal.timestamp).toDateString();
      if (!dayGroups.has(day)) dayGroups.set(day, []);
      dayGroups.get(day)!.push(meal);
    });

    const avgMealsPerDay = Array.from(dayGroups.values())
      .reduce((sum, dayMeals) => sum + dayMeals.length, 0) / dayGroups.size;

    if (avgMealsPerDay < 3) {
      patterns.push('Tendance à sauter des repas');
    } else if (avgMealsPerDay > 5) {
      patterns.push('Alimentation fractionnée fréquente');
    }

    // Analyser la régularité
    const proteinByDay = Array.from(dayGroups.values())
      .map(dayMeals => dayMeals.reduce((sum, meal) => sum + meal.protein, 0));
    
    const proteinVariability = this.calculateVariability(proteinByDay);
    if (proteinVariability > 0.3) {
      patterns.push('Apport en protéines très variable');
    }

    return patterns;
  }

  private calculateVariability(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return mean > 0 ? stdDev / mean : 0;
  }

  private buildBalanceAnalysisPrompt(
    profile: UserNutritionProfile,
    meals: MealEntry[],
    period: string
  ): string {
    const nutrition = this.analyzeRecentNutrition(meals);
    
    return `Analyse l'équilibre nutritionnel de cette personne sur la période: ${period}

    PROFIL: ${this.formatUserProfile(profile)}
    OBJECTIFS: ${profile.proteinGoal}g protéines/jour, ${profile.calorieGoal} kcal/jour

    DONNÉES RÉCENTES:
    - Protéines moyennes: ${nutrition.avgDailyProtein}g/jour
    - Calories moyennes: ${nutrition.avgDailyCalories} kcal/jour
    - Sources de protéines: ${nutrition.proteinSources.join(', ')}
    - Patterns identifiés: ${nutrition.patterns.join(', ')}

    ANALYSE DEMANDÉE:
    1. Évaluation de l'équilibre (score 0-100)
    2. Points forts et axes d'amélioration
    3. Recommandations spécifiques et actionnables
    4. Suggestions de modifications progressives

    Répondre en JSON avec: analysis, recommendations[], balanceScore, improvements[]`;
  }

  private validateAndEnrichRecommendations(
    response: CoachRecommendationResponse
  ): CoachRecommendationResponse {
    // Vérifier que la réponse a la structure attendue
    if (!response || !response.recommendations || !Array.isArray(response.recommendations)) {
      console.error('Invalid response structure:', response);
      throw new Error('Structure de réponse invalide: recommendations manquantes');
    }

    // Valider et nettoyer les recommandations
    const validRecommendations = response.recommendations.filter(rec => {
      const isValid = rec &&
        rec.title && 
        rec.nutrition &&
        rec.nutrition.protein >= 0 && 
        rec.nutrition.calories >= 0 &&
        rec.ingredients &&
        Array.isArray(rec.ingredients) &&
        rec.ingredients.length > 0 &&
        rec.instructions &&
        Array.isArray(rec.instructions) &&
        rec.instructions.length > 0;
      
      if (!isValid) {
        console.log('Rejected recommendation:', {
          title: rec?.title,
          hasNutrition: !!rec?.nutrition,
          protein: rec?.nutrition?.protein,
          calories: rec?.nutrition?.calories,
          hasIngredients: !!rec?.ingredients,
          ingredientsIsArray: Array.isArray(rec?.ingredients),
          ingredientsLength: rec?.ingredients?.length,
          hasInstructions: !!rec?.instructions,
          instructionsIsArray: Array.isArray(rec?.instructions),
          instructionsLength: rec?.instructions?.length
        });
      }
      
      return isValid;
    });

    // Enrichir avec des données calculées
    validRecommendations.forEach(rec => {
      // Calculer la densité protéique
      if (!rec.confidence) {
        rec.confidence = rec.nutrition.protein / rec.nutrition.calories > 0.1 ? 0.8 : 0.6;
      }
      
      // Ajouter des tags automatiques
      if (!rec.tags) rec.tags = [];
      if (rec.prepTime + rec.cookTime < 30) rec.tags.push('rapide');
      if (rec.nutrition.protein > 25) rec.tags.push('riche-en-protéines');
      if (rec.nutrition.calories < 400) rec.tags.push('léger');
    });

    return {
      ...response,
      recommendations: validRecommendations
    };
  }
}

// Export de l'instance singleton
export const nutritionCoach = NutritionCoachService.getInstance();