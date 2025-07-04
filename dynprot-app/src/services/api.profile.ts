// Service API pour la gestion des profils utilisateur
import { z } from 'zod';
import { 
  apiClient, 
  ApiResponse, 
  validateWithSchema, 
  withRetry 
} from './api.service';
import { UserProfile } from './api.auth';

// =====================================================
// TYPES ET SCHÉMAS DE VALIDATION
// =====================================================

// Schémas de validation Zod
const UserProfileUpdateSchema = z.object({
  first_name: z.string().min(1, 'Prénom requis').max(50, 'Prénom trop long').optional(),
  last_name: z.string().min(1, 'Nom requis').max(50, 'Nom trop long').optional(),
  weight_kg: z.number().min(20, 'Poids trop faible').max(500, 'Poids trop élevé').optional(),
  height_cm: z.number().min(100, 'Taille trop faible').max(250, 'Taille trop élevée').optional(),
  age: z.number().min(13, 'Âge minimum 13 ans').max(120, 'Âge trop élevé').optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  body_fat_percentage: z.number().min(3, 'Taux trop faible').max(50, 'Taux trop élevé').optional(),
  daily_protein_goal: z.number().min(10, 'Objectif trop faible').max(500, 'Objectif trop élevé').optional(),
  daily_calorie_goal: z.number().min(800, 'Objectif trop faible').max(5000, 'Objectif trop élevé').optional(),
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

const GoalCalculationSchema = z.object({
  weight_kg: z.number().min(20).max(500),
  height_cm: z.number().min(100).max(250),
  age: z.number().min(13).max(120),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'very_active', 'extremely_active']),
  fitness_goal: z.enum(['lose_weight', 'maintain', 'gain_muscle', 'bulk', 'cut']).optional()
});

// Types TypeScript
export type UserProfileUpdate = z.infer<typeof UserProfileUpdateSchema>;
export type GoalCalculationRequest = z.infer<typeof GoalCalculationSchema>;

export interface DietaryPreference {
  id: number;
  name: string;
  description: string | null;
  common: boolean | null;
}

export interface GoalRecommendation {
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  macroDistribution: {
    protein: number;
    carbs: number;
    fat: number;
  };
  explanation: {
    bmr: string;
    tdee: string;
    protein: string;
    calories: string;
  };
}

export interface ProfileStats {
  profile: UserProfile;
  activityStats: {
    totalMealsLast30Days: number;
    aiAssistedMealsLast30Days: number;
    aiUsagePercentage: number;
    favoriteMealsCount: number;
    activeDaysLast7: number;
    goalsMetLast7Days: number;
    avgProteinGoalPercentage: number;
  };
  recentProgress: Array<{
    date: string;
    protein: number;
    calories: number;
    meals: number;
    proteinGoalMet: boolean;
    proteinPercentage: number;
  }>;
}

// =====================================================
// SERVICE DE GESTION DES PROFILS
// =====================================================

export class ProfileService {
  // Récupérer le profil utilisateur
  static async getProfile(): Promise<UserProfile> {
    const response: ApiResponse<{ profile: UserProfile }> = await apiClient.get('/profile');

    if (response.success && response.data) {
      return response.data.profile;
    }

    throw new Error(response.message || 'Erreur lors de la récupération du profil');
  }

  // Mettre à jour le profil utilisateur
  static async updateProfile(data: UserProfileUpdate): Promise<UserProfile> {
    // Validation côté client
    const validatedData = validateWithSchema(UserProfileUpdateSchema, data);

    const response: ApiResponse<{ profile: UserProfile }> = await withRetry(
      () => apiClient.put('/profile', validatedData)
    );

    if (response.success && response.data) {
      return response.data.profile;
    }

    throw new Error(response.message || 'Erreur lors de la mise à jour du profil');
  }

  // Calculer les objectifs recommandés
  static async calculateRecommendedGoals(data: GoalCalculationRequest): Promise<GoalRecommendation> {
    // Validation côté client
    const validatedData = validateWithSchema(GoalCalculationSchema, data);

    const response: ApiResponse<{ recommendations: GoalRecommendation }> = await apiClient.post(
      '/profile/calculate-goals',
      validatedData
    );

    if (response.success && response.data) {
      return response.data.recommendations;
    }

    throw new Error(response.message || 'Erreur lors du calcul des objectifs');
  }

  // Récupérer les préférences alimentaires disponibles
  static async getDietaryPreferences(): Promise<DietaryPreference[]> {
    const response: ApiResponse<{ preferences: DietaryPreference[] }> = await apiClient.get(
      '/profile/dietary-preferences'
    );

    if (response.success && response.data) {
      return response.data.preferences;
    }

    return [];
  }

  // Récupérer les statistiques du profil
  static async getProfileStats(): Promise<ProfileStats> {
    const response: ApiResponse<ProfileStats> = await apiClient.get('/profile/stats');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erreur lors de la récupération des statistiques');
  }

  // Compléter l'onboarding
  static async completeOnboarding(): Promise<void> {
    const response: ApiResponse = await apiClient.post('/profile/complete-onboarding');

    if (!response.success) {
      throw new Error(response.message || 'Erreur lors de la finalisation de l\'onboarding');
    }
  }

  // Vérifier si le profil est complet
  static async isProfileComplete(): Promise<boolean> {
    try {
      const profile = await this.getProfile();
      return !!(
        profile.weight_kg &&
        profile.height_cm &&
        profile.age &&
        profile.daily_protein_goal
      );
    } catch (error) {
      return false;
    }
  }

  // Sauvegarder les préférences d'accessibilité
  static async updateAccessibilitySettings(settings: {
    reduced_motion?: boolean;
    high_contrast?: boolean;
    large_text?: boolean;
  }): Promise<UserProfile> {
    return this.updateProfile(settings);
  }

  // Sauvegarder les préférences de l'application
  static async updateAppPreferences(preferences: {
    dark_mode?: boolean;
    notifications_enabled?: boolean;
    preferred_units?: 'metric' | 'imperial';
  }): Promise<UserProfile> {
    return this.updateProfile(preferences);
  }

  // Sauvegarder les préférences de confidentialité
  static async updatePrivacySettings(settings: {
    share_data?: boolean;
    allow_analytics?: boolean;
  }): Promise<UserProfile> {
    return this.updateProfile(settings);
  }

  // Mettre à jour uniquement les objectifs nutritionnels
  static async updateNutritionGoals(goals: {
    daily_protein_goal?: number;
    daily_calorie_goal?: number;
  }): Promise<UserProfile> {
    return this.updateProfile(goals);
  }

  // Mettre à jour les informations physiques
  static async updatePhysicalInfo(info: {
    weight_kg?: number;
    height_cm?: number;
    age?: number;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    body_fat_percentage?: number;
  }): Promise<UserProfile> {
    return this.updateProfile(info);
  }

  // Mettre à jour les informations d'activité et fitness
  static async updateFitnessInfo(info: {
    activity_level?: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extremely_active';
    fitness_goal?: 'lose_weight' | 'maintain' | 'gain_muscle' | 'bulk' | 'cut';
    training_days_per_week?: number;
  }): Promise<UserProfile> {
    return this.updateProfile(info);
  }

  // Mettre à jour les préférences alimentaires
  static async updateDietPreferences(preferences: string[]): Promise<UserProfile> {
    return this.updateProfile({ diet_preferences: preferences });
  }

  // Supprimer le profil utilisateur
  static async deleteProfile(): Promise<void> {
    const response: ApiResponse = await withRetry(
      () => apiClient.delete('/profile')
    );

    if (!response.success) {
      throw new Error(response.message || 'Erreur lors de la suppression du profil');
    }
  }
}

// =====================================================
// HELPERS ET UTILITAIRES
// =====================================================

// Helper pour calculer l'IMC
export const calculateBMI = (weightKg: number, heightCm: number): number => {
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
};

// Helper pour interpréter l'IMC
export const interpretBMI = (bmi: number): string => {
  if (bmi < 18.5) return 'Insuffisance pondérale';
  if (bmi < 25) return 'Poids normal';
  if (bmi < 30) return 'Surpoids';
  return 'Obésité';
};

// Helper pour calculer l'âge à partir de la date de naissance
export const calculateAge = (birthDate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Helper pour formater les unités selon les préférences
export const formatWeight = (weightKg: number, units: 'metric' | 'imperial'): string => {
  if (units === 'imperial') {
    const pounds = Math.round(weightKg * 2.20462);
    return `${pounds} lbs`;
  }
  return `${weightKg} kg`;
};

export const formatHeight = (heightCm: number, units: 'metric' | 'imperial'): string => {
  if (units === 'imperial') {
    const totalInches = Math.round(heightCm / 2.54);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return `${feet}'${inches}"`;
  }
  return `${heightCm} cm`;
};

// Helper pour valider les données d'onboarding
export const validateOnboardingData = (profile: Partial<UserProfile>): {
  isValid: boolean;
  missingFields: string[];
} => {
  const requiredFields = [
    { key: 'weight_kg', label: 'Poids' },
    { key: 'height_cm', label: 'Taille' },
    { key: 'age', label: 'Âge' },
    { key: 'daily_protein_goal', label: 'Objectif protéines' }
  ];

  const missingFields = requiredFields
    .filter(field => !profile[field.key as keyof UserProfile])
    .map(field => field.label);

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

// Helper pour créer un profil par défaut
export const createDefaultProfile = (): Partial<UserProfileUpdate> => ({
  daily_protein_goal: 120,
  daily_calorie_goal: 2000,
  activity_level: 'moderate',
  fitness_goal: 'maintain',
  preferred_units: 'metric',
  diet_preferences: [],
  dark_mode: false,
  notifications_enabled: true,
  share_data: false,
  allow_analytics: true,
  reduced_motion: false,
  high_contrast: false,
  large_text: false,
  training_days_per_week: 3
});

// Helper pour convertir les unités
export const convertUnits = {
  kgToLbs: (kg: number): number => Math.round(kg * 2.20462),
  lbsToKg: (lbs: number): number => Math.round(lbs / 2.20462),
  cmToInches: (cm: number): number => Math.round(cm / 2.54),
  inchesToCm: (inches: number): number => Math.round(inches * 2.54),
  feetAndInchesToCm: (feet: number, inches: number): number => {
    const totalInches = feet * 12 + inches;
    return Math.round(totalInches * 2.54);
  }
};

// Helper pour les labels d'activité
export const activityLevelLabels = {
  sedentary: 'Sédentaire (peu ou pas d\'exercice)',
  light: 'Léger (exercice léger 1-3 jours/semaine)',
  moderate: 'Modéré (exercice modéré 3-5 jours/semaine)',
  very_active: 'Actif (exercice intense 6-7 jours/semaine)',
  extremely_active: 'Très actif (exercice très intense, travail physique)'
};

export const fitnessGoalLabels = {
  lose_weight: 'Perdre du poids',
  maintain: 'Maintenir le poids',
  gain_muscle: 'Prendre du muscle',
  bulk: 'Prise de masse',
  cut: 'Sèche'
};

// Helper pour valider les objectifs nutritionnels
export const validateNutritionGoals = (
  proteinGoal: number,
  calorieGoal: number,
  weight?: number
): {
  isValid: boolean;
  warnings: string[];
} => {
  const warnings: string[] = [];

  // Vérifier l'objectif protéines
  if (weight) {
    const proteinPerKg = proteinGoal / weight;
    if (proteinPerKg < 0.8) {
      warnings.push('L\'objectif protéines semble faible (moins de 0.8g/kg)');
    } else if (proteinPerKg > 3) {
      warnings.push('L\'objectif protéines semble très élevé (plus de 3g/kg)');
    }
  }

  // Vérifier l'objectif calories
  if (calorieGoal < 1200) {
    warnings.push('L\'objectif calories semble très faible (moins de 1200 cal)');
  } else if (calorieGoal > 4000) {
    warnings.push('L\'objectif calories semble très élevé (plus de 4000 cal)');
  }

  return {
    isValid: warnings.length === 0,
    warnings
  };
};