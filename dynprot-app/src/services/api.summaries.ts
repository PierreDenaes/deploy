// Service API pour les résumés et analyses nutritionnelles
import { z } from 'zod';
import { 
  apiClient, 
  ApiResponse, 
  validateWithSchema, 
  withRetry 
} from './api.service';

// =====================================================
// TYPES ET SCHÉMAS DE VALIDATION
// =====================================================

// Schémas de validation Zod
const SummaryQuerySchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  period: z.enum(['daily', 'weekly', 'monthly']).default('daily')
});

const CreateDataExportSchema = z.object({
  export_format: z.enum(['csv', 'pdf', 'json']),
  date_range_start: z.string().datetime().or(z.date()),
  date_range_end: z.string().datetime().or(z.date()),
  include_meals: z.boolean().default(true),
  include_favorites: z.boolean().default(true),
  include_summary: z.boolean().default(true),
  include_personal_info: z.boolean().default(true)
});

// Types TypeScript
export type SummaryQuery = z.infer<typeof SummaryQuerySchema>;
export type CreateDataExportRequest = z.infer<typeof CreateDataExportSchema>;

export interface DailySummary {
  id: string;
  user_id: string;
  summary_date: string;
  total_protein: number | null;
  total_calories: number | null;
  total_carbs: number | null;
  total_fat: number | null;
  total_fiber: number | null;
  total_meals: number | null;
  morning_meals: number | null;
  afternoon_meals: number | null;
  evening_meals: number | null;
  night_meals: number | null;
  protein_goal: number;
  calorie_goal: number | null;
  protein_goal_met: boolean | null;
  calorie_goal_met: boolean | null;
  protein_goal_percentage: number | null;
  calorie_goal_percentage: number | null;
  ai_assisted_meals: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface NutritionSummary {
  totalProtein: number;
  totalCalories: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  totalMeals: number;
  avgProteinPerMeal: number;
  avgCaloriesPerMeal: number;
  proteinGoalProgress: number;
  calorieGoalProgress: number;
  mealDistribution: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  };
}

export interface WeeklyTrend {
  date: string;
  protein: number;
  calories: number;
  meals: number;
  goalMet: boolean;
}

export interface MonthlyStats {
  month: string;
  totalProtein: number;
  totalCalories: number;
  totalMeals: number;
  activeDays: number;
  avgProteinPerDay: number;
  goalsMetDays: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface ProgressInsights {
  achievements: string[];
  improvements: string[];
  trends: string[];
}

export interface DataExport {
  id: string;
  user_id: string;
  export_format: string;
  date_range_start: string;
  date_range_end: string;
  include_meals: boolean | null;
  include_favorites: boolean | null;
  include_summary: boolean | null;
  include_personal_info: boolean | null;
  total_records: number | null;
  file_size_bytes: bigint | null;
  export_status: string | null;
  filename: string | null;
  download_url: string | null;
  expires_at: string | null;
  created_at: string | null;
  completed_at: string | null;
}

// =====================================================
// SERVICE DE RÉSUMÉS ET ANALYSES
// =====================================================

export class SummaryService {
  // Récupérer les résumés quotidiens
  static async getDailySummaries(query: SummaryQuery): Promise<DailySummary[]> {
    // Validation côté client
    const validatedQuery = validateWithSchema(SummaryQuerySchema, query);

    const params = new URLSearchParams({
      start_date: validatedQuery.start_date,
      end_date: validatedQuery.end_date,
      period: String(validatedQuery.period)
    });

    const response: ApiResponse<{ summaries: DailySummary[] }> = await apiClient.get(
      `/summaries/daily?${params}`
    );

    if (response.success && response.data) {
      return response.data.summaries;
    }

    return [];
  }

  // Récupérer un résumé nutritionnel pour une période
  static async getNutritionSummary(query: SummaryQuery): Promise<NutritionSummary> {
    // Validation côté client
    const validatedQuery = validateWithSchema(SummaryQuerySchema, query);

    const params = new URLSearchParams({
      start_date: validatedQuery.start_date,
      end_date: validatedQuery.end_date,
      period: String(validatedQuery.period)
    });

    const response: ApiResponse<{ summary: NutritionSummary }> = await apiClient.get(
      `/summaries/nutrition?${params}`
    );

    if (response.success && response.data) {
      return response.data.summary;
    }

    throw new Error(response.message || 'Erreur lors de la récupération du résumé nutritionnel');
  }

  // Récupérer les tendances hebdomadaires
  static async getWeeklyTrends(query: SummaryQuery): Promise<WeeklyTrend[]> {
    // Validation côté client
    const validatedQuery = validateWithSchema(SummaryQuerySchema, query);

    const params = new URLSearchParams({
      start_date: validatedQuery.start_date,
      end_date: validatedQuery.end_date,
      period: String(validatedQuery.period)
    });

    const response: ApiResponse<{ trends: WeeklyTrend[] }> = await apiClient.get(
      `/summaries/weekly-trends?${params}`
    );

    if (response.success && response.data) {
      return response.data.trends;
    }

    return [];
  }

  // Récupérer les statistiques mensuelles
  static async getMonthlyStats(query: SummaryQuery): Promise<MonthlyStats[]> {
    // Validation côté client
    const validatedQuery = validateWithSchema(SummaryQuerySchema, query);

    const params = new URLSearchParams({
      start_date: validatedQuery.start_date,
      end_date: validatedQuery.end_date,
      period: String(validatedQuery.period)
    });

    const response: ApiResponse<{ monthlyStats: MonthlyStats[] }> = await apiClient.get(
      `/summaries/monthly-stats?${params}`
    );

    if (response.success && response.data) {
      return response.data.monthlyStats;
    }

    return [];
  }

  // Récupérer les insights de progrès
  static async getProgressInsights(): Promise<ProgressInsights> {
    const response: ApiResponse<{ insights: ProgressInsights }> = await apiClient.get(
      '/summaries/insights'
    );

    if (response.success && response.data) {
      return response.data.insights;
    }

    return {
      achievements: [],
      improvements: [],
      trends: []
    };
  }

  // Créer un export de données
  static async createDataExport(data: CreateDataExportRequest): Promise<DataExport> {
    // Validation côté client
    const validatedData = validateWithSchema(CreateDataExportSchema, data);

    const response: ApiResponse<{ export: DataExport }> = await withRetry(
      () => apiClient.post('/summaries/export', validatedData),
      1, // Un seul retry pour les exports
      5000 // Délai plus long
    );

    if (response.success && response.data) {
      return response.data.export;
    }

    throw new Error(response.message || 'Erreur lors de la création de l\'export');
  }

  // Récupérer la liste des exports de l'utilisateur
  static async getUserExports(): Promise<DataExport[]> {
    const response: ApiResponse<{ exports: DataExport[] }> = await apiClient.get(
      '/summaries/exports'
    );

    if (response.success && response.data) {
      return response.data.exports;
    }

    return [];
  }

  // Helpers pour des périodes spécifiques
  static async getTodaySummary(): Promise<DailySummary | null> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const summaries = await this.getDailySummaries({
      start_date: startOfDay.toISOString(),
      end_date: endOfDay.toISOString(),
      period: 'daily'
    });

    return summaries.length > 0 ? summaries[0] : null;
  }

  static async getWeekSummary(): Promise<NutritionSummary> {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Dimanche
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Samedi
    endOfWeek.setHours(23, 59, 59, 999);

    return this.getNutritionSummary({
      start_date: startOfWeek.toISOString(),
      end_date: endOfWeek.toISOString(),
      period: 'weekly'
    });
  }

  static async getMonthSummary(): Promise<NutritionSummary> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    return this.getNutritionSummary({
      start_date: startOfMonth.toISOString(),
      end_date: endOfMonth.toISOString(),
      period: 'monthly'
    });
  }

  static async getLast30DaysTrends(): Promise<WeeklyTrend[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    return this.getWeeklyTrends({
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      period: 'weekly'
    });
  }
}

// =====================================================
// HELPERS ET UTILITAIRES
// =====================================================

// Helper pour formater les résumés quotidiens
export const formatDailySummary = (summary: DailySummary) => {
  const proteinGoalProgress = summary.protein_goal > 0 
    ? ((summary.total_protein || 0) / summary.protein_goal) * 100 
    : 0;

  const calorieGoalProgress = summary.calorie_goal && summary.calorie_goal > 0
    ? ((summary.total_calories || 0) / summary.calorie_goal) * 100
    : 0;

  return {
    ...summary,
    date: new Date(summary.summary_date),
    formattedDate: new Date(summary.summary_date).toLocaleDateString('fr-FR'),
    proteinGoalProgress: Math.round(proteinGoalProgress),
    calorieGoalProgress: Math.round(calorieGoalProgress),
    totalMacros: {
      protein: summary.total_protein || 0,
      carbs: summary.total_carbs || 0,
      fat: summary.total_fat || 0,
      fiber: summary.total_fiber || 0
    },
    mealDistribution: {
      morning: summary.morning_meals || 0,
      afternoon: summary.afternoon_meals || 0,
      evening: summary.evening_meals || 0,
      night: summary.night_meals || 0
    }
  };
};

// Helper pour calculer les moyennes sur une période
export const calculatePeriodAverages = (summaries: DailySummary[]) => {
  if (summaries.length === 0) {
    return {
      avgProtein: 0,
      avgCalories: 0,
      avgMeals: 0,
      goalMetPercentage: 0,
      activeDays: 0
    };
  }

  const activeDays = summaries.filter(s => (s.total_meals || 0) > 0).length;
  const totalProtein = summaries.reduce((sum, s) => sum + (s.total_protein || 0), 0);
  const totalCalories = summaries.reduce((sum, s) => sum + (s.total_calories || 0), 0);
  const totalMeals = summaries.reduce((sum, s) => sum + (s.total_meals || 0), 0);
  const goalMetDays = summaries.filter(s => s.protein_goal_met).length;

  return {
    avgProtein: activeDays > 0 ? Math.round(totalProtein / activeDays) : 0,
    avgCalories: activeDays > 0 ? Math.round(totalCalories / activeDays) : 0,
    avgMeals: activeDays > 0 ? Math.round((totalMeals / activeDays) * 10) / 10 : 0,
    goalMetPercentage: activeDays > 0 ? Math.round((goalMetDays / activeDays) * 100) : 0,
    activeDays
  };
};

// Helper pour créer des ranges de dates
export const createDateRanges = {
  last7Days: () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6); // 7 jours incluant aujourd'hui
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  },

  last30Days: () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29); // 30 jours incluant aujourd'hui
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  },

  currentWeek: () => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay()); // Dimanche
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Samedi
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  },

  currentMonth: () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  },

  last3Months: () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(end.getMonth() - 2); // 3 mois
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
};

// Helper pour analyser les tendances
export const analyzeTrend = (values: number[]): 'increasing' | 'decreasing' | 'stable' => {
  if (values.length < 2) return 'stable';

  // Calculer la pente avec régression linéaire simple
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (x[i] - xMean) * (values[i] - yMean);
    denominator += (x[i] - xMean) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const threshold = yMean * 0.05; // 5% du moyenne

  if (slope > threshold) return 'increasing';
  if (slope < -threshold) return 'decreasing';
  return 'stable';
};

// Helper pour formater les exports
export const formatExportStatus = (exportData: DataExport) => {
  const statusLabels = {
    pending: 'En attente',
    processing: 'En cours',
    completed: 'Terminé',
    failed: 'Échoué'
  };

  const formatLabels = {
    csv: 'CSV (Excel)',
    pdf: 'PDF',
    json: 'JSON'
  };

  return {
    ...exportData,
    statusLabel: statusLabels[exportData.export_status as keyof typeof statusLabels] || exportData.export_status,
    formatLabel: formatLabels[exportData.export_format as keyof typeof formatLabels] || exportData.export_format,
    formattedCreatedAt: exportData.created_at 
      ? new Date(exportData.created_at).toLocaleString('fr-FR')
      : '',
    formattedCompletedAt: exportData.completed_at 
      ? new Date(exportData.completed_at).toLocaleString('fr-FR')
      : '',
    isExpired: exportData.expires_at 
      ? new Date(exportData.expires_at) < new Date()
      : false,
    canDownload: exportData.export_status === 'completed' && 
                 exportData.download_url && 
                 (!exportData.expires_at || new Date(exportData.expires_at) > new Date())
  };
};

// Helper pour valider les périodes de résumé
export const validateSummaryPeriod = (startDate: Date, endDate: Date) => {
  const now = new Date();
  const maxDaysBack = 365; // 1 an maximum
  const maxRange = 90; // 90 jours maximum par requête

  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysFromNow = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const errors: string[] = [];

  if (startDate > endDate) {
    errors.push('La date de début doit être antérieure à la date de fin');
  }

  if (endDate > now) {
    errors.push('La date de fin ne peut pas être dans le futur');
  }

  if (daysFromNow > maxDaysBack) {
    errors.push(`Les données ne sont disponibles que pour les ${maxDaysBack} derniers jours`);
  }

  if (daysDiff > maxRange) {
    errors.push(`La période ne peut pas dépasser ${maxRange} jours`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    daysDiff,
    daysFromNow
  };
};