import { MealEntry } from "@/context/AppContext";
import { getWeekRanges, getMonthRanges, isDateInRange } from "./dateUtils";
import { safeSum, safeNumber } from "../utils/numberUtils";

export interface PeriodSummary {
  period: string;
  label: string;
  start: Date;
  end: Date;
  totalDays: number;
  activeDays: number; // Days with at least one meal
  
  // Protein metrics
  totalProtein: number;
  averageProtein: number;
  maxProtein: number;
  minProtein: number;
  proteinGoal: number;
  proteinGoalAchieved: number; // Days where goal was met
  proteinGoalPercentage: number; // Average percentage of goal achieved
  
  // Calorie metrics
  totalCalories: number;
  averageCalories: number;
  maxCalories: number;
  minCalories: number;
  calorieGoal: number;
  calorieGoalAchieved: number;
  calorieGoalPercentage: number;
  
  // Trends
  proteinTrend: 'increasing' | 'decreasing' | 'stable';
  calorieTrend: 'increasing' | 'decreasing' | 'stable';
  
  // Meal patterns
  totalMeals: number;
  averageMealsPerDay: number;
  mealFrequency: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  };
  
  // Daily breakdown
  dailyData: Array<{
    date: Date;
    protein: number;
    calories: number;
    meals: number;
    proteinGoalMet: boolean;
    calorieGoalMet: boolean;
  }>;
}

export interface TrendData {
  slope: number;
  correlation: number;
  direction: 'increasing' | 'decreasing' | 'stable';
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Calculate trend for a series of values
 */
export function calculateTrend(values: number[]): TrendData {
  if (values.length < 2) {
    return { slope: 0, correlation: 0, direction: 'stable', confidence: 'low' };
  }

  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = values;

  // Calculate means
  const xMean = x.reduce((sum, val) => sum + safeNumber(val, 0), 0) / n;
  const yMean = y.reduce((sum, val) => sum + safeNumber(val, 0), 0) / n;

  // Calculate slope and correlation
  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;
    numerator += xDiff * yDiff;
    denominatorX += xDiff * xDiff;
    denominatorY += yDiff * yDiff;
  }

  const slope = denominatorX === 0 ? 0 : numerator / denominatorX;
  const correlation = Math.sqrt(denominatorX * denominatorY) === 0 ? 0 : 
                     numerator / Math.sqrt(denominatorX * denominatorY);

  // Determine direction and confidence
  const absCorrelation = Math.abs(correlation);
  const confidence: 'high' | 'medium' | 'low' = 
    absCorrelation > 0.7 ? 'high' :
    absCorrelation > 0.4 ? 'medium' : 'low';

  const direction: 'increasing' | 'decreasing' | 'stable' = 
    Math.abs(slope) < 0.1 ? 'stable' :
    slope > 0 ? 'increasing' : 'decreasing';

  return { slope, correlation, direction, confidence };
}

/**
 * Get meal time category based on hour
 */
function getMealTimeCategory(timestamp: string): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Calculate summary for a specific period
 */
export function calculatePeriodSummary(
  meals: MealEntry[],
  start: Date,
  end: Date,
  label: string,
  proteinGoal: number,
  calorieGoal: number
): PeriodSummary {
  // Filter meals for this period
  const periodMeals = meals.filter(meal => {
    const mealDate = new Date(meal.timestamp);
    return isDateInRange(mealDate, start, end);
  });

  // Calculate total days in period
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Group meals by date
  const dailyData: Map<string, {
    protein: number;
    calories: number;
    meals: number;
    proteinGoalMet: boolean;
    calorieGoalMet: boolean;
  }> = new Map();

  // Initialize all days in the period
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split('T')[0];
    dailyData.set(dateKey, {
      protein: 0,
      calories: 0,
      meals: 0,
      proteinGoalMet: false,
      calorieGoalMet: false
    });
  }

  // Aggregate meal data by day
  const mealFrequency = { morning: 0, afternoon: 0, evening: 0, night: 0 };

  periodMeals.forEach(meal => {
    const dateKey = new Date(meal.timestamp).toISOString().split('T')[0];
    const dayData = dailyData.get(dateKey);
    
    if (dayData) {
      dayData.protein += safeNumber(meal.protein, 0);
      dayData.calories += safeNumber(meal.calories, 0);
      dayData.meals += 1;
    }

    // Count meal frequency by time
    const timeCategory = getMealTimeCategory(meal.timestamp);
    mealFrequency[timeCategory]++;
  });

  // Calculate goal achievements and final daily data
  const finalDailyData = Array.from(dailyData.entries()).map(([dateStr, data]) => {
    const proteinGoalMet = data.protein >= proteinGoal;
    const calorieGoalMet = calorieGoal > 0 ? data.calories >= calorieGoal : true;
    
    return {
      date: new Date(dateStr),
      protein: data.protein,
      calories: data.calories,
      meals: data.meals,
      proteinGoalMet,
      calorieGoalMet
    };
  });

  // Calculate metrics
  const activeDays = finalDailyData.filter(day => day.meals > 0).length;
  const proteinValues = finalDailyData.filter(day => day.protein > 0).map(day => safeNumber(day.protein, 0));
  const calorieValues = finalDailyData.filter(day => day.calories > 0).map(day => safeNumber(day.calories, 0));

  const totalProtein = safeSum(...proteinValues);
  const totalCalories = safeSum(...calorieValues);
  const averageProtein = activeDays > 0 ? totalProtein / activeDays : 0;
  const averageCalories = activeDays > 0 ? totalCalories / activeDays : 0;

  const proteinGoalAchieved = finalDailyData.filter(day => day.proteinGoalMet).length;
  const calorieGoalAchieved = finalDailyData.filter(day => day.calorieGoalMet).length;

  const proteinGoalPercentage = activeDays > 0 ? (averageProtein / proteinGoal) * 100 : 0;
  const calorieGoalPercentage = activeDays > 0 && calorieGoal > 0 ? (averageCalories / calorieGoal) * 100 : 0;

  // Calculate trends
  const proteinTrend = calculateTrend(proteinValues);
  const calorieTrend = calculateTrend(calorieValues);

  return {
    period: 'custom',
    label,
    start,
    end,
    totalDays,
    activeDays,
    
    totalProtein: Math.round(totalProtein),
    averageProtein: Math.round(averageProtein),
    maxProtein: proteinValues.length > 0 ? Math.round(Math.max(...proteinValues)) : 0,
    minProtein: proteinValues.length > 0 ? Math.round(Math.min(...proteinValues)) : 0,
    proteinGoal,
    proteinGoalAchieved,
    proteinGoalPercentage: Math.round(proteinGoalPercentage),
    
    totalCalories: Math.round(totalCalories),
    averageCalories: Math.round(averageCalories),
    maxCalories: calorieValues.length > 0 ? Math.round(Math.max(...calorieValues)) : 0,
    minCalories: calorieValues.length > 0 ? Math.round(Math.min(...calorieValues)) : 0,
    calorieGoal,
    calorieGoalAchieved,
    calorieGoalPercentage: Math.round(calorieGoalPercentage),
    
    proteinTrend: proteinTrend.direction,
    calorieTrend: calorieTrend.direction,
    
    totalMeals: periodMeals.length,
    averageMealsPerDay: activeDays > 0 ? Math.round((periodMeals.length / activeDays) * 10) / 10 : 0,
    mealFrequency,
    
    dailyData: finalDailyData
  };
}

/**
 * Calculate weekly summaries
 */
export function calculateWeeklySummaries(
  meals: MealEntry[],
  weeksCount: number,
  proteinGoal: number,
  calorieGoal: number
): PeriodSummary[] {
  const weekRanges = getWeekRanges(weeksCount);
  
  return weekRanges.map(range => 
    calculatePeriodSummary(meals, range.start, range.end, range.label, proteinGoal, calorieGoal)
  );
}

/**
 * Calculate monthly summaries
 */
export function calculateMonthlySummaries(
  meals: MealEntry[],
  monthsCount: number,
  proteinGoal: number,
  calorieGoal: number
): PeriodSummary[] {
  const monthRanges = getMonthRanges(monthsCount);
  
  return monthRanges.map(range => 
    calculatePeriodSummary(meals, range.start, range.end, range.label, proteinGoal, calorieGoal)
  );
}

/**
 * Get insights and recommendations based on summaries
 */
export function getInsights(summaries: PeriodSummary[]): {
  achievements: string[];
  improvements: string[];
  trends: string[];
} {
  if (summaries.length === 0) {
    return { achievements: [], improvements: [], trends: [] };
  }

  const latest = summaries[summaries.length - 1];
  const achievements: string[] = [];
  const improvements: string[] = [];
  const trends: string[] = [];

  // Achievements
  if (latest.proteinGoalPercentage >= 100) {
    achievements.push(`Objectif protéines atteint à ${latest.proteinGoalPercentage}%`);
  }
  if (latest.calorieGoalPercentage >= 90 && latest.calorieGoalPercentage <= 110) {
    achievements.push("Calories bien équilibrées");
  }
  if (latest.activeDays / latest.totalDays >= 0.8) {
    achievements.push("Suivi régulier maintenu");
  }

  // Improvements
  if (latest.proteinGoalPercentage < 80) {
    improvements.push("Augmenter l'apport en protéines");
  }
  if (latest.averageMealsPerDay < 2) {
    improvements.push("Augmenter la fréquence des repas");
  }
  if (latest.activeDays / latest.totalDays < 0.5) {
    improvements.push("Améliorer la régularité du suivi");
  }

  // Trends
  if (latest.proteinTrend === 'increasing') {
    trends.push("Tendance positive pour les protéines");
  } else if (latest.proteinTrend === 'decreasing') {
    trends.push("Tendance à la baisse pour les protéines");
  }

  if (summaries.length >= 2) {
    const previous = summaries[summaries.length - 2];
    const proteinImprovement = latest.averageProtein - previous.averageProtein;
    if (proteinImprovement > 5) {
      trends.push(`Amélioration de +${Math.round(proteinImprovement)}g de protéines`);
    }
  }

  return { achievements, improvements, trends };
}