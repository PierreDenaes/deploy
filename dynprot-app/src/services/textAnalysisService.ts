import { sanitizeMealDescription } from '@/utils/sanitize';

export interface TextAnalysisResult {
  protein: number;
  calories: number | null;
  confidence: number;
  detectedFoods: string[];
  suggestions?: string[];
}

export interface TextAnalysisResponse {
  result?: TextAnalysisResult;
  error?: string;
}

/**
 * Mock text analysis service that simulates AI-powered meal description analysis
 * In production, this would make API calls to your AI backend for NLP processing
 */
export class TextAnalysisService {
  
  /**
   * Common food patterns with their typical protein content
   */
  private static readonly FOOD_DATABASE = {
    // Proteins
    'chicken': { protein: 23, calories: 165, multiplier: 1.0 },
    'beef': { protein: 26, calories: 250, multiplier: 1.0 },
    'salmon': { protein: 28, calories: 200, multiplier: 1.0 },
    'tuna': { protein: 30, calories: 130, multiplier: 1.0 },
    'turkey': { protein: 24, calories: 135, multiplier: 1.0 },
    'fish': { protein: 22, calories: 150, multiplier: 1.0 },
    'eggs': { protein: 12, calories: 155, multiplier: 1.0 },
    'tofu': { protein: 12, calories: 80, multiplier: 1.0 },
    'beans': { protein: 8, calories: 120, multiplier: 1.0 },
    'lentils': { protein: 9, calories: 115, multiplier: 1.0 },
    'quinoa': { protein: 4, calories: 120, multiplier: 1.0 },
    'yogurt': { protein: 17, calories: 100, multiplier: 1.0 },
    'cheese': { protein: 14, calories: 200, multiplier: 1.0 },
    'protein shake': { protein: 25, calories: 150, multiplier: 1.0 },
    'protein powder': { protein: 30, calories: 120, multiplier: 1.0 },
    
    // Cooking methods that affect estimates
    'grilled': { protein: 0, calories: 0, multiplier: 1.0 },
    'fried': { protein: 0, calories: 50, multiplier: 1.3 },
    'baked': { protein: 0, calories: 0, multiplier: 1.0 },
    'steamed': { protein: 0, calories: 0, multiplier: 0.9 },
    'roasted': { protein: 0, calories: 20, multiplier: 1.1 },
  };

  /**
   * Validate and sanitize input text
   */
  private static validateInput(text: string): { isValid: boolean; error?: string; sanitized?: string } {
    if (!text || typeof text !== 'string') {
      return { isValid: false, error: 'Please enter a meal description' };
    }

    const sanitized = sanitizeMealDescription(text.trim());
    
    if (sanitized.length < 3) {
      return { isValid: false, error: 'Please provide a more detailed meal description' };
    }

    if (sanitized.length > 500) {
      return { isValid: false, error: 'Meal description is too long. Please keep it under 500 characters' };
    }

    return { isValid: true, sanitized };
  }

  /**
   * Extract food items and cooking methods from text
   */
  private static extractFoods(text: string): { foods: string[]; methods: string[] } {
    const lowerText = text.toLowerCase();
    const foods: string[] = [];
    const methods: string[] = [];

    // Check for foods and cooking methods
    Object.keys(this.FOOD_DATABASE).forEach(item => {
      if (lowerText.includes(item)) {
        const foodData = this.FOOD_DATABASE[item as keyof typeof this.FOOD_DATABASE];
        if (foodData.protein > 0) {
          foods.push(item);
        } else {
          methods.push(item);
        }
      }
    });

    return { foods, methods };
  }

  /**
   * Calculate nutrition estimates based on detected foods and methods
   */
  private static calculateNutrition(foods: string[], methods: string[]): TextAnalysisResult {
    let totalProtein = 0;
    let totalCalories = 0;
    let confidence = 0.7; // Base confidence

    if (foods.length === 0) {
      // No specific foods detected, provide generic estimate
      return {
        protein: Math.floor(Math.random() * 15) + 10, // 10-25g
        calories: Math.floor(Math.random() * 200) + 200, // 200-400 calories
        confidence: 0.4, // Low confidence for generic estimates
        detectedFoods: [],
        suggestions: [
          'Try being more specific about the foods you ate',
          'Include cooking methods (grilled, baked, etc.) for better estimates',
          'Mention portion sizes when possible'
        ]
      };
    }

    // Calculate base nutrition from detected foods
    foods.forEach(food => {
      const foodData = this.FOOD_DATABASE[food as keyof typeof this.FOOD_DATABASE];
      if (foodData) {
        totalProtein += foodData.protein * foodData.multiplier;
        totalCalories += foodData.calories * foodData.multiplier;
      }
    });

    // Apply cooking method multipliers
    let methodMultiplier = 1.0;
    methods.forEach(method => {
      const methodData = this.FOOD_DATABASE[method as keyof typeof this.FOOD_DATABASE];
      if (methodData) {
        methodMultiplier *= methodData.multiplier;
        totalCalories += methodData.calories;
      }
    });

    totalProtein = Math.round(totalProtein * methodMultiplier);
    totalCalories = Math.round(totalCalories * methodMultiplier);

    // Adjust confidence based on detection quality
    if (foods.length >= 2) confidence += 0.1;
    if (methods.length >= 1) confidence += 0.1;
    
    // Add some natural variation
    const proteinVariation = Math.floor(Math.random() * 6) - 3; // ±3g
    const calorieVariation = Math.floor(Math.random() * 40) - 20; // ±20 calories
    
    return {
      protein: Math.max(1, totalProtein + proteinVariation),
      calories: totalCalories > 0 ? Math.max(10, totalCalories + calorieVariation) : null,
      confidence: Math.min(0.95, confidence),
      detectedFoods: foods.map(food => food.charAt(0).toUpperCase() + food.slice(1)), // Capitalize food names
      suggestions: this.generateSuggestions(foods, methods)
    };
  }

  /**
   * Generate helpful suggestions based on analysis
   */
  private static generateSuggestions(foods: string[], methods: string[]): string[] {
    const suggestions: string[] = [];

    if (foods.length === 1) {
      suggestions.push('Consider adding side dishes or ingredients for a more complete estimate');
    }

    if (methods.length === 0) {
      suggestions.push('Include cooking method (grilled, baked, fried) for more accurate calorie estimates');
    }

    if (foods.some(food => ['chicken', 'beef', 'salmon', 'turkey'].includes(food))) {
      suggestions.push('Great protein choice! Consider adding vegetables for balanced nutrition');
    }

    return suggestions;
  }

  /**
   * Simulate processing delay
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Analyze meal description text and extract nutrition information
   */
  static async analyzeText(text: string): Promise<TextAnalysisResponse> {
    try {
      // Validate input
      const validation = this.validateInput(text);
      if (!validation.isValid) {
        return { error: validation.error };
      }

      // Simulate processing time
      await this.delay(1200);

      // Extract foods and cooking methods
      const { foods, methods } = this.extractFoods(validation.sanitized!);

      // Calculate nutrition estimates
      const result = this.calculateNutrition(foods, methods);

      // Simulate occasional failures for more realistic behavior
      if (Math.random() < 0.05) { // 5% chance of failure
        return { 
          error: 'Unable to analyze this meal description. Please try rephrasing or being more specific about the foods you ate.' 
        };
      }

      return { result };

    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Text analysis failed'
      };
    }
  }

  /**
   * Get quick suggestions for common meal patterns
   */
  static getQuickSuggestions(): string[] {
    return [
      'Grilled chicken breast with rice',
      'Salmon salad with avocado',
      'Greek yogurt with berries',
      'Protein shake with banana',
      'Turkey sandwich on whole wheat',
      'Tofu stir-fry with vegetables',
      'Egg omelet with cheese',
      'Quinoa bowl with beans'
    ];
  }
}

export default TextAnalysisService;