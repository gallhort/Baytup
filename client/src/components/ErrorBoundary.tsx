'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // You could also log this to an error reporting service
    if (typeof window !== 'undefined') {
      // Only log client-side errors
      if (process.env.NODE_ENV === 'production') {
        // In production, you might want to send to error tracking service
        // Example: Sentry.captureException(error);
      }
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback component
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
          <div className="max-w-lg w-full">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
              {/* Error Icon */}
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-red-100 rounded-full">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>

              {/* Error Message */}
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Oops! Something went wrong
              </h1>
              <p className="text-gray-600 mb-6 leading-relaxed">
                We're sorry for the inconvenience. The page encountered an unexpected error and couldn't load properly.
              </p>

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                  <p className="text-red-800 font-medium text-sm mb-2">
                    Error Details:
                  </p>
                  <p className="text-red-700 text-xs font-mono break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleRetry}
                  className="inline-flex items-center justify-center px-6 py-3 bg-[#FF6B35] text-white font-semibold rounded-lg hover:bg-[#E55A2B] transition-all duration-200 transform hover:scale-105"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </button>

                <button
                  onClick={this.handleReload}
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-600 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-sm"
                >
                  Reload Page
                </button>
              </div>

              {/* Help Text */}
              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  💡 <strong>Still having issues?</strong> Try refreshing the page or clearing your browser cache.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const useErrorHandler = () => {
  const handleError = (error: Error, errorInfo?: string) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);

    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // In production, send to error tracking service
      // Example: Sentry.captureException(error);
    }
  };

  return { handleError };
};