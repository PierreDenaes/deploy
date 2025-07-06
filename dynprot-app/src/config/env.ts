/**
 * Environment configuration for DynProt application
 * All environment variables are prefixed with VITE_ to be exposed to the client
 */

// Application Configuration
export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME || 'DynProt',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  description: import.meta.env.VITE_APP_DESCRIPTION || 'DynProt Application - Protein Analysis Tool',
  environment: import.meta.env.VITE_NODE_ENV || 'development',
} as const;

// API Configuration
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
} as const;

// Authentication Configuration
export const AUTH_CONFIG = {
  demo: {
    email: import.meta.env.VITE_DEMO_EMAIL || 'demo@dynprot.com',
    password: import.meta.env.VITE_DEMO_PASSWORD || 'Demo123!',
    name: import.meta.env.VITE_DEMO_NAME || 'Demo User',
  },
} as const;

// Encryption Configuration
export const ENCRYPTION_CONFIG = {
  secret: import.meta.env.VITE_ENCRYPTION_SECRET || 'DynProt-2024-SecureStorage-v1.0',
  iterations: parseInt(import.meta.env.VITE_ENCRYPTION_ITERATIONS || '10000'),
} as const;

// Feature Flags
export const FEATURES = {
  demoMode: import.meta.env.VITE_ENABLE_DEMO_MODE === 'true',
  voiceInput: import.meta.env.VITE_ENABLE_VOICE_INPUT === 'true',
  cameraScan: import.meta.env.VITE_ENABLE_CAMERA_SCAN === 'true',
  aiAnalysis: import.meta.env.VITE_ENABLE_AI_ANALYSIS === 'true',
  encryption: import.meta.env.VITE_ENABLE_ENCRYPTION !== 'false', // enabled by default
} as const;

// Analytics Configuration
export const ANALYTICS_CONFIG = {
  enabled: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  analyticsId: import.meta.env.VITE_ANALYTICS_ID || '',
  sentryDsn: import.meta.env.VITE_SENTRY_DSN || '',
} as const;

// AI Services Configuration - handled by backend API only
export const AI_CONFIG = {
  // openaiApiKey removed for security - use backend API instead
  nutritionApiKey: import.meta.env.VITE_NUTRITION_API_KEY || '',
  visionApiKey: import.meta.env.VITE_VISION_API_KEY || '',
} as const;

// Storage Configuration
export const STORAGE_CONFIG = {
  prefix: import.meta.env.VITE_STORAGE_PREFIX || 'dynprot',
  sessionTimeout: parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '86400000'), // 24 hours
} as const;

// UI Configuration
export const UI_CONFIG = {
  defaultTheme: import.meta.env.VITE_DEFAULT_THEME || 'light',
  darkModeEnabled: import.meta.env.VITE_ENABLE_DARK_MODE !== 'false',
  defaultLanguage: import.meta.env.VITE_DEFAULT_LANGUAGE || 'fr',
} as const;

// Development Configuration
export const DEV_CONFIG = {
  debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
  mockApi: import.meta.env.VITE_MOCK_API === 'true',
  showReduxDevtools: import.meta.env.VITE_SHOW_REDUX_DEVTOOLS === 'true',
} as const;

// Security Configuration
export const SECURITY_CONFIG = {
  allowedOrigins: import.meta.env.VITE_ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  cspEnabled: import.meta.env.VITE_CSP_ENABLED === 'true',
} as const;

// Performance Configuration
export const PERFORMANCE_CONFIG = {
  cacheDuration: parseInt(import.meta.env.VITE_CACHE_DURATION || '300000'), // 5 minutes
  maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '5242880'), // 5MB
  maxMealsPerDay: parseInt(import.meta.env.VITE_MAX_MEALS_PER_DAY || '20'),
} as const;

// External Links Configuration
export const EXTERNAL_LINKS = {
  github: import.meta.env.VITE_GITHUB_URL || 'https://github.com/your-org/dynprot-app',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@dynprot.com',
  privacyUrl: import.meta.env.VITE_PRIVACY_URL || 'https://dynprot.com/privacy',
  termsUrl: import.meta.env.VITE_TERMS_URL || 'https://dynprot.com/terms',
} as const;

// Development helpers
export const isDevelopment = APP_CONFIG.environment === 'development';
export const isProduction = APP_CONFIG.environment === 'production';

// Validation helper
export const validateConfig = () => {
  const errors: string[] = [];
  
  if (isProduction && ENCRYPTION_CONFIG.secret.includes('DynProt-2024')) {
    errors.push('VITE_ENCRYPTION_SECRET should be changed in production');
  }
  
  if (isProduction && FEATURES.demoMode) {
    errors.push('Demo mode should be disabled in production');
  }
  
  if (isProduction && DEV_CONFIG.debugMode) {
    errors.push('Debug mode should be disabled in production');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Export all configurations as a single object for convenience
export const CONFIG = {
  app: APP_CONFIG,
  api: API_CONFIG,
  auth: AUTH_CONFIG,
  encryption: ENCRYPTION_CONFIG,
  features: FEATURES,
  analytics: ANALYTICS_CONFIG,
  ai: AI_CONFIG,
  storage: STORAGE_CONFIG,
  ui: UI_CONFIG,
  dev: DEV_CONFIG,
  security: SECURITY_CONFIG,
  performance: PERFORMANCE_CONFIG,
  links: EXTERNAL_LINKS,
} as const;