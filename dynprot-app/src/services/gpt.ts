import OpenAI from 'openai';

// Types for meal analysis response
export interface MealAnalysisResult {
  success: boolean;
  data?: MealNutritionData;
  error?: string;
}

export interface MealNutritionData {
  description: string;
  protein: number;
  calories?: number;
  confidence: 'high' | 'medium' | 'low';
  breakdown: FoodItem[];
  suggestions?: string[];
}

export interface FoodItem {
  name: string;
  quantity?: string;
  protein: number;
  calories?: number;
}

// OpenAI client instance
let openaiClient: OpenAI | null = null;

const getOpenAIClient = (): OpenAI => {
  if (!openaiClient) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please set VITE_OPENAI_API_KEY in your environment variables.');
    }

    openaiClient = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Note: In production, API calls should go through your backend
    });
  }
  
  return openaiClient;
};

// System prompt for meal analysis
const MEAL_ANALYSIS_PROMPT = `Vous êtes un nutritionniste expert spécialisé dans l'analyse de repas et l'estimation des apports protéiques.

Analysez la description d'un repas fournie par l'utilisateur et estimez les apports nutritionnels, en vous concentrant particulièrement sur les protéines.

Répondez UNIQUEMENT en JSON valide avec la structure suivante :
{
  "description": "Description normalisée du repas",
  "protein": "nombre total de protéines en grammes (nombre entier)",
  "calories": "nombre total de calories (nombre entier, optionnel)",
  "confidence": "high/medium/low selon votre certitude",
  "breakdown": [
    {
      "name": "nom de l'aliment",
      "quantity": "quantité estimée",
      "protein": "protéines en grammes",
      "calories": "calories (optionnel)"
    }
  ],
  "suggestions": ["conseils nutritionnels optionnels"]
}

Instructions importantes :
- Soyez précis dans vos estimations
- Si les quantités ne sont pas mentionnées, estimez des portions standards
- Confidence 'high' pour aliments bien décrits, 'low' pour descriptions vagues
- Incluez tous les aliments riches en protéines identifiés
- Les valeurs protein et calories doivent être des nombres entiers
- Maximum 3 suggestions pratiques si pertinent`;

/**
 * Analyzes a meal description using OpenAI GPT-4o and returns structured nutrition data
 */
export async function analyzeMealFromText(mealText: string): Promise<MealAnalysisResult> {
  try {
    // Validate input
    if (!mealText || mealText.trim().length === 0) {
      return {
        success: false,
        error: 'La description du repas ne peut pas être vide.',
      };
    }

    if (mealText.trim().length > 1000) {
      return {
        success: false,
        error: 'La description du repas est trop longue (maximum 1000 caractères).',
      };
    }

    const client = getOpenAIClient();

    // Call OpenAI API
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: MEAL_ANALYSIS_PROMPT,
        },
        {
          role: 'user',
          content: `Analysez ce repas : "${mealText.trim()}"`,
        },
      ],
      temperature: 0.1, // Low temperature for consistent results
      max_tokens: 1000,
    });

    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      return {
        success: false,
        error: 'Aucune réponse reçue de l\'API OpenAI.',
      };
    }

    // Clean and parse JSON response
    let parsedData: any;
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = responseText.trim();
      
      // Remove ```json and ``` wrapper if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      parsedData = JSON.parse(cleanedResponse.trim());
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseText);
      return {
        success: false,
        error: 'Erreur lors du traitement de la réponse de l\'IA.',
      };
    }

    // Validate response structure
    const validationResult = validateMealAnalysisResponse(parsedData);
    if (!validationResult.isValid) {
      console.error('Invalid OpenAI response structure:', parsedData);
      return {
        success: false,
        error: validationResult.error || 'Réponse de l\'IA invalide.',
      };
    }

    return {
      success: true,
      data: parsedData as MealNutritionData,
    };

  } catch (error) {
    console.error('Error analyzing meal with OpenAI:', error);

    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return {
          success: false,
          error: 'Clé API OpenAI invalide.',
        };
      } else if (error.status === 429) {
        return {
          success: false,
          error: 'Limite de requêtes atteinte. Veuillez réessayer plus tard.',
        };
      } else if (error.status === 500) {
        return {
          success: false,
          error: 'Erreur du serveur OpenAI. Veuillez réessayer.',
        };
      }
    }

    return {
      success: false,
      error: 'Erreur lors de l\'analyse du repas. Veuillez réessayer.',
    };
  }
}

/**
 * Validates the structure of the OpenAI response
 */
function validateMealAnalysisResponse(data: any): { isValid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Response is not an object' };
  }

  // Required fields
  if (typeof data.description !== 'string' || data.description.trim().length === 0) {
    return { isValid: false, error: 'Missing or invalid description' };
  }

  if (typeof data.protein !== 'number' || data.protein < 0 || !Number.isInteger(data.protein)) {
    return { isValid: false, error: 'Missing or invalid protein value' };
  }

  if (!['high', 'medium', 'low'].includes(data.confidence)) {
    return { isValid: false, error: 'Missing or invalid confidence level' };
  }

  if (!Array.isArray(data.breakdown)) {
    return { isValid: false, error: 'Missing or invalid breakdown array' };
  }

  // Optional fields validation
  if (data.calories !== undefined && (typeof data.calories !== 'number' || data.calories < 0 || !Number.isInteger(data.calories))) {
    return { isValid: false, error: 'Invalid calories value' };
  }

  if (data.suggestions !== undefined && !Array.isArray(data.suggestions)) {
    return { isValid: false, error: 'Invalid suggestions field' };
  }

  // Validate breakdown items
  for (const item of data.breakdown) {
    if (!item || typeof item !== 'object') {
      return { isValid: false, error: 'Invalid breakdown item' };
    }

    if (typeof item.name !== 'string' || item.name.trim().length === 0) {
      return { isValid: false, error: 'Invalid breakdown item name' };
    }

    if (typeof item.protein !== 'number' || item.protein < 0) {
      return { isValid: false, error: 'Invalid breakdown item protein' };
    }

    if (item.calories !== undefined && (typeof item.calories !== 'number' || item.calories < 0)) {
      return { isValid: false, error: 'Invalid breakdown item calories' };
    }
  }

  return { isValid: true };
}

/**
 * Test function to check if OpenAI API is properly configured
 */
export async function testOpenAIConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getOpenAIClient();
    
    // Simple test call
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: 'Respond with just "OK" if you can read this message.',
        },
      ],
      max_tokens: 10,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (response && response.toLowerCase().includes('ok')) {
      return { success: true };
    } else {
      return { success: false, error: 'Unexpected response from OpenAI' };
    }

  } catch (error) {
    console.error('OpenAI connection test failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}