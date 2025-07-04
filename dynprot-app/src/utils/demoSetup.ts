import { authService } from '@/services/authService';

/**
 * Initialize demo data for the application
 * This ensures the demo user and sample data are available for testing
 */
export const initializeDemoData = async (): Promise<void> => {
  try {
    // Ensure demo user exists
    await authService.ensureDemoUser();
    
    // In a real app, you might also want to add sample meals, goals, etc.
  } catch (error) {
    // Don't throw error as this is not critical for app functionality
  }
};

import { AUTH_CONFIG } from '@/config/env';

/**
 * Demo user credentials for easy access
 */
export const DEMO_CREDENTIALS = {
  email: AUTH_CONFIG.demo.email,
  password: AUTH_CONFIG.demo.password,
  name: AUTH_CONFIG.demo.name,
} as const;