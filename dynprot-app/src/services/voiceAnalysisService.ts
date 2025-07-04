import { sanitizeMealDescription } from '@/utils/sanitize';

export interface VoiceAnalysis {
  detectedFoods: string[];
  estimatedProtein: number;
  confidence: number;
  suggestions: string[];
  completeness: number;
  audioQuality?: number;
  speechClarity?: number;
  nutritionAccuracy?: number;
}

export interface AudioMetrics {
  volume: number;
  clarity: number;
  duration: number;
  pauseCount: number;
}

/**
 * Enhanced voice analysis service with protein estimation feedback
 */
export class VoiceAnalysisService {
  
  // Enhanced food database with French and English keywords
  private static readonly ENHANCED_FOOD_DATABASE = {
    // High-protein foods (confidence boost)
    'chicken': { 
      protein: 25, calories: 165, confidence: 0.9, category: 'protein',
      keywords: ['chicken', 'poulet', 'blanc de poulet', 'filet de poulet', 'escalope de poulet']
    },
    'salmon': { 
      protein: 28, calories: 200, confidence: 0.95, category: 'protein',
      keywords: ['salmon', 'saumon', 'pavé de saumon', 'filet de saumon']
    },
    'tuna': { 
      protein: 30, calories: 130, confidence: 0.9, category: 'protein',
      keywords: ['tuna', 'thon', 'steak de thon', 'miettes de thon']
    },
    'beef': { 
      protein: 26, calories: 250, confidence: 0.9, category: 'protein',
      keywords: ['beef', 'bœuf', 'boeuf', 'steak', 'entrecôte', 'côte de bœuf', 'bavette']
    },
    'turkey': { 
      protein: 24, calories: 135, confidence: 0.85, category: 'protein',
      keywords: ['turkey', 'dinde', 'escalope de dinde', 'blanc de dinde']
    },
    'pork': { 
      protein: 22, calories: 220, confidence: 0.8, category: 'protein',
      keywords: ['pork', 'porc', 'côte de porc', 'filet de porc', 'jambon', 'bacon', 'lardons']
    },
    'fish': { 
      protein: 22, calories: 150, confidence: 0.7, category: 'protein',
      keywords: ['fish', 'poisson', 'cabillaud', 'sole', 'dorade', 'bar', 'truite']
    },
    'shrimp': { 
      protein: 20, calories: 85, confidence: 0.9, category: 'protein',
      keywords: ['shrimp', 'prawns', 'crevettes', 'gambas']
    },
    'crab': { 
      protein: 20, calories: 95, confidence: 0.85, category: 'protein',
      keywords: ['crab', 'crabe', 'chair de crabe']
    },
    
    // Dairy and eggs
    'eggs': { 
      protein: 12, calories: 155, confidence: 0.9, category: 'protein',
      keywords: ['eggs', 'œufs', 'oeufs', 'œuf', 'oeuf', 'omelette', 'œufs brouillés']
    },
    'egg whites': { 
      protein: 11, calories: 17, confidence: 0.95, category: 'protein',
      keywords: ['egg whites', 'blancs d\'œufs', 'blancs d\'oeufs', 'blanc d\'œuf']
    },
    'greek yogurt': { 
      protein: 20, calories: 130, confidence: 0.9, category: 'dairy',
      keywords: ['greek yogurt', 'yaourt grec', 'yogourt grec', 'skyr']
    },
    'yogurt': { 
      protein: 17, calories: 100, confidence: 0.8, category: 'dairy',
      keywords: ['yogurt', 'yaourt', 'yogourt']
    },
    'cottage cheese': { 
      protein: 14, calories: 98, confidence: 0.9, category: 'dairy',
      keywords: ['cottage cheese', 'fromage blanc', 'faisselle']
    },
    'cheese': { 
      protein: 14, calories: 200, confidence: 0.7, category: 'dairy',
      keywords: ['cheese', 'fromage', 'gruyère', 'emmental', 'camembert', 'brie', 'chèvre']
    },
    'milk': { 
      protein: 8, calories: 150, confidence: 0.8, category: 'dairy',
      keywords: ['milk', 'lait', 'lait écrémé', 'lait entier']
    },
    
    // Plant proteins
    'tofu': { 
      protein: 12, calories: 80, confidence: 0.9, category: 'plant',
      keywords: ['tofu']
    },
    'tempeh': { 
      protein: 15, calories: 160, confidence: 0.85, category: 'plant',
      keywords: ['tempeh']
    },
    'seitan': { 
      protein: 25, calories: 120, confidence: 0.8, category: 'plant',
      keywords: ['seitan']
    },
    'beans': { 
      protein: 8, calories: 120, confidence: 0.7, category: 'plant',
      keywords: ['beans', 'haricots', 'haricots rouges', 'haricots blancs', 'flageolets']
    },
    'black beans': { 
      protein: 9, calories: 130, confidence: 0.8, category: 'plant',
      keywords: ['black beans', 'haricots noirs']
    },
    'lentils': { 
      protein: 9, calories: 115, confidence: 0.8, category: 'plant',
      keywords: ['lentils', 'lentilles', 'lentilles vertes', 'lentilles corail']
    },
    'chickpeas': { 
      protein: 8, calories: 130, confidence: 0.8, category: 'plant',
      keywords: ['chickpeas', 'pois chiches', 'houmous', 'hummus']
    },
    'quinoa': { 
      protein: 4, calories: 120, confidence: 0.9, category: 'grain',
      keywords: ['quinoa']
    },
    'nuts': { 
      protein: 6, calories: 200, confidence: 0.6, category: 'plant',
      keywords: ['nuts', 'noix', 'amandes', 'noisettes', 'pistaches', 'cacahuètes']
    },
    'almonds': { 
      protein: 6, calories: 160, confidence: 0.7, category: 'plant',
      keywords: ['almonds', 'amandes']
    },
    'peanut butter': { 
      protein: 8, calories: 190, confidence: 0.8, category: 'plant',
      keywords: ['peanut butter', 'beurre de cacahuète', 'beurre d\'arachide']
    },
    
    // Supplements
    'protein shake': { 
      protein: 25, calories: 150, confidence: 0.95, category: 'supplement',
      keywords: ['protein shake', 'shake protéiné', 'shake de protéines', 'boisson protéinée']
    },
    'protein powder': { 
      protein: 30, calories: 120, confidence: 0.95, category: 'supplement',
      keywords: ['protein powder', 'poudre de protéines', 'protéine en poudre', 'whey']
    },
    'protein bar': { 
      protein: 20, calories: 200, confidence: 0.9, category: 'supplement',
      keywords: ['protein bar', 'barre protéinée', 'barre de protéines']
    },
    'whey protein': { 
      protein: 25, calories: 120, confidence: 0.95, category: 'supplement',
      keywords: ['whey protein', 'whey', 'protéine de lactosérum']
    },

    // Additional high-protein foods for better accuracy
    'cod': { 
      protein: 32, calories: 180, confidence: 0.9, category: 'protein',
      keywords: ['cod', 'cabillaud', 'morue']
    },
    'halibut': { 
      protein: 30, calories: 190, confidence: 0.9, category: 'protein',
      keywords: ['halibut', 'flétan']
    },
    'lean ground beef': { 
      protein: 28, calories: 200, confidence: 0.9, category: 'protein',
      keywords: ['lean ground beef', 'bœuf haché maigre', 'viande hachée maigre']
    },
    'lean pork': { 
      protein: 26, calories: 180, confidence: 0.85, category: 'protein',
      keywords: ['lean pork', 'porc maigre', 'filet mignon de porc']
    },
    'duck breast': { 
      protein: 23, calories: 200, confidence: 0.85, category: 'protein',
      keywords: ['duck breast', 'magret de canard', 'filet de canard']
    },
    
    // Low protein foods (for context)
    'rice': { 
      protein: 3, calories: 130, confidence: 0.8, category: 'grain',
      keywords: ['rice', 'riz', 'riz blanc', 'riz complet', 'riz basmati']
    },
    'pasta': { 
      protein: 5, calories: 160, confidence: 0.8, category: 'grain',
      keywords: ['pasta', 'pâtes', 'spaghetti', 'penne', 'tagliatelles', 'macaroni']
    },
    'bread': { 
      protein: 3, calories: 80, confidence: 0.7, category: 'grain',
      keywords: ['bread', 'pain', 'baguette', 'pain complet', 'pain de mie']
    },
    'salad': { 
      protein: 1, calories: 20, confidence: 0.6, category: 'vegetable',
      keywords: ['salad', 'salade', 'laitue', 'roquette', 'épinards']
    },
    'vegetables': { 
      protein: 2, calories: 25, confidence: 0.5, category: 'vegetable',
      keywords: ['vegetables', 'légumes', 'courgettes', 'brocolis', 'carottes', 'tomates']
    },
  };

  // Cooking methods and their impact (French and English)
  private static readonly COOKING_METHODS = {
    'grilled': { 
      proteinRetention: 1.0, calorieMultiplier: 1.0, confidence: 0.1,
      keywords: ['grilled', 'grillé', 'grillée', 'au grill', 'à la plancha']
    },
    'baked': { 
      proteinRetention: 1.0, calorieMultiplier: 1.0, confidence: 0.1,
      keywords: ['baked', 'cuit au four', 'au four']
    },
    'roasted': { 
      proteinRetention: 0.95, calorieMultiplier: 1.1, confidence: 0.1,
      keywords: ['roasted', 'rôti', 'rôtie', 'rôtis']
    },
    'steamed': { 
      proteinRetention: 1.0, calorieMultiplier: 0.9, confidence: 0.1,
      keywords: ['steamed', 'vapeur', 'à la vapeur', 'cuit vapeur']
    },
    'boiled': { 
      proteinRetention: 0.9, calorieMultiplier: 0.9, confidence: 0.1,
      keywords: ['boiled', 'bouilli', 'bouillie', 'à l\'eau']
    },
    'fried': { 
      proteinRetention: 0.9, calorieMultiplier: 1.5, confidence: 0.1,
      keywords: ['fried', 'frit', 'frite', 'frits', 'poêlé', 'poêlée', 'sauté', 'sautée']
    },
    'sautéed': { 
      proteinRetention: 0.95, calorieMultiplier: 1.2, confidence: 0.1,
      keywords: ['sautéed', 'sauté', 'sautée', 'sautés', 'à la poêle']
    },
    'raw': { 
      proteinRetention: 1.0, calorieMultiplier: 1.0, confidence: 0.1,
      keywords: ['raw', 'cru', 'crue', 'crus', 'tartare', 'sashimi']
    },
  };

  // Enhanced portion indicators with more precise measurements
  private static readonly PORTION_INDICATORS = {
    // Size modifiers with better precision
    'tiny': { multiplier: 0.4, keywords: ['tiny', 'minuscule', 'tout petit', 'toute petite', 'mini'] },
    'small': { multiplier: 0.7, keywords: ['small', 'petit', 'petite', 'petits', 'petites'] },
    'medium': { multiplier: 1.0, keywords: ['medium', 'moyen', 'moyenne', 'moyens', 'moyennes', 'normal', 'normale', 'standard'] },
    'large': { multiplier: 1.4, keywords: ['large', 'grand', 'grande', 'grands', 'grandes', 'gros', 'grosse'] },
    'big': { multiplier: 1.5, keywords: ['big', 'gros', 'grosse', 'volumineux', 'volumineuse'] },
    'huge': { multiplier: 1.8, keywords: ['huge', 'énorme', 'énormes', 'géant', 'géante', 'massif', 'massive'] },
    'extra large': { multiplier: 2.0, keywords: ['extra large', 'très grand', 'très grande', 'xl'] },
    
    // Quantity modifiers with decimals
    'quarter': { multiplier: 0.25, keywords: ['quarter', 'quart', 'un quart', '1/4'] },
    'third': { multiplier: 0.33, keywords: ['third', 'tiers', 'un tiers', '1/3'] },
    'half': { multiplier: 0.5, keywords: ['half', 'demi', 'demie', 'moitié', 'la moitié', '1/2'] },
    'two thirds': { multiplier: 0.67, keywords: ['two thirds', 'deux tiers', '2/3'] },
    'three quarters': { multiplier: 0.75, keywords: ['three quarters', 'trois quarts', '3/4'] },
    'one and half': { multiplier: 1.5, keywords: ['one and half', 'un et demi', 'une et demie', '1.5'] },
    'double': { multiplier: 2.0, keywords: ['double', 'deux fois'] },
    'triple': { multiplier: 3.0, keywords: ['triple', 'trois fois'] },
    
    // Specific quantities
    'one': { multiplier: 1.0, keywords: ['one', 'un', 'une', '1'] },
    'two': { multiplier: 2.0, keywords: ['two', 'deux', '2'] },
    'three': { multiplier: 3.0, keywords: ['three', 'trois', '3'] },
    'four': { multiplier: 4.0, keywords: ['four', 'quatre', '4'] },
    'five': { multiplier: 5.0, keywords: ['five', 'cinq', '5'] },
    'six': { multiplier: 6.0, keywords: ['six', '6'] },
    
    // Measurement terms with protein-specific portions
    'fillet': { multiplier: 1.2, keywords: ['fillet', 'filet', 'escalope'] },
    'breast': { multiplier: 1.3, keywords: ['breast', 'blanc', 'poitrine'] },
    'thigh': { multiplier: 0.9, keywords: ['thigh', 'cuisse'] },
    'steak': { multiplier: 1.5, keywords: ['steak', 'pavé'] },
    'cutlet': { multiplier: 1.1, keywords: ['cutlet', 'côtelette'] },
    'cup': { multiplier: 1.0, keywords: ['cup', 'tasse', 'bol'] },
    'bowl': { multiplier: 1.2, keywords: ['bowl', 'bol', 'assiette creuse'] },
    'plate': { multiplier: 1.0, keywords: ['plate', 'assiette', 'plat'] },
    'portion': { multiplier: 1.0, keywords: ['portion', 'part', 'parts'] },
    'serving': { multiplier: 1.0, keywords: ['serving', 'portion'] },
    'slice': { multiplier: 0.3, keywords: ['slice', 'tranche', 'tranches'] },
    'piece': { multiplier: 0.5, keywords: ['piece', 'morceau', 'morceaux'] },
    'scoop': { multiplier: 0.8, keywords: ['scoop', 'cuillère', 'cuillérée', 'dose'] },
    
    // Weight-based portions (approximate)
    '100g': { multiplier: 1.0, keywords: ['100g', '100 g', '100 grammes', 'cent grammes'] },
    '150g': { multiplier: 1.5, keywords: ['150g', '150 g', '150 grammes'] },
    '200g': { multiplier: 2.0, keywords: ['200g', '200 g', '200 grammes'] },
    '250g': { multiplier: 2.5, keywords: ['250g', '250 g', '250 grammes'] },
    'palm size': { multiplier: 1.0, keywords: ['palm size', 'taille de paume', 'gros comme la paume'] },
    'deck of cards': { multiplier: 0.8, keywords: ['deck of cards', 'jeu de cartes', 'comme un jeu de cartes'] },
  };

  /**
   * Analyze voice input for protein content with enhanced feedback
   */
  static analyzeVoiceInput(
    transcript: string, 
    audioMetrics?: AudioMetrics
  ): VoiceAnalysis {
    const sanitized = sanitizeMealDescription(transcript.trim().toLowerCase());
    
    // Extract foods and methods
    const detectedFoods = this.extractFoods(sanitized);
    const cookingMethods = this.extractCookingMethods(sanitized);
    const portionModifiers = this.extractPortionModifiers(sanitized);
    
    // Calculate nutrition
    const nutrition = this.calculateNutrition(detectedFoods, cookingMethods, portionModifiers);
    
    // Calculate confidence scores
    const confidence = this.calculateConfidence(
      detectedFoods, 
      cookingMethods, 
      sanitized, 
      audioMetrics
    );
    
    // Calculate completeness
    const completeness = this.calculateCompleteness(sanitized, detectedFoods, cookingMethods);
    
    // Generate suggestions
    const suggestions = this.generateSmartSuggestions(
      detectedFoods, 
      cookingMethods, 
      confidence, 
      completeness
    );

    return {
      detectedFoods: detectedFoods.map(food => this.formatFoodName(food.name)),
      estimatedProtein: Math.round(nutrition.protein),
      confidence: Math.min(0.98, confidence.overall),
      suggestions,
      completeness,
      audioQuality: audioMetrics?.clarity || 0,
      speechClarity: confidence.speechClarity,
      nutritionAccuracy: confidence.nutritionAccuracy
    };
  }

  /**
   * Extract foods from transcript with enhanced detection using keywords
   */
  private static extractFoods(text: string): Array<{name: string, data: any, confidence: number}> {
    const foods: Array<{name: string, data: any, confidence: number}> = [];
    
    Object.entries(this.ENHANCED_FOOD_DATABASE).forEach(([foodName, foodData]) => {
      // Check for keyword matches
      const matchedKeyword = foodData.keywords.find(keyword => text.includes(keyword));
      if (matchedKeyword) {
        // Calculate confidence based on keyword specificity
        let keywordConfidence = foodData.confidence;
        
        // Boost confidence for longer, more specific keywords
        if (matchedKeyword.length > 8) {
          keywordConfidence *= 1.1;
        } else if (matchedKeyword.length < 4) {
          keywordConfidence *= 0.9;
        }
        
        foods.push({
          name: foodName,
          data: { ...foodData, matchedKeyword },
          confidence: Math.min(0.98, keywordConfidence)
        });
      }
    });
    
    // Remove duplicates and sort by confidence
    const uniqueFoods = foods.filter((food, index, array) => 
      array.findIndex(f => f.name === food.name) === index
    );
    
    return uniqueFoods.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extract cooking methods using keywords
   */
  private static extractCookingMethods(text: string): string[] {
    const methods: string[] = [];
    
    Object.entries(this.COOKING_METHODS).forEach(([methodName, methodData]) => {
      const matchedKeyword = methodData.keywords.find(keyword => text.includes(keyword));
      if (matchedKeyword) {
        methods.push(methodName);
      }
    });
    
    return methods;
  }

  /**
   * Extract portion modifiers using keywords
   */
  private static extractPortionModifiers(text: string): number {
    let multiplier = 1.0;
    
    Object.entries(this.PORTION_INDICATORS).forEach(([indicatorName, indicatorData]) => {
      const matchedKeyword = indicatorData.keywords.find(keyword => text.includes(keyword));
      if (matchedKeyword) {
        multiplier *= indicatorData.multiplier;
      }
    });
    
    return multiplier;
  }

  /**
   * Calculate nutrition with enhanced accuracy and contextual adjustments
   */
  private static calculateNutrition(
    foods: Array<{name: string, data: any, confidence: number}>,
    cookingMethods: string[],
    portionMultiplier: number
  ): {protein: number, calories: number} {
    let totalProtein = 0;
    let totalCalories = 0;
    let proteinFoodCount = 0;

    // Base nutrition from foods with enhanced protein calculation
    foods.forEach(food => {
      const baseProtein = food.data.protein * food.confidence;
      const baseCalories = food.data.calories * food.confidence;
      
      // Apply category-based confidence boost for protein sources
      let proteinBoost = 1.0;
      if (food.data.category === 'protein' && food.data.protein >= 20) {
        proteinBoost = 1.1; // 10% boost for high-quality protein sources
        proteinFoodCount++;
      } else if (food.data.category === 'supplement') {
        proteinBoost = 1.05; // 5% boost for protein supplements
        proteinFoodCount++;
      }
      
      totalProtein += baseProtein * proteinBoost;
      totalCalories += baseCalories;
    });

    // Apply cooking method effects with improved protein retention
    let proteinRetentionFactor = 1.0;
    let calorieMultiplierFactor = 1.0;
    
    cookingMethods.forEach(method => {
      const methodData = this.COOKING_METHODS[method as keyof typeof this.COOKING_METHODS];
      if (methodData) {
        proteinRetentionFactor *= methodData.proteinRetention;
        calorieMultiplierFactor *= methodData.calorieMultiplier;
      }
    });

    totalProtein *= proteinRetentionFactor;
    totalCalories *= calorieMultiplierFactor;

    // Apply portion modifier with smart scaling
    totalProtein *= portionMultiplier;
    totalCalories *= portionMultiplier;

    // Add contextual protein bonus for complete meals
    if (proteinFoodCount > 0 && foods.length > 1) {
      // Small bonus for meals with complementary foods (amino acid completeness)
      const completeMealBonus = Math.min(0.15, foods.length * 0.05);
      totalProtein *= (1 + completeMealBonus);
    }

    // Apply realistic bounds and rounding
    totalProtein = Math.max(0, Math.min(150, totalProtein)); // Cap at reasonable maximum
    totalCalories = Math.max(0, Math.min(2000, totalCalories)); // Cap at reasonable maximum

    return {
      protein: totalProtein,
      calories: totalCalories
    };
  }

  /**
   * Calculate comprehensive confidence scores with enhanced protein accuracy assessment
   */
  private static calculateConfidence(
    foods: Array<{name: string, data: any, confidence: number}>,
    cookingMethods: string[],
    text: string,
    audioMetrics?: AudioMetrics
  ): {
    overall: number,
    speechClarity: number,
    nutritionAccuracy: number,
    contextualRelevance: number
  } {
    let baseConfidence = 0.2; // Lower starting point for more stringent evaluation

    // Enhanced food detection confidence with protein focus
    if (foods.length > 0) {
      const avgFoodConfidence = foods.reduce((sum, food) => sum + food.confidence, 0) / foods.length;
      baseConfidence += avgFoodConfidence * 0.35;
      
      // Bonus for protein-rich foods with specific measurements
      const proteinFoods = foods.filter(food => food.data.category === 'protein');
      if (proteinFoods.length > 0) {
        baseConfidence += proteinFoods.length * 0.08; // Up to 16% boost for 2 protein sources
      }
    }

    // Multiple foods detected with synergy bonus
    if (foods.length > 1) {
      baseConfidence += Math.min(0.15, foods.length * 0.05); // Diminishing returns
    }

    // Enhanced cooking method evaluation
    if (cookingMethods.length > 0) {
      baseConfidence += 0.08;
      // Bonus for healthy cooking methods
      const healthyMethods = ['grilled', 'baked', 'steamed', 'roasted'];
      const hasHealthyMethod = cookingMethods.some(method => healthyMethods.includes(method));
      if (hasHealthyMethod) {
        baseConfidence += 0.05;
      }
    }

    // Enhanced text analysis with protein keywords
    const wordCount = text.split(' ').length;
    if (wordCount >= 4) baseConfidence += 0.08;
    if (wordCount >= 7) baseConfidence += 0.08;
    if (wordCount >= 12) baseConfidence += 0.06; // Detailed descriptions

    // Protein-specific keyword detection
    const proteinKeywords = [
      'grammes', 'grams', 'g', 'portion', 'filet', 'escalope', 'blanc', 'steak',
      'cuisse', 'pavé', 'tranche', 'morceau', '100g', '150g', '200g', 'palm size'
    ];
    const proteinKeywordCount = proteinKeywords.filter(keyword => text.includes(keyword)).length;
    baseConfidence += Math.min(0.12, proteinKeywordCount * 0.03);

    // High-protein food categories with enhanced scoring
    const hasHighProteinFood = foods.some(food => 
      food.data.category === 'protein' && food.data.protein >= 25
    );
    const hasVeryHighProteinFood = foods.some(food => 
      food.data.category === 'protein' && food.data.protein >= 30
    );
    
    if (hasVeryHighProteinFood) {
      baseConfidence += 0.15;
    } else if (hasHighProteinFood) {
      baseConfidence += 0.10;
    }

    // Supplement detection (usually very accurate)
    const hasSupplements = foods.some(food => food.data.category === 'supplement');
    if (hasSupplements) {
      baseConfidence += 0.12;
    }

    // Enhanced audio quality factors
    let speechClarity = 0.75; // Slightly lower default
    if (audioMetrics) {
      speechClarity = Math.min(1.0, audioMetrics.clarity * 0.7 + audioMetrics.volume * 0.3);
      const audioQualityFactor = 0.6 + speechClarity * 0.4;
      baseConfidence *= audioQualityFactor;
    }

    // Enhanced nutrition accuracy with protein focus
    let nutritionAccuracy = 0.4; // Base accuracy
    if (foods.length > 0) {
      const proteinFoodConfidence = foods
        .filter(food => food.data.category === 'protein' || food.data.category === 'supplement')
        .reduce((sum, food) => sum + food.confidence, 0);
      
      const totalFoodConfidence = foods.reduce((sum, food) => sum + food.confidence, 0);
      
      // Weight protein foods more heavily in accuracy calculation
      nutritionAccuracy = proteinFoodConfidence > 0 
        ? (proteinFoodConfidence * 0.7 + totalFoodConfidence * 0.3) / foods.length
        : totalFoodConfidence / foods.length;
    }

    // Enhanced contextual relevance
    let contextualRelevance = 0.4;
    const mealIndicators = [
      'with', 'and', 'on', 'in', 'for', 'meal', 'breakfast', 'lunch', 'dinner',
      'avec', 'et', 'sur', 'dans', 'pour', 'repas', 'petit-déjeuner', 'déjeuner', 'dîner',
      'accompagné', 'servi', 'mélangé', 'grillé', 'cuit', 'preparé'
    ];
    const indicatorCount = mealIndicators.filter(indicator => text.includes(indicator)).length;
    contextualRelevance += Math.min(0.4, indicatorCount * 0.08);

    // Portion size indicators boost relevance
    const portionIndicators = ['petit', 'grand', 'gros', 'large', 'portion', 'assiette'];
    const portionCount = portionIndicators.filter(indicator => text.includes(indicator)).length;
    contextualRelevance += Math.min(0.2, portionCount * 0.05);

    return {
      overall: Math.min(0.96, Math.max(0.1, baseConfidence)), // More realistic bounds
      speechClarity: Math.max(0.1, speechClarity),
      nutritionAccuracy: Math.max(0.1, Math.min(0.95, nutritionAccuracy)),
      contextualRelevance: Math.max(0.1, Math.min(0.95, contextualRelevance))
    };
  }

  /**
   * Calculate description completeness
   */
  private static calculateCompleteness(
    text: string,
    foods: Array<{name: string, data: any, confidence: number}>,
    cookingMethods: string[]
  ): number {
    let completeness = 0;

    // Base points for food detection
    completeness += Math.min(50, foods.length * 20);

    // Points for cooking method
    if (cookingMethods.length > 0) completeness += 15;

    // Points for description length
    const wordCount = text.split(' ').length;
    completeness += Math.min(20, wordCount * 2);

    // Points for meal context words (French and English)
    const contextWords = [
      'with', 'and', 'served', 'topped', 'mixed',
      'avec', 'et', 'servi', 'servie', 'garni', 'garnie', 'mélangé', 'mélangée',
      'accompagné', 'accompagnée'
    ];
    const contextCount = contextWords.filter(word => text.includes(word)).length;
    completeness += Math.min(15, contextCount * 5);

    return Math.min(100, completeness);
  }

  /**
   * Generate enhanced protein-focused suggestions based on analysis (in French)
   */
  private static generateSmartSuggestions(
    foods: Array<{name: string, data: any, confidence: number}>,
    cookingMethods: string[],
    confidence: any,
    completeness: number
  ): string[] {
    const suggestions: string[] = [];
    const proteinFoods = foods.filter(f => f.data.category === 'protein' || f.data.category === 'supplement');
    const totalProtein = foods.reduce((sum, food) => sum + food.data.protein * food.confidence, 0);

    // Enhanced food-specific suggestions with protein focus
    if (foods.length === 0) {
      suggestions.push("Mentionnez des aliments riches en protéines avec des quantités précises : '150g de saumon grillé'");
    } else if (proteinFoods.length === 0) {
      suggestions.push("Ajoutez une source de protéines de qualité : poulet, poisson, œufs, ou légumineuses");
    } else if (proteinFoods.length === 1) {
      const protein = proteinFoods[0];
      if (protein.data.protein >= 25) {
        suggestions.push("Excellente source de protéines ! Précisez la taille de la portion pour une estimation optimale");
      } else {
        suggestions.push("Bonne source de protéines ! Envisagez d'ajouter une portion plus importante ou une protéine complémentaire");
      }
    }

    // Protein quantity and quality suggestions
    if (totalProtein < 15 && foods.length > 0) {
      suggestions.push("Votre repas semble faible en protéines. Ajoutez 100-150g de viande, poisson ou équivalent végétal");
    } else if (totalProtein >= 30) {
      suggestions.push("Excellent apport protéique ! Ce repas contribue significativement à vos objectifs quotidiens");
    } else if (totalProtein >= 20) {
      suggestions.push("Bon apport en protéines ! Idéal pour la récupération musculaire et la satiété");
    }

    // Enhanced cooking method suggestions with protein preservation
    if (cookingMethods.length === 0 && proteinFoods.length > 0) {
      suggestions.push("Précisez la cuisson pour une estimation plus précise : grillé/vapeur (optimal) ou poêlé/frit");
    } else if (cookingMethods.includes('fried')) {
      suggestions.push("La friture réduit la digestibilité des protéines. Privilégiez la grillade ou la cuisson vapeur");
    } else if (cookingMethods.some(m => ['grilled', 'steamed', 'baked'].includes(m))) {
      suggestions.push("Excellente méthode de cuisson qui préserve la qualité des protéines !");
    }

    // Portion size suggestions with protein focus
    const hasPortionIndicator = foods.some(food => 
      ['100g', '150g', '200g', 'palm size', 'fillet', 'breast', 'steak'].some(portion => 
        food.data.keywords?.some((keyword: string) => keyword.includes(portion))
      )
    );
    
    if (!hasPortionIndicator && proteinFoods.length > 0) {
      suggestions.push("Précisez la taille : 'gros comme la paume' ou '150g' pour une estimation de protéines plus fiable");
    }

    // Confidence-based protein suggestions
    if (confidence.overall < 0.5) {
      suggestions.push("Pour améliorer la précision, décrivez : type de protéine + taille + mode de cuisson");
    } else if (confidence.nutritionAccuracy < 0.6) {
      suggestions.push("Ajoutez des détails nutritionnels : 'blanc de poulet sans peau' vs 'cuisse de poulet'");
    }

    // Completeness suggestions with protein context
    if (completeness < 40) {
      suggestions.push("Description incomplète. Exemple : 'filet de saumon grillé de 150g avec légumes vapeur'");
    } else if (completeness < 70 && proteinFoods.length > 0) {
      suggestions.push("Bonne base ! Ajoutez des détails sur les accompagnements pour optimiser l'analyse");
    }

    // Advanced protein optimization suggestions
    if (proteinFoods.length > 1) {
      suggestions.push("Excellente combinaison de protéines ! La diversité améliore l'absorption des acides aminés");
    }

    // Supplement-specific suggestions
    const hasSupplements = foods.some(f => f.data.category === 'supplement');
    if (hasSupplements) {
      suggestions.push("Supplément détecté ! Timing optimal : post-entraînement ou entre les repas");
    }

    // Filter out duplicate themes and prioritize by importance
    const uniqueSuggestions = suggestions.filter((suggestion, index, array) => 
      array.findIndex(s => s.split(' ')[0] === suggestion.split(' ')[0]) === index
    );

    return uniqueSuggestions.slice(0, 3); // Limit to top 3 most relevant suggestions
  }

  /**
   * Format food name for display
   */
  private static formatFoodName(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get voice input tips (in French)
   */
  static getVoiceInputTips(): string[] {
    return [
      "Parlez clairement et à un rythme normal",
      "Mentionnez des aliments spécifiques : 'blanc de poulet grillé' plutôt que juste 'poulet'",
      "Incluez le mode de cuisson : 'saumon au four' ou 'tofu poêlé'",
      "Décrivez les portions : 'grande portion' ou 'deux œufs'",
      "Ajoutez du contexte : 'salade de poulet avec avocat' donne de meilleures estimations",
      "Marquez une brève pause entre les différents aliments de votre repas"
    ];
  }

  /**
   * Validate voice analysis result (in French)
   */
  static validateAnalysis(analysis: VoiceAnalysis): {isValid: boolean, warnings: string[]} {
    const warnings: string[] = [];
    
    if (analysis.confidence < 0.4) {
      warnings.push("Faible confiance dans la reconnaissance vocale. Envisagez d'utiliser la saisie de texte.");
    }
    
    if (analysis.detectedFoods.length === 0) {
      warnings.push("Aucun aliment spécifique détecté. Soyez plus précis.");
    }
    
    if (analysis.estimatedProtein < 1) {
      warnings.push("Estimation de protéines très faible. Vérifiez si des sources de protéines ont été mentionnées.");
    }
    
    if (analysis.completeness < 30) {
      warnings.push("La description semble incomplète. Ajoutez plus de détails pour une meilleure précision.");
    }

    return {
      isValid: warnings.length < 2,
      warnings
    };
  }
}

export default VoiceAnalysisService;