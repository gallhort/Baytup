import axios from 'axios';
import { LoginForm, RegisterForm, ApiResponse, User } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const authApi = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  withCredentials: true,
});

// Add token to requests if it exists
authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors - let callers (AppContext) handle auth state
authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect here - AppContext handles auth state and navigation
    // The aggressive redirect was causing forced logout on every page refresh
    return Promise.reject(error);
  }
);

export interface AuthResponse {
  status: 'success' | 'error' | 'already_verified';
  message: string;
  token?: string;
  data?: {
    user: User;
    alreadyVerified?: boolean;
  };
}

// Register user
export const register = async (formData: RegisterForm): Promise<AuthResponse> => {
  try {
    const response = await authApi.post<AuthResponse>('/register', formData);

    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }

    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
};

// Login user
export const login = async (formData: LoginForm): Promise<AuthResponse> => {
  try {
    const response = await authApi.post<AuthResponse>('/login', formData);

    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }

    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};

// Google OAuth login
export const googleLogin = async (credential: string): Promise<AuthResponse> => {
  try {
    const response = await authApi.post<AuthResponse>('/google', { credential });

    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }

    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Google login failed');
  }
};

// Logout user
export const logout = async (): Promise<ApiResponse<any>> => {
  try {
    const response = await authApi.get('/logout');
    localStorage.removeItem('token');
    return response.data;
  } catch (error: any) {
    // Even if logout fails on server, remove local token
    localStorage.removeItem('token');
    throw new Error(error.response?.data?.message || 'Logout failed');
  }
};

// Get current user
export const getCurrentUser = async (): Promise<ApiResponse<{ user: User }>> => {
  try {
    const response = await authApi.get('/me');
    return response.data;
  } catch (error: any) {
    // Preserve the original error with status code so AppContext can distinguish 401 from network errors
    throw error;
  }
};

// Forgot password
export const forgotPassword = async (email: string): Promise<ApiResponse<any>> => {
  try {
    const response = await authApi.post('/forgotpassword', { email });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to send reset email');
  }
};

// Reset password
export const resetPassword = async (token: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await authApi.put<AuthResponse>(`/resetpassword/${token}`, { password });

    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }

    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Password reset failed');
  }
};

// Verify email
export const verifyEmail = async (token: string): Promise<AuthResponse> => {
  try {
    const response = await authApi.get<AuthResponse>(`/verify-email/${token}`);

    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }

    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Email verification failed');
  }
};

// Resend verification email
export const resendVerification = async (email: string): Promise<ApiResponse<any>> => {
  try {
    const response = await authApi.post('/resend-verification', { email });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to resend verification email');
  }
};

// Update user details
export const updateUserDetails = async (data: Partial<User>): Promise<ApiResponse<{ user: User }>> => {
  try {
    const response = await authApi.put('/updatedetails', data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to update user details');
  }
};

// Update password
export const updatePassword = async (currentPassword: string, newPassword: string): Promise<AuthResponse> => {
  try {
    const response = await authApi.put<AuthResponse>('/updatepassword', {
      currentPassword,
      newPassword,
    });

    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }

    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Password update failed');
  }
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('token');
  return !!token;
};