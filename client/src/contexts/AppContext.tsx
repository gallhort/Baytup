'use client';

import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { User } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import toast from 'react-hot-toast';

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'LOGOUT' };

interface AppContextType {
  state: AppState;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
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
      }
    } catch (error: any) {
      const status = error?.response?.status;

      // Only remove token on actual 401 (expired/invalid token)
      // Don't remove on network errors or server errors (token might still be valid)
      if (status === 401) {
        localStorage.removeItem('token');
      }
      dispatch({ type: 'LOGOUT' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_INITIALIZED', payload: true });
      setIsCheckingAuth(false);
    }
  };

  // Load user from localStorage on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
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

  // Note: Language and currency management moved to LanguageContext

  const setUser = (user: User | null) => {
    dispatch({ type: 'SET_USER', payload: user });
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