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

// Nouveaux types pour la détection de produits améliorée
export type ProductType = 'PACKAGED_PRODUCT' | 'NATURAL_FOOD' | 'COOKED_DISH';
export type DataSource = 'OFFICIAL_LABEL' | 'ONLINE_DATABASE' | 'VISUAL_ESTIMATION';

export interface NutritionalValue {
  value: number;
  unit: string;
  per: string; // '100g', 'portion', 'total'
}

export interface NutritionalData {
  productName: string;
  brand?: string;
  proteins: number | null;
  calories: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  source: string;
  confidence: number;
}

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
  // Nouveaux champs pour la détection de produits
  productType?: ProductType;
  dataSource?: DataSource;
  isExactValue?: boolean;
  searchAvailable?: boolean;
  onlineSearchResult?: NutritionalData;
  productName?: string;
  brand?: string;
  totalWeight?: string;
  nutritionalValues?: {
    proteins?: NutritionalValue;
    calories?: NutritionalValue;
  };
  calculatedTotal?: {
    proteins: number;
    calories: number;
  };
  notes?: string;
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

  visionAnalysis: `Tu es un système d'analyse nutritionnelle par vision spécialisé dans l'identification précise des produits alimentaires.

INSTRUCTIONS CRITIQUES :

1. DÉTECTE d'abord le type de contenu :
   - PRODUIT EMBALLÉ : boîte, paquet, bouteille, conserve avec étiquettes/codes-barres
   - ALIMENT NATUREL : fruits, légumes, viande brute, etc.
   - PLAT CUISINÉ : préparation maison, restaurant, etc.

2. POUR LES PRODUITS EMBALLÉS :
   - PRIORITÉ 1 : Cherche et lis le TABLEAU NUTRITIONNEL sur l'emballage
   - Localise "Valeurs nutritionnelles"/"Nutrition Facts"/"Informations nutritionnelles"
   - Lis EXACTEMENT les valeurs de protéines indiquées
   - Note l'unité (pour 100g, 100ml, portion, unité)
   - Extrait le nom exact du produit et la marque
   - Calcule pour le produit entier si possible
   
   - PRIORITÉ 2 (si tableau non lisible) : 
   - Identifie précisément le produit (nom + marque)
   - Si tu reconnais le produit, indique que tu peux rechercher les valeurs officielles
   - Propose une recherche en ligne des données nutritionnelles exactes

3. POUR LES ALIMENTS NATURELS/PLATS :
   - Utilise la reconnaissance visuelle pour estimer
   - Base-toi sur les ingrédients visibles
   - Indique clairement que c'est une estimation

4. RÉPONSE STRUCTURÉE OBLIGATOIRE :
   {
     "productType": "PACKAGED_PRODUCT|NATURAL_FOOD|COOKED_DISH",
     "productName": "nom exact si emballé, description si naturel",
     "brand": "marque si visible",
     "totalWeight": "poids/volume total",
     "nutritionalValues": {
       "proteins": { "value": X, "unit": "g", "per": "100g|portion|total" },
       "calories": { "value": X, "unit": "kcal", "per": "100g|portion|total" }
     },
     "calculatedTotal": {
       "proteins": X,
       "calories": X
     },
     "confidence": 95,
     "dataSource": "OFFICIAL_LABEL|ONLINE_DATABASE|VISUAL_ESTIMATION",
     "notes": "informations complémentaires ou demandes si données manquantes",
     "foods": ["aliment1", "aliment2"],
     "protein": grammes_proteine_total,
     "calories": calories_totales,
     "carbs": grammes_glucides,
     "fat": grammes_lipides,
     "fiber": grammes_fibres,
     "explanation": "description_détaillée_français_analyse",
     "suggestions": ["conseil_nutritionnel1", "conseil_nutritionnel2"],
     "breakdown": {
       "aliment1": {
         "quantity": "portion_précise_grammes",
         "protein": grammes_proteine,
         "calories": calories_aliment,
         "preparation": "mode_preparation"
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
     "requiresManualReview": true_ou_false,
     "searchAvailable": true_si_produit_identifiable,
     "isExactValue": true_si_lecture_directe_tableau
   }

5. SI TABLEAU NON VISIBLE/LISIBLE :
   - Identifie d'abord précisément le produit (nom exact + marque)
   - Si produit reconnu : propose recherche des valeurs officielles en ligne
   - Si produit non reconnu : demande photo du tableau nutritionnel
   - NE FAIS JAMAIS d'estimation vague pour un produit emballé
   
   Exemple de réponse :
   "Produit identifié : Yaourt Danone Activia Nature 0% - 4x125g
   Tableau nutritionnel non lisible sur cette photo.
   
   OPTIONS :
   1. Je peux rechercher les valeurs nutritionnelles officielles de ce produit en ligne
   2. Ou prenez une photo plus nette du tableau au dos de l'emballage
   
   Quelle option préférez-vous ?"

Analyse cette image alimentaire selon ces directives.`
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