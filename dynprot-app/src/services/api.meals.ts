// Service API pour la gestion des repas
import { z } from 'zod';
import { 
  apiClient, 
  ApiResponse, 
  PaginatedResponse, 
  validateWithSchema, 
  withRetry,
  fetchPaginated 
} from './api.service';

// =====================================================
// TYPES ET SCHÉMAS DE VALIDATION
// =====================================================

// Schémas de validation Zod
const CreateMealSchema = z.object({
  description: z.string().min(1, 'Description requise').max(1000, 'Description trop longue'),
  meal_timestamp: z.string().datetime().or(z.date()),
  protein_grams: z.number().min(0, 'Protéines doivent être positives').max(500, 'Valeur trop élevée'),
  calories: z.number().min(0, 'Calories doivent être positives').max(5000, 'Valeur trop élevée').optional(),
  carbs_grams: z.number().min(0, 'Glucides doivent être positifs').max(1000, 'Valeur trop élevée').optional(),
  fat_grams: z.number().min(0, 'Lipides doivent être positifs').max(500, 'Valeur trop élevée').optional(),
  fiber_grams: z.number().min(0, 'Fibres doivent être positives').max(200, 'Valeur trop élevée').optional(),
  source_type: z.enum(['manual', 'voice', 'text', 'image', 'ai_scan', 'favorite', 'import']).optional(),
  ai_estimated: z.boolean().optional(),
  photo_url: z.string().url().optional(),
  photo_data: z.string().optional(),
  tags: z.array(z.string()).optional(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'other']).optional(),
  meal_time_category: z.enum(['morning', 'afternoon', 'evening', 'night', 'other']).optional()
});

const UpdateMealSchema = CreateMealSchema.partial();

const MealQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'other']).optional(),
  source_type: z.enum(['manual', 'voice', 'text', 'image', 'ai_scan', 'favorite', 'import']).optional(),
  ai_estimated: z.boolean().optional(),
  search: z.string().optional()
});

const AnalyzeMealSchema = z.object({
  input_text: z.string().min(1, 'Texte requis').optional(),
  input_type: z.enum(['voice', 'text', 'image']),
  photo_data: z.string().optional()
});

// Types TypeScript
export type CreateMealRequest = z.infer<typeof CreateMealSchema>;
export type UpdateMealRequest = z.infer<typeof UpdateMealSchema>;
export type MealQuery = z.infer<typeof MealQuerySchema>;
export type AnalyzeMealRequest = z.infer<typeof AnalyzeMealSchema>;

export interface MealEntry {
  id: string;
  user_id: string;
  description: string;
  meal_timestamp: string;
  protein_grams: number;
  calories: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  fiber_grams: number | null;
  source_type: string | null;
  ai_estimated: boolean | null;
  photo_url: string | null;
  photo_data: string | null;
  tags: string[];
  meal_type: string | null;
  meal_time_category: string | null;
  created_at: string | null;
  updated_at: string | null;
  meal_analyses?: MealAnalysis[];
}

export interface MealAnalysis {
  id: string;
  meal_entry_id: string | null;
  user_id: string;
  input_text: string | null;
  input_type: string;
  detected_foods: string[];
  confidence_score: number;
  confidence_level: string;
  estimated_protein: number | null;
  estimated_calories: number | null;
  estimated_completeness: number | null;
  suggestions: string[];
  breakdown: any;
  processing_time_ms: number | null;
  ai_model_version: string | null;
  created_at: string | null;
}

export interface FavoriteMeal {
  id: string;
  user_id: string;
  name: string;
  description: string;
  protein_grams: number;
  calories: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  use_count: number | null;
  last_used_at: string | null;
  tags: string[];
  photo_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// =====================================================
// SERVICE DE GESTION DES REPAS
// =====================================================

export class MealService {
  // Créer un repas
  static async createMeal(data: CreateMealRequest): Promise<MealEntry> {
    // Validation côté client
    const validatedData = validateWithSchema(CreateMealSchema, data);

    const response: ApiResponse<{ meal: MealEntry }> = await withRetry(
      () => apiClient.post('/meals', validatedData)
    );

    if (response.success && response.data) {
      return response.data.meal;
    }

    throw new Error(response.message || 'Erreur lors de la création du repas');
  }

  // Récupérer les repas avec pagination et filtres
  static async getMeals(query: Partial<MealQuery> = {}): Promise<PaginatedResponse<MealEntry>> {
    // Validation des paramètres
    const validatedQuery = validateWithSchema(MealQuerySchema.partial(), query);

    return await fetchPaginated<MealEntry>(
      '/meals',
      validatedQuery.page,
      validatedQuery.limit,
      {
        start_date: validatedQuery.start_date,
        end_date: validatedQuery.end_date,
        meal_type: validatedQuery.meal_type,
        source_type: validatedQuery.source_type,
        ai_estimated: validatedQuery.ai_estimated,
        search: validatedQuery.search
      }
    );
  }

  // Récupérer un repas spécifique
  static async getMeal(id: string): Promise<MealEntry> {
    const response: ApiResponse<{ meal: MealEntry }> = await apiClient.get(`/meals/${id}`);

    if (response.success && response.data) {
      return response.data.meal;
    }

    throw new Error(response.message || 'Repas non trouvé');
  }

  // Mettre à jour un repas
  static async updateMeal(id: string, data: UpdateMealRequest): Promise<MealEntry> {
    // Validation côté client
    const validatedData = validateWithSchema(UpdateMealSchema, data);

    const response: ApiResponse<{ meal: MealEntry }> = await withRetry(
      () => apiClient.put(`/meals/${id}`, validatedData)
    );

    if (response.success && response.data) {
      return response.data.meal;
    }

    throw new Error(response.message || 'Erreur lors de la mise à jour du repas');
  }

  // Supprimer un repas
  static async deleteMeal(id: string): Promise<void> {
    const response: ApiResponse = await apiClient.delete(`/meals/${id}`);

    if (!response.success) {
      throw new Error(response.message || 'Erreur lors de la suppression du repas');
    }
  }

  // Analyser un repas avec l'IA
  static async analyzeMeal(data: AnalyzeMealRequest): Promise<MealAnalysis> {
    // Validation côté client
    const validatedData = validateWithSchema(AnalyzeMealSchema, data);

    const response: ApiResponse<{ analysis: MealAnalysis }> = await withRetry(
      () => apiClient.post('/meals/analyze', validatedData),
      2, // Retry l'analyse IA jusqu'à 2 fois
      2000 // Délai plus long pour l'IA
    );

    if (response.success && response.data) {
      return response.data.analysis;
    }

    throw new Error(response.message || 'Erreur lors de l\'analyse du repas');
  }

  // Créer un repas à partir d'une analyse
  static async createMealFromAnalysis(
    analysisId: string, 
    mealData: CreateMealRequest
  ): Promise<MealEntry> {
    // Validation côté client
    const validatedData = validateWithSchema(CreateMealSchema, mealData);

    const response: ApiResponse<{ meal: MealEntry }> = await withRetry(
      () => apiClient.post(`/meals/analysis/${analysisId}/create-meal`, validatedData)
    );

    if (response.success && response.data) {
      return response.data.meal;
    }

    throw new Error(response.message || 'Erreur lors de la création du repas à partir de l\'analyse');
  }

  // Récupérer les repas pour une période spécifique
  static async getMealsForPeriod(
    startDate: Date,
    endDate: Date,
    includeAnalyses: boolean = false
  ): Promise<MealEntry[]> {
    const query: Partial<MealQuery> = {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      limit: 100 // Récupérer plus de repas pour les périodes
    };

    const response = await this.getMeals(query);
    return response.data || [];
  }

  // Récupérer les repas du jour
  static async getTodayMeals(): Promise<MealEntry[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    return this.getMealsForPeriod(startOfDay, endOfDay, true);
  }

  // Récupérer les repas récents (pour l'historique)
  static async getRecentMeals(days: number = 30): Promise<MealEntry[]> {
    const today = new Date();
    const startDate = new Date(today.getTime() - (days * 24 * 60 * 60 * 1000));
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    return this.getMealsForPeriod(startDate, endDate, true);
  }

  // Récupérer tous les repas de l'utilisateur (avec pagination)
  static async getAllUserMeals(limit: number = 200): Promise<MealEntry[]> {
    const query: Partial<MealQuery> = {
      limit,
      page: 1
    };

    const response = await this.getMeals(query);
    return response.data || [];
  }

  // Rechercher des repas
  static async searchMeals(searchTerm: string, limit: number = 20): Promise<MealEntry[]> {
    const query: Partial<MealQuery> = {
      search: searchTerm,
      limit
    };

    const response = await this.getMeals(query);
    return response.data || [];
  }

  // Récupérer les statistiques de repas
  static async getMealStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalMeals: number;
    totalProtein: number;
    totalCalories: number;
    avgProteinPerMeal: number;
    avgCaloriesPerMeal: number;
    mealsByType: Record<string, number>;
    mealsBySource: Record<string, number>;
  }> {
    const meals = startDate && endDate 
      ? await this.getMealsForPeriod(startDate, endDate)
      : await this.getTodayMeals();

    const totalMeals = meals.length;
    const totalProtein = meals.reduce((sum, meal) => sum + meal.protein_grams, 0);
    const totalCalories = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);

    const mealsByType: Record<string, number> = {};
    const mealsBySource: Record<string, number> = {};

    meals.forEach(meal => {
      // Compter par type
      const type = meal.meal_type || 'other';
      mealsByType[type] = (mealsByType[type] || 0) + 1;

      // Compter par source
      const source = meal.source_type || 'manual';
      mealsBySource[source] = (mealsBySource[source] || 0) + 1;
    });

    return {
      totalMeals,
      totalProtein: Math.round(totalProtein),
      totalCalories: Math.round(totalCalories),
      avgProteinPerMeal: totalMeals > 0 ? Math.round(totalProtein / totalMeals) : 0,
      avgCaloriesPerMeal: totalMeals > 0 ? Math.round(totalCalories / totalMeals) : 0,
      mealsByType,
      mealsBySource
    };
  }
}

// =====================================================
// SERVICE DE GESTION DES FAVORIS
// =====================================================

const CreateFavoriteSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(200, 'Nom trop long'),
  description: z.string().min(1, 'Description requise').max(1000, 'Description trop longue'),
  protein_grams: z.number().int('Les protéines doivent être un nombre entier').min(0, 'Protéines doivent être positives').max(500, 'Valeur trop élevée'),
  calories: z.number().min(0, 'Calories doivent être positives').max(5000, 'Valeur trop élevée').optional().nullable(),
  carbs_grams: z.number().min(0, 'Glucides doivent être positifs').max(1000, 'Valeur trop élevée').optional().nullable(),
  fat_grams: z.number().min(0, 'Lipides doivent être positifs').max(500, 'Valeur trop élevée').optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  photo_url: z.string().url().optional().nullable()
});

export type CreateFavoriteRequest = z.infer<typeof CreateFavoriteSchema>;
export type UpdateFavoriteRequest = Partial<CreateFavoriteRequest>;

export class FavoriteService {
  // Créer un favori
  static async createFavorite(data: CreateFavoriteRequest): Promise<FavoriteMeal> {
    const validatedData = validateWithSchema(CreateFavoriteSchema, data);

    const response: ApiResponse<{ favoriteMeal: FavoriteMeal }> = await withRetry(
      () => apiClient.post('/meals/favorites', validatedData)
    );

    if (response.success && response.data) {
      return response.data.favoriteMeal;
    }

    throw new Error(response.message || 'Erreur lors de la création du favori');
  }

  // Récupérer les favoris
  static async getFavorites(
    search?: string,
    sortBy: string = 'name',
    order: 'asc' | 'desc' = 'asc'
  ): Promise<FavoriteMeal[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('sortBy', sortBy);
    params.append('order', order);

    const response: ApiResponse<{ favoriteMeals: FavoriteMeal[] }> = 
      await apiClient.get(`/meals/favorites?${params}`);

    if (response.success && response.data) {
      return response.data.favoriteMeals;
    }

    return [];
  }

  // Récupérer un favori spécifique
  static async getFavorite(id: string): Promise<FavoriteMeal> {
    const response: ApiResponse<{ favoriteMeal: FavoriteMeal }> = 
      await apiClient.get(`/meals/favorites/${id}`);

    if (response.success && response.data) {
      return response.data.favoriteMeal;
    }

    throw new Error(response.message || 'Favori non trouvé');
  }

  // Mettre à jour un favori
  static async updateFavorite(id: string, data: UpdateFavoriteRequest): Promise<FavoriteMeal> {
    const response: ApiResponse<{ favoriteMeal: FavoriteMeal }> = await withRetry(
      () => apiClient.put(`/meals/favorites/${id}`, data)
    );

    if (response.success && response.data) {
      return response.data.favoriteMeal;
    }

    throw new Error(response.message || 'Erreur lors de la mise à jour du favori');
  }

  // Supprimer un favori
  static async deleteFavorite(id: string): Promise<void> {
    const response: ApiResponse = await apiClient.delete(`/meals/favorites/${id}`);

    if (!response.success) {
      throw new Error(response.message || 'Erreur lors de la suppression du favori');
    }
  }

  // Utiliser un favori (incrémenter le compteur)
  static async useFavorite(id: string): Promise<{
    favoriteMeal: FavoriteMeal;
    mealTemplate: CreateMealRequest;
  }> {
    const response: ApiResponse<{
      favoriteMeal: FavoriteMeal;
      mealTemplate: CreateMealRequest;
    }> = await apiClient.post(`/meals/favorites/${id}/use`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erreur lors de l\'utilisation du favori');
  }

  // Créer un repas à partir d'un favori
  static async createMealFromFavorite(favoriteId: string): Promise<MealEntry> {
    const { mealTemplate } = await this.useFavorite(favoriteId);
    return MealService.createMeal(mealTemplate);
  }
}

// =====================================================
// HELPERS ET UTILITAIRES
// =====================================================

// Helper pour formater les données de repas pour l'affichage
export const formatMealForDisplay = (meal: MealEntry) => {
  return {
    ...meal,
    formattedTimestamp: new Date(meal.meal_timestamp).toLocaleString('fr-FR'),
    formattedDate: new Date(meal.meal_timestamp).toLocaleDateString('fr-FR'),
    formattedTime: new Date(meal.meal_timestamp).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    totalCalories: meal.calories || 0,
    totalMacros: {
      protein: meal.protein_grams,
      carbs: meal.carbs_grams || 0,
      fat: meal.fat_grams || 0,
      fiber: meal.fiber_grams || 0
    }
  };
};

// Helper pour calculer la distribution des macros
export const calculateMacroDistribution = (
  protein: number,
  carbs: number,
  fat: number
) => {
  const proteinCals = protein * 4;
  const carbsCals = carbs * 4;
  const fatCals = fat * 9;
  const totalCals = proteinCals + carbsCals + fatCals;

  if (totalCals === 0) {
    return { protein: 0, carbs: 0, fat: 0 };
  }

  return {
    protein: Math.round((proteinCals / totalCals) * 100),
    carbs: Math.round((carbsCals / totalCals) * 100),
    fat: Math.round((fatCals / totalCals) * 100)
  };
};

// Helper pour créer un template de repas vide
export const createEmptyMealTemplate = (): CreateMealRequest => ({
  description: '',
  meal_timestamp: new Date().toISOString(),
  protein_grams: 0,
  calories: 0,
  source_type: 'manual',
  ai_estimated: false,
  tags: []
});