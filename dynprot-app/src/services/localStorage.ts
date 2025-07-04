import { AppState, MealEntry, UserProfile } from '../context/AppContext';
import { encryptData, decryptData, isEncryptionSupported } from '../utils/encryption';
import { STORAGE_CONFIG } from '@/config/env';

// Generate user-specific storage keys
const getUserStorageKey = (baseKey: string, userId?: string): string => {
  return userId ? `${baseKey}-${userId}` : baseKey;
};

// Keys for localStorage
const STORAGE_KEYS = {
  APP_STATE: `${STORAGE_CONFIG.prefix}-app-state`,
  USER_PROFILE: `${STORAGE_CONFIG.prefix}-user-profile`,
  MEALS: `${STORAGE_CONFIG.prefix}-meals`,
  PREFERENCES: `${STORAGE_CONFIG.prefix}-preferences`,
};

// Get current user ID from auth (simplified - in real app you'd import from auth context)
const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const authData = localStorage.getItem(`${STORAGE_CONFIG.prefix}-auth`);
    if (authData) {
      const decrypted = isEncryptionSupported() ? decryptData(authData) : authData;
      const parsed = JSON.parse(decrypted);
      return parsed?.user?.id || null;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Save the entire app state to localStorage
 */
export const saveAppState = async (state: AppState): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    const key = getUserStorageKey(STORAGE_KEYS.APP_STATE, userId || undefined);
    const data = JSON.stringify(state);
    const finalData = isEncryptionSupported() ? encryptData(data) : data;
    localStorage.setItem(key, finalData);
  } catch (error) {
    // Silent save error
  }
};

/**
 * Load the entire app state from localStorage
 */
export const loadAppState = async (): Promise<AppState | null> => {
  try {
    const userId = await getCurrentUserId();
    const key = getUserStorageKey(STORAGE_KEYS.APP_STATE, userId || undefined);
    const storedState = localStorage.getItem(key);
    if (!storedState) {
      // Try to load legacy data (without user ID) for migration
      const legacyData = localStorage.getItem(STORAGE_KEYS.APP_STATE);
      if (legacyData && userId) {
        // Migrate legacy data to user-specific storage
        const decryptedData = isEncryptionSupported() ? decryptData(legacyData) : legacyData;
        const state = JSON.parse(decryptedData);
        await saveAppState(state); // Save to user-specific key
        localStorage.removeItem(STORAGE_KEYS.APP_STATE); // Remove legacy data
        return state;
      }
      return null;
    }
    
    const decryptedData = isEncryptionSupported() ? decryptData(storedState) : storedState;
    return JSON.parse(decryptedData);
  } catch (error) {
    return null;
  }
};

/**
 * Save user profile to localStorage
 */
export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    const key = getUserStorageKey(STORAGE_KEYS.USER_PROFILE, userId || undefined);
    const data = JSON.stringify(profile);
    const finalData = isEncryptionSupported() ? encryptData(data) : data;
    localStorage.setItem(key, finalData);
  } catch (error) {
    // Silent save error
  }
};

/**
 * Load user profile from localStorage
 */
export const loadUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const userId = await getCurrentUserId();
    const key = getUserStorageKey(STORAGE_KEYS.USER_PROFILE, userId || undefined);
    const storedProfile = localStorage.getItem(key);
    if (!storedProfile) return null;
    
    const decryptedData = isEncryptionSupported() ? decryptData(storedProfile) : storedProfile;
    return JSON.parse(decryptedData);
  } catch (error) {
    return null;
  }
};

/**
 * Save meals to localStorage
 */
export const saveMeals = async (meals: MealEntry[]): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    const key = getUserStorageKey(STORAGE_KEYS.MEALS, userId || undefined);
    const data = JSON.stringify(meals);
    const finalData = isEncryptionSupported() ? encryptData(data) : data;
    localStorage.setItem(key, finalData);
  } catch (error) {
    // Silent save error
  }
};

/**
 * Load meals from localStorage
 */
export const loadMeals = async (): Promise<MealEntry[]> => {
  try {
    const userId = await getCurrentUserId();
    const key = getUserStorageKey(STORAGE_KEYS.MEALS, userId || undefined);
    const storedMeals = localStorage.getItem(key);
    if (!storedMeals) return [];
    
    const decryptedData = isEncryptionSupported() ? decryptData(storedMeals) : storedMeals;
    return JSON.parse(decryptedData);
  } catch (error) {
    return [];
  }
};

/**
 * Save preferences to localStorage
 */
export const savePreferences = async (preferences: AppState['preferences']): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    const key = getUserStorageKey(STORAGE_KEYS.PREFERENCES, userId || undefined);
    const data = JSON.stringify(preferences);
    const finalData = isEncryptionSupported() ? encryptData(data) : data;
    localStorage.setItem(key, finalData);
  } catch (error) {
    // Silent save error
  }
};

/**
 * Load preferences from localStorage
 */
export const loadPreferences = async (): Promise<AppState['preferences'] | null> => {
  try {
    const userId = await getCurrentUserId();
    const key = getUserStorageKey(STORAGE_KEYS.PREFERENCES, userId || undefined);
    const storedPreferences = localStorage.getItem(key);
    if (!storedPreferences) return null;
    
    const decryptedData = isEncryptionSupported() ? decryptData(storedPreferences) : storedPreferences;
    return JSON.parse(decryptedData);
  } catch (error) {
    return null;
  }
};

/**
 * Clear all app data from localStorage for current user
 */
export const clearAllData = async (): Promise<void> => {
  try {
    const userId = await getCurrentUserId();
    localStorage.removeItem(getUserStorageKey(STORAGE_KEYS.APP_STATE, userId || undefined));
    localStorage.removeItem(getUserStorageKey(STORAGE_KEYS.USER_PROFILE, userId || undefined));
    localStorage.removeItem(getUserStorageKey(STORAGE_KEYS.MEALS, userId || undefined));
    localStorage.removeItem(getUserStorageKey(STORAGE_KEYS.PREFERENCES, userId || undefined));
  } catch (error) {
    // Silent cleanup error
  }
};

/**
 * Clear all data for a specific user (for admin or cleanup purposes)
 */
export const clearUserData = (userId: string): void => {
  try {
    localStorage.removeItem(getUserStorageKey(STORAGE_KEYS.APP_STATE, userId));
    localStorage.removeItem(getUserStorageKey(STORAGE_KEYS.USER_PROFILE, userId));
    localStorage.removeItem(getUserStorageKey(STORAGE_KEYS.MEALS, userId));
    localStorage.removeItem(getUserStorageKey(STORAGE_KEYS.PREFERENCES, userId));
  } catch (error) {
    // Silent cleanup error
  }
};