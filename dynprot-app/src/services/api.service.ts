// Service API de base pour l'application DynProt
import { z } from 'zod';

// =====================================================
// CONFIGURATION ET TYPES DE BASE
// =====================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
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
// GESTION DES ERREURS
// =====================================================

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: any[]
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromResponse(response: Response, data: any): ApiError {
    return new ApiError(
      response.status,
      data.message || data.error || 'Une erreur est survenue',
      data.code,
      data.details
    );
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Erreur de connexion réseau') {
    super(message);
    this.name = 'NetworkError';
  }
}

// =====================================================
// GESTION DES TOKENS
// =====================================================

class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly TOKEN_EXPIRES_KEY = 'token_expires';
  private static readonly REMEMBER_ME_KEY = 'remember_me';

  static getAccessToken(): string | null {
    const rememberMe = this.getRememberMePreference();
    const token = rememberMe 
      ? localStorage.getItem(this.ACCESS_TOKEN_KEY)
      : sessionStorage.getItem(this.ACCESS_TOKEN_KEY);
    
    return token;
  }

  static getRefreshToken(): string | null {
    const rememberMe = this.getRememberMePreference();
    if (rememberMe) {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    } else {
      return sessionStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
  }

  static getRememberMePreference(): boolean {
    return localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';
  }

  static setTokens(tokens: AuthTokens): void {
    const rememberMe = tokens.rememberMe || false;
    
    // Store remember me preference in localStorage (always persistent)
    localStorage.setItem(this.REMEMBER_ME_KEY, rememberMe.toString());
    
    // Choose storage based on remember me preference
    const storage = rememberMe ? localStorage : sessionStorage;
    
    // Store tokens
    storage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);
    if (tokens.refreshToken) {
      storage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
    
    const expiresAt = Date.now() + (tokens.expiresIn * 1000);
    storage.setItem(this.TOKEN_EXPIRES_KEY, expiresAt.toString());
    
    // Clear tokens from the other storage to avoid conflicts
    const otherStorage = rememberMe ? sessionStorage : localStorage;
    otherStorage.removeItem(this.ACCESS_TOKEN_KEY);
    otherStorage.removeItem(this.REFRESH_TOKEN_KEY);
    otherStorage.removeItem(this.TOKEN_EXPIRES_KEY);
  }

  static clearTokens(): void {
    // Clear from both storages to be safe
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRES_KEY);
    localStorage.removeItem(this.REMEMBER_ME_KEY);
    
    sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(this.TOKEN_EXPIRES_KEY);
  }

  static clearTokensKeepRememberMe(): void {
    // Clear tokens but keep remember me preference
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRES_KEY);
    
    sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(this.TOKEN_EXPIRES_KEY);
  }

  static isTokenExpired(): boolean {
    const rememberMe = this.getRememberMePreference();
    const storage = rememberMe ? localStorage : sessionStorage;
    const expiresAt = storage.getItem(this.TOKEN_EXPIRES_KEY);
    if (!expiresAt) return true;
    return Date.now() >= parseInt(expiresAt) - 60000; // 1 minute de marge
  }

  static isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const expired = this.isTokenExpired();
    
    return !!token && !expired;
  }
}

// =====================================================
// CLIENT API DE BASE
// =====================================================

class ApiClient {
  private static instance: ApiClient;
  private refreshPromise: Promise<void> | null = null;

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private async refreshTokens(): Promise<void> {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) {
      TokenManager.clearTokensKeepRememberMe();
      throw new ApiError(401, 'Session expirée, veuillez vous reconnecter');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        TokenManager.clearTokensKeepRememberMe();
        throw new ApiError(401, 'Session expirée, veuillez vous reconnecter');
      }

      const data: ApiResponse<{ tokens: AuthTokens }> = await response.json();
      if (data.success && data.data?.tokens) {
        // Backend includes rememberMe in tokens now
        TokenManager.setTokens(data.data.tokens);
      } else {
        TokenManager.clearTokensKeepRememberMe();
        throw new ApiError(401, 'Impossible de renouveler la session');
      }
    } catch (error) {
      TokenManager.clearTokensKeepRememberMe();
      throw error;
    }
  }

  private async ensureValidToken(): Promise<string> {
    if (!TokenManager.isAuthenticated()) {
      if (TokenManager.getRefreshToken()) {
        // Éviter les refreshs multiples simultanés
        if (!this.refreshPromise) {
          this.refreshPromise = this.refreshTokens().finally(() => {
            this.refreshPromise = null;
          });
        }
        await this.refreshPromise;
      } else {
        throw new ApiError(401, 'Authentification requise');
      }
    }

    const token = TokenManager.getAccessToken();
    if (!token) {
      throw new ApiError(401, 'Token d\'accès manquant');
    }

    return token;
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth: boolean = true
  ): Promise<T> {
    try {
      // Headers par défaut
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Ajouter l'authentification si nécessaire
      if (requireAuth) {
        const token = await this.ensureValidToken();
        headers.Authorization = `Bearer ${token}`;
      }

      // Faire la requête
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      // Parser la réponse
      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = { message: await response.text() };
      }

      // Gérer les erreurs HTTP
      if (!response.ok) {
        if (response.status === 401 && requireAuth) {
          TokenManager.clearTokensKeepRememberMe();
          // Don't force redirect if already on login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          throw new ApiError(401, 'Session expirée, redirection...');
        }
        throw ApiError.fromResponse(response, data);
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError('Impossible de se connecter au serveur');
      }
      throw error;
    }
  }

  // Méthodes de convenance
  async get<T = any>(endpoint: string, requireAuth: boolean = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, requireAuth);
  }

  async post<T = any>(
    endpoint: string,
    data?: any,
    requireAuth: boolean = true
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      requireAuth
    );
  }

  async put<T = any>(
    endpoint: string,
    data?: any,
    requireAuth: boolean = true
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      },
      requireAuth
    );
  }

  async delete<T = any>(endpoint: string, requireAuth: boolean = true): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, requireAuth);
  }
}

// =====================================================
// UTILITAIRES D'EXPORT
// =====================================================

export { TokenManager };
export const apiClient = ApiClient.getInstance();

// Helper pour les requêtes avec retry automatique
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Ne pas retry les erreurs d'authentification ou de validation
      if (error instanceof ApiError && [401, 403, 422].includes(error.statusCode)) {
        throw error;
      }

      // Attendre avant le prochain essai (backoff exponentiel)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }
  }

  throw lastError!;
}

// Helper pour les uploads de fichiers
export async function uploadFile(
  endpoint: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<ApiResponse> {
  return new Promise(async (resolve, reject) => {
    try {
      const token = await TokenManager.isAuthenticated() 
        ? TokenManager.getAccessToken()
        : null;

      if (!token) {
        throw new ApiError(401, 'Authentification requise pour l\'upload');
      }

      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();

      // Gestion du progrès
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress);
          }
        });
      }

      // Gestion de la réponse
      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(ApiError.fromResponse({ status: xhr.status } as Response, data));
          }
        } catch (error) {
          reject(new ApiError(xhr.status, 'Erreur lors de l\'upload'));
        }
      });

      // Gestion des erreurs
      xhr.addEventListener('error', () => {
        reject(new NetworkError('Erreur réseau lors de l\'upload'));
      });

      // Envoyer la requête
      xhr.open('POST', `${API_BASE_URL}${endpoint}`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    } catch (error) {
      reject(error);
    }
  });
}

// Helper pour les requêtes paginées
export async function fetchPaginated<T>(
  endpoint: string,
  page: number = 1,
  limit: number = 20,
  params: Record<string, any> = {}
): Promise<PaginatedResponse<T>> {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined && value !== null)
    ),
  });

  return apiClient.get(`${endpoint}?${queryParams}`);
}

// Helper pour la validation côté client
export function validateWithSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError(
        422,
        'Données invalides',
        'VALIDATION_ERROR',
        error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }
    throw error;
  }
}