// Utilitaires pour la gestion d'erreurs
import { ApiError, NetworkError } from '../services/api.service';
import { toast } from 'sonner';

// =====================================================
// TYPES D'ERREURS
// =====================================================

export interface ErrorInfo {
  type: 'network' | 'api' | 'validation' | 'unknown';
  message: string;
  code?: string;
  statusCode?: number;
  details?: any[];
  retryable: boolean;
  userFriendly: boolean;
}

// =====================================================
// CLASSIFICATION D'ERREURS
// =====================================================

export function classifyError(error: unknown): ErrorInfo {
  // Erreur réseau
  if (error instanceof NetworkError) {
    return {
      type: 'network',
      message: 'Problème de connexion réseau',
      retryable: true,
      userFriendly: true
    };
  }

  // Erreur API
  if (error instanceof ApiError) {
    const isRetryable = error.statusCode >= 500 || error.statusCode === 429;
    
    let userMessage = error.message;
    
    // Messages personnalisés selon le code d'erreur
    switch (error.statusCode) {
      case 400:
        userMessage = 'Données invalides';
        break;
      case 401:
        userMessage = 'Session expirée, veuillez vous reconnecter';
        break;
      case 403:
        userMessage = 'Accès non autorisé';
        break;
      case 404:
        userMessage = 'Ressource non trouvée';
        break;
      case 409:
        userMessage = error.message; // Garder le message original pour les conflits
        break;
      case 422:
        userMessage = 'Données invalides';
        break;
      case 429:
        userMessage = 'Trop de requêtes, veuillez réessayer plus tard';
        break;
      case 500:
        userMessage = 'Erreur serveur, veuillez réessayer';
        break;
      case 503:
        userMessage = 'Service temporairement indisponible';
        break;
    }

    return {
      type: 'api',
      message: userMessage,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
      retryable: isRetryable,
      userFriendly: true
    };
  }

  // Erreur de validation Zod
  if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
    return {
      type: 'validation',
      message: 'Données invalides',
      details: (error as any).errors,
      retryable: false,
      userFriendly: true
    };
  }

  // Erreur JavaScript générique
  if (error instanceof Error) {
    return {
      type: 'unknown',
      message: error.message,
      retryable: false,
      userFriendly: false
    };
  }

  // Erreur inconnue
  return {
    type: 'unknown',
    message: 'Une erreur inattendue est survenue',
    retryable: false,
    userFriendly: true
  };
}

// =====================================================
// GESTIONNAIRE D'ERREURS GLOBAL
// =====================================================

export class ErrorHandler {
  private static toastHistory = new Map<string, number>();
  private static readonly TOAST_COOLDOWN = 5000; // 5 secondes entre les toasts identiques

  // Gérer une erreur avec affichage conditionnel
  static handle(error: unknown, options: {
    showToast?: boolean;
    context?: string;
    onRetry?: () => void;
    silent?: boolean;
  } = {}): ErrorInfo {
    const errorInfo = classifyError(error);
    const { showToast = true, context, onRetry, silent = false } = options;

    // Logger l'erreur (sauf en mode silencieux)
    if (!silent) {
      console.error(`[ErrorHandler${context ? ` - ${context}` : ''}]:`, error);
    }

    // Afficher un toast si demandé et l'erreur est user-friendly
    if (showToast && errorInfo.userFriendly) {
      this.showErrorToast(errorInfo, onRetry);
    }

    // Déclencher des actions spécifiques selon le type d'erreur
    this.handleSpecificErrors(errorInfo);

    return errorInfo;
  }

  // Afficher un toast d'erreur avec déduplication
  private static showErrorToast(errorInfo: ErrorInfo, onRetry?: () => void): void {
    const toastKey = `${errorInfo.type}-${errorInfo.message}`;
    const now = Date.now();
    const lastShown = this.toastHistory.get(toastKey);

    // Éviter les toasts en double
    if (lastShown && (now - lastShown) < this.TOAST_COOLDOWN) {
      return;
    }

    this.toastHistory.set(toastKey, now);

    // Nettoyer l'historique des anciens toasts
    setTimeout(() => {
      this.toastHistory.delete(toastKey);
    }, this.TOAST_COOLDOWN);

    // Afficher le toast avec action de retry si possible
    const toastOptions: any = {
      description: errorInfo.details?.length > 0 
        ? `${errorInfo.details.length} erreur(s) de validation`
        : undefined,
      duration: errorInfo.type === 'network' ? 10000 : 5000, // Plus long pour les erreurs réseau
    };

    if (errorInfo.retryable && onRetry) {
      toastOptions.action = {
        label: 'Réessayer',
        onClick: onRetry
      };
    }

    // Utiliser le bon type de toast selon la sévérité
    if (errorInfo.statusCode === 401 || errorInfo.statusCode === 403) {
      toast.warning(errorInfo.message, toastOptions);
    } else if (errorInfo.retryable) {
      toast.error(errorInfo.message, toastOptions);
    } else {
      toast.error(errorInfo.message, toastOptions);
    }
  }

  // Gérer des erreurs spécifiques
  private static handleSpecificErrors(errorInfo: ErrorInfo): void {
    switch (errorInfo.statusCode) {
      case 401:
        // Redirection vers login si nécessaire
        if (window.location.pathname !== '/login') {
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
        break;

      case 503:
        // Service indisponible - peut-être afficher une page de maintenance
        console.warn('Service indisponible détecté');
        break;
    }
  }

  // Gérer les erreurs de validation avec détails
  static handleValidationErrors(errorInfo: ErrorInfo): Record<string, string> {
    const fieldErrors: Record<string, string> = {};

    if (errorInfo.details && Array.isArray(errorInfo.details)) {
      errorInfo.details.forEach((detail: any) => {
        if (detail.field && detail.message) {
          fieldErrors[detail.field] = detail.message;
        }
      });
    }

    return fieldErrors;
  }

  // Vérifier si une erreur nécessite une reconnexion
  static requiresReauth(error: unknown): boolean {
    if (error instanceof ApiError) {
      return error.statusCode === 401;
    }
    return false;
  }

  // Vérifier si une erreur est temporaire
  static isTemporary(error: unknown): boolean {
    const errorInfo = classifyError(error);
    return errorInfo.retryable;
  }
}

// =====================================================
// HOOKS POUR LA GESTION D'ERREURS
// =====================================================

import { useState, useCallback } from 'react';

export interface UseErrorHandlerReturn {
  error: ErrorInfo | null;
  hasError: boolean;
  handleError: (error: unknown, options?: {
    showToast?: boolean;
    context?: string;
    onRetry?: () => void;
  }) => ErrorInfo;
  clearError: () => void;
  retryLastAction: () => void;
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [lastAction, setLastAction] = useState<(() => void) | null>(null);

  const handleError = useCallback((
    err: unknown, 
    options: {
      showToast?: boolean;
      context?: string;
      onRetry?: () => void;
    } = {}
  ): ErrorInfo => {
    const errorInfo = ErrorHandler.handle(err, options);
    setError(errorInfo);
    
    if (options.onRetry) {
      setLastAction(() => options.onRetry!);
    }
    
    return errorInfo;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setLastAction(null);
  }, []);

  const retryLastAction = useCallback(() => {
    if (lastAction) {
      clearError();
      lastAction();
    }
  }, [lastAction, clearError]);

  return {
    error,
    hasError: !!error,
    handleError,
    clearError,
    retryLastAction
  };
}

// =====================================================
// BOUNDARY D'ERREUR REACT
// =====================================================

import React, { Component, ErrorInfo as ReactErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ReactErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ReactErrorInfo) => ReactNode;
  onError?: (error: Error, errorInfo: ReactErrorInfo) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ReactErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Logger l'erreur
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Appeler le callback d'erreur si fourni
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Envoyer l'erreur à un service de monitoring (Sentry, etc.)
    // reportError(error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error && this.state.errorInfo) {
      // Utiliser le fallback personnalisé si fourni
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo);
      }

      // Fallback par défaut
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-lg font-medium text-gray-900">
                Une erreur est survenue
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                L'application a rencontré une erreur inattendue. Veuillez rafraîchir la page.
              </p>
              <div className="mt-4">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Rafraîchir la page
                </button>
              </div>
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4 text-left">
                  <summary className="text-sm text-gray-600 cursor-pointer">
                    Détails de l'erreur (développement)
                  </summary>
                  <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap">
                    {this.state.error.toString()}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// =====================================================
// UTILITAIRES POUR LES ERREURS RÉSEAU
// =====================================================

export const NetworkErrorUtils = {
  // Détecter si on est hors ligne
  isOnline: () => navigator.onLine,

  // Détecter si c'est une erreur de timeout
  isTimeoutError: (error: unknown): boolean => {
    return error instanceof Error && 
           (error.message.includes('timeout') || 
            error.message.includes('TIMEOUT'));
  },

  // Détecter si c'est une erreur de CORS
  isCorsError: (error: unknown): boolean => {
    return error instanceof Error && 
           error.message.includes('CORS');
  },

  // Créer un listener pour les changements de statut réseau
  createNetworkStatusListener: (
    onOnline: () => void,
    onOffline: () => void
  ) => {
    const handleOnline = () => {
      console.log('Connexion réseau rétablie');
      toast.success('Connexion rétablie');
      onOnline();
    };

    const handleOffline = () => {
      console.log('Connexion réseau perdue');
      toast.error('Connexion perdue - Mode hors ligne activé');
      onOffline();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Fonction de nettoyage
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
};

// =====================================================
// HELPERS POUR LES ERREURS DE FORMULAIRE
// =====================================================

export const FormErrorUtils = {
  // Extraire les erreurs de champ depuis une erreur API
  extractFieldErrors: (error: unknown): Record<string, string> => {
    const errorInfo = classifyError(error);
    return ErrorHandler.handleValidationErrors(errorInfo);
  },

  // Créer un message d'erreur pour un champ spécifique
  getFieldError: (errors: Record<string, string>, fieldName: string): string | undefined => {
    return errors[fieldName];
  },

  // Vérifier si un champ a une erreur
  hasFieldError: (errors: Record<string, string>, fieldName: string): boolean => {
    return !!errors[fieldName];
  }
};