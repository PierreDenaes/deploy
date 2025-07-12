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
  titre: string;
  description: string;
  categorie: 'petit-dejeuner' | 'dejeuner' | 'diner' | 'collation';
  nutrition: {
    calories: number;
    proteines: number;
    glucides: number;
    lipides: number;
    fibres?: number;
  };
  ingredients: Array<{
    nom: string;
    quantite: string;
    unite: string;
  }>;
  instructions: string[];
  tempsPreparation: number; // minutes
  tempsCuisson: number; // minutes
  portions: number;
  difficulte: 'facile' | 'moyen' | 'difficile';
  tags: string[]; // 'végétarien', 'sans-gluten', etc.
  conseils?: string[];
  variantes?: string[];
  cout?: 'faible' | 'moyen' | 'eleve';
  saison?: string[]; // ['printemps', 'été']
  equipement?: string[];
  confiance: number; // 0-1
  source: 'ai_generated' | 'recette_adaptee';
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

      // Transformer la réponse française en format français attendu
      const recommendationsData: CoachRecommendationResponse = this.extractDataUniversal(rawData);

      // Validation et enrichissement de la réponse
      const recommendations = this.validateAndEnrichRecommendations(recommendationsData);
      
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
   * Extraction numérique universelle
   */

  /**
   * Transformer la réponse française de l'IA en format français attendu
   */
  /**
   * Extraction universelle des données depuis n'importe quelle structure API
   */
  private extractDataUniversal(rawData: any): CoachRecommendationResponse {
    // Extract recommendations list from various possible structures
    const recList = this.extractRecommendationsList(rawData);
    
    const recommendations: MealRecommendation[] = [];
    
    if (recList && Array.isArray(recList)) {
      recList.forEach((item: any, index: number) => {
        const recommendation = this.transformToMealRecommendation(item, index);
        
        // Validate recommendation before adding
        if (this.isValidRecommendation(recommendation)) {
          recommendations.push(recommendation);
        } else {
          console.warn(`Invalid recommendation skipped at index ${index}:`, recommendation.titre);
        }
      });
    }

    // Ensure we have at least one recommendation of each category
    this.ensureAllCategoriesRepresented(recommendations);

    // Extract tips and metadata
    const tips = this.extractTips(rawData, recList);
    const explanation = this.extractExplanation(rawData);
    const nutritionalInsights = this.generateNutritionalInsights(recommendations);
    const weeklyGoalProgress = this.calculateWeeklyProgress(recommendations);

    return {
      recommendations,
      explanation,
      tips,
      nutritionalInsights,
      weeklyGoalProgress
    };
  }

  private extractRecommendationsList(data: any): any[] {
    // Try all possible field names for recommendations
    const possibleFields = [
      'recommendations', 'recommandations', 'repas_recommandés', 'repas',
      'meal_recommendations', 'recommandations_de_repas', 'recommandations_repas'
    ];
    
    for (const field of possibleFields) {
      if (data[field] && Array.isArray(data[field])) {
        return data[field];
      }
    }
    
    // Handle nested structures
    if (data.data?.recommendations) return data.data.recommendations;
    if (data.response?.recommendations) return data.response.recommendations;
    
    return [];
  }

  private transformToMealRecommendation(item: any, index: number): MealRecommendation {
    return {
      id: `rec_${index + 1}_${Date.now()}`,
      titre: this.extractTitre(item, index),
      description: this.extractDescription(item, index),
      categorie: this.extractCategorie(item, index),
      nutrition: this.extractNutrition(item),
      ingredients: this.extractIngredients(item),
      instructions: this.extractInstructions(item),
      tempsPreparation: this.extractTempsPrepration(item),
      tempsCuisson: this.extractTempsCuisson(item),
      portions: this.extractPortions(item),
      difficulte: this.extractDifficulte(item),
      tags: this.extractTags(item),
      conseils: this.extractConseils(item),
      variantes: this.extractVariantes(item),
      cout: this.extractCout(item),
      saison: this.extractSaison(item),
      equipement: this.extractEquipement(item),
      confiance: 0.85,
      source: 'ai_generated' as const
    };
  }

  private isValidRecommendation(rec: MealRecommendation): boolean {
    // Check for valid title (be more permissive)
    if (!rec.titre || rec.titre.trim() === '') return false;
    
    // Allow "Repas X" titles if they have good content otherwise
    const hasGenericTitle = rec.titre.match(/^Repas \d+$/);
    
    // Check for fallback ingredients indicating invalid data
    const hasFallbackIngredients = rec.ingredients.some(ing => 
      ing.nom === "Protéine au choix" || 
      ing.nom === "Légumes" || 
      ing.nom === "Féculents" ||
      ing.nom === "Ingrédients à préciser" ||
      ing.nom === "Ingrédients détaillés disponibles"
    );
    
    // If we have generic title AND fallback ingredients, reject
    if (hasGenericTitle && hasFallbackIngredients) return false;
    
    // If we have fallback ingredients but a specific title, check if nutrition is reasonable
    if (hasFallbackIngredients) {
      const nutrition = rec.nutrition;
      // Reject if both title is generic AND nutrition is poor
      return nutrition.calories > 100 && nutrition.proteines > 5;
    }
    
    // Check for reasonable nutrition values (be more permissive)
    const nutrition = rec.nutrition;
    if (nutrition.calories <= 50 && nutrition.proteines <= 2) return false;
    
    // Accept if we have specific ingredients or reasonable nutrition
    return !hasFallbackIngredients || (nutrition.calories > 100 && nutrition.proteines > 5);
  }

  private extractTitre(item: any, index: number): string {
    const possibleFields = [
      'nom_du_repas', 'nom', 'nom_repas', 'titre', 'title', 
      'meal_name', 'name', 'plat', 'nom_plat'
    ];
    
    for (const field of possibleFields) {
      const value = item[field];
      if (value && typeof value === 'string' && value.trim() !== '') {
        return value.trim();
      }
    }
    
    return `Repas ${index + 1}`;
  }

  private extractDescription(item: any, index: number): string {
    return item.description || 
           item.desc || 
           `Repas équilibré ${index + 1} riche en protéines`;
  }

  private extractCategorie(item: any, index: number): 'petit-dejeuner' | 'dejeuner' | 'diner' | 'collation' {
    const category = item.categorie || item.category || item.type_repas || item.meal_type;
    
    if (category) {
      const normalized = category.toLowerCase();
      
      // Direct French mappings
      if (normalized === 'petit-dejeuner' || normalized === 'petit dejeuner') return 'petit-dejeuner';
      if (normalized === 'dejeuner' || normalized === 'déjeuner') return 'dejeuner';
      if (normalized === 'diner' || normalized === 'dîner') return 'diner';
      if (normalized === 'collation') return 'collation';
      
      // English mappings
      if (normalized.includes('breakfast')) return 'petit-dejeuner';
      if (normalized.includes('lunch')) return 'dejeuner';
      if (normalized.includes('dinner')) return 'diner';
      if (normalized.includes('snack')) return 'collation';
    }

    // Smart assignment based on title and content analysis
    const title = this.extractTitre(item, index).toLowerCase();
    const description = (item.description || '').toLowerCase();
    const text = title + ' ' + description;
    
    // Explicit meal type keywords
    if (text.includes('petit-déjeuner') || text.includes('breakfast')) return 'petit-dejeuner';
    if (text.includes('déjeuner') || text.includes('lunch')) return 'dejeuner';
    if (text.includes('dîner') || text.includes('dinner')) return 'diner';
    if (text.includes('snack') || text.includes('collation')) return 'collation';

    // Content-based intelligent categorization
    return this.smartCategoryAssignmentByContent(text, index);
  }

  private smartCategoryAssignmentByContent(text: string, index: number): 'petit-dejeuner' | 'dejeuner' | 'diner' | 'collation' {
    // Breakfast indicators
    const breakfastKeywords = [
      'omelette', 'œuf', 'œufs', 'pain', 'toast', 'céréales', 'yaourt', 'muesli', 
      'granola', 'confiture', 'miel', 'café', 'thé', 'tartine', 'croissant', 'pancake'
    ];
    
    // Dinner indicators (more substantial proteins and cooking methods)
    const dinnerKeywords = [
      'rôti', 'grillé', 'braisé', 'saumon', 'poisson', 'bœuf', 'agneau', 'canard',
      'curry', 'risotto', 'ragoût', 'mijot', 'four', 'papillote', 'confit'
    ];
    
    // Lunch indicators
    const lunchKeywords = [
      'salade', 'sandwich', 'wrap', 'bowl', 'quinoa', 'riz', 'pâtes', 'soupe',
      'poulet grillé', 'légumes sautés', 'stir-fry'
    ];
    
    // Snack indicators
    const snackKeywords = [
      'smoothie', 'fruits', 'noix', 'amandes', 'avocat toast', 'houmous', 
      'barre', 'encas', 'collation', 'fruits rouges'
    ];

    // Score each category
    let breakfastScore = 0;
    let lunchScore = 0;
    let dinnerScore = 0;
    let snackScore = 0;

    breakfastKeywords.forEach(keyword => {
      if (text.includes(keyword)) breakfastScore++;
    });

    lunchKeywords.forEach(keyword => {
      if (text.includes(keyword)) lunchScore++;
    });

    dinnerKeywords.forEach(keyword => {
      if (text.includes(keyword)) dinnerScore++;
    });

    snackKeywords.forEach(keyword => {
      if (text.includes(keyword)) snackScore++;
    });

    // Special rules for specific patterns
    if (text.includes('poulet') && text.includes('rôti')) dinnerScore += 2;
    if (text.includes('saumon') || text.includes('poisson')) dinnerScore += 2;
    if (text.includes('légumes') && text.includes('grillé')) {
      // Could be lunch or dinner, slight preference for dinner if roasted
      if (text.includes('rôti')) dinnerScore += 1;
      else lunchScore += 1;
    }

    // Find the highest score
    const maxScore = Math.max(breakfastScore, lunchScore, dinnerScore, snackScore);
    
    if (maxScore === 0) {
      // If no keywords match, distribute cyclically but with some intelligence
      // High-calorie or high-protein items are more likely to be main meals
      const categories: Array<'petit-dejeuner' | 'dejeuner' | 'diner' | 'collation'> = ['dejeuner', 'diner', 'dejeuner', 'collation'];
      return categories[index % 4];
    }

    if (dinnerScore === maxScore) return 'diner';
    if (lunchScore === maxScore) return 'dejeuner';
    if (breakfastScore === maxScore) return 'petit-dejeuner';
    if (snackScore === maxScore) return 'collation';

    // Fallback
    return 'dejeuner';
  }

  private extractNutrition(item: any): { calories: number; proteines: number; glucides: number; lipides: number; fibres?: number } {
    // Try to find nutrition data in various nested structures
    const nutritionSources = [
      item.valeur_nutritionnelle,
      item.nutrition,
      item.nutritional_info,
      item.apports_nutritionnels,
      item.informations_nutritionnelles,
      item // Direct on item
    ];

    const extractNumber = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const match = value.match(/(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
      }
      return 0;
    };

    let calories = 0, proteines = 0, glucides = 0, lipides = 0, fibres = 0;

    for (const source of nutritionSources) {
      if (!source) continue;

      // Try different field names for each nutrient
      if (!calories) {
        calories = extractNumber(source.calories) || 
                  extractNumber(source.kcal) || 
                  extractNumber(source.energie) || 
                  extractNumber(source.energy);
      }

      if (!proteines) {
        proteines = extractNumber(source.proteines) || 
                   extractNumber(source.proteins) || 
                   extractNumber(source.protein) || 
                   extractNumber(source.protéines);
      }

      if (!glucides) {
        glucides = extractNumber(source.glucides) || 
                  extractNumber(source.carbs) || 
                  extractNumber(source.carbohydrates) || 
                  extractNumber(source.glucide);
      }

      if (!lipides) {
        lipides = extractNumber(source.lipides) || 
                 extractNumber(source.fats) || 
                 extractNumber(source.fat) || 
                 extractNumber(source.lipide);
      }

      if (!fibres) {
        fibres = extractNumber(source.fibres) || 
                extractNumber(source.fiber) || 
                extractNumber(source.fibre);
      }
    }

    // Estimate missing values if some are present
    if (calories > 0 && proteines === 0) proteines = Math.round(calories * 0.15 / 4);
    if (calories > 0 && glucides === 0) glucides = Math.round(calories * 0.45 / 4);
    if (calories > 0 && lipides === 0) lipides = Math.round(calories * 0.30 / 9);

    return { calories, proteines, glucides, lipides, fibres };
  }

  private extractIngredients(item: any): Array<{ nom: string; quantite: string; unite: string }> {
    const ingredientsSources = [
      item.ingrédients,
      item.ingredients,
      item.recipe?.ingredients,
      item.recette?.ingrédients
    ];

    for (const source of ingredientsSources) {
      if (Array.isArray(source) && source.length > 0) {
        return source.map((ing: any) => this.parseIngredient(ing));
      }
    }

    return [{ nom: 'Ingrédients détaillés disponibles', quantite: '1', unite: 'portion' }];
  }

  private parseIngredient(ing: any): { nom: string; quantite: string; unite: string } {
    // If it's already a structured object
    if (typeof ing === 'object' && ing !== null) {
      return {
        nom: ing.nom || ing.name || ing.ingredient || 'Ingrédient',
        quantite: String(ing.quantite || ing.quantity || ing.amount || '1'),
        unite: ing.unite || ing.unit || ing.unité || this.guessUnit(ing.nom || ing.name || '')
      };
    }
    
    // If it's a string, try to parse it intelligently
    if (typeof ing === 'string') {
      return this.parseIngredientString(ing.trim());
    }
    
    return { nom: String(ing), quantite: '1', unite: 'portion' };
  }

  private parseIngredientString(ingredient: string): { nom: string; quantite: string; unite: string } {
    // Try different patterns for ingredient strings
    
    // Pattern 1: "200g de blanc de poulet"
    const pattern1 = ingredient.match(/^(\d+(?:\.\d+)?)\s*([a-zA-ZÀ-ÿ]+)\s+(?:de\s+|d')?(.+)$/);
    if (pattern1) {
      return {
        quantite: pattern1[1],
        unite: pattern1[2],
        nom: pattern1[3].trim()
      };
    }
    
    // Pattern 2: "1 cuillère à soupe d'huile d'olive"
    const pattern2 = ingredient.match(/^(\d+(?:\.\d+)?)\s+(cuillère[s]?.*?|tasse[s]?.*?|verre[s]?.*?)\s+(?:de\s+|d')?(.+)$/i);
    if (pattern2) {
      return {
        quantite: pattern2[1],
        unite: pattern2[2].trim(),
        nom: pattern2[3].trim()
      };
    }
    
    // Pattern 3: "200g blanc de poulet" (sans "de")
    const pattern3 = ingredient.match(/^(\d+(?:\.\d+)?)\s*([a-zA-ZÀ-ÿ]+)\s+(.+)$/);
    if (pattern3) {
      return {
        quantite: pattern3[1],
        unite: pattern3[2],
        nom: pattern3[3].trim()
      };
    }
    
    // Pattern 4: "Herbes de Provence" (no quantity)
    const pattern4 = ingredient.match(/^([A-ZÀ-ÿ].*)/);
    if (pattern4) {
      return {
        quantite: this.guessQuantity(ingredient),
        unite: this.guessUnit(ingredient),
        nom: ingredient
      };
    }
    
    // Fallback
    return {
      nom: ingredient,
      quantite: '1',
      unite: this.guessUnit(ingredient)
    };
  }

  private guessQuantity(ingredient: string): string {
    const name = ingredient.toLowerCase();
    
    // Spices and seasonings
    if (name.includes('sel') || name.includes('poivre') || name.includes('herbes') || 
        name.includes('épices') || name.includes('poudre')) {
      return '1';
    }
    
    // Oils
    if (name.includes('huile')) {
      return '1';
    }
    
    return '1';
  }

  private guessUnit(ingredient: string): string {
    const name = ingredient.toLowerCase();
    
    // Spices and seasonings
    if (name.includes('sel') || name.includes('poivre') || name.includes('herbes') || 
        name.includes('épices') || name.includes('poudre')) {
      return 'pincée';
    }
    
    // Oils
    if (name.includes('huile')) {
      return 'cuillère à soupe';
    }
    
    // Liquids
    if (name.includes('eau') || name.includes('lait') || name.includes('jus')) {
      return 'ml';
    }
    
    // Default
    return 'portion';
  }

  private extractInstructions(item: any): string[] {
    const instructionSources = [
      item.instructions,
      item.preparation,
      item.préparation,
      item.recipe?.instructions,
      item.recette?.instructions
    ];

    for (const source of instructionSources) {
      if (Array.isArray(source)) {
        return source.map(String);
      } else if (typeof source === 'string') {
        return [source];
      }
    }

    return ['Instructions détaillées disponibles'];
  }

  private extractTempsPrepration(item: any): number {
    return item.temps_préparation || item.prepTime || item.temps_preparation || 15;
  }

  private extractTempsCuisson(item: any): number {
    return item.temps_cuisson || item.cookTime || item.temps_cuisson || 15;
  }

  private extractPortions(item: any): number {
    return item.portions || item.servings || item.nb_portions || 1;
  }

  private extractDifficulte(item: any): 'facile' | 'moyen' | 'difficile' {
    const difficulty = item.difficulté || item.difficulty || item.niveau;
    if (typeof difficulty === 'string') {
      const normalized = difficulty.toLowerCase();
      if (normalized.includes('facile') || normalized.includes('easy')) return 'facile';
      if (normalized.includes('moyen') || normalized.includes('medium')) return 'moyen';
      if (normalized.includes('difficile') || normalized.includes('hard')) return 'difficile';
    }
    return 'facile';
  }

  private extractTags(item: any): string[] {
    const tags = item.tags || item.étiquettes || [];
    if (Array.isArray(tags)) return tags.map(String);
    return ['équilibré', 'protéiné'];
  }

  private extractConseils(item: any): string[] | undefined {
    const conseils = item.conseils || item.tips || item.astuces;
    if (Array.isArray(conseils)) return conseils.map(String);
    if (typeof conseils === 'string') return [conseils];
    return undefined;
  }

  private extractVariantes(item: any): string[] | undefined {
    const variantes = item.variantes || item.variations || item.alternatives;
    if (Array.isArray(variantes)) return variantes.map(String);
    if (typeof variantes === 'string') return [variantes];
    return undefined;
  }

  private extractCout(item: any): 'faible' | 'moyen' | 'eleve' | undefined {
    const cost = item.cout || item.cost || item.prix;
    if (typeof cost === 'string') {
      const normalized = cost.toLowerCase();
      if (normalized.includes('faible') || normalized.includes('low')) return 'faible';
      if (normalized.includes('moyen') || normalized.includes('medium')) return 'moyen';
      if (normalized.includes('eleve') || normalized.includes('élevé') || normalized.includes('high')) return 'eleve';
    }
    return undefined;
  }

  private extractSaison(item: any): string[] | undefined {
    const saison = item.saison || item.season || item.saisons;
    if (Array.isArray(saison)) return saison.map(String);
    if (typeof saison === 'string') return [saison];
    return undefined;
  }

  private extractEquipement(item: any): string[] | undefined {
    const equipement = item.equipement || item.equipment || item.équipement;
    if (Array.isArray(equipement)) return equipement.map(String);
    if (typeof equipement === 'string') return [equipement];
    return undefined;
  }

  private extractTips(rawData: any, recList: any[]): string[] {
    const globalTips = rawData.conseils_pratiques || rawData.astuces || rawData.astuces_de_chef || rawData.tips || [];
    const mealTips = recList?.map((item: any) => item.tips).filter(Boolean) || [];
    const tips = Array.isArray(globalTips) ? globalTips : (globalTips ? [globalTips] : mealTips);
    return Array.isArray(tips) ? tips.map(String) : [];
  }

  private extractExplanation(rawData: any): string {
    return rawData.notes || rawData.conseils || rawData.commentaires || rawData.explanation || 
           'Voici vos recommandations de repas personnalisées, conçues pour vous aider à atteindre vos objectifs nutritionnels.';
  }

  private generateNutritionalInsights(recommendations: MealRecommendation[]): string[] {
    const totalCalories = recommendations.reduce((sum, rec) => sum + rec.nutrition.calories, 0);
    const totalProteines = recommendations.reduce((sum, rec) => sum + rec.nutrition.proteines, 0);
    const totalGlucides = recommendations.reduce((sum, rec) => sum + rec.nutrition.glucides, 0);
    const totalLipides = recommendations.reduce((sum, rec) => sum + rec.nutrition.lipides, 0);

    return [
      `Total protéines : ${totalProteines}g`,
      `Total calories : ${totalCalories} kcal`,
      `Total glucides : ${totalGlucides}g`,
      `Total lipides : ${totalLipides}g`
    ];
  }

  private calculateWeeklyProgress(recommendations: MealRecommendation[]): any {
    const totalProteines = recommendations.reduce((sum, rec) => sum + rec.nutrition.proteines, 0);
    const totalCalories = recommendations.reduce((sum, rec) => sum + rec.nutrition.calories, 0);
    
    const proteinProgress = totalProteines > 0 ? Math.round(totalProteines / 195 * 100) : 0;
    const calorieProgress = totalCalories > 0 ? Math.round(totalCalories / 2140 * 100) : 0;
    
    return {
      proteinProgress,
      calorieProgress,
      balanceScore: 88
    };
  }

  private extractNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const match = value.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : 0;
    }
    return 0;
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
   * Assignation intelligente de catégorie basée sur l'analyse du contenu
   */
  private smartCategoryAssignment(title: string, description: string): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
    const text = (title + ' ' + description).toLowerCase();
    
    // Système de scoring pour chaque catégorie
    const scores = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snack: 0
    };
    
    // Mots-clés pour petit-déjeuner
    const breakfastKeywords = ['petit-déjeuner', 'smoothie', 'yaourt', 'œuf', 'omelette', 'céréales', 'pain', 'confiture', 'miel', 'café', 'thé'];
    const dinnerKeywords = ['dîner', 'poulet', 'saumon', 'bœuf', 'rôti', 'grillé', 'purée', 'risotto', 'pâtes', 'curry'];
    const lunchKeywords = ['déjeuner', 'salade', 'sandwich', 'soupe', 'quinoa', 'bowl', 'wrap'];
    const snackKeywords = ['collation', 'snack', 'smoothie', 'fruits', 'noix', 'barre', 'protéiné aux fruits'];
    
    // Calculer les scores
    breakfastKeywords.forEach(keyword => {
      if (text.includes(keyword)) scores.breakfast += 1;
    });
    lunchKeywords.forEach(keyword => {
      if (text.includes(keyword)) scores.lunch += 1;
    });
    dinnerKeywords.forEach(keyword => {
      if (text.includes(keyword)) scores.dinner += 1;
    });
    snackKeywords.forEach(keyword => {
      if (text.includes(keyword)) scores.snack += 1;
    });
    
    // Règles spéciales
    if (text.includes('smoothie') && text.includes('fruits')) {
      scores.snack += 2; // Bonus pour smoothie aux fruits
    }
    
    // Trouver la catégorie avec le score le plus élevé
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) {
      // Si aucun score, distribution cyclique
      const categories: ('breakfast' | 'lunch' | 'dinner' | 'snack')[] = ['breakfast', 'lunch', 'dinner', 'snack'];
      const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return categories[hash % categories.length];
    }
    
    // Retourner la catégorie avec le meilleur score
    const bestCategory = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] as 'breakfast' | 'lunch' | 'dinner' | 'snack';
    return bestCategory || 'lunch';
  }

  /**
   * Estimer les glucides à partir des calories et protéines
   */
  private estimateCarbs(nutritionValues: any): number {
    const calories = nutritionValues.calories || nutritionValues.énergie || 0;
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
      return [];
    }
    
    const mapped = ingredients.map((ingredient: any) => {
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
        // Nouveau format: {item: "nom", quantity: "quantité", unit: "unité"}
        if (ingredient.item) {
          return {
            name: String(ingredient.item),
            quantity: String(ingredient.quantity || '1'),
            unit: String(ingredient.unit || 'unité')
          };
        }
        
        // Format alternatif: {nom/name: "nom", quantite/quantity: "quantité", unite/unit: "unité"}
        if (ingredient.nom || ingredient.name) {
          return {
            name: String(ingredient.nom || ingredient.name),
            quantity: String(ingredient.quantite || ingredient.quantité || ingredient.quantity || '1'),
            unit: String(ingredient.unite || ingredient.unité || ingredient.unit || 'unité')
          };
        }
        
        // Ancien format: {"oeufs": 3, "protéines": 21, "calories": 234}
        // Le nom est la première clé qui n'est pas protéines/calories
        const keys = Object.keys(ingredient);
        const nameKey = keys.find(key => !['protéines', 'calories', 'proteins', 'glucides', 'lipides', 'carbs', 'fat', 'item', 'quantity', 'unit', 'nom', 'name', 'quantite', 'quantité', 'unite', 'unité'].includes(key));
        
        if (nameKey) {
          return {
            name: String(nameKey),
            quantity: String(ingredient[nameKey]),
            unit: 'g' // Par défaut, assumer grammes
          };
        }
        
        return {
          name: 'Ingrédient',
          quantity: '1',
          unit: 'unité'
        };
      }
      
      // Fallback: if we can't parse the ingredient, at least keep the raw text
      return {
        name: String(ingredient).trim() || 'Ingrédient',
        quantity: '1',
        unit: 'portion'
      };
    });
    
    // Safety check: if we had ingredients but mapped to empty, create fallback
    if (ingredients.length > 0 && mapped.length === 0) {
      return [{
        name: 'Ingrédients disponibles (voir instructions)',
        quantity: '1',
        unit: 'portion'
      }];
    }
    
    return mapped;
  }

  /**
   * Extraire les ingrédients des instructions lorsque le champ ingredients est vide
   */
  private extractIngredientsFromInstructions(instructions: string[]): Array<{ name: string; quantity: string; unit: string }> {
    const ingredients: Array<{ name: string; quantity: string; unit: string }> = [];
    
    // Regex pour capturer quantité + unité + ingrédient dans les instructions
    const patterns = [
      // "200g de poitrine de poulet", "150g de filet de saumon"
      /(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+(?:de\s+|d')([^,\.;]+)/gi,
      // "1 cuillère à soupe d'huile d'olive", "2 cuillères à soupe de sauce soja"
      /(\d+(?:\.\d+)?)\s+(cuillère[s]?\s+à\s+\w+)\s+(?:de\s+|d')([^,\.;]+)/gi,
      // "1 oignon", "3 œufs", "2 gousses d'ail"
      /(\d+(?:\.\d+)?)\s+(oignon[s]?|œuf[s]?|gousse[s]?\s+d'ail|gousse[s]?\s+d'ail)/gi,
      // Formats avec unités spécifiques: "400ml de lait de coco", "1 boîte de tomates"
      /(\d+(?:\.\d+)?)\s*(ml|cl|l|boîte[s]?|conserve[s]?)\s+(?:de\s+|d')([^,\.;]+)/gi
    ];

    instructions.forEach(instruction => {
      patterns.forEach(pattern => {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);
        while ((match = regex.exec(instruction)) !== null) {
          const quantity = match[1];
          const unit = match[2];
          const name = match[3].trim();
          
          // Éviter les doublons
          if (!ingredients.some(ing => ing.name.toLowerCase() === name.toLowerCase())) {
            ingredients.push({
              name: name,
              quantity: quantity,
              unit: unit
            });
          }
        }
      });
    });

    return ingredients;
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
        rec.titre && 
        rec.nutrition &&
        rec.nutrition.proteines >= 0 && 
        rec.nutrition.calories >= 0 &&
        rec.ingredients &&
        Array.isArray(rec.ingredients) &&
        rec.instructions &&
        Array.isArray(rec.instructions) &&
        rec.instructions.length > 0;
      
      
      return isValid;
    });

    // Enrichir avec des données calculées
    validRecommendations.forEach(rec => {
      // Calculer la densité protéique
      if (!rec.confiance) {
        rec.confiance = rec.nutrition.proteines / rec.nutrition.calories > 0.1 ? 0.8 : 0.6;
      }
      
      // Ajouter des tags automatiques
      if (!rec.tags) rec.tags = [];
      if (rec.tempsPreparation + rec.tempsCuisson < 30) rec.tags.push('rapide');
      if (rec.nutrition.proteines > 25) rec.tags.push('riche-en-protéines');
      if (rec.nutrition.calories < 400) rec.tags.push('léger');
    });

    return {
      ...response,
      recommendations: validRecommendations
    };
  }


  /**
   * S'assurer qu'il y a exactement 4 recommandations avec au moins une de chaque catégorie
   */
  private ensureAllCategoriesRepresented(recommendations: MealRecommendation[]): void {
    const categories: ('petit-dejeuner' | 'dejeuner' | 'diner' | 'collation')[] = 
      ['petit-dejeuner', 'dejeuner', 'diner', 'collation'];
    
    // Check which categories are missing
    const existingCategories = new Set(recommendations.map(r => r.categorie));
    const missingCategories = categories.filter(cat => !existingCategories.has(cat));
    
    if (missingCategories.length > 0 && recommendations.length >= 4) {
      // Find recommendations that have duplicate categories
      const categoryCount = new Map<string, number>();
      recommendations.forEach(rec => {
        categoryCount.set(rec.categorie, (categoryCount.get(rec.categorie) || 0) + 1);
      });
      
      // Reassign duplicate categories to missing ones
      let missingIndex = 0;
      for (let i = 0; i < recommendations.length && missingIndex < missingCategories.length; i++) {
        const currentCategory = recommendations[i].categorie;
        const count = categoryCount.get(currentCategory) || 0;
        
        // If this category has more than one recommendation, reassign it
        if (count > 1) {
          recommendations[i].categorie = missingCategories[missingIndex];
          categoryCount.set(currentCategory, count - 1);
          missingIndex++;
        }
      }
    }
  }

  private extractDataWithRegex(responseString: string): any {
    // Fallback method to extract data when JSON parsing fails
    
    // Try to extract basic meal recommendation structure
    const mealRecommendations: any[] = [];
    
    // Look for meal titles
    const titleMatches = responseString.match(/"title":\s*"([^"]+)"/g);
    const descriptionMatches = responseString.match(/"description":\s*"([^"]+)"/g);
    
    if (titleMatches && titleMatches.length > 0) {
      titleMatches.forEach((titleMatch, index) => {
        const title = titleMatch.match(/"title":\s*"([^"]+)"/)?.[1] || `Repas ${index + 1}`;
        const description = descriptionMatches?.[index]?.match(/"description":\s*"([^"]+)"/)?.[1] || 'Description non disponible';
        
        mealRecommendations.push({
          id: `rec_${index + 1}`,
          title: title,
          description: description,
          category: 'lunch', // Default category
          nutrition: {
            calories: 300,
            protein: 20,
            carbs: 30,
            fat: 10
          },
          ingredients: [
            { name: "Ingrédients à préciser", quantity: "1", unit: "portion" }
          ],
          instructions: ["Instructions de préparation à définir"],
          prepTime: 15,
          cookTime: 15,
          servings: 1,
          difficulty: 'easy' as const,
          tags: ['ai_generated'],
          confidence: 0.5,
          source: 'ai_generated' as const
        });
      });
    }
    
    // If no titles found, create a default meal
    if (mealRecommendations.length === 0) {
      mealRecommendations.push({
        id: 'rec_fallback',
        title: 'Repas équilibré',
        description: 'Un repas équilibré riche en protéines',
        category: 'lunch',
        nutrition: {
          calories: 350,
          protein: 25,
          carbs: 35,
          fat: 12
        },
        ingredients: [
          { name: "Protéine au choix", quantity: "100", unit: "g" },
          { name: "Légumes", quantity: "150", unit: "g" },
          { name: "Féculents", quantity: "80", unit: "g" }
        ],
        instructions: [
          "Préparer les ingrédients",
          "Cuire selon les préférences",
          "Servir chaud"
        ],
        prepTime: 15,
        cookTime: 20,
        servings: 1,
        difficulty: 'easy' as const,
        tags: ['équilibré', 'protéiné'],
        confidence: 0.7,
        source: 'ai_generated' as const
      });
    }
    
    return {
      meal_recommendations: mealRecommendations
    };
  }

  /**
   * Extraction des métadonnées globales
   */
  private extractMetadata(parsedData: any) {
    return {
      explanation: parsedData.notes || parsedData.conseils || parsedData.commentaires || 
                  parsedData.explanation || 'Recommandations personnalisées générées',
      tips: Array.isArray(parsedData.tips) ? parsedData.tips : 
            Array.isArray(parsedData.astuces) ? parsedData.astuces : [],
      nutritionalInsights: parsedData.insights || parsedData.nutritionalInsights || 
                          ['Recommandations adaptées à vos objectifs'],
      weeklyGoalProgress: {
        proteinProgress: 75,
        calorieProgress: 80,
        balanceScore: 85
      }
    };
  }
}

// Export de l'instance singleton
export const nutritionCoach = NutritionCoachService.getInstance();