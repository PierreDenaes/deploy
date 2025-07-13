import { AuthUser, LoginCredentials, RegisterCredentials, AuthResponse, AuthError } from '@/types/auth';
import { AuthService, DeleteAccountRequest } from './api.auth';
import { ErrorHandler } from '@/utils/errorHandling';
import { LoadingOperations } from '@/hooks/useLoadingState';

/**
 * Authentication service - migrated to use real API calls
 * Replaces localStorage-based authentication with server-side API
 */

export const authService = {
  // Ensure demo user exists for development
  async ensureDemoUser(): Promise<void> {
    // This is a placeholder for demo user creation
    // In a real implementation, this would check if demo user exists
    return Promise.resolve();
  },

  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await AuthService.login({
        email: credentials.email,
        password: credentials.password,
        rememberMe: credentials.rememberMe
      });
      return {
        user: {
          id: response.user.id,
          email: response.user.email,
          name: [response.user.first_name, response.user.last_name].filter(Boolean).join(' ') || 'Utilisateur',
          createdAt: response.user.created_at ? String(response.user.created_at) : '',
          emailVerified: !!response.user.email_verified,
          hasCompletedOnboarding: !!response.user.has_completed_onboarding,
          last_analytics_viewed: response.user.last_analytics_viewed ? String(response.user.last_analytics_viewed) : null
        },
        token: response.tokens.accessToken
      };
    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'authService.login',
        showToast: true
      });
      throw error;
    }
  },

  // Register new user
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      // Client-side validation
      if (credentials.password !== credentials.confirmPassword) {
        throw new Error('Passwords do not match');
      }
      
      if (!credentials.acceptTerms) {
        throw new Error('You must accept the terms and conditions');
      }
      
      // Split name into first and last name
      const nameParts = credentials.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Generate a valid username from email prefix (only letters, numbers, underscores)
      const emailPrefix = credentials.email.split('@')[0];
      const cleanUsername = emailPrefix.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
      const username = cleanUsername.length >= 3 ? cleanUsername : `user_${Date.now().toString().slice(-6)}`;
      
      // Prepare registration data with proper handling of optional fields
      const registerData: any = {
        email: credentials.email,
        username: username,
        password: credentials.password,
      };
      
      // Only include firstName/lastName if they have valid values
      if (firstName && firstName.trim().length > 0) {
        registerData.firstName = firstName.trim();
      }
      if (lastName && lastName.trim().length > 0) {
        registerData.lastName = lastName.trim();
      }
      
      const response = await AuthService.register(registerData);
      
      return {
        user: {
          id: response.user.id,
          email: response.user.email,
          name: [response.user.first_name, response.user.last_name].filter(Boolean).join(' ') || 'Utilisateur',
          createdAt: response.user.created_at ? String(response.user.created_at) : '',
          emailVerified: !!response.user.email_verified,
          hasCompletedOnboarding: !!response.user.has_completed_onboarding,
          last_analytics_viewed: response.user.last_analytics_viewed ? String(response.user.last_analytics_viewed) : null
        },
        token: response.tokens.accessToken
      };
    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'authService.register',
        showToast: true
      });
      throw error;
    }
  },

  // Get current user (check if logged in)
  async getCurrentUser(): Promise<{ user: AuthUser; token: string } | null> {
    try {
      const user = await AuthService.getCurrentUser();
      // No token available from getCurrentUser, so return null for token
      if (user) {
        return {
          user: {
            id: user.id,
            email: user.email,
            name: [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Utilisateur',
            createdAt: user.created_at ? String(user.created_at) : '',
            emailVerified: !!user.email_verified,
            hasCompletedOnboarding: !!user.has_completed_onboarding,
            last_analytics_viewed: user.last_analytics_viewed ? String(user.last_analytics_viewed) : null
          },
          token: ''
        };
      }
      return null;
    } catch (error) {
      // Silent error for getCurrentUser - don't show toast
      ErrorHandler.handle(error, {
        context: 'authService.getCurrentUser',
        showToast: false,
        silent: true
      });
      return null;
    }
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      await AuthService.logout();
    } catch (error) {
      // Silent logout error - always succeed locally
      ErrorHandler.handle(error, {
        context: 'authService.logout',
        showToast: false,
        silent: true
      });
    }
  },

  // Refresh token
  async refreshToken(): Promise<{ user: AuthUser; token: string } | null> {
    try {
      // The refreshToken method in api.auth.ts only returns tokens, not user
      // So we need to re-fetch the user after refreshing the token
      await AuthService.refreshToken(''); // You may need to pass the actual refresh token here
      const user = await AuthService.getCurrentUser();
      if (user) {
        return {
          user: {
            id: user.id,
            email: user.email,
            name: [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Utilisateur',
            createdAt: user.created_at ? String(user.created_at) : '',
            emailVerified: !!user.email_verified,
            hasCompletedOnboarding: !!user.has_completed_onboarding,
            last_analytics_viewed: user.last_analytics_viewed ? String(user.last_analytics_viewed) : null
          },
          token: ''
        };
      }
      return null;
    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'authService.refreshToken',
        showToast: false,
        silent: true
      });
      return null;
    }
  },

  // Update user onboarding status
  async updateOnboardingStatus(): Promise<void> {
    try {
      // This would typically be handled by the profile service
      // For now, we'll assume onboarding completion is handled server-side
      // when certain profile fields are updated
    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'authService.updateOnboardingStatus',
        showToast: true
      });
      throw error;
    }
  },

  // Reset password
  async requestPasswordReset(email: string): Promise<void> {
    try {
      await AuthService.requestPasswordReset(email);
    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'authService.requestPasswordReset',
        showToast: true
      });
      throw error;
    }
  },

  // Delete user account - requires password and confirmation
  async deleteAccount(data: DeleteAccountRequest): Promise<void> {
    try {
      // Call the real backend API to delete the account
      await AuthService.deleteAccount(data);
      
      // Account deletion successful - tokens are already cleared in AuthService
      // Clear any remaining local data using TokenManager
      // (TokenManager.clearTokens() is already called in AuthService.deleteAccount)
      
    } catch (error) {
      ErrorHandler.handle(error, {
        context: 'authService.deleteAccount',
        showToast: true
      });
      throw error;
    }
  },

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user;
  },

  // Get user profile information
  async getUserProfile(): Promise<AuthUser | null> {
    const authData = await this.getCurrentUser();
    return authData?.user || null;
  }
};