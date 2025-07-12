// Service de coaching nutritionnel intelligent avec ChatGPT - VERSION CORRIGÉE
import { z } from 'zod';
import { apiClient, ApiResponse } from './api.service';
import { MealEntry } from '@/context/AppContext';

// =====================================================
// TYPES ET SCHÉMAS DE VALIDATION ROBUSTES
// =====================================================

// Schéma pour la nutrition avec valeurs par défaut
const NutritionSchema = z.object({
  calories: z.number().default(0),
  proteines: z.number().default(0),
  glucides: z.number().default(0),
  lipides: z.number().default(0),
  fibres: z.number().optional().default(0)
});

// Schéma pour les ingrédients avec parsing flexible
const IngredientSchema = z.object({
  nom: z.string().default('Ingrédient'),
  quantite: z.string().default('1'),
  unite: z.string().default('portion')
});

// Schéma pour une recommandation de repas complète
const MealRecommendationSchema = z.object({
  id: z.string().optional(),
  titre: z.string().min(1),
  description: z.string().default(''),
  categorie: z.enum(['petit-dejeuner', 'dejeuner', 'diner', 'collation']),
  nutrition: NutritionSchema,
  ingredients: z.array(IngredientSchema).default([]),
  instructions: z.array(z.string()).default(['Instructions détaillées disponibles']),
  tempsPreparation: z.number().default(15),
  tempsCuisson: z.number().default(15),
  portions: z.number().default(1),
  difficulte: z.enum(['facile', 'moyen', 'difficile']).default('facile'),
  tags: z.array(z.string()).default(['équilibré', 'protéiné']),
  conseils: z.array(z.string()).optional(),
  variantes: z.array(z.string()).optional(),
  cout: z.enum(['faible', 'moyen', 'eleve']).optional(),
  saison: z.array(z.string()).optional(),
  equipement: z.array(z.string()).optional(),
  confiance: z.number().default(0.85),
  source: z.enum(['ai_generated', 'recette_adaptee', 'fallback']).default('ai_generated')
});

// Schéma pour la progression hebdomadaire
const WeeklyGoalProgressSchema = z.object({
  proteinProgress: z.number().default(0),
  calorieProgress: z.number().default(0),
  balanceScore: z.number().default(0)
});

// Schéma pour la réponse complète du coach
const CoachRecommendationResponseSchema = z.object({
  recommendations: z.array(MealRecommendationSchema),
  explanation: z.string().default('Recommandations personnalisées générées'),
  tips: z.array(z.string()).default([]),
  nutritionalInsights: z.array(z.string()).default([]),
  weeklyGoalProgress: WeeklyGoalProgressSchema.optional()
});

// Schéma flexible pour parser différentes structures de réponse API
const ApiResponseFlexibleSchema = z.union([
  // Structure directe
  CoachRecommendationResponseSchema,
  // Structure avec data wrapper
  z.object({
    success: z.boolean().optional(),
    data: CoachRecommendationResponseSchema
  }),
  // Structure avec recommendations/recommandations au top level
  z.object({
    recommendations: z.array(z.any()).optional(),
    recommandations: z.array(z.any()).optional(),
    explanation: z.string().optional(),
    tips: z.array(z.string()).optional(),
    nutritionalInsights: z.array(z.string()).optional(),
    weeklyGoalProgress: WeeklyGoalProgressSchema.optional()
  })
]).transform((data): CoachRecommendationResponse => {
  // Normaliser les différentes structures en une seule
  if ('data' in data && data.data) {
    return data.data;
  }
  
  if ('recommendations' in data || 'recommandations' in data) {
    // Prioritize the array that has content, or use the French one if both are empty
    let recommendations = [];
    
    if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
      recommendations = data.recommendations;
    } else if (Array.isArray((data as any).recommandations) && (data as any).recommandations.length > 0) {
      recommendations = (data as any).recommandations;
    } else {
      // Both are empty or don't exist, try both anyway
      recommendations = data.recommendations || (data as any).recommandations || [];
    }
    
    console.log('📋 Sélection de l\'array:', {
      recommendationsLength: Array.isArray(data.recommendations) ? data.recommendations.length : 'not array',
      recommandationsLength: Array.isArray((data as any).recommandations) ? (data as any).recommandations.length : 'not array',
      selectedLength: recommendations.length,
      selectedSample: recommendations.slice(0, 1)
    });
    
    return {
      recommendations: recommendations.map((rec: any, index: number) => 
        parseRecommendation(rec, index)
      ),
      explanation: data.explanation || 'Recommandations personnalisées générées',
      tips: data.tips || [],
      nutritionalInsights: data.nutritionalInsights || [],
      weeklyGoalProgress: data.weeklyGoalProgress
    };
  }
  
  return data as CoachRecommendationResponse;
});

// Helper pour parser une recommandation individuelle
function parseRecommendation(rec: any, index: number): MealRecommendation {
  try {
    // Tentative de parsing direct avec le schéma
    const parsed = MealRecommendationSchema.parse({
      ...rec,
      id: rec.id || `rec_${index}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    });
    return parsed;
  } catch (error) {
    // Si le parsing échoue, créer une recommandation avec extraction manuelle
    return createRecommendationFromRawData(rec, index);
  }
}

// Extraction manuelle robuste si le parsing Zod échoue
function createRecommendationFromRawData(item: any, index: number): MealRecommendation {
  const extractField = (obj: any, ...fields: string[]): any => {
    for (const field of fields) {
      if (obj[field] !== undefined && obj[field] !== null) {
        return obj[field];
      }
    }
    return undefined;
  };

  const titre = extractField(item, 'titre', 'title', 'nom', 'nom_du_repas', 'name') || `Repas ${index + 1}`;
  const description = extractField(item, 'description', 'desc') || 'Repas équilibré riche en protéines';
  
  // Extraction de la catégorie avec logique intelligente
  const categorieRaw = extractField(item, 'categorie', 'category', 'type_repas', 'meal_type') || '';
  const categorie = normalizeCategory(categorieRaw, titre, description, index);
  
  // Extraction de la nutrition
  const nutritionData = extractField(item, 'nutrition', 'valeur_nutritionnelle', 'nutritional_info') || item;
  const nutrition = {
    calories: extractNumber(nutritionData, 'calories', 'kcal', 'energie') || 300,
    proteines: extractNumber(nutritionData, 'proteines', 'proteins', 'protein') || 20,
    glucides: extractNumber(nutritionData, 'glucides', 'carbs', 'carbohydrates') || 30,
    lipides: extractNumber(nutritionData, 'lipides', 'fats', 'fat') || 10,
    fibres: extractNumber(nutritionData, 'fibres', 'fiber') || 5
  };
  
  // Extraction des ingrédients
  const ingredientsRaw = extractField(item, 'ingredients', 'ingrédients', 'recipe.ingredients') || [];
  const ingredients = parseIngredients(ingredientsRaw);
  
  // Extraction des instructions
  const instructionsRaw = extractField(item, 'instructions', 'preparation', 'préparation') || [];
  const instructions = Array.isArray(instructionsRaw) 
    ? instructionsRaw.map(String).filter(Boolean)
    : (typeof instructionsRaw === 'string' ? [instructionsRaw] : ['Instructions détaillées disponibles']);
  
  return {
    id: item.id || `rec_${index}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    titre,
    description,
    categorie,
    nutrition,
    ingredients,
    instructions,
    tempsPreparation: extractNumber(item, 'temps_preparation', 'temps_préparation', 'prepTime') || 15,
    tempsCuisson: extractNumber(item, 'temps_cuisson', 'cookTime') || 15,
    portions: extractNumber(item, 'portions', 'servings', 'nb_portions') || 1,
    difficulte: normalizeDifficulty(extractField(item, 'difficulte', 'difficulty', 'niveau')),
    tags: extractTags(item),
    conseils: extractField(item, 'conseils', 'tips', 'astuces'),
    variantes: extractField(item, 'variantes', 'variations', 'alternatives'),
    cout: normalizeCost(extractField(item, 'cout', 'cost', 'prix')),
    saison: extractField(item, 'saison', 'season'),
    equipement: extractField(item, 'equipement', 'equipment'),
    confiance: 0.85,
    source: 'ai_generated' as const
  };
}

// Helpers d'extraction
function extractNumber(obj: any, ...fields: string[]): number {
  for (const field of fields) {
    const value = obj[field];
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const match = value.match(/(\d+(?:\.\d+)?)/);
      if (match) return parseFloat(match[1]);
    }
  }
  return 0;
}

function normalizeCategory(
  raw: string, 
  titre: string, 
  description: string, 
  index: number
): 'petit-dejeuner' | 'dejeuner' | 'diner' | 'collation' {
  const text = `${raw} ${titre} ${description}`.toLowerCase();
  
  if (text.includes('petit-déjeuner') || text.includes('petit dejeuner') || text.includes('breakfast')) {
    return 'petit-dejeuner';
  }
  if (text.includes('déjeuner') || text.includes('dejeuner') || text.includes('lunch')) {
    return 'dejeuner';
  }
  if (text.includes('dîner') || text.includes('diner') || text.includes('dinner')) {
    return 'diner';
  }
  if (text.includes('collation') || text.includes('snack')) {
    return 'collation';
  }
  
  // Distribution cyclique par défaut
  const categories: Array<'petit-dejeuner' | 'dejeuner' | 'diner' | 'collation'> = 
    ['petit-dejeuner', 'dejeuner', 'diner', 'collation'];
  return categories[index % 4];
}

function normalizeDifficulty(raw: any): 'facile' | 'moyen' | 'difficile' {
  if (typeof raw === 'string') {
    const normalized = raw.toLowerCase();
    if (normalized.includes('facile') || normalized.includes('easy')) return 'facile';
    if (normalized.includes('moyen') || normalized.includes('medium')) return 'moyen';
    if (normalized.includes('difficile') || normalized.includes('hard')) return 'difficile';
  }
  return 'facile';
}

function normalizeCost(raw: any): 'faible' | 'moyen' | 'eleve' | undefined {
  if (typeof raw === 'string') {
    const normalized = raw.toLowerCase();
    if (normalized.includes('faible') || normalized.includes('low')) return 'faible';
    if (normalized.includes('moyen') || normalized.includes('medium')) return 'moyen';
    if (normalized.includes('eleve') || normalized.includes('élevé') || normalized.includes('high')) return 'eleve';
  }
  return undefined;
}

function extractTags(item: any): string[] {
  const tags = item.tags || item.étiquettes || [];
  if (Array.isArray(tags)) return tags.map(String);
  return ['équilibré', 'protéiné'];
}

function parseIngredients(raw: any): Array<{ nom: string; quantite: string; unite: string }> {
  if (!Array.isArray(raw)) return [{ nom: 'Ingrédients détaillés disponibles', quantite: '1', unite: 'portion' }];
  
  return raw.map((ing: any) => {
    if (typeof ing === 'string') {
      // Parser les formats string comme "200g de poulet"
      const match = ing.match(/^(\d+(?:\.\d+)?)\s*([a-zA-ZÀ-ÿ]+)?\s*(?:de\s+|d')?(.+)$/);
      if (match) {
        return {
          quantite: match[1],
          unite: match[2] || 'unité',
          nom: match[3].trim()
        };
      }
      return { nom: ing.trim(), quantite: '1', unite: 'portion' };
    }
    
    if (typeof ing === 'object' && ing !== null) {
      return {
        nom: ing.nom || ing.name || ing.item || 'Ingrédient',
        quantite: String(ing.quantite || ing.quantity || ing.amount || '1'),
        unite: ing.unite || ing.unit || ing.unité || 'unité'
      };
    }
    
    return { nom: String(ing), quantite: '1', unite: 'portion' };
  });
}

// Types exportés
export interface UserNutritionProfile {
  age: number;
  gender: 'male' | 'female' | 'other';
  weight: number;
  height: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extremely_active';
  fitnessGoal: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'general_health';
  proteinGoal: number;
  calorieGoal: number;
  allergies?: string[];
  dietaryRestrictions?: string[];
  cuisinePreferences?: string[];
  cookingTime?: 'quick' | 'moderate' | 'extensive';
  budget?: 'low' | 'medium' | 'high';
  equipment?: string[];
}

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
    ingredients?: string[];
    cookingTime?: number;
    servings?: number;
    excludeIngredients?: string[];
  };
  context?: string;
}

export type MealRecommendation = z.infer<typeof MealRecommendationSchema>;
export type CoachRecommendationResponse = z.infer<typeof CoachRecommendationResponseSchema>;

// =====================================================
// SERVICE PRINCIPAL CORRIGÉ
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
   * Obtenir des recommandations de repas personnalisées avec validation robuste
   */
  async getRecommendations(
    userProfile: UserNutritionProfile,
    request: RecommendationRequest,
    recentMeals: MealEntry[] = []
  ): Promise<CoachRecommendationResponse> {
    try {
      // Validation des entrées avec Zod
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

      const validatedProfile = UserProfileSchema.parse(userProfile);

      // Préparer le contexte pour l'IA
      const context = this.buildCoachContext(validatedProfile, request, recentMeals);
      
      // Sélectionner le prompt approprié
      const prompt = this.selectPrompt(request.type);
      const fullPrompt = this.interpolatePrompt(prompt, context);

      // Appel à l'API backend
      const response = await apiClient.post<any>('/ai/nutrition-coach', {
        userProfile: validatedProfile,
        request,
        recentMealsIds: recentMeals.map(meal => meal.id),
        systemPrompt: this.COACH_PROMPTS.systemPrompt,
        userPrompt: fullPrompt,
        maxTokens: 4000,
        temperature: 0.7,
      });

      // Validation de la réponse API
      if (!response || !response.success) {
        console.error('Échec de l\'API:', response);
        throw new Error(`API Error: ${response?.error || 'Réponse API invalide'}`);
      }

      if (!response.data) {
        console.error('Données manquantes dans la réponse API:', response);
        throw new Error('Aucune donnée reçue de l\'API');
      }

      console.log('Structure de response.data:', {
        hasRecommendations: 'recommendations' in response.data,
        hasRecommandations: 'recommandations' in response.data,
        hasResponse: 'response' in response.data,
        keys: Object.keys(response.data),
        recommendationsLength: Array.isArray(response.data.recommendations) ? response.data.recommendations.length : 'not array',
        recommandationsLength: Array.isArray(response.data.recommandations) ? response.data.recommandations.length : 'not array',
        fullDataSample: JSON.stringify(response.data).substring(0, 1000)
      });

      // Validation et parsing de la réponse avec Zod et fallback robuste
      let validatedResponse: CoachRecommendationResponse;
      
      try {
        validatedResponse = ApiResponseFlexibleSchema.parse(response.data);
        console.log('✅ Parsing Zod réussi:', {
          recommendationsCount: validatedResponse.recommendations?.length || 0,
          hasExplanation: !!validatedResponse.explanation
        });
      } catch (zodError) {
        console.warn('⚠️ Échec du parsing Zod, tentative de récupération manuelle...', zodError);
        
        // Fallback: Try to manually extract recommendations from raw response
        validatedResponse = this.extractRecommendationsFromRawResponse(response.data);
        console.log('🔧 Récupération manuelle effectuée:', {
          recommendationsCount: validatedResponse.recommendations?.length || 0,
          explanation: validatedResponse.explanation?.substring(0, 100)
        });
      }
      
      // Filtrer les recommandations invalides
      const validRecommendations = (validatedResponse.recommendations || []).filter(rec => 
        this.isValidRecommendation(rec)
      );

      console.log('📊 Validation des recommandations:', {
        total: validatedResponse.recommendations?.length || 0,
        valid: validRecommendations.length,
        invalid: (validatedResponse.recommendations?.length || 0) - validRecommendations.length
      });

      if (validRecommendations.length === 0) {
        console.warn('Aucune recommandation valide trouvée, tentative de récupération...');
        
        // Progressive fallback: try to salvage what we can from the response
        const allRecommendations = validatedResponse.recommendations || [];
        
        if (allRecommendations.length > 0) {
          console.log('Tentative de récupération des recommandations avec validation relaxée...');
          
          // Apply minimal validation instead of strict validation
          const minimallyValidRecs = allRecommendations.filter(rec => 
            rec && rec.titre && rec.titre.trim().length > 0
          );
          
          if (minimallyValidRecs.length > 0) {
            console.log(`✅ Récupération réussie: ${minimallyValidRecs.length} recommandations sauvées`);
            
            // Enrichir même les recommandations partiellement valides
            const enrichedRecommendations = this.enrichRecommendations(minimallyValidRecs);
            
            return {
              ...validatedResponse,
              recommendations: enrichedRecommendations,
              explanation: validatedResponse.explanation + ' (Recommandations récupérées avec validation relaxée)',
              tips: [...(validatedResponse.tips || []), 'Ces recommandations ont été récupérées avec des critères de validation plus souples.']
            };
          }
        }
        
        console.error('💥 Toutes les tentatives de récupération ont échoué');
        console.log('🚨 Tentative de création de recommandations par défaut...');
        
        // Last resort: create basic recommendations manually
        const emergencyRecommendations = this.createEmergencyRecommendations();
        
        console.log('🆘 Recommandations d\'urgence créées:', {
          count: emergencyRecommendations.length,
          titles: emergencyRecommendations.map(r => r.titre)
        });
        
        return {
          recommendations: emergencyRecommendations,
          explanation: 'Recommandations par défaut générées en raison d\'un problème de génération IA.',
          tips: ['Ces recommandations sont des suggestions génériques.', 'Veuillez réessayer pour des recommandations personnalisées.'],
          nutritionalInsights: ['Équilibre nutritionnel de base maintenu.']
        };
      }

      // Enrichir les recommandations
      const enrichedRecommendations = this.enrichRecommendations(validRecommendations);
      
      return {
        ...validatedResponse,
        recommendations: enrichedRecommendations
      };

    } catch (error) {
      console.error('Erreur NutritionCoachService:', error);
      
      if (error instanceof z.ZodError) {
        console.error('Erreur de validation Zod:', error.errors);
        throw new Error('Données invalides. Veuillez vérifier les informations fournies.');
      }
      
      if (error instanceof Error) {
        console.error('Type d\'erreur:', error.constructor.name);
        console.error('Message d\'erreur:', error.message);
        console.error('Stack trace:', error.stack);
        
        if (error.message.includes('Aucune recommandation valide')) {
          throw error;
        }
        
        // Log additional context for debugging
        console.error('Contexte de l\'erreur:', {
          userProfileValid: !!userProfile,
          requestType: request?.type,
          recentMealsCount: recentMeals?.length || 0
        });
        
        throw new Error(`Erreur lors de la génération des recommandations: ${error.message}`);
      }
      
      throw new Error('Erreur inattendue lors de la génération des recommandations');
    }
  }

  /**
   * Extraire manuellement les recommandations d'une réponse brute
   */
  private extractRecommendationsFromRawResponse(rawData: any): CoachRecommendationResponse {
    console.log('🔧 Extraction manuelle de la réponse brute:', rawData);
    console.log('🔍 Structure détaillée:', {
      keys: Object.keys(rawData),
      hasRecommendations: 'recommendations' in rawData,
      hasRecommandations: 'recommandations' in rawData,
      recommendationsType: typeof rawData.recommendations,
      recommandationsType: typeof rawData.recommandations,
      isRecommendationsArray: Array.isArray(rawData.recommendations),
      isRecommandationsArray: Array.isArray(rawData.recommandations)
    });
    
    // Try different possible structures
    let recommendations: any[] = [];
    
    // Case 1: Direct recommendations array
    if (Array.isArray(rawData.recommendations)) {
      recommendations = rawData.recommendations;
    }
    // Case 2: French recommendations (recommandations)
    else if (Array.isArray(rawData.recommandations)) {
      recommendations = rawData.recommandations;
    }
    // Case 3: Nested in data field
    else if (rawData.data && Array.isArray(rawData.data.recommendations)) {
      recommendations = rawData.data.recommendations;
    }
    // Case 4: Response is plain text or contains response field
    else if (typeof rawData.response === 'string') {
      // Try to extract JSON from text response
      try {
        const jsonMatch = rawData.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.recommendations)) {
            recommendations = parsed.recommendations;
          }
        }
      } catch (e) {
        console.warn('Impossible d\'extraire JSON du texte:', e);
      }
    }
    
    // Convert raw recommendations to proper format
    const processedRecommendations = recommendations.map((rec, index) => 
      this.ensureRecommendationStructure(rec, index)
    );
    
    return {
      recommendations: processedRecommendations,
      explanation: rawData.explanation || rawData.explication || 'Recommandations générées par IA',
      tips: rawData.tips || rawData.conseils || [],
      nutritionalInsights: rawData.nutritionalInsights || rawData.insights || [],
      weeklyGoalProgress: rawData.weeklyGoalProgress
    };
  }

  /**
   * S'assurer qu'une recommandation a la structure requise
   */
  private ensureRecommendationStructure(rec: any, index: number): MealRecommendation {
    // If it's already properly structured, return as is
    if (rec.titre && rec.categorie && rec.nutrition && rec.ingredients) {
      return rec;
    }
    
    // Otherwise, use the existing createRecommendationFromRawData function
    return createRecommendationFromRawData(rec, index);
  }

  /**
   * Créer des recommandations d'urgence en cas d'échec total
   */
  private createEmergencyRecommendations(): MealRecommendation[] {
    const emergencyMeals = [
      {
        titre: 'Omelette aux légumes',
        description: 'Petit-déjeuner riche en protéines',
        categorie: 'petit-dejeuner' as const,
        nutrition: { calories: 280, proteines: 20, glucides: 8, lipides: 18, fibres: 3 },
        ingredients: [
          { nom: 'Œufs', quantite: '2', unite: 'unités' },
          { nom: 'Épinards', quantite: '50', unite: 'g' },
          { nom: 'Tomates', quantite: '1', unite: 'unité' }
        ],
        instructions: ['Battre les œufs', 'Cuire les légumes', 'Ajouter les œufs et cuire']
      },
      {
        titre: 'Salade de poulet',
        description: 'Déjeuner équilibré et protéiné',
        categorie: 'dejeuner' as const,
        nutrition: { calories: 350, proteines: 30, glucides: 15, lipides: 18, fibres: 5 },
        ingredients: [
          { nom: 'Blanc de poulet', quantite: '120', unite: 'g' },
          { nom: 'Salade verte', quantite: '100', unite: 'g' },
          { nom: 'Avocat', quantite: '0.5', unite: 'unité' }
        ],
        instructions: ['Cuire le poulet', 'Préparer la salade', 'Mélanger et assaisonner']
      },
      {
        titre: 'Saumon grillé',
        description: 'Dîner riche en oméga-3',
        categorie: 'diner' as const,
        nutrition: { calories: 400, proteines: 35, glucides: 20, lipides: 20, fibres: 4 },
        ingredients: [
          { nom: 'Filet de saumon', quantite: '150', unite: 'g' },
          { nom: 'Brocoli', quantite: '150', unite: 'g' },
          { nom: 'Riz complet', quantite: '50', unite: 'g' }
        ],
        instructions: ['Griller le saumon', 'Cuire le brocoli à la vapeur', 'Préparer le riz']
      },
      {
        titre: 'Smoothie protéiné',
        description: 'Collation énergisante',
        categorie: 'collation' as const,
        nutrition: { calories: 180, proteines: 20, glucides: 15, lipides: 5, fibres: 3 },
        ingredients: [
          { nom: 'Protéine en poudre', quantite: '30', unite: 'g' },
          { nom: 'Banane', quantite: '1', unite: 'unité' },
          { nom: 'Lait d\'amande', quantite: '200', unite: 'ml' }
        ],
        instructions: ['Mixer tous les ingrédients', 'Servir frais']
      }
    ];

    return emergencyMeals.map((meal, index) => ({
      ...meal,
      id: `emergency_${meal.categorie}_${Date.now()}_${index}`,
      tempsPreparation: 10,
      tempsCuisson: 10,
      portions: 1,
      difficulte: 'facile' as const,
      tags: ['équilibré', 'protéiné', 'urgence'],
      confiance: 0.6,
      source: 'fallback' as const
    }));
  }

  /**
   * Validation plus permissive d'une recommandation
   */
  private isValidRecommendation(rec: MealRecommendation): boolean {
    // Vérifier le titre (plus permissif)
    if (!rec.titre || rec.titre.trim() === '') {
      return false;
    }
    
    // Ignorer les titres génériques seulement s'ils sont vraiment basiques
    if (rec.titre.trim().toLowerCase() === 'repas' || rec.titre.trim().toLowerCase() === 'meal') {
      return false;
    }
    
    // Vérifier les ingrédients fallback - plus permissif
    const hasFallbackIngredients = rec.ingredients.some(ing => 
      ing.nom === "Ingrédients détaillés disponibles" ||
      ing.nom === "Ingrédient" ||
      ing.nom === "Protéine au choix"
    );
    
    // Accepter même avec des ingrédients fallback si il y en a d'autres
    if (hasFallbackIngredients && rec.ingredients.length === 1) {
      return false;
    }
    
    // Vérifier la nutrition - seuils plus bas
    const { calories, proteines } = rec.nutrition;
    if (calories < 20 || proteines < 1) {
      return false;
    }
    
    // Vérifier les instructions - plus permissif
    if (rec.instructions.length === 0) {
      return false;
    }
    
    // Accepter même avec instructions génériques si elles existent
    if (rec.instructions.length === 1 && 
        (rec.instructions[0] === 'Instructions détaillées disponibles' ||
         rec.instructions[0] === '')) {
      return false;
    }
    
    return true;
  }

  /**
   * Enrichir les recommandations avec des métadonnées calculées
   */
  private enrichRecommendations(recommendations: MealRecommendation[]): MealRecommendation[] {
    return recommendations.map(rec => {
      // Calculer la densité protéique
      const proteinDensity = rec.nutrition.calories > 0 
        ? rec.nutrition.proteines / rec.nutrition.calories 
        : 0;
      
      // Enrichir les tags
      const enrichedTags = [...rec.tags];
      if (rec.tempsPreparation + rec.tempsCuisson < 30 && !enrichedTags.includes('rapide')) {
        enrichedTags.push('rapide');
      }
      if (rec.nutrition.proteines > 25 && !enrichedTags.includes('riche-en-protéines')) {
        enrichedTags.push('riche-en-protéines');
      }
      if (rec.nutrition.calories < 400 && !enrichedTags.includes('léger')) {
        enrichedTags.push('léger');
      }
      
      // Ajuster la confiance basée sur la qualité des données
      const confiance = proteinDensity > 0.1 ? 0.85 : 0.65;
      
      return {
        ...rec,
        tags: enrichedTags,
        confiance
      };
    });
  }

  /**
   * Construction du contexte pour l'IA
   */
  private buildCoachContext(
    profile: UserNutritionProfile,
    request: RecommendationRequest,
    recentMeals: MealEntry[]
  ): Record<string, any> {
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

    const recentMeals = meals.slice(0, 21);
    const totalProtein = recentMeals.reduce((sum, meal) => sum + meal.protein, 0);
    const totalCalories = recentMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    
    const dayGroups = new Map<string, MealEntry[]>();
    recentMeals.forEach(meal => {
      const day = new Date(meal.timestamp).toDateString();
      if (!dayGroups.has(day)) dayGroups.set(day, []);
      dayGroups.get(day)!.push(meal);
    });

    const avgDailyProtein = Math.round(totalProtein / Math.max(dayGroups.size, 1));
    const avgDailyCalories = Math.round(totalCalories / Math.max(dayGroups.size, 1));

    const proteinSources = this.extractProteinSources(recentMeals);
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

    return Array.from(sources).slice(0, 8);
  }

  private identifyEatingPatterns(meals: MealEntry[]): string[] {
    const patterns: string[] = [];
    
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

  /**
   * Suggestion rapide pour un repas immédiat
   */
  async getQuickSuggestion(
    userProfile: UserNutritionProfile,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    constraints?: {
      timeLimit?: number;
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
    return response.recommendations.slice(0, 2);
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
        temperature: 0.3,
      });

      // Validation avec Zod
      const BalanceAnalysisSchema = z.object({
        analysis: z.string(),
        recommendations: z.array(z.string()),
        balanceScore: z.number().min(0).max(100),
        improvements: z.array(z.string())
      });

      return BalanceAnalysisSchema.parse(response.data);

    } catch (error) {
      console.error('Erreur analyse équilibre:', error);
      
      if (error instanceof z.ZodError) {
        throw new Error('Format de réponse invalide pour l\'analyse nutritionnelle');
      }
      
      throw new Error('Impossible d\'analyser l\'équilibre nutritionnel');
    }
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
}

// Export de l'instance singleton
export const nutritionCoach = NutritionCoachService.getInstance();