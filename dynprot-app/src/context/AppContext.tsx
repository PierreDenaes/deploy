import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { UnifiedAnalysisResult } from '../hooks/useAnalyzeMeal';
import { MealService, FavoriteService, FavoriteMeal as ApiFavoriteMeal } from '../services/api.meals';
import { ProfileService } from '../services/api.profile';
import { SummaryService } from '../services/api.summaries';
import { AuthService } from '../services/api.auth';
import { ErrorHandler } from '../utils/errorHandling';
import { useTypedLoading, LoadingOperations } from '../hooks/useLoadingState';
import { safeNumber, safeDate } from '../utils/numberUtils';
import { apiClient } from '../services/api.service';

// Types for our global state
export interface UserProfile {
  id: string;
  name: string;
  dailyProteinGoal: number;
  weightKg: number;
  heightCm: number;
  preferredUnits: 'metric' | 'imperial';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extremely_active';
  dietPreferences: string[];
  calorieGoal?: number;
}

export interface MealEntry {
  id: string;
  timestamp: string;
  description: string;
  protein: number;
  calories?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  photo?: string;
  imageUrl?: string;
  source?: string;
  aiEstimated: boolean;
  tags?: string[];
}

export interface FavoriteMeal {
  id: string;
  name: string;
  description: string;
  protein: number;
  calories?: number | null;
  tags?: string[];
  createdAt: string;
  lastUsed: string;
  useCount: number;
}

export interface AIServiceState {
  isAvailable: boolean;
  usageToday: number;
  usageLimit: number;
  features: {
    proteinEstimation: boolean;
    mealRecommendation: boolean;
    nutritionAnalysis: boolean;
  };
}

export interface CameraState {
  isAvailable: boolean;
  isActive: boolean;
  hasPermission: boolean | null;
  currentDevice: string | null;
  availableDevices: MediaDeviceInfo[];
}

export interface NavigationState {
  currentRoute: string;
  previousRoute: string | null;
  history: string[];
}

export interface UserPreferences {
  darkMode: boolean;
  notifications: boolean;
  privacySettings: {
    shareData: boolean;
    allowAnalytics: boolean;
  };
  accessibility: {
    reducedMotion: boolean;
    highContrast: boolean;
    largeText: boolean;
  };
}

export interface AppState {
  meals: MealEntry[];
  favoriteMeals: FavoriteMeal[];
  user: UserProfile;
  camera: CameraState;
  ai: AIServiceState;
  navigation: NavigationState;
  preferences: UserPreferences;
  isLoading: boolean;
  error: string | null;
  analysisResult: UnifiedAnalysisResult | null;
  lastAnalyticsViewed: string | null;
  userSettings?: {
    proteinGoal: number;
    calorieGoal: number;
    weightKg: number;
    heightCm: number;
    activityLevel: string;
    preferredUnits: 'metric' | 'imperial';
    age?: number;
    gender?: string;
    fitnessGoal?: string;
    bodyFatPercentage?: number;
    trainingDays?: number;
  };
}

// Define action types
type ActionType =
  | { type: 'SET_USER'; payload: UserProfile }
  | { type: 'ADD_MEAL'; payload: MealEntry }
  | { type: 'DELETE_MEAL'; payload: string }
  | { type: 'UPDATE_MEAL'; payload: MealEntry }
  | { type: 'SET_MEALS'; payload: MealEntry[] }
  | { type: 'ADD_FAVORITE_MEAL'; payload: FavoriteMeal }
  | { type: 'DELETE_FAVORITE_MEAL'; payload: string }
  | { type: 'UPDATE_FAVORITE_MEAL'; payload: FavoriteMeal }
  | { type: 'UPDATE_FAVORITE_MEALS'; payload: FavoriteMeal[] }
  | { type: 'SET_FAVORITE_MEALS'; payload: FavoriteMeal[] }
  | { type: 'SET_CAMERA_STATE'; payload: Partial<CameraState> }
  | { type: 'SET_AI_STATE'; payload: Partial<AIServiceState> }
  | { type: 'SET_NAVIGATION'; payload: Partial<NavigationState> }
  | { type: 'SET_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ANALYSIS_RESULT'; payload: UnifiedAnalysisResult | null }
  | { type: 'CLEAR_ANALYSIS_RESULT' }
  | { type: 'LOAD_STORED_STATE'; payload: AppState }
  | { type: 'UPDATE_USER_SETTINGS'; payload: Partial<AppState['userSettings']> }
  | { type: 'MARK_ANALYTICS_VIEWED' }
  | { type: 'SET_LAST_ANALYTICS_VIEWED'; payload: string | null }
  | { type: 'RESET_APP_DATA' };

// Initial state  
const initialState: AppState = {
  meals: [],
  favoriteMeals: [],
  user: {
    id: 'user-1',
    name: 'User',
    dailyProteinGoal: 120,
    weightKg: 75,
    heightCm: 175,
    preferredUnits: 'metric',
    activityLevel: 'moderate',
    dietPreferences: [],
    calorieGoal: 2000,
  },
  camera: {
    isAvailable: false,
    isActive: false,
    hasPermission: null,
    currentDevice: null,
    availableDevices: [],
  },
  ai: {
    isAvailable: true,
    usageToday: 0,
    usageLimit: 50,
    features: {
      proteinEstimation: true,
      mealRecommendation: true,
      nutritionAnalysis: true,
    },
  },
  navigation: {
    currentRoute: '/',
    previousRoute: null,
    history: ['/'],
  },
  preferences: {
    darkMode: false,
    notifications: true,
    privacySettings: {
      shareData: false,
      allowAnalytics: true,
    },
    accessibility: {
      reducedMotion: false,
      highContrast: false,
      largeText: false,
    },
  },
  isLoading: false,
  error: null,
  analysisResult: null,
  lastAnalyticsViewed: null,
  userSettings: {
    proteinGoal: 120,
    calorieGoal: 2000,
    weightKg: 75,
    heightCm: 175,
    activityLevel: 'moderate',
    preferredUnits: 'metric',
    age: 30,
    gender: 'other',
    fitnessGoal: 'general_health',
    bodyFatPercentage: 20,
    trainingDays: 3,
  }
};

// Create a context for our app state
const AppStateContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<ActionType>;
  addMeal: (meal: Omit<MealEntry, 'aiEstimated'>) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  updateUserSettings: (settings: Partial<AppState['userSettings']>) => Promise<void>;
  updateNutritionGoals: (nutritionGoals: { proteinGoal?: number; calorieGoal?: number }) => Promise<void>;
  addFavoriteMeal: (meal: Omit<FavoriteMeal, 'id' | 'createdAt' | 'lastUsed' | 'useCount'>) => Promise<void>;
  deleteFavoriteMeal: (id: string) => Promise<void>;
  updateFavoriteMeal: (id: string, updates: Partial<FavoriteMeal>) => Promise<void>;
  addMealFromFavorite: (favoriteId: string) => Promise<void>;
  setAnalysisResult: (result: UnifiedAnalysisResult | null) => void;
  clearAnalysisResult: () => void;
  markAnalyticsViewed: () => void;
  resetAppData: () => Promise<void>;
  deleteUserAccount: (password: string, confirmation: string) => Promise<void>;
  userSettings?: AppState['userSettings'];
}>({
  state: initialState,
  dispatch: () => null,
  addMeal: async () => {},
  deleteMeal: async () => {},
  updateUserSettings: async () => {},
  updateNutritionGoals: async () => {},
  addFavoriteMeal: async () => {},
  deleteFavoriteMeal: async () => {},
  updateFavoriteMeal: async () => {},
  addMealFromFavorite: async () => {},
  setAnalysisResult: () => {},
  clearAnalysisResult: () => {},
  markAnalyticsViewed: () => {},
  resetAppData: async () => {},
  deleteUserAccount: async () => {},
  userSettings: initialState.userSettings,
});

// Reducer function to handle state updates
const appReducer = (state: AppState, action: ActionType): AppState => {
  let newState: AppState;
  
  switch (action.type) {
    case 'SET_USER':
      newState = { ...state, user: action.payload };
      // Note: User profile updates are now handled via API calls
      return newState;
      
    case 'ADD_MEAL':
      newState = { ...state, meals: [...state.meals, action.payload] };
      // Note: Meals are now persisted via API calls
      return newState;
      
    case 'DELETE_MEAL':
      newState = {
        ...state,
        meals: state.meals.filter((meal) => meal.id !== action.payload),
      };
      // Note: Meal deletion is now handled via API calls
      return newState;
      
    case 'UPDATE_MEAL':
      newState = {
        ...state,
        meals: state.meals.map((meal) =>
          meal.id === action.payload.id ? action.payload : meal
        ),
      };
      // Note: Meal updates are now handled via API calls
      return newState;
      
    case 'SET_MEALS':
      return {
        ...state,
        meals: action.payload
      };
      
    case 'ADD_FAVORITE_MEAL':
      newState = { ...state, favoriteMeals: [...(state.favoriteMeals || []), action.payload] };
      // Note: Favorites are now persisted via API calls
      return newState;
      
    case 'DELETE_FAVORITE_MEAL':
      newState = {
        ...state,
        favoriteMeals: (state.favoriteMeals || []).filter((meal) => meal.id !== action.payload),
      };
      // Note: Favorite deletion is now handled via API calls
      return newState;
      
    case 'UPDATE_FAVORITE_MEAL':
      newState = {
        ...state,
        favoriteMeals: (state.favoriteMeals || []).map((meal) =>
          meal.id === action.payload.id ? action.payload : meal
        ),
      };
      // Note: Favorite updates are now handled via API calls
      return newState;
      
    case 'UPDATE_FAVORITE_MEALS':
      newState = {
        ...state,
        favoriteMeals: action.payload
      };
      // Note: This action updates only favorites without affecting meals
      return newState;
      
    case 'SET_FAVORITE_MEALS':
      return {
        ...state,
        favoriteMeals: action.payload
      };
      
    case 'SET_CAMERA_STATE':
      return { ...state, camera: { ...state.camera, ...action.payload } };
      
    case 'SET_AI_STATE':
      newState = { ...state, ai: { ...state.ai, ...action.payload } };
      // Note: AI state is managed client-side for now
      return newState;
      
    case 'SET_NAVIGATION':
      return { ...state, navigation: { ...state.navigation, ...action.payload } };
      
    case 'SET_PREFERENCES':
      newState = {
        ...state,
        preferences: { ...state.preferences, ...action.payload },
      };
      // Note: Preferences are now saved via user profile API
      return newState;
      
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_ANALYSIS_RESULT':
      return { ...state, analysisResult: action.payload };

    case 'CLEAR_ANALYSIS_RESULT':
      return { ...state, analysisResult: null };

    case 'MARK_ANALYTICS_VIEWED':
      return { ...state, lastAnalyticsViewed: new Date().toISOString() };

    case 'SET_LAST_ANALYTICS_VIEWED':
      return { ...state, lastAnalyticsViewed: action.payload };

    case 'UPDATE_USER_SETTINGS':
      newState = {
        ...state,
        userSettings: {
          ...state.userSettings,
          proteinGoal: action.payload?.proteinGoal ?? state.userSettings?.proteinGoal ?? 120,
          calorieGoal: action.payload?.calorieGoal ?? state.userSettings?.calorieGoal ?? 2000,
          weightKg: action.payload?.weightKg ?? state.userSettings?.weightKg ?? 75,
          heightCm: action.payload?.heightCm ?? state.userSettings?.heightCm ?? 175,
          activityLevel: (action.payload?.activityLevel ?? state.userSettings?.activityLevel ?? 'moderate') as 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extremely_active',
          preferredUnits: (action.payload?.preferredUnits ?? state.userSettings?.preferredUnits ?? 'metric') as 'metric' | 'imperial',
          age: action.payload?.age ?? state.userSettings?.age,
          gender: action.payload?.gender ?? state.userSettings?.gender,
          fitnessGoal: action.payload?.fitnessGoal ?? state.userSettings?.fitnessGoal,
          bodyFatPercentage: action.payload?.bodyFatPercentage ?? state.userSettings?.bodyFatPercentage,
          trainingDays: action.payload?.trainingDays ?? state.userSettings?.trainingDays,
        },
        user: { 
          ...state.user, 
          dailyProteinGoal: action.payload?.proteinGoal ?? state.user.dailyProteinGoal,
          calorieGoal: action.payload?.calorieGoal ?? state.user.calorieGoal,
          weightKg: action.payload?.weightKg ?? state.user.weightKg,
          heightCm: action.payload?.heightCm ?? state.user.heightCm,
          activityLevel: (action.payload?.activityLevel ?? state.user.activityLevel) as 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extremely_active',
          preferredUnits: (action.payload?.preferredUnits ?? state.user.preferredUnits) as 'metric' | 'imperial',
        }
      };
      // Note: User settings are now saved via profile API
      return newState;
      
    case 'LOAD_STORED_STATE':
      return {
        ...action.payload,
        favoriteMeals: action.payload.favoriteMeals || []
      };

    case 'RESET_APP_DATA':
      // Preserve certain important preferences before clearing
      const preservedPreferences = {
        darkMode: state.preferences.darkMode,
        accessibility: state.preferences.accessibility
      };
      
      // Clear localStorage but preserve theme
      const keysToPreserve = ['darkMode', 'accessibility'];
      const preservedData: Record<string, string> = {};
      keysToPreserve.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) preservedData[key] = value;
      });
      
      localStorage.clear();
      
      // Restore preserved data
      Object.entries(preservedData).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
      
      // Reset to initial state but preserve authentication and preferences
      return {
        ...initialState,
        user: {
          ...initialState.user,
          id: state.user.id,
          name: state.user.name || initialState.user.name
        },
        preferences: {
          ...initialState.preferences,
          ...preservedPreferences
        }
      };
      
    default:
      return state;
  }
};

// Provider component
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { user: authUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const { executeOperation } = useTypedLoading();

  // Load data from API when user is authenticated
  useEffect(() => {
    const loadUserData = async () => {
      if (!isAuthenticated || !authUser || authLoading) {
        return;
      }
      
      try {
        // Load user profile from API
        await executeOperation(LoadingOperations.LOAD_PROFILE, async () => {
          const profile = await ProfileService.getProfile();
          
          // Map API profile to local user state
          const userProfile: UserProfile = {
            id: profile.id,
            name: profile.first_name && profile.last_name 
              ? `${profile.first_name} ${profile.last_name}`.trim()
              : profile.first_name || authUser.name || 'Utilisateur',
            dailyProteinGoal: profile.daily_protein_goal,
            weightKg: profile.weight_kg || 75,
            heightCm: profile.height_cm || 175,
            preferredUnits: (profile.preferred_units as 'metric' | 'imperial') || 'metric',
            activityLevel: (profile.activity_level as 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extremely_active') || 'moderate',
            dietPreferences: profile.diet_preferences || [],
            calorieGoal: profile.daily_calorie_goal || undefined,
          };
          
          dispatch({ type: 'SET_USER', payload: userProfile });
          
          // Load last analytics viewed timestamp from auth user
          // Removed: authUser?.last_analytics_viewed block, as this property does not exist on AuthUser
          
          // Update user settings
          dispatch({ 
            type: 'UPDATE_USER_SETTINGS', 
            payload: {
              proteinGoal: profile.daily_protein_goal,
              calorieGoal: profile.daily_calorie_goal || undefined,
              weightKg: profile.weight_kg || 75,
              heightCm: profile.height_cm || 175,
              activityLevel: (profile.activity_level as 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extremely_active') || 'moderate',
              preferredUnits: (profile.preferred_units as 'metric' | 'imperial') || 'metric',
              age: profile.age || undefined,
              gender: profile.gender || undefined,
              fitnessGoal: profile.fitness_goal || undefined,
              bodyFatPercentage: (profile as any).body_fat_percentage || undefined,
              trainingDays: (profile as any).training_days_per_week || undefined,
            }
          });
        });
        
        // Load recent meals (last 30 days) to preserve history
        await executeOperation(LoadingOperations.LOAD_MEALS, async () => {
          const recentMeals = await MealService.getRecentMeals(30);
          
          // Map API meals to local meal state
          const mappedMeals: MealEntry[] = recentMeals.map(meal => ({
            id: meal.id,
            timestamp: meal.meal_timestamp,
            description: meal.description,
            protein: safeNumber(meal.protein_grams, 0),
            calories: safeNumber(meal.calories, 0),
            photo: meal.photo_url || undefined,
            imageUrl: meal.photo_url || undefined,
            source: meal.source_type || 'manual',
            aiEstimated: meal.ai_estimated || false,
            tags: meal.tags || [],
          }));
          
          // Replace meals in state with recent historical data
          dispatch({ type: 'SET_MEALS', payload: mappedMeals });
        });
        
        // Load favorite meals
        await executeOperation(LoadingOperations.LOAD_FAVORITES, async () => {
          const favorites = await FavoriteService.getFavorites();
          
          // Map API favorites to local favorite state
          const mappedFavorites: FavoriteMeal[] = favorites.map(fav => ({
            id: fav.id,
            name: fav.name,
            description: fav.description,
            protein: safeNumber(fav.protein_grams, 0),
            calories: safeNumber(fav.calories, 0),
            tags: fav.tags || [],
            createdAt: safeDate(fav.created_at, new Date()).toISOString(),
            lastUsed: safeDate(fav.last_used_at, new Date()).toISOString(),
            useCount: fav.use_count || 0,
          }));
          
          // Update favorites in state
          dispatch({ type: 'SET_FAVORITE_MEALS', payload: mappedFavorites });
        });
        
      } catch (error) {
        ErrorHandler.handle(error, {
          context: 'AppContext.loadUserData',
          showToast: false,
          silent: true
        });
        
        // Initialize with auth user data on error
        dispatch({ 
          type: 'SET_USER', 
          payload: {
            ...initialState.user,
            id: authUser.id,
            name: authUser.name,
          }
        });
      }
    };
    
    loadUserData();
  }, [isAuthenticated, authUser, authLoading]);

  // Auto-save preferences to API when they change
  useEffect(() => {
    const savePreferences = async () => {
      if (!isAuthenticated || !authUser || authLoading) {
        return;
      }
      
      try {
        // Save user preferences to profile
        await ProfileService.updateAppPreferences({
          dark_mode: state.preferences.darkMode,
          notifications_enabled: state.preferences.notifications,
        });
        
        await ProfileService.updateAccessibilitySettings({
          reduced_motion: state.preferences.accessibility.reducedMotion,
          high_contrast: state.preferences.accessibility.highContrast,
          large_text: state.preferences.accessibility.largeText,
        });
        
        await ProfileService.updatePrivacySettings({
          share_data: state.preferences.privacySettings.shareData,
          allow_analytics: state.preferences.privacySettings.allowAnalytics,
        });
      } catch (error) {
        // Silent error - preferences will be saved on next API call
      }
    };
    
    // Debounce preference saves
    const timeout = setTimeout(savePreferences, 1000);
    return () => clearTimeout(timeout);
  }, [state.preferences, isAuthenticated, authUser, authLoading]);

  // Apply dark mode from preferences
  useEffect(() => {
    if (state.preferences.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.preferences.darkMode]);

  // Apply accessibility settings
  useEffect(() => {
    const { accessibility } = state.preferences;
    
    if (accessibility.largeText) {
      document.documentElement.classList.add('text-lg');
    } else {
      document.documentElement.classList.remove('text-lg');
    }
    
    if (accessibility.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    
    if (accessibility.reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [state.preferences.accessibility]);

  // Helper function to add meals - now saves to API
  const addMeal = async (meal: Omit<MealEntry, 'aiEstimated'>) => {
    try {
      const aiEstimated = meal.source === 'ai_scan' || meal.source === 'text' || meal.source === 'image';
      
      // Create meal via API - clean data before sending
      const mealData = {
        description: meal.description,
        meal_timestamp: meal.timestamp,
        protein_grams: safeNumber(meal.protein, 0),
        calories: safeNumber(meal.calories, 0),
        source_type: meal.source as any,
        ai_estimated: aiEstimated,
        // Only include photo_url if it's a valid URL
        ...(meal.photo && meal.photo.startsWith('http') ? { photo_url: meal.photo } : {}),
        tags: meal.tags || [],
      };

      const createdMeal = await executeOperation(
        LoadingOperations.CREATE_MEAL,
        () => MealService.createMeal(mealData)
      );
      
      // Update local state with API response
      const localMeal: MealEntry = {
        id: createdMeal.id,
        timestamp: createdMeal.meal_timestamp,
        description: createdMeal.description,
        protein: safeNumber(createdMeal.protein_grams, 0),
        calories: safeNumber(createdMeal.calories, 0),
        photo: createdMeal.photo_url || undefined,
        imageUrl: createdMeal.photo_url || undefined,
        source: createdMeal.source_type || 'manual',
        aiEstimated: createdMeal.ai_estimated || false,
        tags: createdMeal.tags || [],
      };
      
      dispatch({ type: 'ADD_MEAL', payload: localMeal });
    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'AppContext.addMeal',
        showToast: true
      });
      throw error;
    }
  };

  // Helper function to delete meals - now deletes from API
  const deleteMeal = async (id: string) => {
    try {
      await executeOperation(
        LoadingOperations.DELETE_MEAL,
        () => MealService.deleteMeal(id)
      );
      
      dispatch({ type: 'DELETE_MEAL', payload: id });
    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'AppContext.deleteMeal',
        showToast: true
      });
      throw error;
    }
  };

  // Helper function to update ONLY nutrition goals - avoids validation errors
  const updateNutritionGoals = async (nutritionGoals: { proteinGoal?: number; calorieGoal?: number }) => {
    try {
      const goals: any = {};
      if (nutritionGoals.proteinGoal !== undefined) goals.daily_protein_goal = nutritionGoals.proteinGoal;
      if (nutritionGoals.calorieGoal !== undefined) goals.daily_calorie_goal = nutritionGoals.calorieGoal;
      
      if (Object.keys(goals).length > 0) {
        await executeOperation(
          LoadingOperations.UPDATE_PROFILE,
          () => ProfileService.updateNutritionGoals(goals)
        );
        
        // Update local state
        dispatch({ type: 'UPDATE_USER_SETTINGS', payload: nutritionGoals });
      }
    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'AppContext.updateNutritionGoals',
        showToast: true
      });
      throw error;
    }
  };

  // Helper function to update user settings - now saves to API
  const updateUserSettings = async (settings: Partial<AppState['userSettings']> = {}) => {
    try {
      // Update profile via API
      if (settings?.proteinGoal || settings?.calorieGoal) {
        // Filter out undefined values and validate
        const nutritionGoals: any = {};
        if (settings?.proteinGoal !== undefined) nutritionGoals.daily_protein_goal = settings.proteinGoal;
        if (settings?.calorieGoal !== undefined) nutritionGoals.daily_calorie_goal = settings.calorieGoal;
        
        if (Object.keys(nutritionGoals).length > 0) {
          await executeOperation(
            LoadingOperations.UPDATE_PROFILE,
            () => ProfileService.updateNutritionGoals(nutritionGoals)
          );
        }
      }
      
      // Only process physical info if we actually have physical data to update
      const physicalInfo: any = {};
      if (settings?.weightKg !== undefined) physicalInfo.weight_kg = settings.weightKg;
      if (settings?.heightCm !== undefined) physicalInfo.height_cm = settings.heightCm;
      if (settings?.age !== undefined) physicalInfo.age = settings.age;
      if (settings?.gender !== undefined) physicalInfo.gender = settings.gender;
      if (settings?.bodyFatPercentage !== undefined) physicalInfo.body_fat_percentage = settings.bodyFatPercentage;
      
      if (Object.keys(physicalInfo).length > 0) {
        await executeOperation(
          LoadingOperations.UPDATE_PROFILE,
          () => ProfileService.updatePhysicalInfo(physicalInfo)
        );
      }
      
      if (settings?.activityLevel || settings?.fitnessGoal || settings?.trainingDays) {
        // Filter out undefined values and validate
        const fitnessInfo: any = {};
        if (settings?.activityLevel !== undefined) fitnessInfo.activity_level = settings.activityLevel;
        if (settings?.fitnessGoal !== undefined) fitnessInfo.fitness_goal = settings.fitnessGoal;
        if (settings?.trainingDays !== undefined) fitnessInfo.training_days_per_week = settings.trainingDays;
        
        if (Object.keys(fitnessInfo).length > 0) {
          await executeOperation(
            LoadingOperations.UPDATE_PROFILE,
            () => ProfileService.updateFitnessInfo(fitnessInfo)
          );
        }
      }
      
      // Update local state
      dispatch({ type: 'UPDATE_USER_SETTINGS', payload: settings });
    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'AppContext.updateUserSettings',
        showToast: true
      });
      throw error;
    }
  };

  // Helper function to convert API FavoriteMeal to local FavoriteMeal format
  const mapApiFavoriteToLocal = (apiFavorite: ApiFavoriteMeal): FavoriteMeal => ({
    id: apiFavorite.id,
    name: apiFavorite.name,
    description: apiFavorite.description,
    protein: safeNumber(apiFavorite.protein_grams, 0),
    calories: safeNumber(apiFavorite.calories, 0),
    tags: apiFavorite.tags || [],
    createdAt: safeDate(apiFavorite.created_at, new Date()).toISOString(),
    lastUsed: safeDate(apiFavorite.last_used_at, new Date()).toISOString(),
    useCount: apiFavorite.use_count || 0,
  });

  // Helper functions for favorites - now saves to API
  const addFavoriteMeal = async (meal: Omit<FavoriteMeal, 'id' | 'createdAt' | 'lastUsed' | 'useCount'>) => {
    try {
      const createdFavorite = await executeOperation(
        LoadingOperations.CREATE_FAVORITE,
        () => FavoriteService.createFavorite({
          name: meal.name.trim(),
          description: meal.description.trim(),
          protein_grams: Math.round(Math.max(0, meal.protein || 0)),
          calories: meal.calories && meal.calories > 0 ? Math.round(meal.calories) : undefined,
          tags: meal.tags || [],
        })
      );
      
      const localFavorite = mapApiFavoriteToLocal(createdFavorite);
      
      dispatch({ type: 'ADD_FAVORITE_MEAL', payload: localFavorite });
    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'AppContext.addFavoriteMeal',
        showToast: true
      });
      throw error;
    }
  };

  const deleteFavoriteMeal = async (id: string) => {
    try {
      await executeOperation(
        LoadingOperations.DELETE_FAVORITE,
        () => FavoriteService.deleteFavorite(id)
      );
      
      dispatch({ type: 'DELETE_FAVORITE_MEAL', payload: id });
    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'AppContext.deleteFavoriteMeal',
        showToast: true
      });
      throw error;
    }
  };

  const updateFavoriteMeal = async (id: string, updates: Partial<FavoriteMeal>) => {
    try {
      const updatedFavorite = await executeOperation(
        LoadingOperations.UPDATE_FAVORITE,
        () => FavoriteService.updateFavorite(id, {
          name: updates.name,
          description: updates.description,
          protein_grams: updates.protein,
          calories: updates.calories,
          tags: updates.tags,
        })
      );
      
      const localFavorite: FavoriteMeal = {
        id: updatedFavorite.id,
        name: updatedFavorite.name,
        description: updatedFavorite.description,
        protein: safeNumber(updatedFavorite.protein_grams, 0),
        calories: safeNumber(updatedFavorite.calories, 0),
        tags: updatedFavorite.tags || [],
        createdAt: safeDate(updatedFavorite.created_at, new Date()).toISOString(),
        lastUsed: safeDate(updatedFavorite.last_used_at, new Date()).toISOString(),
        useCount: updatedFavorite.use_count || 0,
      };
      
      dispatch({ type: 'UPDATE_FAVORITE_MEAL', payload: localFavorite });
    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'AppContext.updateFavoriteMeal',
        showToast: true
      });
      throw error;
    }
  };

  const addMealFromFavorite = async (favoriteId: string) => {
    try {
      const { mealTemplate } = await executeOperation(
        LoadingOperations.CREATE_MEAL,
        () => FavoriteService.useFavorite(favoriteId)
      );
      
      // Clean and validate meal template data before creating meal
      const cleanTemplate = {
        description: mealTemplate.description || '',
        meal_timestamp: mealTemplate.meal_timestamp || new Date().toISOString(),
        protein_grams: Math.max(0, Math.min(500, mealTemplate.protein_grams || 0)),
        calories: mealTemplate.calories ? Math.max(0, Math.min(5000, mealTemplate.calories)) : undefined,
        carbs_grams: mealTemplate.carbs_grams ? Math.max(0, Math.min(1000, mealTemplate.carbs_grams)) : undefined,
        fat_grams: mealTemplate.fat_grams ? Math.max(0, Math.min(500, mealTemplate.fat_grams)) : undefined,
        fiber_grams: mealTemplate.fiber_grams ? Math.max(0, Math.min(200, mealTemplate.fiber_grams)) : undefined,
        source_type: 'favorite' as const,
        ai_estimated: false,
        tags: Array.isArray(mealTemplate.tags) ? mealTemplate.tags : [],
        meal_type: mealTemplate.meal_type || 'other' as const,
        meal_time_category: mealTemplate.meal_time_category || 'other' as const
      };
      
      // Remove undefined values
      Object.keys(cleanTemplate).forEach(key => {
        if (cleanTemplate[key as keyof typeof cleanTemplate] === undefined) {
          delete cleanTemplate[key as keyof typeof cleanTemplate];
        }
      });
      
      // Create meal from the cleaned template
      const createdMeal = await executeOperation(
        LoadingOperations.CREATE_MEAL,
        () => MealService.createMeal(cleanTemplate)
      );
      
      // Update local state
      const localMeal: MealEntry = {
        id: createdMeal.id,
        timestamp: createdMeal.meal_timestamp,
        description: createdMeal.description,
        protein: safeNumber(createdMeal.protein_grams, 0),
        calories: safeNumber(createdMeal.calories, 0),
        photo: createdMeal.photo_url || undefined,
        imageUrl: createdMeal.photo_url || undefined,
        source: 'favorite',
        aiEstimated: false,
        tags: createdMeal.tags || [],
      };
      
      dispatch({ type: 'ADD_MEAL', payload: localMeal });
      
      // Refresh favorites to get updated use count (without overwriting meals)
      const updatedFavorites = await FavoriteService.getFavorites();
      const mappedFavorites = updatedFavorites.map(mapApiFavoriteToLocal);
      
      dispatch({ type: 'UPDATE_FAVORITE_MEALS', payload: mappedFavorites });
    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'AppContext.addMealFromFavorite',
        showToast: true
      });
      throw error;
    }
  };

  // Analysis result management
  const setAnalysisResult = (result: UnifiedAnalysisResult | null) => {
    dispatch({ type: 'SET_ANALYSIS_RESULT', payload: result });
  };

  const clearAnalysisResult = () => {
    dispatch({ type: 'CLEAR_ANALYSIS_RESULT' });
  };

  const markAnalyticsViewed = useCallback(async () => {
    try {
      // Update server-side timestamp using centralized API client
      await apiClient.post('/profile/analytics-viewed');
      // Update local state only if server update was successful
      dispatch({ type: 'MARK_ANALYTICS_VIEWED' });
    } catch (error) {
      console.error('Error updating analytics viewed timestamp:', error);
      // Still update local state as fallback
      dispatch({ type: 'MARK_ANALYTICS_VIEWED' });
    }
  }, []);

  // Reset app data function
  const resetAppData = async () => {
    try {
      console.log('🔄 Réinitialisation des données en cours...');
      
      // Dispatch the reset action to clear local state and localStorage
      dispatch({ type: 'RESET_APP_DATA' });
      
      console.log('✅ Réinitialisation terminée');
      
      // Note: In a real implementation, you might want to also call APIs to clear server-side data
      // For now, we're only clearing local state and localStorage
      
    } catch (error) {
      console.error('❌ Erreur lors de la réinitialisation:', error);
      ErrorHandler.handle(error, {
        context: 'AppContext.resetAppData',
        showToast: true
      });
      throw error;
    }
  };

  // Complete account deletion - uses backend API to delete account and all data
  const deleteUserAccount = async (password: string, confirmation: string) => {
    try {
      console.log('🗑️ Suppression du compte en cours...');
      
      // Validate inputs (backend will also validate, but check here for better UX)
      if (!password || password.trim() === '') {
        throw new Error('Mot de passe requis pour confirmer la suppression');
      }
      
      if (confirmation !== 'SUPPRIMER') {
        throw new Error('Vous devez taper "SUPPRIMER" exactement');
      }
      
      // Use the AuthService to delete the account via backend API
      // This will delete the user account and all related data via cascade deletes
      await AuthService.deleteAccount({ password, confirmation });
      
      console.log('✅ Compte supprimé du backend');
      
      // Clear all local state and data
      dispatch({ type: 'RESET_APP_DATA' });
      
      // Clear all authentication tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_data');
      
      // Clear all app-specific data
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('dynprot_') || 
          key.includes('user') || 
          key.includes('auth') ||
          key.includes('meal') ||
          key.includes('favorite') ||
          key.includes('profile')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('✅ Compte et données supprimés définitivement');
      
    } catch (error) {
      console.error('❌ Erreur lors de la suppression du compte:', error);
      ErrorHandler.handle(error, {
        context: 'AppContext.deleteUserAccount',
        showToast: true
      });
      throw error;
    }
  };

  return (
    <AppStateContext.Provider value={{ 
      state, 
      dispatch, 
      addMeal, 
      deleteMeal, 
      updateUserSettings,
      updateNutritionGoals,
      addFavoriteMeal,
      deleteFavoriteMeal,
      updateFavoriteMeal,
      addMealFromFavorite,
      setAnalysisResult,
      clearAnalysisResult,
      markAnalyticsViewed,
      resetAppData,
      deleteUserAccount,
      userSettings: state.userSettings
    }}>
      {children}
    </AppStateContext.Provider>
  );
};

// Custom hook to use the app context
export const useAppContext = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// For backward compatibility
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
};