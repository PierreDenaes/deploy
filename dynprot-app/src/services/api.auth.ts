// Service API pour l'authentification
import { z } from 'zod';
import { apiClient, ApiResponse, AuthTokens, TokenManager, validateWithSchema } from './api.service';

// =====================================================
// TYPES ET SCHÉMAS DE VALIDATION
// =====================================================

// Schémas de validation Zod
const LoginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis')
});

const RegisterSchema = z.object({
  email: z.string().email('Email invalide'),
  username: z.string().min(3, 'Nom d\'utilisateur trop court').max(50, 'Nom d\'utilisateur trop long'),
  password: z.string().min(8, 'Mot de passe trop court'),
  firstName: z.string().min(1, 'Prénom requis').optional(),
  lastName: z.string().min(1, 'Nom requis').optional()
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(8, 'Nouveau mot de passe trop court')
});

const DeleteAccountSchema = z.object({
  password: z.string().min(1, 'Mot de passe requis pour confirmer la suppression'),
  confirmation: z.literal('SUPPRIMER', {
    errorMap: () => ({ message: 'Vous devez taper "SUPPRIMER" exactement' })
  })
});

const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requis'),
  newPassword: z.string().min(8, 'Nouveau mot de passe trop court')
});

// Types TypeScript
export type LoginRequest = z.infer<typeof LoginSchema>;
export type RegisterRequest = z.infer<typeof RegisterSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordSchema>;
export type DeleteAccountRequest = z.infer<typeof DeleteAccountSchema>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordSchema>;

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  email_verified: boolean | null;
  has_completed_onboarding: boolean | null;
  is_active: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
  last_login_at: Date | null;
  profile?: UserProfile;
}

export interface UserProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  age: number | null;
  gender: string | null;
  daily_protein_goal: number;
  daily_calorie_goal: number | null;
  activity_level: string;
  fitness_goal: string | null;
  preferred_units: string | null;
  diet_preferences: string[];
  dark_mode: boolean | null;
  notifications_enabled: boolean | null;
  share_data: boolean | null;
  allow_analytics: boolean | null;
  reduced_motion: boolean | null;
  high_contrast: boolean | null;
  large_text: boolean | null;
}

// =====================================================
// SERVICE D'AUTHENTIFICATION
// =====================================================

export class AuthService {
  // Inscription
  static async register(data: RegisterRequest): Promise<{
    user: AuthUser;
    tokens: AuthTokens;
  }> {
    // Validation côté client
    const validatedData = validateWithSchema(RegisterSchema, data);

    const response: ApiResponse<{
      user: AuthUser;
      tokens: AuthTokens;
    }> = await apiClient.post('/auth/register', validatedData, false);

    if (response.success && response.data) {
      // Sauvegarder les tokens
      TokenManager.setTokens(response.data.tokens);
      return response.data;
    }

    throw new Error(response.message || 'Erreur lors de l\'inscription');
  }

  // Connexion
  static async login(data: LoginRequest): Promise<{
    user: AuthUser;
    tokens: AuthTokens;
  }> {
    // Validation côté client
    const validatedData = validateWithSchema(LoginSchema, data);

    const response: ApiResponse<{
      user: AuthUser;
      tokens: AuthTokens;
    }> = await apiClient.post('/auth/login', validatedData, false);

    if (response.success && response.data) {
      // Sauvegarder les tokens
      TokenManager.setTokens(response.data.tokens);
      return response.data;
    }

    throw new Error(response.message || 'Erreur lors de la connexion');
  }

  // Déconnexion
  static async logout(): Promise<void> {
    try {
      // Notifier le serveur de la déconnexion
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Ignorer les erreurs serveur lors de la déconnexion
      console.warn('Erreur lors de la déconnexion serveur:', error);
    } finally {
      // Toujours nettoyer les tokens locaux
      TokenManager.clearTokens();
    }
  }

  // Récupérer l'utilisateur actuel
  static async getCurrentUser(): Promise<AuthUser> {
    const response: ApiResponse<{ user: AuthUser }> = await apiClient.get('/auth/me');

    if (response.success && response.data) {
      return response.data.user;
    }

    throw new Error(response.message || 'Erreur lors de la récupération de l\'utilisateur');
  }

  // Changer le mot de passe
  static async changePassword(data: ChangePasswordRequest): Promise<void> {
    // Validation côté client
    const validatedData = validateWithSchema(ChangePasswordSchema, data);

    const response: ApiResponse = await apiClient.post('/auth/change-password', validatedData);

    if (!response.success) {
      throw new Error(response.message || 'Erreur lors du changement de mot de passe');
    }
  }

  // Rafraîchir le token
  static async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response: ApiResponse<{ tokens: AuthTokens }> = await apiClient.post(
      '/auth/refresh',
      { refreshToken },
      false
    );

    if (response.success && response.data) {
      TokenManager.setTokens(response.data.tokens);
      return response.data.tokens;
    }

    throw new Error(response.message || 'Erreur lors du rafraîchissement du token');
  }

  // Vérifier l'authentification
  static isAuthenticated(): boolean {
    return TokenManager.isAuthenticated();
  }

  // Obtenir le token d'accès
  static getAccessToken(): string | null {
    return TokenManager.getAccessToken();
  }

  // Vérifier si l'utilisateur a complété l'onboarding
  static async checkOnboardingStatus(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return user.has_completed_onboarding || false;
    } catch (error) {
      return false;
    }
  }

  // Demander une réinitialisation de mot de passe
  static async requestPasswordReset(email: string): Promise<void> {
    const response: ApiResponse = await apiClient.post('/auth/request-password-reset', { email }, false);
    if (!response.success) {
      throw new Error(response.message || 'Erreur lors de la demande de réinitialisation du mot de passe');
    }
  }

  // Réinitialiser le mot de passe avec un token
  static async resetPassword(data: ResetPasswordRequest): Promise<void> {
    // Validation côté client
    const validatedData = validateWithSchema(ResetPasswordSchema, data);

    const response: ApiResponse = await apiClient.post('/auth/reset-password', validatedData, false);
    if (!response.success) {
      throw new Error(response.message || 'Erreur lors de la réinitialisation du mot de passe');
    }
  }

  // Supprimer le compte utilisateur
  static async deleteAccount(data: DeleteAccountRequest): Promise<void> {
    // Validation côté client - très stricte pour la sécurité
    const validatedData = validateWithSchema(DeleteAccountSchema, data);

    const response: ApiResponse = await apiClient.post('/auth/delete-account', validatedData);

    if (response.success) {
      // Nettoyer immédiatement les tokens après suppression réussie
      TokenManager.clearTokens();
    } else {
      throw new Error(response.message || 'Erreur lors de la suppression du compte');
    }
  }
}

// =====================================================
// HELPERS ET UTILITAIRES
// =====================================================

// Helper pour gérer l'état d'authentification dans les composants
export const useAuthStatus = () => {
  const isAuthenticated = AuthService.isAuthenticated();
  const token = AuthService.getAccessToken();
  
  return {
    isAuthenticated,
    hasToken: !!token,
    needsLogin: !isAuthenticated
  };
};

// Helper pour récupérer l'utilisateur avec gestion d'erreur
export const getCurrentUserSafe = async (): Promise<AuthUser | null> => {
  try {
    return await AuthService.getCurrentUser();
  } catch (error) {
    console.warn('Impossible de récupérer l\'utilisateur actuel:', error);
    return null;
  }
};

// Helper pour la déconnexion forcée en cas d'erreur
export const forceLogout = (): void => {
  TokenManager.clearTokens();
  // Rediriger vers la page de connexion
  window.location.href = '/login';
};

// Event listeners pour la gestion de l'authentification
export const setupAuthEventListeners = () => {
  // Écouter les changements de storage (déconnexion dans un autre onglet)
  window.addEventListener('storage', (e) => {
    if (e.key === 'access_token' && !e.newValue) {
      // Token supprimé dans un autre onglet - déconnecter ici aussi
      window.location.reload();
    }
  });

  // Écouter les erreurs réseau globales
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason?.statusCode === 401) {
      // Erreur d'authentification non gérée
      forceLogout();
    }
  });
};

// Helper pour les requêtes authentifiées avec retry automatique
export const withAuthRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 1
): Promise<T> => {
  let attempt = 0;
  
  while (attempt <= maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      attempt++;
      
      if (error?.statusCode === 401 && attempt <= maxRetries) {
        // Essayer de rafraîchir le token
        const refreshToken = TokenManager.getRefreshToken();
        if (refreshToken) {
          try {
            await AuthService.refreshToken(refreshToken);
            continue; // Réessayer l'opération
          } catch (refreshError) {
            forceLogout();
            throw refreshError;
          }
        }
      }
      
      throw error;
    }
  }
  
  throw new Error('Maximum retries reached');
};