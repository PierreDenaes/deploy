import prisma from '../lib/prisma';

// =====================================================
// NUTRITION CALCULATION SERVICE
// =====================================================

export interface MacroCalculation {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  fiber?: number;
}

export interface GoalRecommendation {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  bmr: number;
  tdee: number;
  rationale: string;
}

export interface NutritionAnalysis {
  macros: MacroCalculation;
  micronutrients?: Record<string, number>;
  quality_score: number;
  recommendations: string[];
}

// =====================================================
// BMR AND TDEE CALCULATIONS
// =====================================================

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor Equation
 */
export function calculateBMR(
  weight: number, 
  height: number, 
  age: number, 
  gender: string
): number {
  const baseRate = (10 * weight) + (6.25 * height) - (5 * age);
  return gender === 'male' ? baseRate + 5 : baseRate - 161;
}

/**
 * Calculate Total Daily Energy Expenditure
 */
export function calculateTDEE(bmr: number, activityLevel: string): number {
  const multipliers = {
    'sedentary': 1.2,
    'light': 1.375,
    'moderate': 1.55,
    'very_active': 1.725,
    'extremely_active': 1.9
  };
  
  return bmr * (multipliers[activityLevel as keyof typeof multipliers] || 1.55);
}

// =====================================================
// PROTEIN GOAL CALCULATIONS
// =====================================================

/**
 * Calculate optimal protein intake based on user characteristics and goals
 */
export function calculateProteinGoal(
  weight: number,
  activityLevel: string,
  fitnessGoal?: string,
  bodyFatPercentage?: number
): number {
  let proteinPerKg = 0.8; // Base recommendation
  
  // Adjust for activity level
  switch (activityLevel) {
    case 'sedentary':
      proteinPerKg = 0.8;
      break;
    case 'light':
      proteinPerKg = 1.0;
      break;
    case 'moderate':
      proteinPerKg = 1.2;
      break;
    case 'very_active':
      proteinPerKg = 1.6;
      break;
    case 'extremely_active':
      proteinPerKg = 2.0;
      break;
  }
  
  // Adjust for fitness goals
  switch (fitnessGoal) {
    case 'lose_weight':
      proteinPerKg *= 1.2; // Higher protein for muscle preservation
      break;
    case 'gain_muscle':
      proteinPerKg *= 1.4; // Higher protein for muscle building
      break;
    case 'bulk':
      proteinPerKg *= 1.3;
      break;
    case 'cut':
      proteinPerKg *= 1.5; // Highest protein for cutting
      break;
    case 'maintain':
    default:
      // No adjustment needed
      break;
  }
  
  // Adjust for body composition if available
  if (bodyFatPercentage && bodyFatPercentage > 0) {
    const leanMass = weight * (1 - bodyFatPercentage / 100);
    // Base calculation on lean mass for more accurate needs
    return Math.round(leanMass * proteinPerKg * 1.1);
  }
  
  return Math.round(weight * proteinPerKg);
}

// =====================================================
// MACRO DISTRIBUTION CALCULATIONS
// =====================================================

/**
 * Calculate optimal macro distribution based on goals
 */
export function calculateMacroDistribution(
  totalCalories: number,
  proteinGrams: number,
  fitnessGoal?: string,
  dietPreferences: string[] = []
): MacroCalculation {
  const proteinCalories = proteinGrams * 4;
  const remainingCalories = totalCalories - proteinCalories;
  
  // Default ratios (can be adjusted based on goals and preferences)
  let carbPercentage = 45;
  let fatPercentage = 35;
  
  // Adjust based on fitness goals
  switch (fitnessGoal) {
    case 'cut':
      carbPercentage = 30;
      fatPercentage = 50;
      break;
    case 'bulk':
      carbPercentage = 55;
      fatPercentage = 25;
      break;
    case 'gain_muscle':
      carbPercentage = 50;
      fatPercentage = 30;
      break;
  }
  
  // Adjust based on diet preferences
  if (dietPreferences.includes('keto')) {
    carbPercentage = 10;
    fatPercentage = 70;
  } else if (dietPreferences.includes('low-fat')) {
    carbPercentage = 65;
    fatPercentage = 15;
  } else if (dietPreferences.includes('paleo')) {
    carbPercentage = 35;
    fatPercentage = 45;
  }
  
  // Calculate actual grams
  const carbCalories = remainingCalories * (carbPercentage / 100);
  const fatCalories = remainingCalories * (fatPercentage / 100);
  
  const carbGrams = Math.round(carbCalories / 4);
  const fatGrams = Math.round(fatCalories / 9);
  
  return {
    protein: proteinGrams,
    carbs: carbGrams,
    fat: fatGrams,
    calories: totalCalories
  };
}

// =====================================================
// GOAL RECOMMENDATION SERVICE
// =====================================================

/**
 * Generate comprehensive nutrition goal recommendations
 */
export function generateGoalRecommendations(
  weight: number,
  height: number,
  age: number,
  gender: string,
  activityLevel: string,
  fitnessGoal?: string,
  dietPreferences: string[] = [],
  bodyFatPercentage?: number
): GoalRecommendation {
  // Calculate BMR and TDEE
  const bmr = calculateBMR(weight, height, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel);
  
  // Adjust calories based on fitness goal
  let dailyCalories = tdee;
  let rationale = 'Maintenance calories based on your activity level';
  
  switch (fitnessGoal) {
    case 'lose_weight':
      dailyCalories = Math.round(tdee * 0.8);
      rationale = '20% caloric deficit for sustainable weight loss';
      break;
    case 'gain_muscle':
      dailyCalories = Math.round(tdee * 1.1);
      rationale = '10% caloric surplus for lean muscle gain';
      break;
    case 'bulk':
      dailyCalories = Math.round(tdee * 1.2);
      rationale = '20% caloric surplus for significant muscle and weight gain';
      break;
    case 'cut':
      dailyCalories = Math.round(tdee * 0.75);
      rationale = '25% caloric deficit for aggressive fat loss while preserving muscle';
      break;
  }
  
  // Calculate protein goal
  const dailyProtein = calculateProteinGoal(weight, activityLevel, fitnessGoal, bodyFatPercentage);
  
  // Calculate macro distribution
  const macros = calculateMacroDistribution(dailyCalories, dailyProtein, fitnessGoal, dietPreferences);
  
  return {
    dailyCalories: Math.round(dailyCalories),
    dailyProtein: dailyProtein,
    dailyCarbs: macros.carbs,
    dailyFat: macros.fat,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    rationale
  };
}

// =====================================================
// MEAL ANALYSIS SERVICE
// =====================================================

/**
 * Analyze a meal's nutritional quality and provide recommendations
 */
export function analyzeMealNutrition(
  protein: number,
  calories: number,
  carbs?: number,
  fat?: number,
  fiber?: number,
  userGoals?: { protein: number; calories: number }
): NutritionAnalysis {
  const recommendations: string[] = [];
  let qualityScore = 70; // Base score
  
  // Analyze protein content
  if (protein < 10) {
    recommendations.push('Consider adding more protein to this meal');
    qualityScore -= 15;
  } else if (protein > 30) {
    qualityScore += 10;
  }
  
  // Analyze calories
  if (calories && calories > 800) {
    recommendations.push('This is a high-calorie meal - consider portion size');
    qualityScore -= 5;
  } else if (calories && calories < 200) {
    recommendations.push('This meal is quite light - you might need more calories');
    qualityScore -= 5;
  }
  
  // Analyze macronutrient balance
  if (carbs && fat && calories) {
    const proteinCals = protein * 4;
    const carbCals = carbs * 4;
    const fatCals = fat * 9;
    const totalMacroCals = proteinCals + carbCals + fatCals;
    
    const proteinPercentage = (proteinCals / totalMacroCals) * 100;
    const carbPercentage = (carbCals / totalMacroCals) * 100;
    const fatPercentage = (fatCals / totalMacroCals) * 100;
    
    if (proteinPercentage > 35) {
      qualityScore += 5;
    }
    
    if (carbPercentage > 70) {
      recommendations.push('This meal is high in carbohydrates - consider adding more protein or healthy fats');
      qualityScore -= 5;
    }
    
    if (fatPercentage > 60) {
      recommendations.push('This meal is high in fat - consider balancing with more protein or complex carbs');
      qualityScore -= 5;
    }
  }
  
  // Analyze fiber content
  if (fiber !== undefined) {
    if (fiber < 3) {
      recommendations.push('Consider adding more fiber-rich foods like vegetables or whole grains');
      qualityScore -= 5;
    } else if (fiber > 8) {
      qualityScore += 5;
    }
  } else {
    recommendations.push('Try to include fiber-rich foods for better digestion and satiety');
  }
  
  // Compare to user goals if available
  if (userGoals) {
    const mealProteinGoal = userGoals.protein / 3; // Assume 3 meals per day
    const mealCalorieGoal = userGoals.calories / 3;
    
    if (protein >= mealProteinGoal) {
      qualityScore += 10;
    } else if (protein < mealProteinGoal * 0.5) {
      recommendations.push(`This meal is low in protein compared to your daily goal (${Math.round(mealProteinGoal)}g per meal)`);
    }
    
    if (calories && Math.abs(calories - mealCalorieGoal) / mealCalorieGoal < 0.2) {
      qualityScore += 5;
    }
  }
  
  // Ensure quality score is within bounds
  qualityScore = Math.max(0, Math.min(100, qualityScore));
  
  return {
    macros: {
      protein,
      carbs: carbs || 0,
      fat: fat || 0,
      calories: calories || 0,
      fiber
    },
    quality_score: qualityScore,
    recommendations
  };
}

// =====================================================
// PROGRESS ANALYSIS SERVICE
// =====================================================

/**
 * Analyze user's progress and provide insights
 */
export async function analyzeUserProgress(
  userId: string,
  days: number = 30
): Promise<{
  trends: Record<string, 'increasing' | 'decreasing' | 'stable'>;
  achievements: string[];
  recommendations: string[];
  insights: string[];
}> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);
  
  // Get daily summaries
  const summaries = await prisma.daily_summaries.findMany({
    where: {
      user_id: userId,
      summary_date: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: { summary_date: 'asc' }
  });
  
  if (summaries.length < 7) {
    return {
      trends: {},
      achievements: [],
      recommendations: ['Start tracking meals consistently to see meaningful insights'],
      insights: ['More data needed for analysis']
    };
  }
  
  // Calculate trends
  const proteinValues = summaries.map(s => Number(s.total_protein || 0));
  const calorieValues = summaries.map(s => s.total_calories || 0);
  const mealValues = summaries.map(s => s.total_meals || 0);
  
  const trends = {
    protein: calculateTrend(proteinValues),
    calories: calculateTrend(calorieValues),
    meals: calculateTrend(mealValues)
  };
  
  // Analyze achievements
  const achievements: string[] = [];
  const recommendations: string[] = [];
  const insights: string[] = [];
  
  const activeDays = summaries.filter(s => (s.total_meals || 0) > 0).length;
  const consistencyRate = activeDays / summaries.length;
  
  if (consistencyRate >= 0.8) {
    achievements.push('Excellent tracking consistency');
  } else if (consistencyRate >= 0.6) {
    achievements.push('Good tracking consistency');
  } else {
    recommendations.push('Try to track meals more consistently for better insights');
  }
  
  const goalsMetCount = summaries.filter(s => s.protein_goal_met).length;
  const goalAchievementRate = goalsMetCount / activeDays;
  
  if (goalAchievementRate >= 0.8) {
    achievements.push('Consistently meeting protein goals');
  } else if (goalAchievementRate >= 0.6) {
    achievements.push('Frequently meeting protein goals');
  } else {
    recommendations.push('Focus on increasing protein intake to meet daily goals');
  }
  
  // Generate insights based on trends
  if (trends.protein === 'increasing') {
    insights.push('Your protein intake is trending upward - great progress!');
  } else if (trends.protein === 'decreasing') {
    insights.push('Your protein intake has been decreasing - consider adding more protein sources');
    recommendations.push('Plan protein-rich meals and snacks throughout the day');
  }
  
  if (trends.meals === 'decreasing') {
    insights.push('You\'re logging fewer meals lately - consistency is key for reaching goals');
    recommendations.push('Set meal reminders to maintain tracking habits');
  }
  
  // Analyze meal frequency
  const avgMealsPerDay = mealValues.reduce((sum, val) => sum + val, 0) / mealValues.length;
  if (avgMealsPerDay < 2) {
    recommendations.push('Consider eating more frequent, smaller meals throughout the day');
  } else if (avgMealsPerDay > 5) {
    insights.push('You\'re eating frequently - make sure each meal contributes to your goals');
  }
  
  return {
    trends,
    achievements,
    recommendations,
    insights
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable';
  
  // Split into first and second half
  const midPoint = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, midPoint);
  const secondHalf = values.slice(midPoint);
  
  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
  
  const difference = secondAvg - firstAvg;
  const threshold = firstAvg * 0.05; // 5% threshold
  
  if (difference > threshold) return 'increasing';
  if (difference < -threshold) return 'decreasing';
  return 'stable';
}

// =====================================================
// FOOD DATABASE INTEGRATION (MOCK)
// =====================================================

/**
 * Mock food database for nutrition lookup
 * In production, this would integrate with USDA FoodData Central or similar API
 */
export const FOOD_DATABASE = {
  'chicken breast': { protein: 23, calories: 165, carbs: 0, fat: 3.6, fiber: 0 },
  'salmon': { protein: 25, calories: 208, carbs: 0, fat: 12, fiber: 0 },
  'eggs': { protein: 13, calories: 155, carbs: 1.1, fat: 11, fiber: 0 },
  'greek yogurt': { protein: 10, calories: 100, carbs: 6, fat: 0.4, fiber: 0 },
  'quinoa': { protein: 4.4, calories: 120, carbs: 22, fat: 1.9, fiber: 2.8 },
  'broccoli': { protein: 3, calories: 25, carbs: 5, fat: 0.3, fiber: 2.6 },
  'almonds': { protein: 6, calories: 164, carbs: 6, fat: 14, fiber: 3.5 },
  'oats': { protein: 5, calories: 150, carbs: 27, fat: 3, fiber: 4 }
};

/**
 * Estimate nutrition from food description
 */
export function estimateNutritionFromDescription(description: string): MacroCalculation | null {
  const words = description.toLowerCase().split(/\s+/);
  let totalProtein = 0;
  let totalCalories = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;
  let foundFoods = 0;
  
  for (const word of words) {
    for (const [food, nutrition] of Object.entries(FOOD_DATABASE)) {
      if (food.includes(word) || word.includes((food.split(' ')[0]) || "")) {
        totalProtein += nutrition.protein;
        totalCalories += nutrition.calories;
        totalCarbs += nutrition.carbs;
        totalFat += nutrition.fat;
        totalFiber += nutrition.fiber;
        foundFoods++;
        break;
      }
    }
  }
  
  if (foundFoods === 0) {
    return null;
  }
  
  // Apply portion size estimation (basic heuristic)
  let portionMultiplier = 1;
  if (words.includes('large') || words.includes('big')) {
    portionMultiplier = 1.5;
  } else if (words.includes('small') || words.includes('little')) {
    portionMultiplier = 0.7;
  } else if (words.includes('cup')) {
    portionMultiplier = 1.2;
  }
  
  return {
    protein: Math.round(totalProtein * portionMultiplier),
    calories: Math.round(totalCalories * portionMultiplier),
    carbs: Math.round(totalCarbs * portionMultiplier),
    fat: Math.round(totalFat * portionMultiplier),
    fiber: Math.round(totalFiber * portionMultiplier)
  };
}