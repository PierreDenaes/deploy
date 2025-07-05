import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthState, AuthContextType, AuthUser, LoginCredentials, RegisterCredentials } from '@/types/auth';
import { DeleteAccountRequest } from '@/services/api.auth';
import { authService } from '@/services/authService';
import { toast } from 'sonner';

// Auth action types
type AuthAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: AuthUser | null }
  | { type: 'SET_TOKEN'; payload: string | null }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<AuthUser> };

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start as loading to check existing auth
  error: null,
  token: null,
};

// Auth reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
        error: null,
      };
    case 'SET_TOKEN':
      return {
        ...state,
        token: action.payload,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Only check auth if there's a stored token
        const hasStoredToken = localStorage.getItem('access_token');
        if (!hasStoredToken) {
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }
        
        // Ensure demo user exists for testing
        await authService.ensureDemoUser();
        
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          dispatch({ type: 'SET_USER', payload: currentUser.user });
          dispatch({ type: 'SET_TOKEN', payload: currentUser.token });
        }
      } catch (error) {
        // Clear any invalid stored auth data
        await authService.logout();
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await authService.login(credentials);
      
      dispatch({ type: 'SET_USER', payload: response.user });
      dispatch({ type: 'SET_TOKEN', payload: response.token });
      
      toast.success(`Welcome back, ${response.user.name}!`);
    } catch (error: unknown) {
      const errorMessage = error.message || 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Register function
  const register = async (credentials: RegisterCredentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await authService.register(credentials);
      
      dispatch({ type: 'SET_USER', payload: response.user });
      dispatch({ type: 'SET_TOKEN', payload: response.token });
      
      toast.success(`Welcome to DynProt, ${response.user.name}!`);
    } catch (error: unknown) {
      const errorMessage = error.message || 'Registration failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    authService.logout();
    dispatch({ type: 'LOGOUT' });
    toast.success('You have been logged out successfully');
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  // Delete account function - requires password and confirmation
  const deleteAccount = async (data: DeleteAccountRequest) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      await authService.deleteAccount(data);
      
      // Account deleted successfully - logout and clear state
      dispatch({ type: 'LOGOUT' });
      
      toast.success('Votre compte a été supprimé définitivement');
      
    } catch (error: unknown) {
      const errorMessage = (error as any)?.message || 'Erreur lors de la suppression du compte';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Update user profile function
  const updateUserProfile = (updates: Partial<AuthUser>) => {
    dispatch({ type: 'UPDATE_USER', payload: updates });
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
    updateUserProfile,
    deleteAccount,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;