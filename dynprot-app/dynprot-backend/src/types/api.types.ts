import { z } from 'zod';
import type { 
  User, 
  user_profiles, 
  meal_entries, 
  favorite_meals, 
  meal_analyses, 
  daily_summaries,
  data_exports
} from '@prisma/client';

// =====================================================
// COMMON TYPES
// =====================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  rememberMe?: boolean;
}

// =====================================================
// ZOD VALIDATION SCHEMAS
// =====================================================

// Common validations
const uuidSchema = z.string().uuid();
const emailSchema = z.string().email().max(255);
const passwordSchema = z.string().min(8).max(100);

// =====================================================
// AUTH SCHEMAS
// =====================================================

export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false)
});

export const RegisterSchema = z.object({
  email: emailSchema,
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: passwordSchema,
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional()
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

export const UserUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional()
});

// =====================================================
// USER PROFILE SCHEMAS
// =====================================================

export const UserProfileUpdateSchema = z.object({
  weight_kg: z.number().min(20).max(500).optional(),
  height_cm: z.number().min(100).max(250).optional(),
  age: z.number().min(13).max(120).optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  body_fat_percentage: z.number().min(3).max(50).optional(),
  daily_protein_goal: z.number().min(10).max(500).optional(),
  daily_calorie_goal: z.number().min(800).max(5000).optional(),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'very_active', 'extremely_active']).optional(),
  fitness_goal: z.enum(['lose_weight', 'maintain', 'gain_muscle', 'bulk', 'cut']).optional(),
  training_days_per_week: z.number().min(0).max(7).optional(),
  preferred_units: z.enum(['metric', 'imperial']).optional(),
  diet_preferences: z.array(z.string()).optional(),
  dark_mode: z.boolean().optional(),
  notifications_enabled: z.boolean().optional(),
  share_data: z.boolean().optional(),
  allow_analytics: z.boolean().optional(),
  reduced_motion: z.boolean().optional(),
  high_contrast: z.boolean().optional(),
  large_text: z.boolean().optional()
});

// =====================================================
// MEAL ENTRY SCHEMAS
// =====================================================

export const CreateMealEntrySchema = z.object({
  description: z.string().min(1).max(1000),
  meal_timestamp: z.string().datetime().or(z.date()),
  protein_grams: z.number().min(0).max(500),
  calories: z.number().min(0).max(5000).optional(),
  carbs_grams: z.number().min(0).max(1000).optional(),
  fat_grams: z.number().min(0).max(500).optional(),
  fiber_grams: z.number().min(0).max(200).optional(),
  source_type: z.enum(['manual', 'voice', 'text', 'image', 'ai_scan', 'favorite', 'import']).optional(),
  ai_estimated: z.boolean().optional(),
  photo_url: z.string().url().optional(),
  photo_data: z.string().optional(),
  tags: z.array(z.string()).optional(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'other']).optional(),
  meal_time_category: z.enum(['morning', 'afternoon', 'evening', 'night', 'other']).optional()
});

export const UpdateMealEntrySchema = CreateMealEntrySchema.partial();

export const MealQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'other']).optional(),
  source_type: z.enum(['manual', 'voice', 'text', 'image', 'ai_scan', 'favorite', 'import']).optional(),
  ai_estimated: z.coerce.boolean().optional(),
  search: z.string().optional()
});

// =====================================================
// AI ANALYSIS SCHEMAS
// =====================================================

export const CreateMealAnalysisSchema = z.object({
  input_text: z.string().optional(),
  input_type: z.enum(['voice', 'text', 'image']),
  detected_foods: z.array(z.string()).min(1),
  confidence_score: z.number().min(0).max(1),
  confidence_level: z.enum(['high', 'medium', 'low']),
  estimated_protein: z.number().min(0).max(500).optional(),
  estimated_calories: z.number().min(0).max(5000).optional(),
  estimated_completeness: z.number().min(0).max(1).optional(),
  suggestions: z.array(z.string()).optional(),
  breakdown: z.record(z.any()).optional(),
  processing_time_ms: z.number().optional(),
  ai_model_version: z.string().optional()
});

export const AnalyzeMealInputSchema = z.object({
  input_text: z.string().min(1).optional(),
  input_type: z.enum(['voice', 'text', 'image']),
  photo_data: z.string().optional() // Base64 encoded image
});

// =====================================================
// FAVORITE MEALS SCHEMAS
// =====================================================

export const CreateFavoriteMealSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  protein_grams: z.number().min(0).max(500),
  calories: z.number().min(0).max(5000).optional(),
  carbs_grams: z.number().min(0).max(1000).optional(),
  fat_grams: z.number().min(0).max(500).optional(),
  tags: z.array(z.string()).optional(),
  photo_url: z.string().url().optional()
});

export const UpdateFavoriteMealSchema = CreateFavoriteMealSchema.partial();

// =====================================================
// SUMMARY SCHEMAS
// =====================================================

export const SummaryQuerySchema = z.object({
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  period: z.enum(['daily', 'weekly', 'monthly']).default('daily')
});

// =====================================================
// DATA EXPORT SCHEMAS
// =====================================================

export const CreateDataExportSchema = z.object({
  export_format: z.enum(['csv', 'pdf', 'json']),
  date_range_start: z.string().datetime().or(z.date()),
  date_range_end: z.string().datetime().or(z.date()),
  include_meals: z.boolean().default(true),
  include_favorites: z.boolean().default(true),
  include_summary: z.boolean().default(true),
  include_personal_info: z.boolean().default(true)
});

// =====================================================
// RESPONSE TYPES
// =====================================================

export type AuthUser = Omit<User, 'password_hash'> & {
  profile?: user_profiles;
};

export type UserUpdate = z.infer<typeof UserUpdateSchema>;

export type MealEntryWithAnalysis = meal_entries & {
  meal_analyses?: meal_analyses[];
};

export type DailySummaryWithDetails = daily_summaries & {
  user?: Pick<User, 'id' | 'first_name' | 'last_name'>;
};

export type FavoriteMealWithStats = favorite_meals & {
  recent_usage?: number;
  popularity_rank?: number;
};

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

// =====================================================
// REQUEST CONTEXT TYPES
// =====================================================

export interface RequestContext {
  userId: string;
  user: AuthUser;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthenticatedRequest extends Express.Request {
  user?: AuthUser;
  context?: RequestContext;
}

// =====================================================
// VALIDATION HELPERS
// =====================================================

export const validateUUID = (id: string): boolean => {
  return uuidSchema.safeParse(id).success;
};

export const validateEmail = (email: string): boolean => {
  return emailSchema.safeParse(email).success;
};

export const validateDateRange = (start: string, end: string): boolean => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return startDate <= endDate && endDate <= new Date();
};

// =====================================================
// ERROR TYPES
// =====================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  code: string;
  details?: ValidationError[];
  stack?: string;
}

// =====================================================
// TYPE INFERENCE FROM ZOD SCHEMAS
// =====================================================

export type LoginRequest = z.infer<typeof LoginSchema>;
export type RegisterRequest = z.infer<typeof RegisterSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenSchema>;
export type UserProfileUpdate = z.infer<typeof UserProfileUpdateSchema>;
export type CreateMealEntry = z.infer<typeof CreateMealEntrySchema>;
export type UpdateMealEntry = z.infer<typeof UpdateMealEntrySchema>;
export type MealQuery = z.infer<typeof MealQuerySchema>;
export type CreateMealAnalysis = z.infer<typeof CreateMealAnalysisSchema>;
export type AnalyzeMealInput = z.infer<typeof AnalyzeMealInputSchema>;
export type CreateFavoriteMeal = z.infer<typeof CreateFavoriteMealSchema>;
export type UpdateFavoriteMeal = z.infer<typeof UpdateFavoriteMealSchema>;
export type SummaryQuery = z.infer<typeof SummaryQuerySchema>;
export type CreateDataExport = z.infer<typeof CreateDataExportSchema>;