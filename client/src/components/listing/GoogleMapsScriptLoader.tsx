'use client';

/**
 * GoogleMapsScriptLoader - Simple wrapper component
 *
 * Note: This component no longer loads Google Maps directly.
 * Google Maps is loaded globally via GoogleMapsContext in the root layout.
 * This component is kept for backwards compatibility but just renders children.
 */

interface GoogleMapsScriptLoaderProps {
  children: React.ReactNode;
}

export default function GoogleMapsScriptLoader({ children }: GoogleMapsScriptLoaderProps) {
  // Google Maps is already loaded via GoogleMapsContext in layout.tsx
  // This component just renders children without additional script loading
  return <>{children}</>;
}
