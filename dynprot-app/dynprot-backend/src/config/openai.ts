// Configuration OpenAI pour les services IA
import OpenAI from 'openai';
import { config } from './env';

// Initialisation du client OpenAI
export const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// Configuration des modèles
export const AI_CONFIG = {
  // Modèles
  textModel: config.openai.model,
  visionModel: config.openai.visionModel,
  
  // Paramètres
  maxTokens: config.openai.maxTokens,
  temperature: config.openai.temperature,
  timeout: config.ai.timeoutMs,
  
  // Scoring
  confidenceThreshold: config.ai.confidenceThreshold,
  maxRetries: config.ai.maxRetries,
} as const;

// Types pour les réponses IA
export interface AIAnalysisResult {
  foods: string[];
  protein: number;
  calories?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  confidence: number;
  explanation: string;
  suggestions?: string[];
  breakdown?: {
    [food: string]: {
      quantity: string;
      protein: number;
      calories?: number;
    };
  };
  detectedItems?: Array<{
    name: string;
    confidence: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  imageQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  requiresManualReview?: boolean;
}

export interface AIVisionResult extends AIAnalysisResult {
  detectedItems: Array<{
    name: string;
    confidence: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  imageQuality: 'excellent' | 'good' | 'fair' | 'poor';
  requiresManualReview: boolean;
}

// Prompts système pour l'IA
export const AI_PROMPTS = {
  textAnalysis: `Tu es un expert en nutrition spécialisé dans l'analyse des repas français et internationaux.

Analyse la description du repas fournie et estime les valeurs nutritionnelles avec précision.

RÈGLES D'ANALYSE:
- Identifie chaque aliment mentionné dans la description
- Estime les quantités basées sur les portions typiques françaises
- Utilise la base de données nutritionnelle CIQUAL française quand possible
- Prends en compte les modes de cuisson et préparations
- Sois précis mais conservateur dans tes estimations

GESTION DE LA CONFIANCE:
- Confidence élevée (>0.8): Aliments clairement décrits, portions mentionnées
- Confidence moyenne (0.6-0.8): Bonne description, portions estimées
- Confidence faible (<0.6): Description vague, estimations approximatives

CONSEILS NUTRITIONNELS:
- Propose des améliorations nutritionnelles pertinentes
- Suggère des alternatives plus riches en protéines si nécessaire
- Recommande des compléments alimentaires si le repas est déséquilibré

Format de réponse JSON STRICT:
{
  "foods": ["aliment1", "aliment2"],
  "protein": grammes_proteine_total,
  "calories": calories_totales,
  "carbs": grammes_glucides,
  "fat": grammes_lipides,
  "fiber": grammes_fibres,
  "confidence": confidence_0_1,
  "explanation": "analyse_détaillée_français_des_aliments_et_portions",
  "suggestions": ["conseil_nutritionnel1", "conseil_nutritionnel2"],
  "breakdown": {
    "aliment1": {
      "quantity": "portion_précise_grammes",
      "protein": grammes_proteine,
      "calories": calories_aliment,
      "preparation": "mode_preparation"
    }
  }
}`,

  visionAnalysis: `Tu es un expert en nutrition spécialisé dans l'analyse visuelle des repas français et internationaux.

Analyse cette image de repas en utilisant les critères suivants:

IDENTIFICATION DES ALIMENTS:
- Identifie précisément chaque aliment visible
- Distingue les différentes préparations (grillé, frit, cuit à la vapeur, etc.)
- Reconnais les accompagnements (sauces, assaisonnements, garnitures)
- Estime les portions en utilisant des références visuelles (taille d'assiette, couverts, etc.)

ESTIMATION NUTRITIONNELLE:
- Utilise la base de données nutritionnelle CIQUAL française quand possible
- Prends en compte les modes de cuisson qui affectent les valeurs nutritionnelles
- Calcule les portions en grammes en utilisant des références visuelles
- Sois conservateur dans tes estimations si l'image est ambiguë

QUALITÉ DE L'IMAGE:
- Excellent: Image nette, bonne lumière, tous les aliments clairement visibles
- Good: Image correcte, la plupart des aliments identifiables
- Fair: Image acceptable mais certains détails flous
- Poor: Image de mauvaise qualité, identification difficile

CONFIANCE ET RÉVISION:
- Confidence élevée (>0.8): Aliments clairement identifiés, portions estimables
- Confidence moyenne (0.6-0.8): Bonne identification, portions approximatives
- Confidence faible (<0.6): Identification incertaine, révision recommandée

Format de réponse JSON STRICT:
{
  "foods": ["aliment1", "aliment2"],
  "protein": grammes_proteine_total,
  "calories": calories_totales,
  "carbs": grammes_glucides,
  "fat": grammes_lipides,
  "fiber": grammes_fibres,
  "confidence": confidence_globale_0_1,
  "explanation": "description_détaillée_français_des_aliments_visibles_et_portions",
  "suggestions": ["conseil_nutritionnel1", "conseil_nutritionnel2"],
  "breakdown": {
    "aliment1": {
      "quantity": "portion_précise_en_grammes",
      "protein": grammes_proteine,
      "calories": calories_aliment,
      "preparation": "mode_cuisson_preparation"
    }
  },
  "detectedItems": [
    {
      "name": "nom_précis_aliment",
      "confidence": confidence_0_1,
      "portion": "estimation_portion"
    }
  ],
  "imageQuality": "excellent|good|fair|poor",
  "requiresManualReview": true_ou_false
}`
} as const;

// Utilitaire pour valider une réponse IA
export function validateAIResponse(response: any): response is AIAnalysisResult {
  return (
    typeof response === 'object' &&
    Array.isArray(response.foods) &&
    typeof response.protein === 'number' &&
    typeof response.confidence === 'number' &&
    response.confidence >= 0 &&
    response.confidence <= 1 &&
    typeof response.explanation === 'string'
  );
}

// Utilitaire pour valider une réponse vision
export function validateVisionResponse(response: any): response is AIVisionResult {
  return (
    validateAIResponse(response) &&
    Array.isArray(response.detectedItems) &&
    typeof response.imageQuality === 'string' &&
    typeof response.requiresManualReview === 'boolean'
  );
}

// Gestion des erreurs IA
export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIError';
  }
}

// Types d'erreurs courantes
export const AI_ERROR_CODES = {
  RATE_LIMIT: 'rate_limit',
  INVALID_RESPONSE: 'invalid_response',
  TIMEOUT: 'timeout',
  API_ERROR: 'api_error',
  LOW_CONFIDENCE: 'low_confidence',
  IMAGE_QUALITY: 'image_quality',
} as const;