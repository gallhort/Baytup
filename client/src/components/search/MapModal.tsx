'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize2, Minimize2, MapPin } from 'lucide-react';
import LeafletMapView from './LeafletMapView';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/hooks/useTranslation'; // Translation hook

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  listings: any[];
  selectedListing?: string | null;
  onListingSelect?: (id: string) => void;
  onListingHover?: (id: string | null) => void;
  onMapBoundsChange?: (bounds: google.maps.LatLngBounds | null) => void;
  filters: any;
  onFilterChange?: (filters: any) => void;
  title?: string;
}

export default function MapModal({
  isOpen,
  onClose,
  listings,
  selectedListing,
  onListingSelect,
  onListingHover,
  onMapBoundsChange,
  filters,
  onFilterChange,
  title
}: MapModalProps) {
  const { language, currency } = useLanguage();
  const t = useTranslation('search');
  const modalTitle = title || (t as any)?.map?.title || 'Explore Properties on Map';
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // IMPORTANT: Use Algeria center coordinates SAME AS HOMEPAGE
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.0, 2.0]); // Center of Algeria
  const [mapZoom, setMapZoom] = useState(5.5); // Zoom level to show entire Algeria
  const [visibleListingsCount, setVisibleListingsCount] = useState(listings.length);
  const [currentMapBounds, setCurrentMapBounds] = useState<google.maps.LatLngBounds | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle ESC key press and modal state
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
      // Reset visible count when opening
      setVisibleListingsCount(listings.length);
      // Don't reset bounds to allow persistence
      // setCurrentMapBounds(null);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isFullscreen, onClose, listings.length]);

  // Handle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Use all listings directly since we removed category filtering
  const filteredListings = listings;

  // Function to check if a listing is within map bounds - SAME AS HOMEPAGE AND SEARCH PAGE
  const isListingInBounds = useCallback((listing: any, bounds: google.maps.LatLngBounds) => {
    // IMPORTANT: Use address.coordinates which is in [lat, lng] format (same as homepage/search)
    const coords = listing.address?.coordinates || listing.displayCoordinates;

    if (!coords || !Array.isArray(coords) || coords.length !== 2) {
      return false;
    }

    // Coordinates are already in [lat, lng] format after transformation
    const [lat, lng] = coords;

    if (isNaN(lat) || isNaN(lng)) {
      return false;
    }

    const isInBounds = bounds.contains({ lat, lng });
    return isInBounds;
  }, []);

  // Count listings within current map bounds
  useEffect(() => {
    if (currentMapBounds && listings.length > 0) {
      const visibleCount = listings.filter(listing => {
        const inBounds = isListingInBounds(listing, currentMapBounds);
        return inBounds;
      }).length;
      setVisibleListingsCount(visibleCount);
    } else if (listings.length > 0) {
      setVisibleListingsCount(listings.length);
    } else {
      setVisibleListingsCount(0);
    }
  }, [currentMapBounds, listings, isListingInBounds]);

  // Calculate center based on listings or use Algeria center
  useEffect(() => {
    if (filteredListings.length > 0) {
      const validListings = filteredListings.filter(listing =>
        listing.address?.coordinates || listing.displayCoordinates
      );

      if (validListings.length > 0) {
        // Keep Algeria center for consistency with homepage
        setMapCenter([28.0, 2.0]); // Center of Algeria
        setMapZoom(5.5); // Show all Algeria
      }
    } else {
      // Use Algeria center when no listings
      setMapCenter([28.0, 2.0]); // Center of Algeria
      setMapZoom(5.5); // Show all Algeria
    }
  }, [filteredListings]);


  if (!isOpen) return null;

  const modalContent = (
    <div className={`fixed inset-0 z-[9999] ${isFullscreen ? '' : 'p-4'}`}>
      {/* Enhanced Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Enhanced Modal Container */}
      <div
        ref={modalRef}
        className={`relative mx-auto bg-white shadow-2xl transition-all duration-300 ${
          isFullscreen
            ? 'w-full h-full rounded-none'
            : 'w-full max-w-7xl h-[90vh] rounded-3xl border border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Enhanced Header - FIXED WITH pointer-events-none */}
        <div className="relative z-10 bg-white/95 backdrop-blur-lg border-b border-gray-200 p-4 md:p-6 rounded-t-3xl pointer-events-none">
          <div className="flex items-center justify-between">
            {/* Title and Stats */}
            <div className="flex items-center space-x-4 pointer-events-auto">
              <div className="p-3 bg-gradient-to-br from-[#FF6B35] to-orange-600 rounded-2xl shadow-lg">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{modalTitle}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-bold text-[#FF6B35]">
                    {visibleListingsCount} {visibleListingsCount === 1 ? ((t as any)?.mapDetails?.property || 'Property') : ((t as any)?.mapDetails?.properties || 'Properties')}
                  </span>
                  {' '}{(t as any)?.mapDetails?.found || 'found'}
                  {currentMapBounds && visibleListingsCount !== listings.length && (
                    <span className="text-xs ml-2 text-gray-500">
                      ({listings.length} {(t as any)?.mapDetails?.total || 'total'})
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center space-x-2 pointer-events-auto">
              {/* Map Controls */}
              <div className="flex items-center space-x-2">
                {/* Fullscreen Toggle */}
                <button
                  onClick={toggleFullscreen}
                  className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors duration-200"
                  title={isFullscreen ? ((t as any)?.mapDetails?.exitFullscreen || "Exit Fullscreen") : ((t as any)?.mapDetails?.enterFullscreen || "Enter Fullscreen")}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4 text-gray-600" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-gray-600" />
                  )}
                </button>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="p-3 bg-gray-100 hover:bg-red-100 hover:text-red-600 rounded-xl transition-all duration-200"
                  title={(t as any)?.map?.closeMap || "Close Map"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>


        </div>

        {/* Enhanced Map Container */}
        <div className={`relative ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-[calc(90vh-140px)]'}`}>
          {/* Badge removed - count already shown above list */}

          {filteredListings.length > 0 ? (
            <LeafletMapView
              listings={filteredListings}
              center={mapCenter}
              zoom={mapZoom}
              selectedListing={selectedListing}
              onListingSelect={(id) => {
                onListingSelect?.(id);
                // Add haptic feedback on mobile
                if ('vibrate' in navigator) {
                  navigator.vibrate(50);
                }
              }}
              onListingHover={onListingHover}
              onMapBoundsChange={(bounds) => {
                setCurrentMapBounds(bounds); // Update local bounds for counting
                onMapBoundsChange?.(bounds); // Also notify parent
              }}
              currency={currency}
              className="w-full h-full rounded-b-3xl"
              interactive={true} // ALWAYS interactive in modal
              fitBounds={false} // Don't auto-fit to show Algeria
            />
          ) : (
            /* Enhanced Empty State */
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-b-3xl">
              <div className="text-center p-8">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[#FF6B35] to-orange-600 rounded-full flex items-center justify-center">
                  <MapPin className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {(t as any)?.mapDetails?.noPropertiesFound || 'No properties found'}
                </h3>
                <p className="text-gray-600 mb-6 max-w-md">
                  {(t as any)?.mapDetails?.noPropertiesDesc || 'There are no properties to display on the map with your current filters.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-[#FF6B35] hover:bg-orange-600 text-white rounded-xl font-medium transition-colors duration-200"
                  >
                    {(t as any)?.mapDetails?.backToList || 'Back to List'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>


        {/* Enhanced Loading Overlay */}
        {filteredListings.length === 0 && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-3xl pointer-events-none">
            <div className="text-center pointer-events-none">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#FF6B35] mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-900">{(t as any)?.mapDetails?.loadingMap || 'Loading map data...'}</h3>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Use portal to render modal at the body level
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}