'use client';

import React from 'react';
import { Loader2, MapPin, Home, Car } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  fullScreen?: boolean;
  variant?: 'default' | 'search' | 'map' | 'listings';
  className?: string;
}

export default function LoadingSpinner({
  size = 'medium',
  text,
  fullScreen = false,
  variant = 'default',
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50'
    : 'flex items-center justify-center';

  const getIcon = () => {
    switch (variant) {
      case 'search':
        return <MapPin className={`${sizeClasses[size]} text-[#FF6B35]`} />;
      case 'map':
        return <MapPin className={`${sizeClasses[size]} text-blue-500`} />;
      case 'listings':
        return <Home className={`${sizeClasses[size]} text-green-500`} />;
      default:
        return <Loader2 className={`${sizeClasses[size]} text-[#FF6B35] animate-spin`} />;
    }
  };

  const getLoadingText = () => {
    if (text) return text;

    switch (variant) {
      case 'search':
        return 'Searching properties...';
      case 'map':
        return 'Loading map...';
      case 'listings':
        return 'Loading listings...';
      default:
        return 'Loading...';
    }
  };

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="text-center">
        {variant === 'default' ? (
          <Loader2 className={`${sizeClasses[size]} text-[#FF6B35] animate-spin mx-auto mb-3`} />
        ) : (
          <div className="relative mx-auto mb-3 flex items-center justify-center">
            {getIcon()}
            <div className="absolute inset-0 animate-ping">
              {getIcon()}
            </div>
          </div>
        )}

        <p className="text-gray-600 font-medium">
          {getLoadingText()}
        </p>

        {fullScreen && (
          <div className="mt-4 flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-[#FF6B35] rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-[#FF6B35] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-[#FF6B35] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        )}
      </div>
    </div>
  );
}

// Skeleton Loading Components
export const ListingSkeleton = () => (
  <div className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
    <div className="aspect-[4/3] bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 shimmer"></div>
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded shimmer"></div>
      <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-2/3 shimmer"></div>
      <div className="flex justify-between items-center">
        <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-1/3 shimmer"></div>
        <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-1/4 shimmer"></div>
      </div>
    </div>
  </div>
);

export const ListingsGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {[...Array(count)].map((_, i) => (
      <ListingSkeleton key={i} />
    ))}
  </div>
);

// Map Loading Component
export const MapLoadingSkeleton = () => (
  <div className="relative w-full h-full bg-gray-100 rounded-xl overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse"></div>
    <div className="absolute top-4 left-4 bg-white rounded-lg p-4 shadow-lg">
      <div className="h-4 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
      <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
    </div>
    <div className="absolute bottom-4 left-4 bg-white rounded-lg p-3 shadow-lg">
      <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
    </div>
  </div>
);

// Search Results Header Skeleton
export const SearchHeaderSkeleton = () => (
  <div className="bg-white border-b">
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
          <div className="flex items-center gap-2">
            <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded-full w-24 animate-pulse"></div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
);