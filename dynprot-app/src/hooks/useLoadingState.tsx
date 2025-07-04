// Hook pour la gestion d'état de chargement
import { useState, useCallback, useRef, useEffect, createContext, useContext, ReactNode } from 'react';

// =====================================================
// TYPES ET INTERFACES
// =====================================================

export interface LoadingState {
  isLoading: boolean;
  operation: string | null;
  progress?: number;
  message?: string;
}

export interface UseLoadingStateReturn {
  // État actuel
  isLoading: boolean;
  operation: string | null;
  progress?: number;
  message?: string;
  
  // Actions
  startLoading: (operation: string, message?: string) => void;
  stopLoading: () => void;
  setProgress: (progress: number) => void;
  setMessage: (message: string) => void;
  
  // Helpers
  withLoading: <T>(
    operation: string,
    asyncFn: () => Promise<T>,
    message?: string
  ) => Promise<T>;
}

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export function useLoadingState(initialState: LoadingState = {
  isLoading: false,
  operation: null
}): UseLoadingStateReturn {
  const [state, setState] = useState<LoadingState>(initialState);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Nettoyer le timeout au démontage
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const startLoading = useCallback((operation: string, message?: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setState({
      isLoading: true,
      operation,
      message,
      progress: undefined
    });
  }, []);

  const stopLoading = useCallback(() => {
    setState({
      isLoading: false,
      operation: null,
      message: undefined,
      progress: undefined
    });
  }, []);

  const setProgress = useCallback((progress: number) => {
    setState(prev => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress))
    }));
  }, []);

  const setMessage = useCallback((message: string) => {
    setState(prev => ({
      ...prev,
      message
    }));
  }, []);

  const withLoading = useCallback(
    function<T>(
      operation: string,
      asyncFn: () => Promise<T>,
      message?: string
    ): Promise<T> {
      return (async () => {
        try {
          startLoading(operation, message);
          const result = await asyncFn();
          return result;
        } finally {
          // Délai minimum pour éviter le clignotement
          timeoutRef.current = setTimeout(stopLoading, 100);
        }
      })();
    }
  , [startLoading, stopLoading]);

  return {
    isLoading: state.isLoading,
    operation: state.operation,
    progress: state.progress,
    message: state.message,
    startLoading,
    stopLoading,
    setProgress,
    setMessage,
    withLoading
  };
}

// =====================================================
// CONTEXTE GLOBAL POUR LE LOADING
// =====================================================

interface GlobalLoadingContextType extends UseLoadingStateReturn {
  // État de chargement pour différentes opérations
  loadingOperations: Set<string>;
  
  // Démarrer/arrêter des opérations spécifiques
  startOperation: (operation: string, message?: string) => void;
  stopOperation: (operation: string) => void;
  isOperationLoading: (operation: string) => boolean;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType | undefined>(undefined);

export function GlobalLoadingProvider({ children }: { children: ReactNode }) {
  const loadingState = useLoadingState();
  const [operations, setOperations] = useState<Set<string>>(new Set());

  const startOperation = useCallback((operation: string, message?: string) => {
    setOperations(prev => new Set([...prev, operation]));
    if (!loadingState.isLoading) {
      loadingState.startLoading(operation, message);
    }
  }, [loadingState]);

  const stopOperation = useCallback((operation: string) => {
    setOperations(prev => {
      const newSet = new Set(prev);
      newSet.delete(operation);
      
      // Si plus d'opérations en cours, arrêter le loading
      if (newSet.size === 0) {
        loadingState.stopLoading();
      } else {
        // Mettre à jour avec la première opération restante
        const firstOperation = Array.from(newSet)[0];
        loadingState.startLoading(firstOperation);
      }
      
      return newSet;
    });
  }, [loadingState]);

  const isOperationLoading = useCallback((operation: string) => {
    return operations.has(operation);
  }, [operations]);

  const withLoading = useCallback(async (
    operation: string,
    asyncFn: () => Promise<any>,
    message?: string
  ) => {
    try {
      startOperation(operation, message);
      return await asyncFn();
    } finally {
      stopOperation(operation);
    }
  }, [startOperation, stopOperation]);

  const contextValue: GlobalLoadingContextType = {
    ...loadingState,
    loadingOperations: operations,
    startOperation,
    stopOperation,
    isOperationLoading,
    withLoading
  };

  return (
    <GlobalLoadingContext.Provider value={contextValue}>
      {children}
    </GlobalLoadingContext.Provider>
  );
}

export function useGlobalLoading(): GlobalLoadingContextType {
  const context = useContext(GlobalLoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading must be used within GlobalLoadingProvider');
  }
  return context;
}

// =====================================================
// HOOKS SPÉCIALISÉS
// =====================================================

// Hook pour les opérations API
export function useApiLoading() {
  const globalLoading = useGlobalLoading();

  const executeWithLoading = useCallback(async (
    apiCall: () => Promise<any>,
    operation: string = 'api-call',
    message?: string
  ) => {
    return globalLoading.withLoading(operation, apiCall, message);
  }, [globalLoading]);

  return {
    isLoading: globalLoading.isLoading,
    executeWithLoading
  };
}

// Hook pour les uploads de fichiers
export function useUploadLoading() {
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const globalLoading = useGlobalLoading();

  const uploadWithProgress = useCallback(
    function<T>(
      uploadFn: (onProgress: (progress: number) => void) => Promise<T>,
      operation: string = 'upload'
    ): Promise<T> {
      return (async () => {
        try {
          globalLoading.startOperation(operation, 'Upload en cours...');
          setUploadProgress(0);

          const result = await uploadFn((progress) => {
            setUploadProgress(progress);
            globalLoading.setProgress(progress);
          });

          return result;
        } finally {
          globalLoading.stopOperation(operation);
          setUploadProgress(0);
        }
      })();
    }
  , [globalLoading]);

  return {
    isUploading: globalLoading.isOperationLoading('upload'),
    uploadProgress,
    uploadWithProgress
  };
}

// Hook pour la pagination avec loading
export function usePaginatedLoading() {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const globalLoading = useGlobalLoading();

  const loadPage = useCallback(
    function<T>(
      loadFn: () => Promise<T>,
      isInitialLoad: boolean = false
    ): Promise<T> {
      return (async () => {
        if (isInitialLoad) {
          return globalLoading.withLoading('pagination-initial', loadFn, 'Chargement...');
        } else {
          try {
            setIsLoadingMore(true);
            return await loadFn();
          } finally {
            setIsLoadingMore(false);
          }
        }
      })();
    }
  , [globalLoading]);

  return {
    isInitialLoading: globalLoading.isOperationLoading('pagination-initial'),
    isLoadingMore,
    loadPage
  };
}

// =====================================================
// COMPOSANT DE LOADING OVERLAY
// =====================================================

import { motion, AnimatePresence } from 'framer-motion';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number;
  operation?: string;
  className?: string;
}

export function LoadingOverlay({
  isVisible,
  message,
  progress,
  operation,
  className = ''
}: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center ${className}`}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4"
          >
            <div className="flex flex-col items-center">
              {/* Spinner */}
              <div className="relative">
                <div className="w-12 h-12 border-4 border-gray-200 rounded-full"></div>
                <div className="absolute top-0 left-0 w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>

              {/* Message */}
              {message && (
                <p className="mt-4 text-sm text-gray-600 text-center">
                  {message}
                </p>
              )}

              {/* Opération */}
              {operation && (
                <p className="mt-2 text-xs text-gray-400 text-center capitalize">
                  {operation.replace(/[-_]/g, ' ')}
                </p>
              )}

              {/* Barre de progression */}
              {typeof progress === 'number' && (
                <div className="mt-4 w-full">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progression</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      className="bg-primary h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =====================================================
// HOOK POUR LOADING OVERLAY GLOBAL
// =====================================================

export function useGlobalLoadingOverlay() {
  const globalLoading = useGlobalLoading();

  return (
    <LoadingOverlay
      isVisible={globalLoading.isLoading}
      message={globalLoading.message}
      progress={globalLoading.progress}
      operation={globalLoading.operation || undefined}
    />
  );
}

// =====================================================
// UTILITAIRES
// =====================================================

// Helper pour créer des opérations de loading typées
export const LoadingOperations = {
  // Authentification
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  REFRESH_TOKEN: 'refresh-token',

  // Profil utilisateur
  LOAD_PROFILE: 'load-profile',
  UPDATE_PROFILE: 'update-profile',
  CALCULATE_GOALS: 'calculate-goals',

  // Repas
  LOAD_MEALS: 'load-meals',
  CREATE_MEAL: 'create-meal',
  UPDATE_MEAL: 'update-meal',
  DELETE_MEAL: 'delete-meal',
  ANALYZE_MEAL: 'analyze-meal',

  // Favoris
  LOAD_FAVORITES: 'load-favorites',
  CREATE_FAVORITE: 'create-favorite',
  UPDATE_FAVORITE: 'update-favorite',
  DELETE_FAVORITE: 'delete-favorite',

  // Résumés et analytics
  LOAD_SUMMARY: 'load-summary',
  LOAD_TRENDS: 'load-trends',
  LOAD_INSIGHTS: 'load-insights',

  // Export
  CREATE_EXPORT: 'create-export',
  DOWNLOAD_EXPORT: 'download-export',

  // Upload
  UPLOAD_PHOTO: 'upload-photo'
} as const;

export type LoadingOperation = typeof LoadingOperations[keyof typeof LoadingOperations];

// Helper pour des messages de loading contextuels
export const LoadingMessages = {
  [LoadingOperations.LOGIN]: 'Connexion en cours...',
  [LoadingOperations.LOGOUT]: 'Déconnexion...',
  [LoadingOperations.REGISTER]: 'Création du compte...',
  [LoadingOperations.REFRESH_TOKEN]: 'Actualisation de la session...',

  [LoadingOperations.LOAD_PROFILE]: 'Chargement du profil...',
  [LoadingOperations.UPDATE_PROFILE]: 'Mise à jour du profil...',
  [LoadingOperations.CALCULATE_GOALS]: 'Calcul des objectifs...',

  [LoadingOperations.LOAD_MEALS]: 'Chargement des repas...',
  [LoadingOperations.CREATE_MEAL]: 'Ajout du repas...',
  [LoadingOperations.UPDATE_MEAL]: 'Modification du repas...',
  [LoadingOperations.DELETE_MEAL]: 'Suppression du repas...',
  [LoadingOperations.ANALYZE_MEAL]: 'Analyse du repas...',

  [LoadingOperations.LOAD_FAVORITES]: 'Chargement des favoris...',
  [LoadingOperations.CREATE_FAVORITE]: 'Ajout aux favoris...',
  [LoadingOperations.UPDATE_FAVORITE]: 'Modification du favori...',
  [LoadingOperations.DELETE_FAVORITE]: 'Suppression du favori...',

  [LoadingOperations.LOAD_SUMMARY]: 'Chargement du résumé...',
  [LoadingOperations.LOAD_TRENDS]: 'Calcul des tendances...',
  [LoadingOperations.LOAD_INSIGHTS]: 'Génération des insights...',

  [LoadingOperations.CREATE_EXPORT]: 'Préparation de l\'export...',
  [LoadingOperations.DOWNLOAD_EXPORT]: 'Téléchargement...',

  [LoadingOperations.UPLOAD_PHOTO]: 'Upload de la photo...'
} as const;

// Hook simplifié avec opérations prédéfinies
export function useTypedLoading() {
  const globalLoading = useGlobalLoading();

  const executeOperation = useCallback(
    function executeOperation<T>(
      operation: LoadingOperation,
      asyncFn: () => Promise<T>
    ): Promise<T> {
      const message = LoadingMessages[operation];
      return globalLoading.withLoading(operation, asyncFn, message);
    },
    [globalLoading]
  );

  const isOperationLoading = useCallback((operation: LoadingOperation): boolean => {
    return globalLoading.isOperationLoading(operation);
  }, [globalLoading]);

  return {
    isLoading: globalLoading.isLoading,
    executeOperation,
    isOperationLoading,
    currentOperation: globalLoading.operation
  };
}