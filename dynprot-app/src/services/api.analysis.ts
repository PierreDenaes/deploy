// Service API pour l'analyse IA des repas
import { z } from 'zod';
import { 
  apiClient, 
  ApiResponse, 
  validateWithSchema, 
  withRetry 
} from './api.service';

// =====================================================
// TYPES ET SCHÉMAS DE VALIDATION
// =====================================================

// Schéma pour l'analyse de repas
const AnalyzeMealSchema = z.object({
  input_text: z.string().optional(),
  input_type: z.enum(['text', 'image', 'voice']),
  photo_data: z.string().optional()
});

// Types TypeScript
export type AnalyzeMealRequest = z.infer<typeof AnalyzeMealSchema>;

export interface MealAnalysisResult {
  id: string;
  user_id: string;
  input_text: string | null;
  input_type: string;
  detected_foods: string[];
  confidence_score: number;
  confidence_level: 'low' | 'medium' | 'high';
  estimated_protein: number | null;
  estimated_calories: number | null;
  estimated_weight: number | null;
  estimated_carbs: number | null;
  estimated_fat: number | null;
  estimated_fiber: number | null;
  estimated_completeness: number | null;
  suggestions: string[];
  breakdown: any;
  processing_time_ms: number | null;
  ai_model_version: string | null;
  requires_manual_review?: boolean;
  image_quality?: 'excellent' | 'good' | 'fair' | 'poor';
  created_at: string | null;
}

export interface MealAnalysisStats {
  totalAnalyses: number;
  successRate: number;
  avgConfidence: number;
  avgProcessingTime: number;
  mostDetectedFoods: Array<{
    food: string;
    count: number;
  }>;
}

// =====================================================
// SERVICE D'ANALYSE IA
// =====================================================

export class AnalysisService {
  // Analyser un repas depuis du texte
  static async analyzeTextMeal(description: string): Promise<MealAnalysisResult> {
    if (!description?.trim()) {
      throw new Error('Description du repas requise');
    }

    console.log(`🤖 Analyse IA texte: ${description.substring(0, 100)}...`);

    const requestData: AnalyzeMealRequest = {
      input_text: description.trim(),
      input_type: 'text'
    };

    const validatedData = validateWithSchema(AnalyzeMealSchema, requestData);

    const response: ApiResponse<{ analysis: MealAnalysisResult }> = await withRetry(
      () => apiClient.post('/meals/analyze', validatedData),
      2, // Retry pour l'IA
      5000 // Délai plus long pour l'IA
    );

    if (response.success && response.data) {
      const analysis = response.data.analysis;
      console.log(`✅ Analyse IA réussie (confiance: ${analysis.confidence_score})`);
      return analysis;
    }

    throw new Error(response.message || 'Erreur lors de l\'analyse du texte');
  }

  // Analyser un repas depuis une image
  static async analyzeImageMeal(
    imageUrl: string, 
    description?: string
  ): Promise<MealAnalysisResult> {
    if (!imageUrl) {
      throw new Error('URL d\'image requise');
    }

    console.log(`📸 Analyse IA image: ${imageUrl.substring(0, 100)}...`);

    const requestData: AnalyzeMealRequest = {
      input_text: description?.trim(),
      input_type: 'image',
      photo_data: imageUrl
    };

    const validatedData = validateWithSchema(AnalyzeMealSchema, requestData);

    const response: ApiResponse<{ analysis: MealAnalysisResult }> = await withRetry(
      () => apiClient.post('/meals/analyze', validatedData),
      2,
      10000 // Délai plus long pour l'analyse d'image
    );

    if (response.success && response.data) {
      const analysis = response.data.analysis;
      console.log(`✅ Analyse IA image réussie (confiance: ${analysis.confidence_score}, qualité: ${analysis.image_quality})`);
      return analysis;
    }

    throw new Error(response.message || 'Erreur lors de l\'analyse de l\'image');
  }

  // Analyser un repas avec texte ET image (meilleure précision)
  static async analyzeCompleteMeal(
    description: string,
    imageUrl?: string
  ): Promise<MealAnalysisResult> {
    if (!description?.trim() && !imageUrl) {
      throw new Error('Description ou image requise pour l\'analyse');
    }

    console.log(`🔍 Analyse IA complète: ${description ? 'texte' : ''} ${imageUrl ? '+ image' : ''}`);

    if (imageUrl) {
      // Utiliser l'analyse image qui inclut le texte
      return this.analyzeImageMeal(imageUrl, description);
    } else {
      // Fallback sur l'analyse texte
      return this.analyzeTextMeal(description);
    }
  }

  // Créer un repas depuis une analyse
  static async createMealFromAnalysis(
    analysisId: string,
    mealData: {
      description: string;
      meal_timestamp: string | Date;
      protein_grams: number;
      calories?: number;
      carbs_grams?: number;
      fat_grams?: number;
      fiber_grams?: number;
      photo_url?: string;
      tags?: string[];
      meal_type?: string;
      meal_time_category?: string;
    }
  ): Promise<any> {
    if (!analysisId) {
      throw new Error('ID d\'analyse requis');
    }

    console.log(`📝 Création repas depuis analyse: ${analysisId}`);

    const response: ApiResponse<{ meal: any }> = await apiClient.post(
      `/meals/analysis/${analysisId}/create-meal`,
      mealData
    );

    if (response.success && response.data) {
      console.log(`✅ Repas créé depuis analyse: ${response.data.meal.id}`);
      return response.data.meal;
    }

    throw new Error(response.message || 'Erreur lors de la création du repas');
  }

  // Obtenir les statistiques d'analyse
  static async getAnalysisStats(): Promise<MealAnalysisStats> {
    // TODO: Implémenter l'endpoint de stats côté backend
    return {
      totalAnalyses: 0,
      successRate: 0.95,
      avgConfidence: 0.82,
      avgProcessingTime: 2500,
      mostDetectedFoods: [
        { food: 'poulet', count: 45 },
        { food: 'riz', count: 38 },
        { food: 'légumes', count: 32 }
      ]
    };
  }
}

// =====================================================
// HOOKS POUR L'ANALYSE IA
// =====================================================

import { useState, useCallback } from 'react';
import { ErrorHandler } from '../utils/errorHandling';

// Hook pour l'analyse de repas
export function useMealAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MealAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const analyzeText = useCallback(async (description: string): Promise<MealAnalysisResult | null> => {
    try {
      setIsAnalyzing(true);
      setAnalysisError(null);
      
      const result = await AnalysisService.analyzeTextMeal(description);
      setAnalysisResult(result);
      
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Erreur lors de l\'analyse du texte';
      setAnalysisError(errorMessage);
      
      ErrorHandler.handle(error, {
        context: 'useMealAnalysis.analyzeText',
        showToast: true
      });
      
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const analyzeImage = useCallback(async (
    imageUrl: string, 
    description?: string
  ): Promise<MealAnalysisResult | null> => {
    try {
      setIsAnalyzing(true);
      setAnalysisError(null);
      
      const result = await AnalysisService.analyzeImageMeal(imageUrl, description);
      setAnalysisResult(result);
      
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Erreur lors de l\'analyse de l\'image';
      setAnalysisError(errorMessage);
      
      ErrorHandler.handle(error, {
        context: 'useMealAnalysis.analyzeImage',
        showToast: true
      });
      
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const analyzeComplete = useCallback(async (
    description: string,
    imageUrl?: string
  ): Promise<MealAnalysisResult | null> => {
    try {
      setIsAnalyzing(true);
      setAnalysisError(null);
      
      const result = await AnalysisService.analyzeCompleteMeal(description, imageUrl);
      setAnalysisResult(result);
      
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Erreur lors de l\'analyse complète';
      setAnalysisError(errorMessage);
      
      ErrorHandler.handle(error, {
        context: 'useMealAnalysis.analyzeComplete',
        showToast: true
      });
      
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setAnalysisError(null);
  }, []);

  return {
    // État
    isAnalyzing,
    analysisResult,
    analysisError,
    
    // Actions
    analyzeText,
    analyzeImage,
    analyzeComplete,
    clearAnalysis,
    
    // Helpers
    hasResult: !!analysisResult,
    confidence: analysisResult?.confidence_score || 0,
    requiresReview: analysisResult?.requires_manual_review || false,
    imageQuality: analysisResult?.image_quality
  };
}

// Hook pour la création de repas depuis analyse
export function useAnalysisToMeal() {
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const createMeal = useCallback(async (
    analysisId: string,
    mealData: Parameters<typeof AnalysisService.createMealFromAnalysis>[1]
  ): Promise<any | null> => {
    try {
      setIsCreating(true);
      setCreateError(null);
      
      const meal = await AnalysisService.createMealFromAnalysis(analysisId, mealData);
      return meal;
    } catch (error: any) {
      const errorMessage = error.message || 'Erreur lors de la création du repas';
      setCreateError(errorMessage);
      
      ErrorHandler.handle(error, {
        context: 'useAnalysisToMeal.createMeal',
        showToast: true
      });
      
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  return {
    createMeal,
    isCreating,
    createError,
    clearError: () => setCreateError(null)
  };
}