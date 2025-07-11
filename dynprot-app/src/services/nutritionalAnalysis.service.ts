// Service d'analyse nutritionnelle avancée avec insights ChatGPT
import { z } from 'zod';
import { apiClient, ApiResponse } from './api.service';
import { MealEntry } from '@/context/AppContext';
import { UserNutritionProfile } from './nutritionCoach.service';

// =====================================================
// TYPES ET SCHÉMAS DE VALIDATION
// =====================================================

// Période d'analyse
export type AnalysisPeriod = 'week' | 'month' | '3months' | '6months' | 'year' | 'custom';

// Métriques nutritionnelles calculées
export interface NutritionalMetrics {
  // Macronutriments
  avgDailyProtein: number;
  avgDailyCalories: number;
  avgDailyCarbs: number;
  avgDailyFat: number;
  avgDailyFiber: number;
  
  // Ratios et pourcentages
  proteinPercentage: number; // % des calories totales
  carbsPercentage: number;
  fatPercentage: number;
  proteinPerKg: number; // g/kg de poids corporel
  
  // Variabilité et constance
  proteinConsistency: number; // 0-100, 100 = très régulier
  calorieConsistency: number;
  
  // Objectifs
  proteinGoalAchievement: number; // % de l'objectif atteint
  calorieGoalAchievement: number;
  
  // Tendances (sur la période)
  proteinTrend: 'increasing' | 'decreasing' | 'stable';
  calorieTrend: 'increasing' | 'decreasing' | 'stable';
  
  // Scores globaux
  balanceScore: number; // 0-100
  varietyScore: number; // 0-100
  consistencyScore: number; // 0-100
  overallScore: number; // 0-100
}

// Analyse des patterns alimentaires
export interface EatingPatterns {
  // Fréquence des repas
  avgMealsPerDay: number;
  mealTimingRegularity: number; // 0-100
  
  // Distribution des macros par repas
  breakfastProtein: number;
  lunchProtein: number;
  dinnerProtein: number;
  snackProtein: number;
  
  // Sources de protéines
  proteinSources: Array<{
    name: string;
    frequency: number; // nombre d'occurrences
    contribution: number; // % des protéines totales
  }>;
  
  // Patterns temporels
  weekdayVsWeekend: {
    weekdayAvgProtein: number;
    weekendAvgProtein: number;
    difference: number;
  };
  
  // Variabilité
  highProteinDays: number; // jours au-dessus de l'objectif
  lowProteinDays: number; // jours en-dessous de l'objectif
  perfectDays: number; // jours dans la zone optimale
}

// Insights et recommandations
export interface NutritionalInsights {
  // Points forts
  strengths: Array<{
    category: 'consistency' | 'variety' | 'balance' | 'timing' | 'quantity';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
  }>;
  
  // Axes d'amélioration
  improvements: Array<{
    category: 'consistency' | 'variety' | 'balance' | 'timing' | 'quantity';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    actionItems: string[];
    expectedImpact: string;
  }>;
  
  // Alertes nutritionnelles
  alerts: Array<{
    type: 'deficiency' | 'excess' | 'imbalance' | 'irregularity';
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    recommendations: string[];
  }>;
  
  // Conseils personnalisés
  personalizedTips: Array<{
    category: string;
    tip: string;
    reasoning: string;
    difficulty: 'easy' | 'medium' | 'challenging';
  }>;
}

// Comparaisons et benchmarks
export interface NutritionalBenchmarks {
  // Comparaison avec objectifs
  vsGoals: {
    proteinGap: number; // différence avec objectif
    calorieGap: number;
    adherenceRate: number; // % de jours où objectifs atteints
  };
  
  // Comparaison avec période précédente
  vsPreviousPeriod?: {
    proteinChange: number; // % de changement
    calorieChange: number;
    consistencyChange: number;
    varietyChange: number;
    trend: 'improving' | 'declining' | 'stable';
  };
  
  // Benchmarks généraux (anonymisés)
  vsPopulation?: {
    proteinPercentile: number; // où se situe l'utilisateur
    varietyPercentile: number;
    consistencyPercentile: number;
  };
}

// Prédictions et projections
export interface NutritionalProjections {
  // Objectifs atteignables
  nextMonth: {
    predictedAvgProtein: number;
    confidenceInterval: [number, number];
    goalAchievabilityScore: number; // 0-100
  };
  
  // Recommandations d'ajustement
  adjustmentSuggestions: Array<{
    type: 'increase_protein' | 'improve_consistency' | 'add_variety' | 'optimize_timing';
    currentValue: number;
    targetValue: number;
    timeframe: string;
    difficulty: number; // 0-100
    expectedBenefit: string;
  }>;
}

// Réponse complète du service
export interface NutritionalAnalysisReport {
  // Métadonnées
  id: string;
  userId: string;
  period: AnalysisPeriod;
  dateRange: {
    start: string;
    end: string;
  };
  mealsAnalyzed: number;
  generatedAt: string;
  
  // Données calculées
  metrics: NutritionalMetrics;
  patterns: EatingPatterns;
  insights: NutritionalInsights;
  benchmarks: NutritionalBenchmarks;
  projections: NutritionalProjections;
  
  // Résumé exécutif (généré par IA)
  executiveSummary: {
    overallAssessment: string;
    keyFindings: string[];
    mainRecommendations: string[];
    nextSteps: string[];
    confidenceLevel: number; // 0-100
  };
  
  // Graphiques et visualisations (données pour frontend)
  visualizations: {
    proteinTrend: Array<{ date: string; value: number; goal: number }>;
    macroDistribution: Array<{ date: string; protein: number; carbs: number; fat: number }>;
    consistencyHeatmap: Array<{ date: string; score: number }>;
    sourceDistribution: Array<{ name: string; value: number }>;
  };
}

// Demande d'analyse
export interface AnalysisRequest {
  period: AnalysisPeriod;
  customRange?: {
    start: string;
    end: string;
  };
  focusAreas?: Array<'protein' | 'calories' | 'balance' | 'consistency' | 'variety' | 'timing'>;
  comparisonPeriod?: AnalysisPeriod;
  includeProjections?: boolean;
  detailLevel: 'summary' | 'detailed' | 'expert';
}

// Schémas de validation
const AnalysisRequestSchema = z.object({
  period: z.enum(['week', 'month', '3months', '6months', 'year', 'custom']),
  customRange: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
  focusAreas: z.array(z.enum(['protein', 'calories', 'balance', 'consistency', 'variety', 'timing'])).optional(),
  comparisonPeriod: z.enum(['week', 'month', '3months', '6months', 'year', 'custom']).optional(),
  includeProjections: z.boolean().optional(),
  detailLevel: z.enum(['summary', 'detailed', 'expert']),
});

// =====================================================
// SERVICE PRINCIPAL
// =====================================================

export class NutritionalAnalysisService {
  private static instance: NutritionalAnalysisService;
  
  private readonly ANALYSIS_PROMPTS = {
    systemPrompt: `Tu es un expert en nutrition clinique et en analyse de données nutritionnelles avec 20 ans d'expérience.

    EXPERTISE :
    - Analyse statistique des données nutritionnelles
    - Identification de patterns et tendances alimentaires
    - Évaluation de l'équilibre et de la variété alimentaire
    - Recommandations cliniques personnalisées
    - Communication pédagogique et motivante

    PRINCIPES :
    - Analyse scientifiquement rigoureuse
    - Insights actionnables et pratiques
    - Ton professionnel mais encourageant
    - Focus sur l'amélioration progressive
    - Respect de l'individualité des besoins

    MÉTHODOLOGIE :
    - Calculs précis et vérifiables
    - Identification de patterns significatifs
    - Corrélations entre comportements et résultats
    - Recommandations priorisées par impact
    - Projections réalistes et motivantes`,

    detailedAnalysis: `Effectue une analyse nutritionnelle approfondie basée sur :

    PROFIL UTILISATEUR : {userProfile}
    PÉRIODE D'ANALYSE : {period} ({dateRange})
    DONNÉES NUTRITIONNELLES : {nutritionalData}
    MÉTRIQUES CALCULÉES : {calculatedMetrics}
    FOCUS SPÉCIFIQUE : {focusAreas}

    ANALYSE DEMANDÉE :
    1. Évaluation des métriques nutritionnelles
    2. Identification des patterns alimentaires
    3. Forces et axes d'amélioration
    4. Alertes nutritionnelles importantes
    5. Recommandations personnalisées et priorisées
    6. Conseils pratiques et actionnables

    Génère des insights approfondis avec explications scientifiques vulgarisées.`,

    executiveSummary: `Crée un résumé exécutif de l'analyse nutritionnelle :

    DONNÉES CLÉS : {keyMetrics}
    INSIGHTS PRINCIPAUX : {mainInsights}
    OBJECTIFS UTILISATEUR : {userGoals}

    RÉSUMÉ DEMANDÉ :
    - Évaluation globale en 2-3 phrases
    - 3-5 découvertes clés
    - 3-4 recommandations prioritaires
    - Prochaines étapes concrètes
    - Niveau de confiance de l'analyse

    Ton motivant et constructif, focus sur les opportunités d'amélioration.`,

    trendAnalysis: `Analyse les tendances nutritionnelles sur la période :

    DONNÉES TEMPORELLES : {timeSeriesData}
    PÉRIODE : {period}
    COMPARAISON : {comparisonPeriod}

    ANALYSE DEMANDÉE :
    - Évolution des métriques clés
    - Identification de cycles et patterns
    - Points d'inflexion significatifs
    - Corrélations temporelles
    - Prédictions réalistes pour la suite

    Fournis des explications sur les causes possibles des variations.`,

    improvementPlan: `Élabore un plan d'amélioration personnalisé :

    POINTS FAIBLES IDENTIFIÉS : {weaknesses}
    OBJECTIFS UTILISATEUR : {goals}
    CONTRAINTES : {constraints}
    HISTORIQUE DE RÉUSSITE : {successPatterns}

    PLAN DEMANDÉ :
    - Actions prioritaires (impact vs effort)
    - Étapes progressives et réalistes
    - Métriques de suivi
    - Échéances et jalons
    - Stratégies de motivation

    Plan pratique et adapté au profil de l'utilisateur.`
  };

  public static getInstance(): NutritionalAnalysisService {
    if (!NutritionalAnalysisService.instance) {
      NutritionalAnalysisService.instance = new NutritionalAnalysisService();
    }
    return NutritionalAnalysisService.instance;
  }

  /**
   * Générer un rapport d'analyse nutritionnelle complet
   */
  async generateAnalysisReport(
    userProfile: UserNutritionProfile,
    meals: MealEntry[],
    request: AnalysisRequest
  ): Promise<NutritionalAnalysisReport> {
    try {
      // Validation des entrées
      AnalysisRequestSchema.parse(request);

      // Filtrer les repas selon la période demandée
      const filteredMeals = this.filterMealsByPeriod(meals, request);
      
      if (filteredMeals.length === 0) {
        throw new Error('Aucune donnée disponible pour la période sélectionnée');
      }

      // Calculs des métriques de base
      const metrics = this.calculateNutritionalMetrics(filteredMeals, userProfile);
      const patterns = this.analyzeEatingPatterns(filteredMeals);
      const benchmarks = this.calculateBenchmarks(metrics, userProfile, filteredMeals, request);
      
      // Préparation du contexte pour l'IA
      const context = this.buildAnalysisContext(userProfile, filteredMeals, metrics, patterns, request);
      
      // Génération des insights par l'IA
      const insights = await this.generateAIInsights(context, request.detailLevel);
      
      // Génération des projections
      const projections = request.includeProjections 
        ? await this.generateProjections(filteredMeals, userProfile, metrics)
        : this.createBasicProjections(metrics, userProfile);
      
      // Génération du résumé exécutif
      const executiveSummary = await this.generateExecutiveSummary(metrics, insights, userProfile);
      
      // Préparation des données de visualisation
      const visualizations = this.prepareVisualizationData(filteredMeals, userProfile);

      // Assemblage du rapport final
      const report: NutritionalAnalysisReport = {
        id: this.generateReportId(),
        userId: userProfile.age.toString(), // Placeholder, à remplacer par le vrai userId
        period: request.period,
        dateRange: this.getDateRange(request),
        mealsAnalyzed: filteredMeals.length,
        generatedAt: new Date().toISOString(),
        metrics,
        patterns,
        insights,
        benchmarks,
        projections,
        executiveSummary,
        visualizations,
      };

      return report;

    } catch (error) {
      console.error('Erreur génération rapport:', error);
      throw new Error('Impossible de générer le rapport d\'analyse. Veuillez réessayer.');
    }
  }

  /**
   * Analyse rapide des tendances récentes
   */
  async getQuickInsights(
    userProfile: UserNutritionProfile,
    recentMeals: MealEntry[],
    period: 'week' | 'month' = 'week'
  ): Promise<{
    score: number;
    trend: 'improving' | 'stable' | 'declining';
    keyInsights: string[];
    urgentRecommendations: string[];
  }> {
    try {
      const metrics = this.calculateNutritionalMetrics(recentMeals, userProfile);
      
      const response = await apiClient.post('/ai/quick-insights', {
        systemPrompt: this.ANALYSIS_PROMPTS.systemPrompt,
        userPrompt: this.buildQuickInsightsPrompt(userProfile, metrics, period),
        maxTokens: 1000,
        temperature: 0.3,
      });

      if (!response.success || !response.data) {
        throw new Error('Erreur lors de la génération des insights rapides');
      }

      return response.data;

    } catch (error) {
      console.error('Erreur insights rapides:', error);
      throw new Error('Impossible de générer les insights. Veuillez réessayer.');
    }
  }

  /**
   * Comparer deux périodes
   */
  async comparePeriods(
    userProfile: UserNutritionProfile,
    currentMeals: MealEntry[],
    previousMeals: MealEntry[]
  ): Promise<{
    comparison: string;
    improvements: string[];
    regressions: string[];
    recommendations: string[];
    overallTrend: 'improving' | 'stable' | 'declining';
  }> {
    try {
      const currentMetrics = this.calculateNutritionalMetrics(currentMeals, userProfile);
      const previousMetrics = this.calculateNutritionalMetrics(previousMeals, userProfile);
      
      const response = await apiClient.post('/ai/period-comparison', {
        systemPrompt: this.ANALYSIS_PROMPTS.systemPrompt,
        userPrompt: this.buildComparisonPrompt(userProfile, currentMetrics, previousMetrics),
        maxTokens: 1500,
        temperature: 0.4,
      });

      if (!response.success || !response.data) {
        throw new Error('Erreur lors de la comparaison des périodes');
      }

      return response.data;

    } catch (error) {
      console.error('Erreur comparaison périodes:', error);
      throw new Error('Impossible de comparer les périodes. Veuillez réessayer.');
    }
  }

  // =====================================================
  // MÉTHODES PRIVÉES DE CALCUL
  // =====================================================

  private filterMealsByPeriod(meals: MealEntry[], request: AnalysisRequest): MealEntry[] {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (request.period === 'custom' && request.customRange) {
      startDate = new Date(request.customRange.start);
      endDate = new Date(request.customRange.end);
    } else {
      const periodDays = {
        week: 7,
        month: 30,
        '3months': 90,
        '6months': 180,
        year: 365
      };
      if (request.period in periodDays) {
        startDate = new Date(now.getTime() - periodDays[request.period as keyof typeof periodDays] * 24 * 60 * 60 * 1000);
      } else {
        throw new Error('Invalid period for analysis');
      }
    }

    return meals.filter(meal => {
      const mealDate = new Date(meal.timestamp);
      return mealDate >= startDate && mealDate <= endDate;
    });
  }

  private calculateNutritionalMetrics(meals: MealEntry[], profile: UserNutritionProfile): NutritionalMetrics {
    if (meals.length === 0) {
      return this.getEmptyMetrics();
    }

    // Grouper par jour
    const dayGroups = this.groupMealsByDay(meals);
    const dailyTotals = Array.from(dayGroups.values()).map(dayMeals => ({
      protein: dayMeals.reduce((sum, meal) => sum + meal.protein, 0),
      calories: dayMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0),
      carbs: dayMeals.reduce((sum, meal) => sum + (meal.carbs || 0), 0),
      fat: dayMeals.reduce((sum, meal) => sum + (meal.fat || 0), 0),
      fiber: dayMeals.reduce((sum, meal) => sum + (meal.fiber || 0), 0),
    }));

    // Calculs des moyennes
    const avgDailyProtein = this.calculateAverage(dailyTotals.map(d => d.protein));
    const avgDailyCalories = this.calculateAverage(dailyTotals.map(d => d.calories));
    const avgDailyCarbs = this.calculateAverage(dailyTotals.map(d => d.carbs));
    const avgDailyFat = this.calculateAverage(dailyTotals.map(d => d.fat));
    const avgDailyFiber = this.calculateAverage(dailyTotals.map(d => d.fiber));

    // Calculs des ratios
    const proteinCalories = avgDailyProtein * 4;
    const carbsCalories = avgDailyCarbs * 4;
    const fatCalories = avgDailyFat * 9;
    const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;

    const proteinPercentage = totalMacroCalories > 0 ? (proteinCalories / totalMacroCalories) * 100 : 0;
    const carbsPercentage = totalMacroCalories > 0 ? (carbsCalories / totalMacroCalories) * 100 : 0;
    const fatPercentage = totalMacroCalories > 0 ? (fatCalories / totalMacroCalories) * 100 : 0;
    
    const proteinPerKg = avgDailyProtein / profile.weight;

    // Calculs de consistance
    const proteinConsistency = this.calculateConsistency(dailyTotals.map(d => d.protein));
    const calorieConsistency = this.calculateConsistency(dailyTotals.map(d => d.calories));

    // Calculs des objectifs
    const proteinGoalAchievement = (avgDailyProtein / profile.proteinGoal) * 100;
    const calorieGoalAchievement = (avgDailyCalories / profile.calorieGoal) * 100;

    // Calculs des tendances
    const proteinTrend = this.calculateTrend(dailyTotals.map(d => d.protein));
    const calorieTrend = this.calculateTrend(dailyTotals.map(d => d.calories));

    // Calculs des scores
    const balanceScore = this.calculateBalanceScore(proteinPercentage, carbsPercentage, fatPercentage);
    const varietyScore = this.calculateVarietyScore(meals);
    const consistencyScore = (proteinConsistency + calorieConsistency) / 2;
    const overallScore = (balanceScore + varietyScore + consistencyScore + Math.min(proteinGoalAchievement, 100)) / 4;

    return {
      avgDailyProtein: Math.round(avgDailyProtein),
      avgDailyCalories: Math.round(avgDailyCalories),
      avgDailyCarbs: Math.round(avgDailyCarbs),
      avgDailyFat: Math.round(avgDailyFat),
      avgDailyFiber: Math.round(avgDailyFiber),
      proteinPercentage: Math.round(proteinPercentage),
      carbsPercentage: Math.round(carbsPercentage),
      fatPercentage: Math.round(fatPercentage),
      proteinPerKg: Math.round(proteinPerKg * 10) / 10,
      proteinConsistency: Math.round(proteinConsistency),
      calorieConsistency: Math.round(calorieConsistency),
      proteinGoalAchievement: Math.round(proteinGoalAchievement),
      calorieGoalAchievement: Math.round(calorieGoalAchievement),
      proteinTrend,
      calorieTrend,
      balanceScore: Math.round(balanceScore),
      varietyScore: Math.round(varietyScore),
      consistencyScore: Math.round(consistencyScore),
      overallScore: Math.round(overallScore),
    };
  }

  private analyzeEatingPatterns(meals: MealEntry[]): EatingPatterns {
    const dayGroups = this.groupMealsByDay(meals);
    const avgMealsPerDay = this.calculateAverage(Array.from(dayGroups.values()).map(dayMeals => dayMeals.length));
    
    // Analyse des sources de protéines
    const proteinSources = this.analyzeProteinSources(meals);
    
    // Analyse weekday vs weekend
    const weekdayVsWeekend = this.analyzeWeekdayVsWeekend(meals);
    
    // Analyse de la distribution par repas (estimation basée sur l'heure)
    const mealDistribution = this.analyzeMealDistribution(meals);
    
    // Analyse des jours selon les objectifs
    const goalAnalysis = this.analyzeGoalAchievement(dayGroups);

    return {
      avgMealsPerDay: Math.round(avgMealsPerDay * 10) / 10,
      mealTimingRegularity: this.calculateTimingRegularity(meals),
      breakfastProtein: mealDistribution.breakfast,
      lunchProtein: mealDistribution.lunch,
      dinnerProtein: mealDistribution.dinner,
      snackProtein: mealDistribution.snack,
      proteinSources,
      weekdayVsWeekend,
      highProteinDays: goalAnalysis.high,
      lowProteinDays: goalAnalysis.low,
      perfectDays: goalAnalysis.perfect,
    };
  }

  // Méthodes utilitaires privées
  private groupMealsByDay(meals: MealEntry[]): Map<string, MealEntry[]> {
    const groups = new Map<string, MealEntry[]>();
    meals.forEach(meal => {
      const day = new Date(meal.timestamp).toDateString();
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day)!.push(meal);
    });
    return groups;
  }

  private calculateAverage(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private calculateConsistency(values: number[]): number {
    if (values.length < 2) return 100;
    
    const mean = this.calculateAverage(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0; // Coefficient de variation
    
    // Convertir en score de consistance (0-100, 100 = très consistant)
    return Math.max(0, 100 - (cv * 100));
  }

  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 5) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = this.calculateAverage(firstHalf);
    const secondAvg = this.calculateAverage(secondHalf);
    
    const changePercent = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
    
    if (changePercent > 5) return 'increasing';
    if (changePercent < -5) return 'decreasing';
    return 'stable';
  }

  private calculateBalanceScore(protein: number, carbs: number, fat: number): number {
    // Ratios idéaux approximatifs: 15-25% protéines, 45-65% glucides, 20-35% lipides
    const proteinScore = protein >= 15 && protein <= 25 ? 100 : Math.max(0, 100 - Math.abs(protein - 20) * 5);
    const carbsScore = carbs >= 45 && carbs <= 65 ? 100 : Math.max(0, 100 - Math.abs(carbs - 55) * 2);
    const fatScore = fat >= 20 && fat <= 35 ? 100 : Math.max(0, 100 - Math.abs(fat - 27.5) * 3);
    
    return (proteinScore + carbsScore + fatScore) / 3;
  }

  private calculateVarietyScore(meals: MealEntry[]): number {
    // Analyser la diversité des descriptions de repas
    const uniqueWords = new Set<string>();
    const commonWords = new Set(['de', 'le', 'la', 'les', 'du', 'des', 'avec', 'et', 'ou', 'à', 'au', 'aux']);
    
    meals.forEach(meal => {
      const words = meal.description.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2 && !commonWords.has(word));
      
      words.forEach(word => uniqueWords.add(word));
    });
    
    // Score basé sur le ratio diversité/nombre de repas
    const diversityRatio = meals.length > 0 ? uniqueWords.size / meals.length : 0;
    return Math.min(100, diversityRatio * 50); // Normaliser à 0-100
  }

  private analyzeProteinSources(meals: MealEntry[]): Array<{ name: string; frequency: number; contribution: number }> {
    const sources = new Map<string, { count: number; totalProtein: number }>();
    const proteinKeywords = [
      'poulet', 'bœuf', 'porc', 'poisson', 'saumon', 'thon', 'crevettes', 'cabillaud',
      'œuf', 'omelette', 'fromage', 'yaourt', 'lait', 'tofu', 'tempeh', 'seitan',
      'quinoa', 'lentilles', 'haricots', 'pois chiches', 'amandes', 'noix', 'graines',
      'protéine', 'whey', 'caséine'
    ];

    const totalProtein = meals.reduce((sum, meal) => sum + meal.protein, 0);

    meals.forEach(meal => {
      const description = meal.description.toLowerCase();
      proteinKeywords.forEach(keyword => {
        if (description.includes(keyword)) {
          if (!sources.has(keyword)) {
            sources.set(keyword, { count: 0, totalProtein: 0 });
          }
          const source = sources.get(keyword)!;
          source.count++;
          source.totalProtein += meal.protein;
        }
      });
    });

    return Array.from(sources.entries())
      .map(([name, data]) => ({
        name,
        frequency: data.count,
        contribution: totalProtein > 0 ? Math.round((data.totalProtein / totalProtein) * 100) : 0
      }))
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 10);
  }

  private analyzeWeekdayVsWeekend(meals: MealEntry[]): { weekdayAvgProtein: number; weekendAvgProtein: number; difference: number } {
    const weekdayMeals: MealEntry[] = [];
    const weekendMeals: MealEntry[] = [];

    meals.forEach(meal => {
      const date = new Date(meal.timestamp);
      const dayOfWeek = date.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Dimanche ou Samedi
        weekendMeals.push(meal);
      } else {
        weekdayMeals.push(meal);
      }
    });

    const weekdayDays = this.groupMealsByDay(weekdayMeals);
    const weekendDays = this.groupMealsByDay(weekendMeals);

    const weekdayAvgProtein = weekdayDays.size > 0 
      ? Array.from(weekdayDays.values()).reduce((sum, dayMeals) => 
          sum + dayMeals.reduce((daySum, meal) => daySum + meal.protein, 0), 0) / weekdayDays.size
      : 0;

    const weekendAvgProtein = weekendDays.size > 0
      ? Array.from(weekendDays.values()).reduce((sum, dayMeals) => 
          sum + dayMeals.reduce((daySum, meal) => daySum + meal.protein, 0), 0) / weekendDays.size
      : 0;

    return {
      weekdayAvgProtein: Math.round(weekdayAvgProtein),
      weekendAvgProtein: Math.round(weekendAvgProtein),
      difference: Math.round(weekendAvgProtein - weekdayAvgProtein)
    };
  }

  private analyzeMealDistribution(meals: MealEntry[]): { breakfast: number; lunch: number; dinner: number; snack: number } {
    const distribution = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
    const counts = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };

    meals.forEach(meal => {
      const hour = new Date(meal.timestamp).getHours();
      let mealType: keyof typeof distribution;

      if (hour >= 6 && hour < 11) {
        mealType = 'breakfast';
      } else if (hour >= 11 && hour < 15) {
        mealType = 'lunch';
      } else if (hour >= 18 && hour < 22) {
        mealType = 'dinner';
      } else {
        mealType = 'snack';
      }

      distribution[mealType] += meal.protein;
      counts[mealType]++;
    });

    return {
      breakfast: counts.breakfast > 0 ? Math.round(distribution.breakfast / counts.breakfast) : 0,
      lunch: counts.lunch > 0 ? Math.round(distribution.lunch / counts.lunch) : 0,
      dinner: counts.dinner > 0 ? Math.round(distribution.dinner / counts.dinner) : 0,
      snack: counts.snack > 0 ? Math.round(distribution.snack / counts.snack) : 0,
    };
  }

  private calculateTimingRegularity(meals: MealEntry[]): number {
    // Analyser la régularité des heures de repas
    const mealsByDay = this.groupMealsByDay(meals);
    const dailyTimings: number[][] = [];

    mealsByDay.forEach(dayMeals => {
      const timings = dayMeals.map(meal => new Date(meal.timestamp).getHours() * 60 + new Date(meal.timestamp).getMinutes());
      timings.sort((a, b) => a - b);
      dailyTimings.push(timings);
    });

    if (dailyTimings.length < 2) return 100;

    // Calculer la variance des heures de premiers/derniers repas
    const firstMeals = dailyTimings.map(day => day[0]).filter(time => time !== undefined);
    const lastMeals = dailyTimings.map(day => day[day.length - 1]).filter(time => time !== undefined);

    const firstMealVariance = this.calculateConsistency(firstMeals);
    const lastMealVariance = this.calculateConsistency(lastMeals);

    return (firstMealVariance + lastMealVariance) / 2;
  }

  private analyzeGoalAchievement(dayGroups: Map<string, MealEntry[]>): { high: number; low: number; perfect: number } {
    // Cette méthode nécessiterait l'objectif de l'utilisateur pour être complète
    // Pour l'instant, on utilise une estimation basée sur une moyenne
    const dailyProteins = Array.from(dayGroups.values()).map(dayMeals => 
      dayMeals.reduce((sum, meal) => sum + meal.protein, 0)
    );

    const avgProtein = this.calculateAverage(dailyProteins);
    const perfectRange = [avgProtein * 0.9, avgProtein * 1.1];

    return {
      high: dailyProteins.filter(p => p > perfectRange[1]).length,
      low: dailyProteins.filter(p => p < perfectRange[0]).length,
      perfect: dailyProteins.filter(p => p >= perfectRange[0] && p <= perfectRange[1]).length,
    };
  }

  // Méthodes utilitaires pour le rapport
  private getEmptyMetrics(): NutritionalMetrics {
    return {
      avgDailyProtein: 0,
      avgDailyCalories: 0,
      avgDailyCarbs: 0,
      avgDailyFat: 0,
      avgDailyFiber: 0,
      proteinPercentage: 0,
      carbsPercentage: 0,
      fatPercentage: 0,
      proteinPerKg: 0,
      proteinConsistency: 0,
      calorieConsistency: 0,
      proteinGoalAchievement: 0,
      calorieGoalAchievement: 0,
      proteinTrend: 'stable',
      calorieTrend: 'stable',
      balanceScore: 0,
      varietyScore: 0,
      consistencyScore: 0,
      overallScore: 0,
    };
  }

  private generateReportId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private getDateRange(request: AnalysisRequest): { start: string; end: string } {
    if (request.period === 'custom' && request.customRange) {
      return request.customRange;
    }

    const now = new Date();
    const periodDays = {
      week: 7,
      month: 30,
      '3months': 90,
      '6months': 180,
      year: 365
    };

    if (request.period in periodDays) {
      const startDate = new Date(now.getTime() - periodDays[request.period as keyof typeof periodDays] * 24 * 60 * 60 * 1000);
      return {
        start: startDate.toISOString(),
        end: now.toISOString()
      };
    } else {
      throw new Error('Invalid period for analysis');
    }
  }

  // Méthodes pour l'IA (placeholders - à implémenter selon les besoins)
  private buildAnalysisContext(
    profile: UserNutritionProfile,
    meals: MealEntry[],
    metrics: NutritionalMetrics,
    patterns: EatingPatterns,
    request: AnalysisRequest
  ): Record<string, any> {
    return {
      userProfile: profile,
      nutritionalData: meals.slice(0, 50), // Limiter pour l'IA
      calculatedMetrics: metrics,
      patterns: patterns,
      focusAreas: request.focusAreas || ['protein', 'balance', 'consistency'],
      period: request.period,
      dateRange: this.getDateRange(request)
    };
  }

  private async generateAIInsights(context: Record<string, any>, detailLevel: string): Promise<NutritionalInsights> {
    // TODO: Implement AI insights generation
    console.log('Generating AI insights with context:', context, 'detail level:', detailLevel);
    return {
      strengths: [],
      improvements: [],
      alerts: [],
      personalizedTips: []
    };
  }

  private async generateProjections(meals: MealEntry[], profile: UserNutritionProfile, metrics: NutritionalMetrics): Promise<NutritionalProjections> {
    // TODO: Implement AI projections
    console.log('Generating projections for meals:', meals.length, 'profile:', profile.age, 'metrics:', metrics.overallScore);
    return this.createBasicProjections(metrics, profile);
  }

  private createBasicProjections(metrics: NutritionalMetrics, profile: UserNutritionProfile): NutritionalProjections {
    return {
      nextMonth: {
        predictedAvgProtein: metrics.avgDailyProtein,
        confidenceInterval: [metrics.avgDailyProtein * 0.9, metrics.avgDailyProtein * 1.1],
        goalAchievabilityScore: Math.min(100, metrics.proteinGoalAchievement + 10)
      },
      adjustmentSuggestions: []
    };
  }

  private async generateExecutiveSummary(metrics: NutritionalMetrics, insights: NutritionalInsights, profile: UserNutritionProfile): Promise<any> {
    // TODO: Implement AI executive summary
    console.log('Generating executive summary for profile:', profile.age, 'metrics:', metrics.overallScore, 'insights:', insights.strengths.length);
    return {
      overallAssessment: '',
      keyFindings: [],
      mainRecommendations: [],
      nextSteps: [],
      confidenceLevel: 85
    };
  }

  private calculateBenchmarks(metrics: NutritionalMetrics, profile: UserNutritionProfile, meals: MealEntry[], request: AnalysisRequest): NutritionalBenchmarks {
    console.log('Calculating benchmarks for', meals.length, 'meals, request:', request.period);
    return {
      vsGoals: {
        proteinGap: metrics.avgDailyProtein - profile.proteinGoal,
        calorieGap: metrics.avgDailyCalories - profile.calorieGoal,
        adherenceRate: Math.min(100, metrics.proteinGoalAchievement)
      }
    };
  }

  private prepareVisualizationData(meals: MealEntry[], profile: UserNutritionProfile): any {
    // TODO: Implement visualization data preparation
    console.log('Preparing visualization data for', meals.length, 'meals, profile:', profile.age);
    return {
      proteinTrend: [],
      macroDistribution: [],
      consistencyHeatmap: [],
      sourceDistribution: []
    };
  }

  // Méthodes pour les prompts IA
  private buildQuickInsightsPrompt(profile: UserNutritionProfile, metrics: NutritionalMetrics, period: string): string {
    return `Analyse rapide de la nutrition sur ${period} dernière:
    
    PROFIL: ${profile.age} ans, objectif ${profile.proteinGoal}g protéines/jour
    MÉTRIQUES: Moyenne ${metrics.avgDailyProtein}g/jour, score global ${metrics.overallScore}/100
    
    Fournis: score général, tendance, 3 insights clés, recommandations urgentes.
    Format JSON: {score, trend, keyInsights[], urgentRecommendations[]}`;
  }

  private buildComparisonPrompt(profile: UserNutritionProfile, current: NutritionalMetrics, previous: NutritionalMetrics): string {
    return `Compare les deux périodes nutritionnelles:
    
    PÉRIODE ACTUELLE: ${current.avgDailyProtein}g protéines/jour, score ${current.overallScore}
    PÉRIODE PRÉCÉDENTE: ${previous.avgDailyProtein}g protéines/jour, score ${previous.overallScore}
    
    Analyse les améliorations, régressions, tendance générale et recommandations.
    Format JSON: {comparison, improvements[], regressions[], recommendations[], overallTrend}`;
  }
}

// Export de l'instance singleton
export const nutritionalAnalysis = NutritionalAnalysisService.getInstance();