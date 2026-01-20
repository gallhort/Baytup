'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import socketService from '@/lib/socket';
import type { FeatureFlags, FeatureFlagsResponse, FeatureFlagsUpdateEvent } from '@/types/featureFlags';

interface FeatureFlagsContextType {
  features: FeatureFlags;
  loading: boolean;
  error: string | null;
  refreshFlags: () => Promise<void>;
}

const defaultFeatures: FeatureFlags = {
  vehiclesEnabled: true,
  accommodationsEnabled: true
};

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined);

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [features, setFeatures] = useState<FeatureFlags>(defaultFeatures);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch feature flags from API
  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get<FeatureFlagsResponse>(
        `${process.env.NEXT_PUBLIC_API_URL}/settings/feature-flags`
      );

      if (response.data?.status === 'success') {
        setFeatures(response.data.data.features);

        // Store in localStorage for faster initial load
        if (typeof window !== 'undefined') {
          localStorage.setItem('baytup_features', JSON.stringify(response.data.data.features));
        }
      }
    } catch (err: any) {
      console.error('Error fetching feature flags:', err);
      setError(err.message || 'Failed to load feature flags');

      // Try to use cached flags from localStorage
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('baytup_features');
        if (cached) {
          try {
            setFeatures(JSON.parse(cached));
          } catch (parseErr) {
            console.error('Error parsing cached features:', parseErr);
            setFeatures(defaultFeatures);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh flags (can be called manually)
  const refreshFlags = useCallback(async () => {
    await fetchFlags();
  }, [fetchFlags]);

  // Initial load
  useEffect(() => {
    // Load from localStorage immediately for fast render
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('baytup_features');
      if (cached) {
        try {
          setFeatures(JSON.parse(cached));
        } catch (err) {
          console.error('Error parsing cached features:', err);
        }
      }
    }

    // Then fetch fresh data
    fetchFlags();
  }, [fetchFlags]);

  // Listen for real-time updates via Socket.IO
  useEffect(() => {
    const handleFlagsUpdate = (data: FeatureFlagsUpdateEvent) => {
      console.log('🔄 Feature flags updated:', data);

      // Refresh flags from server
      refreshFlags();
    };

    // Subscribe to Socket.IO events
    // socketService.on() returns a cleanup function automatically
    const cleanup = socketService.on('feature-flags-updated', handleFlagsUpdate);

    // Return the cleanup function
    return cleanup;
  }, [refreshFlags]);

  const value: FeatureFlagsContextType = {
    features,
    loading,
    error,
    refreshFlags
  };

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/**
 * Hook to access all feature flags
 * @returns FeatureFlagsContextType
 */
export function useFeatureFlags(): FeatureFlagsContextType {
  const context = useContext(FeatureFlagsContext);
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }
  return context;
}

/**
 * Convenience hook for checking a single feature
 * @param featureName - Name of the feature flag to check
 * @returns boolean - Whether the feature is enabled
 */
export function useFeature(featureName: keyof FeatureFlags): boolean {
  const { features } = useFeatureFlags();
  return features[featureName] !== false; // Default to true if undefined
}
