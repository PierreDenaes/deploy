export interface QuantityParseResult {
  multiplier: number;
  unit?: string;
  originalText: string;
  confidence: number;
  parsedComponents: {
    number?: number;
    textNumber?: string;
    unitType?: 'piece' | 'weight' | 'volume' | 'portion';
    foodType?: string;
  };
}

export class QuantityParser {
  private static readonly FRENCH_NUMBERS = new Map([
    ['un', 1], ['une', 1], ['deux', 2], ['trois', 3], ['quatre', 4], ['cinq', 5],
    ['six', 6], ['sept', 7], ['huit', 8], ['neuf', 9], ['dix', 10],
    ['onze', 11], ['douze', 12], ['treize', 13], ['quatorze', 14], ['quinze', 15],
    ['seize', 16], ['dix-sept', 17], ['dix-huit', 18], ['dix-neuf', 19], ['vingt', 20],
    ['quelques', 3], ['plusieurs', 4], ['beaucoup', 8]
  ]);

  private static readonly ENGLISH_NUMBERS = new Map([
    ['one', 1], ['two', 2], ['three', 3], ['four', 4], ['five', 5],
    ['six', 6], ['seven', 7], ['eight', 8], ['nine', 9], ['ten', 10],
    ['eleven', 11], ['twelve', 12], ['thirteen', 13], ['fourteen', 14], ['fifteen', 15],
    ['sixteen', 16], ['seventeen', 17], ['eighteen', 18], ['nineteen', 19], ['twenty', 20],
    ['some', 3], ['several', 4], ['many', 8], ['few', 2]
  ]);

  private static readonly PORTION_WEIGHTS = new Map([
    // Biscuits et gâteaux
    ['biscuit', 20], ['cookie', 20], ['gâteau', 50], ['cake', 50],
    ['madeleine', 15], ['sablé', 8], ['petit-beurre', 7],
    
    // Pain et viennoiseries
    ['tranche', 25], ['slice', 25], ['tartine', 30], ['toast', 25],
    ['croissant', 60], ['pain', 40], ['baguette', 200],
    
    // Produits laitiers
    ['yaourt', 125], ['yogurt', 125], ['fromage', 30], ['cheese', 30],
    ['lait', 250], ['milk', 250],
    
    // Portions standards
    ['portion', 100], ['serving', 100], ['assiette', 150], ['plate', 150],
    ['bol', 200], ['bowl', 200], ['tasse', 240], ['cup', 240],
    
    // Fruits et légumes
    ['pomme', 150], ['apple', 150], ['banane', 120], ['banana', 120],
    ['orange', 180], ['tomate', 100], ['tomato', 100]
  ]);

  private static readonly FRACTION_PATTERNS = new Map([
    ['1/2', 0.5], ['½', 0.5], ['demi', 0.5], ['half', 0.5],
    ['1/3', 0.33], ['⅓', 0.33], ['tiers', 0.33], ['third', 0.33],
    ['1/4', 0.25], ['¼', 0.25], ['quart', 0.25], ['quarter', 0.25],
    ['2/3', 0.67], ['⅔', 0.67], ['3/4', 0.75], ['¾', 0.75]
  ]);

  private static readonly WEIGHT_PATTERNS = [
    /(\d+(?:[.,]\d+)?)\s*g(?:rammes?)?/i,
    /(\d+(?:[.,]\d+)?)\s*kg(?:ilogrammes?)?/i,
    /(\d+(?:[.,]\d+)?)\s*ml(?:illilitres?)?/i,
    /(\d+(?:[.,]\d+)?)\s*l(?:itres?)?/i,
    /(\d+(?:[.,]\d+)?)\s*oz/i,
    /(\d+(?:[.,]\d+)?)\s*lb/i
  ];

  static parseQuantity(input: string): QuantityParseResult {
    const normalizedInput = input.toLowerCase().trim();
    
    // Try weight patterns first (most precise)
    const weightResult = this.parseWeightQuantity(normalizedInput);
    if (weightResult.confidence > 0.8) {
      return weightResult;
    }

    // Try fraction patterns
    const fractionResult = this.parseFractionQuantity(normalizedInput);
    if (fractionResult.confidence > 0.7) {
      return fractionResult;
    }

    // Try numeric with unit patterns
    const numericResult = this.parseNumericQuantity(normalizedInput);
    if (numericResult.confidence > 0.6) {
      return numericResult;
    }

    // Try text number patterns
    const textResult = this.parseTextQuantity(normalizedInput);
    if (textResult.confidence > 0.5) {
      return textResult;
    }

    // Default fallback
    return {
      multiplier: 1,
      originalText: input,
      confidence: 0.3,
      parsedComponents: {}
    };
  }

  private static parseWeightQuantity(input: string): QuantityParseResult {
    for (const pattern of this.WEIGHT_PATTERNS) {
      const match = input.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'));
        const unit = match[0].replace(match[1], '').trim();
        
        let weightInGrams = value;
        if (unit.includes('kg')) weightInGrams *= 1000;
        if (unit.includes('l') && !unit.includes('ml')) weightInGrams *= 1000;
        if (unit.includes('oz')) weightInGrams *= 28.35;
        if (unit.includes('lb')) weightInGrams *= 453.59;

        return {
          multiplier: weightInGrams / 100, // Convert to ratio for 100g base
          unit: unit,
          originalText: input,
          confidence: 0.9,
          parsedComponents: {
            number: value,
            unitType: 'weight'
          }
        };
      }
    }

    return {
      multiplier: 1,
      originalText: input,
      confidence: 0,
      parsedComponents: {}
    };
  }

  private static parseFractionQuantity(input: string): QuantityParseResult {
    for (const [fraction, value] of this.FRACTION_PATTERNS) {
      if (input.includes(fraction)) {
        const foodType = this.extractFoodType(input);
        const baseWeight = foodType ? this.PORTION_WEIGHTS.get(foodType) || 100 : 100;
        
        return {
          multiplier: value * (baseWeight / 100),
          originalText: input,
          confidence: 0.8,
          parsedComponents: {
            number: value,
            unitType: 'portion',
            foodType: foodType
          }
        };
      }
    }

    return {
      multiplier: 1,
      originalText: input,
      confidence: 0,
      parsedComponents: {}
    };
  }

  private static parseNumericQuantity(input: string): QuantityParseResult {
    // Pattern for numeric values with optional food type
    const numericPattern = /(\d+(?:[.,]\d+)?)\s*(.+)?/;
    const match = input.match(numericPattern);
    
    if (match) {
      const number = parseFloat(match[1].replace(',', '.'));
      const remainder = match[2] || '';
      const foodType = this.extractFoodType(remainder);
      
      if (foodType) {
        const baseWeight = this.PORTION_WEIGHTS.get(foodType) || 100;
        return {
          multiplier: number * (baseWeight / 100),
          originalText: input,
          confidence: 0.7,
          parsedComponents: {
            number: number,
            unitType: 'piece',
            foodType: foodType
          }
        };
      }
      
      // Fallback to simple numeric multiplier
      return {
        multiplier: number,
        originalText: input,
        confidence: 0.6,
        parsedComponents: {
          number: number,
          unitType: 'portion'
        }
      };
    }

    return {
      multiplier: 1,
      originalText: input,
      confidence: 0,
      parsedComponents: {}
    };
  }

  private static parseTextQuantity(input: string): QuantityParseResult {
    // Check French numbers first
    for (const [word, value] of this.FRENCH_NUMBERS) {
      if (input.includes(word)) {
        const foodType = this.extractFoodType(input);
        const baseWeight = foodType ? this.PORTION_WEIGHTS.get(foodType) || 100 : 100;
        
        return {
          multiplier: value * (baseWeight / 100),
          originalText: input,
          confidence: 0.7,
          parsedComponents: {
            number: value,
            textNumber: word,
            unitType: 'piece',
            foodType: foodType
          }
        };
      }
    }

    // Check English numbers
    for (const [word, value] of this.ENGLISH_NUMBERS) {
      if (input.includes(word)) {
        const foodType = this.extractFoodType(input);
        const baseWeight = foodType ? this.PORTION_WEIGHTS.get(foodType) || 100 : 100;
        
        return {
          multiplier: value * (baseWeight / 100),
          originalText: input,
          confidence: 0.7,
          parsedComponents: {
            number: value,
            textNumber: word,
            unitType: 'piece',
            foodType: foodType
          }
        };
      }
    }

    return {
      multiplier: 1,
      originalText: input,
      confidence: 0,
      parsedComponents: {}
    };
  }

  private static extractFoodType(input: string): string | undefined {
    const words = input.split(/\s+/);
    
    for (const word of words) {
      const cleanWord = word.replace(/[^a-zA-Zàâäéèêëîïôöùûüÿç-]/g, '');
      if (this.PORTION_WEIGHTS.has(cleanWord)) {
        return cleanWord;
      }
    }

    // Check for partial matches
    for (const [foodType] of this.PORTION_WEIGHTS) {
      if (input.includes(foodType)) {
        return foodType;
      }
    }

    return undefined;
  }

  static calculateNutritionFromQuantity(
    baseNutrition: any,
    quantityInput: string,
    originalPortionWeight: number = 100
  ): any {
    const parseResult = this.parseQuantity(quantityInput);
    const finalWeight = parseResult.multiplier * originalPortionWeight;
    const ratio = finalWeight / 100; // Most nutrition data is per 100g

    return {
      protein: (baseNutrition.protein || 0) * ratio,
      calories: (baseNutrition.calories || 0) * ratio,
      carbs: (baseNutrition.carbs || 0) * ratio,
      fat: (baseNutrition.fat || 0) * ratio,
      fiber: (baseNutrition.fiber || 0) * ratio,
      sugar: (baseNutrition.sugar || 0) * ratio,
      sodium: (baseNutrition.sodium || 0) * ratio,
      estimatedWeight: finalWeight,
      quantityMultiplier: parseResult.multiplier,
      quantityParseResult: parseResult
    };
  }

  static getPortionSuggestions(foodType?: string): Array<{label: string, value: string, weight: number}> {
    const suggestions: Array<{label: string, value: string, weight: number}> = [];

    if (foodType) {
      const baseWeight = this.PORTION_WEIGHTS.get(foodType) || 100;
      
      suggestions.push(
        {label: `1 ${foodType}`, value: `1 ${foodType}`, weight: baseWeight},
        {label: `2 ${foodType}s`, value: `2 ${foodType}s`, weight: baseWeight * 2},
        {label: `Demi ${foodType}`, value: `1/2 ${foodType}`, weight: baseWeight * 0.5}
      );
    }

    // Add common suggestions
    suggestions.push(
      {label: '1 portion', value: '1 portion', weight: 100},
      {label: '1 tranche', value: '1 tranche', weight: 25},
      {label: '50g', value: '50g', weight: 50},
      {label: '100g', value: '100g', weight: 100},
      {label: '150g', value: '150g', weight: 150}
    );

    return suggestions.slice(0, 6); // Limit to 6 suggestions
  }
}