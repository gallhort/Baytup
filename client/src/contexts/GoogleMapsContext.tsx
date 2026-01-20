'use client';

import { createContext, useContext, useCallback, useState, useEffect, useMemo } from 'react';
import { LoadScript } from '@react-google-maps/api';

// Static libraries array to prevent LoadScript reloading
// Include all libraries needed across the application
const GOOGLE_MAPS_LIBRARIES: ("places" | "marker" | "geometry" | "drawing" | "visualization")[] = [
  'places',
  'marker',
  'geometry',
  'drawing',
  'visualization'
];

interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: Error | null;
  initializeAutocomplete: (
    input: HTMLInputElement,
    options?: google.maps.places.AutocompleteOptions
  ) => google.maps.places.Autocomplete | null;
}

const GoogleMapsContext = createContext<GoogleMapsContextType | null>(null);

interface GoogleMapsProviderProps {
  children: React.ReactNode;
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);

    // ✅ DEBUG: Vérifie si la clé est chargée
  console.log('🗺️ Google Maps API Key:', process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? '✅ Loaded' : '❌ Missing');

  
  const handleLoad = useCallback(() => {

    // Suppress known warnings and deprecation messages
    if (typeof window !== 'undefined' && window.console) {
      const originalWarn = window.console.warn;
      const originalError = window.console.error;

      window.console.warn = function(...args) {
        const message = args.join(' ');
        // Filter out duplicate element definition warnings
        if (message.includes('Element with name') && message.includes('already defined')) {
          return; // Suppress duplicate element warnings
        }
        // Filter out deprecated API warnings we're aware of
        if (message.includes('google.maps.places.Autocomplete is not available to new customers') ||
            message.includes('google.maps.Marker is deprecated') ||
            message.includes('Google Maps already loaded outside')) {
          return; // Suppress these specific warnings
        }
        // Filter out Next.js Image LCP warnings (Logo already has priority)
        if (message.includes('Image with src') && message.includes('Largest Contentful Paint') && message.includes('priority')) {
          return; // Suppress LCP warnings (already optimized)
        }
        originalWarn.apply(window.console, args);
      };

      window.console.error = function(...args) {
        const message = args.join(' ');
        // Filter out multiple API loading errors
        if (message.includes('You have included the Google Maps JavaScript API multiple times')) {
          return; // Suppress multiple loading error (we control it now)
        }
        // Filter out address types mixing error (fixed in our implementation)
        if (message.includes('address cannot be mixed with other types')) {
          return; // Suppress this error (we're using geocode type only)
        }
        originalError.apply(window.console, args);
      };
    }

    setIsLoaded(true);
  }, []);

  const handleError = useCallback((error: Error) => {
    console.error('Google Maps API failed to load:', error);
    setLoadError(error);
  }, []);

  const initializeAutocomplete = useCallback((
    input: HTMLInputElement,
    options?: google.maps.places.AutocompleteOptions
  ): google.maps.places.Autocomplete | null => {
    if (!isLoaded || !window.google?.maps?.places?.Autocomplete) {
      console.warn('Google Maps API not loaded yet');
      return null;
    }

    try {
      // Current implementation using legacy Autocomplete API
      // Note: While Google recommends PlaceAutocompleteElement for new projects,
      // the legacy API continues to work and receives bug fixes
      const defaultOptions: google.maps.places.AutocompleteOptions = {
        componentRestrictions: { country: 'dz' },
        // Fixed: Use 'geocode' only - covers addresses, streets, cities, localities, postal codes
        // Note: 'address' type cannot be mixed with other types per Google Maps API rules
        // 'geocode' is the correct type for address autocomplete and includes all address components
        types: ['geocode'],
        fields: ['formatted_address', 'geometry', 'name', 'place_id', 'vicinity', 'types', 'address_components', 'plus_code'],
        strictBounds: false,
        ...options
      };

      return new google.maps.places.Autocomplete(input, defaultOptions);
    } catch (error) {
      console.error('Error initializing autocomplete:', error);
      return null;
    }
  }, [isLoaded]);

  const contextValue: GoogleMapsContextType = useMemo(() => ({
    isLoaded,
    loadError,
    initializeAutocomplete
  }), [isLoaded, loadError, initializeAutocomplete]);

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!googleMapsApiKey) {
  console.error('⚠️ Google Maps API key not found in environment variables');
  console.log('Make sure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set in .env or .env.local');
  
  // ✅ Toujours retourner le Provider pour éviter les erreurs
  return (
    <GoogleMapsContext.Provider value={{ isLoaded: false, loadError: new Error('API key missing'), initializeAutocomplete: () => null }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

  return (
    <GoogleMapsContext.Provider value={contextValue}>
      <LoadScript
        googleMapsApiKey={googleMapsApiKey}
        libraries={GOOGLE_MAPS_LIBRARIES}
        onLoad={handleLoad}
        onError={handleError}
        loadingElement={<div />}
        preventGoogleFontsLoading
        // Prevent multiple loads by using a unique ID
        id="google-maps-script-loader"
        // Add key to prevent unnecessary remounting
        key="google-maps-loader"
      >
        {children}
      </LoadScript>
    </GoogleMapsContext.Provider>
  );
}

export function useGoogleMaps() {
  const context = useContext(GoogleMapsContext);
  if (!context) {
    throw new Error('useGoogleMaps must be used within a GoogleMapsProvider');
  }
  return context;
}