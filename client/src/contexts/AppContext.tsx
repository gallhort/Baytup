'use client';

import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { User } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import toast from 'react-hot-toast';

interface AppState {
  language: 'en' | 'fr' | 'ar';
  currency: 'DZD' | 'EUR';
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

type AppAction =
  | { type: 'SET_LANGUAGE'; payload: 'en' | 'fr' | 'ar' }
  | { type: 'SET_CURRENCY'; payload: 'DZD' | 'EUR' }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'LOGOUT' };

interface AppContextType {
  state: AppState;
  setLanguage: (language: 'en' | 'fr' | 'ar') => void;
  setCurrency: (currency: 'DZD' | 'EUR') => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialState: AppState = {
  language: 'en',
  currency: 'DZD',
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'SET_CURRENCY':
      return { ...state, currency: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false
      };
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Function to load user from token
  const loadUserFromToken = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsCheckingAuth(false);
      dispatch({ type: 'SET_INITIALIZED', payload: true });
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await getCurrentUser();

      if (response.status === 'success' && response.data?.user) {
        dispatch({ type: 'SET_USER', payload: response.data.user });

        // Update language and currency from user preferences
        if (response.data.user.language) {
          dispatch({ type: 'SET_LANGUAGE', payload: response.data.user.language });
        }
        if (response.data.user.currency) {
          dispatch({ type: 'SET_CURRENCY', payload: response.data.user.currency });
        }
      }
    } catch (error: any) {
      console.error('Failed to load user:', error);

      // If token is invalid or expired, remove it
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        localStorage.removeItem('token');
        dispatch({ type: 'LOGOUT' });
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_INITIALIZED', payload: true });
      setIsCheckingAuth(false);
    }
  };

  // Load saved preferences and user from localStorage on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load language and currency preferences
        const savedLanguage = localStorage.getItem('baytup_language') as 'en' | 'fr' | 'ar';
        const savedCurrency = localStorage.getItem('baytup_currency') as 'DZD' | 'EUR';

        if (savedLanguage) {
          dispatch({ type: 'SET_LANGUAGE', payload: savedLanguage });
        }
        if (savedCurrency) {
          dispatch({ type: 'SET_CURRENCY', payload: savedCurrency });
        }

        // Load user from token
        await loadUserFromToken();
      } catch (error) {
        console.error('Error loading initial data:', error);
        setIsCheckingAuth(false);
        dispatch({ type: 'SET_INITIALIZED', payload: true });
      }
    };

    loadInitialData();
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    if (state.isInitialized) {
      localStorage.setItem('baytup_language', state.language);
    }
  }, [state.language, state.isInitialized]);

  useEffect(() => {
    if (state.isInitialized) {
      localStorage.setItem('baytup_currency', state.currency);
    }
  }, [state.currency, state.isInitialized]);

  // Apply RTL for Arabic
  useEffect(() => {
    if (state.language === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = state.language;
    }
  }, [state.language]);

  const setLanguage = (language: 'en' | 'fr' | 'ar') => {
    dispatch({ type: 'SET_LANGUAGE', payload: language });
  };

  const setCurrency = (currency: 'DZD' | 'EUR') => {
    dispatch({ type: 'SET_CURRENCY', payload: currency });
  };

  const setUser = (user: User | null) => {
    dispatch({ type: 'SET_USER', payload: user });
    if (user) {
      // Update user preferences from profile
      if (user.language) {
        dispatch({ type: 'SET_LANGUAGE', payload: user.language });
      }
      if (user.currency) {
        dispatch({ type: 'SET_CURRENCY', payload: user.currency });
      }
    }
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const logout = async () => {
    try {
      // Import the logout function from auth
      const { logout: logoutAPI } = await import('@/lib/auth');

      // Call logout API endpoint to clear server-side session
      try {
        await logoutAPI();
      } catch (apiError) {
        console.warn('Server logout failed, continuing with local logout:', apiError);
      }

      // Clear token from localStorage (already done in logoutAPI, but ensure it's cleared)
      localStorage.removeItem('token');

      // Clear user from state
      dispatch({ type: 'LOGOUT' });

      // Note: Success message is shown in HeaderWrapper for better language support
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if API call fails, clear local state
      localStorage.removeItem('token');
      dispatch({ type: 'LOGOUT' });
    }
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await getCurrentUser();
      if (response.status === 'success' && response.data?.user) {
        dispatch({ type: 'SET_USER', payload: response.data.user });
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value: AppContextType = {
    state: {
      ...state,
      isLoading: state.isLoading || isCheckingAuth
    },
    setLanguage,
    setCurrency,
    setUser,
    setLoading,
    logout,
    refreshUser
  };

  // Show loading spinner while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35]"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;