import { validateImageDataUrl } from '@/utils/sanitize';

export interface ScanResultItem {
  id: string;
  name: string;
  protein: number;
  calories?: number;
  confidence: number;
}

export interface QuickEstimateResult {
  protein: number;
  calories: number | null;
}

export type ScanMode = 'quick_estimate' | 'food_identification';

export interface ScanServiceResponse {
  mode: ScanMode;
  quickEstimate?: QuickEstimateResult;
  foodItems?: ScanResultItem[];
  error?: string;
}

/**
 * Mock scanning service that simulates AI-powered food analysis
 * In production, this would make API calls to your AI backend
 */
export class ScanService {
  
  /**
   * Validate image before processing
   */
  private static validateImage(imageData: string): { isValid: boolean; error?: string } {
    return validateImageDataUrl(imageData);
  }

  /**
   * Generate mock quick estimate results
   */
  private static generateQuickEstimate(): QuickEstimateResult {
    return {
      protein: Math.floor(Math.random() * 30) + 10, // 10-40g protein
      calories: Math.floor(Math.random() * 300) + 150, // 150-450 calories
    };
  }

  /**
   * Generate mock food identification results
   */
  private static generateFoodItems(): ScanResultItem[] {
    const mockFoods = [
      { name: 'Grilled Chicken Breast', protein: 31, calories: 165, baseConfidence: 0.9 },
      { name: 'Greek Yogurt', protein: 17, calories: 100, baseConfidence: 0.85 },
      { name: 'Protein Shake', protein: 25, calories: 150, baseConfidence: 0.8 },
      { name: 'Salmon Fillet', protein: 28, calories: 200, baseConfidence: 0.88 },
      { name: 'Tofu', protein: 12, calories: 80, baseConfidence: 0.75 },
      { name: 'Egg Whites', protein: 11, calories: 50, baseConfidence: 0.82 },
      { name: 'Cottage Cheese', protein: 14, calories: 90, baseConfidence: 0.78 },
      { name: 'Turkey Breast', protein: 26, calories: 135, baseConfidence: 0.86 }
    ];

    // Randomly select 2-4 foods and add some variation
    const numResults = Math.floor(Math.random() * 3) + 2; // 2-4 results
    const selectedFoods = mockFoods
      .sort(() => Math.random() - 0.5)
      .slice(0, numResults)
      .map((food, index) => ({
        id: (index + 1).toString(),
        name: food.name,
        protein: food.protein + Math.floor(Math.random() * 6) - 3, // ±3g variation
        calories: food.calories ? food.calories + Math.floor(Math.random() * 40) - 20 : undefined, // ±20 cal variation
        confidence: Math.max(0.6, food.baseConfidence + (Math.random() * 0.2) - 0.1) // ±0.1 confidence variation
      }))
      .sort((a, b) => b.confidence - a.confidence); // Sort by confidence

    return selectedFoods;
  }

  /**
   * Simulate processing delay
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Perform quick protein/calorie estimation
   */
  static async quickEstimate(imageData: string): Promise<QuickEstimateResult> {
    // Validate image
    const validation = this.validateImage(imageData);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid image data');
    }

    // Simulate processing time
    await this.delay(1500);

    return this.generateQuickEstimate();
  }

  /**
   * Perform detailed food identification
   */
  static async identifyFoods(imageData: string): Promise<ScanResultItem[]> {
    // Validate image
    const validation = this.validateImage(imageData);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid image data');
    }

    // Simulate processing time (longer for more detailed analysis)
    await this.delay(2000);

    const foods = this.generateFoodItems();
    
    // Simulate occasional failures for more realistic behavior
    if (Math.random() < 0.1) { // 10% chance of failure
      throw new Error('Unable to identify foods in the image. Please ensure good lighting and clear visibility of food items.');
    }

    return foods;
  }

  /**
   * Universal scan method that supports both modes
   */
  static async scan(imageData: string, mode: ScanMode): Promise<ScanServiceResponse> {
    try {
      if (mode === 'quick_estimate') {
        const result = await this.quickEstimate(imageData);
        return {
          mode,
          quickEstimate: result
        };
      } else {
        const result = await this.identifyFoods(imageData);
        return {
          mode,
          foodItems: result
        };
      }
    } catch (error) {
      return {
        mode,
        error: error instanceof Error ? error.message : 'Scan failed'
      };
    }
  }
}

export default ScanService;