/**
 * Authentication types for DynProt app
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  emailVerified: boolean;
  hasCompletedOnboarding: boolean;
  last_analytics_viewed?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  acceptTerms: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateUserProfile: (updates: Partial<AuthUser>) => Promise<void>;
  deleteAccount: (data: { password: string; confirmation: string }) => Promise<void>;
}

export interface AuthError {
  code: string;
  message: string;
  field?: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

// Onboarding specific types
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface OnboardingData {
  personalInfo: {
    name: string;
    age: number;
    gender: 'male' | 'female' | 'other' | '';
  };
  physicalStats: {
    height: number;
    weight: number;
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extremely_active';
    units: 'metric' | 'imperial';
  };
  goals: {
    primaryGoal: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'general_health' | 'endurance' | 'strength';
    secondaryGoal?: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'general_health' | 'endurance' | 'strength' | 'none';
    goalPriority?: 'primary_only' | 'balanced' | 'secondary_focused';
    proteinGoal: number;
    calorieGoal: number;
    dietaryPreferences: string[];
    useCalculatedRecommendations?: boolean;
  };
  preferences: {
    notifications: boolean;
    dataSharing: boolean;
    darkMode: boolean;
  };
}

export type OnboardingStepKey = keyof OnboardingData;