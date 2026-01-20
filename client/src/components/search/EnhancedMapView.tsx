'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { GoogleMap, InfoWindow, Marker, OverlayView } from '@react-google-maps/api';
import { useGoogleMaps } from '@/contexts/GoogleMapsContext';
import { MapPin, Star, X, Navigation, Heart, Camera, Zap, Crown, Eye, Users } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { getListingImageUrl } from '@/utils/imageUtils';
import { useTranslation } from '@/hooks/useTranslation';

interface EnhancedMapViewProps {
  listings: any[];
  center?: [number, number];
  zoom?: number;
  selectedListing?: string | null;
  onListingSelect?: (id: string) => void;
  onListingHover?: (id: string | null) => void;
  onMapBoundsChange?: (bounds: google.maps.LatLngBounds | null) => void;
  onVisibleListingsChange?: (listings: any[]) => void;
  currency?: 'DZD' | 'EUR';
  className?: string;
  showCluster?: boolean;
  showHeatmap?: boolean;
  interactive?: boolean;
  fitBounds?: boolean;
  selectedCategory?: 'stay' | 'vehicle' | 'all';
}

// Enhanced map configuration for better performance and visuals
const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '12px',
  // ✅ FIX: Allow touch/pointer events for full interactivity
  touchAction: 'pan-x pan-y',
  pointerEvents: 'auto' as const
};

// Create dynamic map options based on interactivity
const getMapOptions = (interactive: boolean = true): google.maps.MapOptions => {
  const options: google.maps.MapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
    // CRITICAL: Set gestureHandling to 'greedy' to allow free panning without Ctrl
    gestureHandling: 'greedy',
    clickableIcons: false,
    // CRITICAL: Enable dragging - this is the key property
    draggable: true,
    scrollwheel: true,
    disableDoubleClickZoom: false,
    keyboardShortcuts: true,
    // Remove custom styles that might interfere
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      },
      {
        featureType: 'transit',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ]
  };
  return options;
};


// Haversine distance calculation fallback
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

// Enhanced marker clustering logic
interface MarkerCluster {
  id: string;
  position: google.maps.LatLng;
  listings: any[];
  size: 'small' | 'medium' | 'large';
}

// ✅ NEW: Group listings at exactly the same location (same coordinates)
const createSameLocationClusters = (listings: any[]): MarkerCluster[] => {
  const clusters: MarkerCluster[] = [];
  const locationMap = new Map<string, any[]>();

  // Group by exact coordinates (rounded to 6 decimals ~0.1m precision)
  listings.forEach(listing => {
    const lat = Math.round(listing.displayCoordinates[0] * 1000000) / 1000000;
    const lng = Math.round(listing.displayCoordinates[1] * 1000000) / 1000000;
    const key = `${lat},${lng}`;

    if (!locationMap.has(key)) {
      locationMap.set(key, []);
    }
    locationMap.get(key)!.push(listing);
  });

  // Create clusters for locations with multiple listings
  locationMap.forEach((groupedListings, key) => {
    if (groupedListings.length > 1) {
      const [lat, lng] = key.split(',').map(Number);
      clusters.push({
        id: `same-location-${key}`,
        position: new google.maps.LatLng(lat, lng),
        listings: groupedListings,
        size: groupedListings.length >= 10 ? 'large' : groupedListings.length >= 5 ? 'medium' : 'small'
      });
    }
  });

  return clusters;
};

const createClusters = (listings: any[], zoom: number): MarkerCluster[] => {
  // ✅ ALWAYS check for same-location clusters first
  const sameLocationClusters = createSameLocationClusters(listings);

  // ✅ Smart clustering based on zoom and listing count
  // Don't cluster at high zoom (>13) or with very few listings (<10)
  if (zoom > 13 || listings.length < 10) {
    return sameLocationClusters; // Return only same-location clusters
  }

  const clusters: MarkerCluster[] = [...sameLocationClusters];
  const processedListings = [...listings].filter(listing => {
    // Don't re-cluster listings already in same-location clusters
    return !sameLocationClusters.some(cluster =>
      cluster.listings.some(l => l._id === listing._id)
    );
  });

  while (processedListings.length > 0) {
    const currentListing = processedListings.shift()!;
    const cluster: MarkerCluster = {
      id: `cluster-${clusters.length}`,
      position: new google.maps.LatLng(
        currentListing.displayCoordinates[0], // lat
        currentListing.displayCoordinates[1]  // lng
      ),
      listings: [currentListing],
      size: 'small'
    };

    // Find nearby listings to cluster
    for (let i = processedListings.length - 1; i >= 0; i--) {
      const otherListing = processedListings[i];

      let distance: number;
      try {
        // Try using Google Maps geometry library first
        if (window.google?.maps?.geometry?.spherical) {
          distance = window.google.maps.geometry.spherical.computeDistanceBetween(
            cluster.position,
            new google.maps.LatLng(
              otherListing.displayCoordinates[0], // lat
              otherListing.displayCoordinates[1]  // lng
            )
          );
        } else {
          // Fallback to Haversine formula
          distance = calculateDistance(
            currentListing.displayCoordinates[0], // lat
            currentListing.displayCoordinates[1], // lng
            otherListing.displayCoordinates[0],   // lat
            otherListing.displayCoordinates[1]    // lng
          );
        }
      } catch (error) {
        // Use fallback calculation if Google Maps geometry fails
        distance = calculateDistance(
          currentListing.displayCoordinates[0], // lat
          currentListing.displayCoordinates[1], // lng
          otherListing.displayCoordinates[0],   // lat
          otherListing.displayCoordinates[1]    // lng
        );
      }

      // ✅ Dynamic clustering distance based on zoom level
      // Lower zoom = larger distance threshold for clustering
      const clusterDistance = zoom < 8 ? 5000 : zoom < 10 ? 2000 : 1000; // 5km, 2km, or 1km

      if (distance < clusterDistance) {
        cluster.listings.push(otherListing);
        processedListings.splice(i, 1);
      }
    }

    // Determine cluster size
    if (cluster.listings.length >= 10) {
      cluster.size = 'large';
    } else if (cluster.listings.length >= 5) {
      cluster.size = 'medium';
    }

    clusters.push(cluster);
  }

  return clusters.filter(cluster => cluster.listings.length > 1);
};

// ✅ Performance optimization: Limit markers rendered
const MAX_INDIVIDUAL_MARKERS = 200; // Don't render more than 200 individual markers

export default function EnhancedMapView({
  listings,
  center = [36.7538, 3.0588],
  zoom = 10,
  selectedListing,
  onListingSelect,
  onListingHover,
  onMapBoundsChange,
  onVisibleListingsChange,
  currency = 'DZD',
  className = '',
  showCluster = false, // Clustering now controlled by parent based on listing count
  showHeatmap = false,
  interactive = true,
  fitBounds = true,
  selectedCategory = 'all'
}: EnhancedMapViewProps) {
  const t = useTranslation('search');
  const { isLoaded, loadError } = useGoogleMaps();
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [hoverTimeoutId, setHoverTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds | null>(null);
  const [clusters, setClusters] = useState<MarkerCluster[]>([]);
  const [heatmapData, setHeatmapData] = useState<google.maps.visualization.WeightedLocation[]>([]);
  // ✅ Track if user has moved the map (to enable bounds filtering)
  const [hasUserMovedMap, setHasUserMovedMap] = useState(false);

  const mapRef = useRef<google.maps.Map | null>(null);
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const boundsDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutId) {
        clearTimeout(hoverTimeoutId);
      }
      if (boundsDebounceRef.current) {
        clearTimeout(boundsDebounceRef.current);
      }
    };
  }, [hoverTimeoutId]);

  // Process listings with enhanced coordinate handling
  const processedListings = useMemo(() => {
    console.log('🗺️ EnhancedMapView - Processing', listings.length, 'listings');

    const filtered = listings.filter(listing => {
      // Prioritize address.coordinates (Google Maps [lat, lng] format)
      // Fall back to location.coordinates if needed
      const coords = listing.address?.coordinates || listing.displayCoordinates || listing.location?.coordinates;
      const hasCoords = coords &&
                       Array.isArray(coords) &&
                       coords.length === 2 &&
                       !isNaN(coords[0]) &&
                       !isNaN(coords[1]);

      if (!hasCoords) {
        console.warn('❌ Listing without valid coordinates:', listing._id || listing.id);
        return false;
      }

      // Filter by category if specified
      if (selectedCategory !== 'all' && listing.category !== selectedCategory) {
        return false;
      }

      // ✅ IMPORTANT: Only filter by bounds if user has moved the map AND callback is provided
      // On initial load, show ALL markers, then filter when user interacts with map
      if (mapBounds && onVisibleListingsChange && hasUserMovedMap) {
        // coords should be in Google Maps [lat, lng] format
        const lat = coords[0];
        const lng = coords[1];
        const isInBounds = mapBounds.contains({ lat, lng });
        return isInBounds;
      }

      return true;
    }).map(listing => {
      // Prioritize address.coordinates (Google Maps format)
      const coords = listing.address?.coordinates || listing.displayCoordinates || listing.location?.coordinates;
      // Coordinates should already be in Google Maps [lat, lng] format
      const displayCoords = coords ? [coords[0], coords[1]] : null;

      return {
        ...listing,
        displayCoordinates: displayCoords
      };
    });

    // ✅ Performance: Limit individual markers to prevent slowness
    // If we have too many listings and clustering is disabled, only show the first N
    if (!showCluster && filtered.length > MAX_INDIVIDUAL_MARKERS) {
      console.warn(`⚠️ Too many markers (${filtered.length}). Limiting to ${MAX_INDIVIDUAL_MARKERS} for performance. Enable clustering for better results.`);
      return filtered.slice(0, MAX_INDIVIDUAL_MARKERS);
    }

    console.log('✅ Processed listings for map:', filtered.length, '(hasUserMovedMap:', hasUserMovedMap, ')');
    if (filtered.length > 0) {
      console.log('📍 Sample marker position:', filtered[0].displayCoordinates);
    }

    return filtered;
  }, [listings, selectedCategory, mapBounds, showCluster, onVisibleListingsChange, hasUserMovedMap]);

  // ✅ Notify parent when visible listings change (for syncing list with map)
  useEffect(() => {
    if (onVisibleListingsChange) {
      onVisibleListingsChange(processedListings);
    }
  }, [processedListings, onVisibleListingsChange]);

  // Convert center coordinates to Google Maps format
  const mapCenter = useMemo(() => ({
    lat: center[0],
    lng: center[1]
  }), [center]);

  // ✅ Add small offset to markers at same location for visual separation
  const getMarkerOffset = useCallback((listing: any, allListings: any[]) => {
    // Find all listings at approximately the same location (within 10 meters)
    const sameLocationListings = allListings.filter(l => {
      const distance = calculateDistance(
        listing.displayCoordinates[0],
        listing.displayCoordinates[1],
        l.displayCoordinates[0],
        l.displayCoordinates[1]
      );
      return distance < 10; // Same location if within 10 meters
    });

    if (sameLocationListings.length <= 1) {
      return { lat: 0, lng: 0 }; // No offset needed
    }

    // Find index of current listing in same-location group
    const index = sameLocationListings.findIndex(l => l._id === listing._id);
    const total = sameLocationListings.length;

    // Create fan/arc pattern offset (in degrees, very small)
    // Offset about 0.0001 degrees (~11 meters) in a circular pattern
    const angleStep = (Math.PI * 2) / total;
    const angle = index * angleStep;
    const offsetDistance = 0.0001; // ~11 meters

    return {
      lat: Math.sin(angle) * offsetDistance,
      lng: Math.cos(angle) * offsetDistance
    };
  }, []);

  // Update clusters when zoom or listings change
  useEffect(() => {
    if (showCluster && processedListings.length > 0) {
      const newClusters = createClusters(processedListings, currentZoom);
      setClusters(newClusters);
    } else {
      setClusters([]);
    }
  }, [processedListings, currentZoom, showCluster]);

  // Update heatmap data
  useEffect(() => {
    if (showHeatmap && processedListings.length > 0) {
      const heatmapPoints = processedListings.map(listing => ({
        location: new google.maps.LatLng(
          listing.displayCoordinates[0], // Already in [lat, lng] format
          listing.displayCoordinates[1]
        ),
        weight: listing.stats?.views || 1
      }));
      setHeatmapData(heatmapPoints);
    }
  }, [processedListings, showHeatmap]);

  // Handle map load
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapInstance(map);

    // CRITICAL: Force enable dragging after map loads
    map.setOptions({
      draggable: true,
      gestureHandling: 'greedy',
      scrollwheel: true,
      disableDoubleClickZoom: false
    });

    // Add zoom change listener
    map.addListener('zoom_changed', () => {
      setCurrentZoom(map.getZoom() || 10);
    });

    // ✅ FIX: Use idle event instead of bounds_changed to prevent infinite loop
    // idle fires after map stops moving/zooming
    map.addListener('idle', () => {
      const bounds = map.getBounds() || null;
      setMapBounds(bounds);
      onMapBoundsChange?.(bounds);

      // ✅ After first idle (initial map load), enable bounds filtering for future movements
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        // Wait a bit before enabling bounds filtering to ensure all markers are visible
        setTimeout(() => {
          setHasUserMovedMap(true);
          console.log('✅ Map initialized - bounds filtering enabled');
        }, 1000);
      }
    });

    // Also fire once on initial load after a short delay
    setTimeout(() => {
      const bounds = map.getBounds() || null;
      if (bounds) {
        setMapBounds(bounds);
        onMapBoundsChange?.(bounds);
      }
    }, 100);
  }, [onMapBoundsChange]);

  // Fit map to show all listings
  const fitMapToListings = useCallback(() => {
    if (!mapInstance || processedListings.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    processedListings.forEach(listing => {
      if (listing.displayCoordinates) {
        bounds.extend({
          lat: listing.displayCoordinates[0], // Already in [lat, lng] format
          lng: listing.displayCoordinates[1]
        });
      }
    });

    mapInstance.fitBounds(bounds);

    const listener = google.maps.event.addListener(mapInstance, 'bounds_changed', () => {
      if (mapInstance && mapInstance.getZoom()! > 15) {
        mapInstance.setZoom(15);
      }
      google.maps.event.removeListener(listener);
    });
  }, [mapInstance, processedListings]);

  // Auto-fit bounds when listings change
  useEffect(() => {
    if (fitBounds && processedListings.length > 1) {
      const timer = setTimeout(fitMapToListings, 100);
      return () => clearTimeout(timer);
    }
  }, [processedListings, fitBounds, fitMapToListings]);

  // Handle marker interactions
  const handleMarkerClick = useCallback((listingId: string) => {
    setSelectedMarkerId(selectedMarkerId === listingId ? null : listingId);
    onListingSelect?.(listingId);
  }, [selectedMarkerId, onListingSelect]);

  const handleMarkerMouseOver = useCallback((listingId: string) => {
    if (interactive) {
      // Clear any existing timeout
      if (hoverTimeoutId) {
        clearTimeout(hoverTimeoutId);
        setHoverTimeoutId(null);
      }

      // Show hover preview immediately if no other marker is hovered
      if (!hoveredMarkerId) {
        setHoveredMarkerId(listingId);
        onListingHover?.(listingId);
      } else {
        // Add slight delay when switching between markers
        const timeout = setTimeout(() => {
          setHoveredMarkerId(listingId);
          onListingHover?.(listingId);
          setHoverTimeoutId(null);
        }, 100);
        setHoverTimeoutId(timeout);
      }
    }
  }, [onListingHover, interactive, hoverTimeoutId, hoveredMarkerId]);

  const handleMarkerMouseOut = useCallback(() => {
    if (interactive) {
      // Clear any existing timeout
      if (hoverTimeoutId) {
        clearTimeout(hoverTimeoutId);
        setHoverTimeoutId(null);
      }

      // Add a slight delay before hiding to allow moving to the preview card
      const timeout = setTimeout(() => {
        setHoveredMarkerId(null);
        onListingHover?.(null);
        setHoverTimeoutId(null);
      }, 150);
      setHoverTimeoutId(timeout);
    }
  }, [onListingHover, interactive, hoverTimeoutId]);

  // Handle hover preview mouse events to keep it open
  const handlePreviewMouseEnter = useCallback(() => {
    if (hoverTimeoutId) {
      clearTimeout(hoverTimeoutId);
      setHoverTimeoutId(null);
    }
  }, [hoverTimeoutId]);

  const handlePreviewMouseLeave = useCallback(() => {
    const timeout = setTimeout(() => {
      setHoveredMarkerId(null);
      onListingHover?.(null);
      setHoverTimeoutId(null);
    }, 100);
    setHoverTimeoutId(timeout);
  }, [onListingHover]);

  // Handle cluster click
  const handleClusterClick = useCallback((cluster: MarkerCluster) => {
    if (mapInstance) {
      const bounds = new google.maps.LatLngBounds();
      cluster.listings.forEach(listing => {
        bounds.extend({
          lat: listing.displayCoordinates[0], // lat
          lng: listing.displayCoordinates[1]  // lng
        });
      });
      mapInstance.fitBounds(bounds);
    }
  }, [mapInstance]);

  // Format price for display
  const formatPrice = useCallback((listing: any) => {
    const price = listing.pricing?.basePrice || listing.price || 0;
    if (currency === 'DZD') {
      if (price >= 10000) {
        return `${Math.round(price/1000)}K دج`;
      } else if (price >= 1000) {
        return `${(price/1000).toFixed(1)}K دج`;
      }
      return `${price} دج`;
    }
    return `€${price}`;
  }, [currency]);

  // ✅ TripAdvisor-style: Simple circle marker for zoomed out view (zoom < 11)
  const createSimpleCircleIcon = useCallback((listing: any, isSelected: boolean, isHovered: boolean) => {
    const baseColor = '#FF6B35'; // Use current orange color
    const size = isSelected || isHovered ? 16 : 12; // Slightly larger when selected/hovered
    const strokeWidth = isSelected || isHovered ? 3 : 2;

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="${size + 8}" height="${size + 8}" viewBox="0 0 ${size + 8} ${size + 8}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="circleShadow-${listing._id}" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
            </filter>
          </defs>

          <!-- Simple colored circle with smooth transition -->
          <circle
            cx="${(size + 8) / 2}"
            cy="${(size + 8) / 2}"
            r="${size / 2}"
            fill="${baseColor}"
            stroke="white"
            stroke-width="${strokeWidth}"
            filter="url(#circleShadow-${listing._id})"
            style="transition: all 200ms ease-in-out;"
          />

          <!-- Pulse animation for selected/hovered state -->
          ${isSelected || isHovered ? `
            <circle
              cx="${(size + 8) / 2}"
              cy="${(size + 8) / 2}"
              r="${size}"
              fill="none"
              stroke="${baseColor}"
              stroke-width="2"
              stroke-opacity="0.4"
              style="transition: all 200ms ease-in-out;">
              <animate attributeName="r" values="${size};${size + 4};${size}" dur="1.5s" repeatCount="indefinite"/>
              <animate attributeName="stroke-opacity" values="0.4;0.1;0.4" dur="1.5s" repeatCount="indefinite"/>
            </circle>
          ` : ''}
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(size + 8, size + 8),
      anchor: new google.maps.Point((size + 8) / 2, (size + 8) / 2),
      origin: new google.maps.Point(0, 0)
    };
  }, []);

  // ✅ Airbnb-style: Rectangle marker with price for zoomed in view (zoom >= 11)
  const createPriceRectangleIcon = useCallback((listing: any, isSelected: boolean, isHovered: boolean) => {
    const price = formatPrice(listing);
    const baseColor = '#FF6B35'; // Use current orange color

    // Dynamic sizing based on price length
    const padding = 12;
    const fontSize = 13;
    const textWidth = price.length * 7; // Approximate text width
    const width = Math.max(textWidth + padding * 2, 60);
    const height = 32;
    const borderWidth = isSelected || isHovered ? 3 : 2;

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="${width + 10}" height="${height + 10}" viewBox="0 0 ${width + 10} ${height + 10}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="rectShadow-${listing._id}" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.3"/>
            </filter>
          </defs>

          <!-- Rounded rectangle with smooth transition -->
          <rect
            x="5"
            y="5"
            width="${width}"
            height="${height}"
            rx="8"
            ry="8"
            fill="${isSelected || isHovered ? baseColor : 'white'}"
            stroke="${isSelected || isHovered ? 'white' : baseColor}"
            stroke-width="${borderWidth}"
            filter="url(#rectShadow-${listing._id})"
            style="transition: all 200ms ease-in-out;"
          />

          <!-- Price text -->
          <text
            x="${(width + 10) / 2}"
            y="${(height + 10) / 2 + 5}"
            text-anchor="middle"
            fill="${isSelected || isHovered ? 'white' : baseColor}"
            font-family="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
            font-size="${fontSize}"
            font-weight="700"
            style="transition: all 200ms ease-in-out;">
            ${price}
          </text>

          <!-- Pulse animation for selected/hovered state -->
          ${isSelected || isHovered ? `
            <rect
              x="3"
              y="3"
              width="${width + 4}"
              height="${height + 4}"
              rx="10"
              ry="10"
              fill="none"
              stroke="${baseColor}"
              stroke-width="2"
              stroke-opacity="0.3"
              style="transition: all 200ms ease-in-out;">
              <animate attributeName="stroke-opacity" values="0.3;0.1;0.3" dur="1.5s" repeatCount="indefinite"/>
            </rect>
          ` : ''}
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(width + 10, height + 10),
      anchor: new google.maps.Point((width + 10) / 2, (height + 10) / 2),
      origin: new google.maps.Point(0, 0)
    };
  }, [formatPrice]);

  // ✅ Airbnb-style: Always show price rectangles (except at very low zoom)
  const createMarkerIcon = useCallback((listing: any, isSelected: boolean, isHovered: boolean, zoom: number) => {
    // Only use simple circles at very low zoom (< 7) for performance
    // Otherwise always show price rectangles (Airbnb-style)
    if (zoom < 7) {
      return createSimpleCircleIcon(listing, isSelected, isHovered);
    } else {
      return createPriceRectangleIcon(listing, isSelected, isHovered);
    }
  }, [createSimpleCircleIcon, createPriceRectangleIcon]);

  // Create cluster marker icon
  const createClusterIcon = useCallback((cluster: MarkerCluster) => {
    const count = cluster.listings.length;
    const size = cluster.size === 'large' ? 60 : cluster.size === 'medium' ? 50 : 40;
    const fontSize = cluster.size === 'large' ? '16' : cluster.size === 'medium' ? '14' : '12';

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="clusterShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.3"/>
            </filter>
            <radialGradient id="clusterGradient" cx="50%" cy="30%" r="70%">
              <stop offset="0%" style="stop-color:#FF6B35;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#E55A2B;stop-opacity:1" />
            </radialGradient>
          </defs>

          <circle cx="${size/2}" cy="${size/2}" r="${size/2-2}"
                  fill="url(#clusterGradient)"
                  stroke="white"
                  stroke-width="3"
                  filter="url(#clusterShadow)"/>

          <text x="${size/2}" y="${size/2+4}" text-anchor="middle"
                fill="white"
                font-family="system-ui, -apple-system, sans-serif"
                font-size="${fontSize}"
                font-weight="bold">
            ${count}
          </text>
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(size, size),
      anchor: new google.maps.Point(size/2, size/2)
    };
  }, []);

  // Update heatmap layer
  useEffect(() => {
    if (!mapInstance || !showHeatmap) return;

    // Remove existing heatmap
    if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
    }

    // Create new heatmap if we have data
    if (heatmapData.length > 0) {
      heatmapRef.current = new google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: mapInstance,
        radius: 50,
        opacity: 0.6
      });
    }

    return () => {
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
      }
    };
  }, [mapInstance, showHeatmap, heatmapData]);

  // Error state
  if (loadError) {
    return (
      <div className={`relative w-full h-full bg-red-50 rounded-xl overflow-hidden flex items-center justify-center ${className}`}>
        <div className="text-center p-6">
          <MapPin className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-900 mb-2">{(t as any)?.mapDetails?.failedToLoad || 'Failed to Load Map'}</h3>
          <p className="text-red-700 mb-4">{(t as any)?.mapDetails?.unableToConnect || 'Unable to connect to Google Maps'}</p>
          <p className="text-sm text-red-600">{(t as any)?.mapDetails?.checkConnection || 'Please check your internet connection and try again'}</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (!isLoaded) {
    return (
      <div className={`relative w-full h-full bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#FF6B35] mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{(t as any)?.mapDetails?.loadingEnhanced || 'Loading Enhanced Map'}</h3>
          <p className="text-gray-600">{(t as any)?.mapDetails?.initializingData || 'Initializing map data and location services...'}</p>
        </div>
      </div>
    );
  }

  const hoveredListing = hoveredMarkerId ? processedListings.find(l => l._id === hoveredMarkerId) : null;

  return (
    <div className={`relative w-full h-full bg-gray-100 rounded-xl overflow-hidden ${className}`}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={zoom}
        options={getMapOptions(true)}
        onLoad={onMapLoad}
        onDragStart={() => console.log('🗺️ Map drag started')}
        onDrag={() => console.log('🗺️ Map dragging...')}
        onDragEnd={() => console.log('🗺️ Map drag ended')}
      >
        {/* Render clusters */}
        {clusters.map((cluster) => (
          <Marker
            key={cluster.id}
            position={{
              lat: cluster.position.lat(),
              lng: cluster.position.lng()
            }}
            icon={createClusterIcon(cluster)}
            onClick={() => handleClusterClick(cluster)}
            zIndex={1000}
          />
        ))}

        {/* Render individual markers (not clustered) */}
        {processedListings
          .filter(listing => !clusters.some(cluster =>
            cluster.listings.some(clusteredListing => clusteredListing._id === listing._id)
          ))
          .map((listing) => {
            const isSelected = selectedMarkerId === listing._id;
            const isHovered = hoveredMarkerId === listing._id;

            // ✅ Apply small offset for listings at same location
            const offset = getMarkerOffset(listing, processedListings);
            const markerPosition = {
              lat: listing.displayCoordinates[0] + offset.lat,
              lng: listing.displayCoordinates[1] + offset.lng
            };

            return (
              <Marker
                key={listing._id}
                position={markerPosition}
                icon={createMarkerIcon(listing, isSelected, isHovered, currentZoom)}
                onClick={() => handleMarkerClick(listing._id)}
                onMouseOver={() => handleMarkerMouseOver(listing._id)}
                onMouseOut={handleMarkerMouseOut}
                zIndex={isSelected ? 2000 : isHovered ? 1500 : 100}
                title={listing.title}
              />
            );
          })}

        {/* Enhanced InfoWindow for selected marker */}
        {selectedMarkerId && processedListings.find(l => l._id === selectedMarkerId) && (
          <InfoWindow
            position={{
              lat: processedListings.find(l => l._id === selectedMarkerId)!.displayCoordinates[0], // lat
              lng: processedListings.find(l => l._id === selectedMarkerId)!.displayCoordinates[1]  // lng
            }}
            onCloseClick={() => setSelectedMarkerId(null)}
            options={{
              pixelOffset: new google.maps.Size(0, -70),
              disableAutoPan: false,
              maxWidth: 400,
              zIndex: 3000
            }}
          >
            {(() => {
              const listing = processedListings.find(l => l._id === selectedMarkerId)!;
              return (
                <div className="w-[360px] max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden transform">
                  <Link
                    href={`/listing/${listing._id}`}
                    className="block hover:bg-gray-50/30 transition-all duration-300 rounded-3xl overflow-hidden group"
                  >
                    {/* Enhanced Image Section */}
                    <div className="relative mb-4 overflow-hidden rounded-t-3xl">
                      <div className="aspect-video w-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                        <Image
                          src={getListingImageUrl(listing, 0)}
                          alt={listing.title}
                          width={360}
                          height={202}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.jpg';
                          }}
                        />
                      </div>

                      {/* Enhanced overlay with premium gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10 group-hover:from-black/40 transition-all duration-300" />

                      {/* Premium Badges with animations */}
                      <div className="absolute top-3 left-3 flex flex-col space-y-2">
                        {listing.featured && (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg animate-pulse">
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            {(t as any)?.listing?.featured || 'Featured'}
                          </span>
                        )}
                        {listing.host?.hostInfo?.superhost && (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg">
                            <Crown className="w-3 h-3 mr-1" />
                            {(t as any)?.listing?.superhost || 'Superhost'}
                          </span>
                        )}
                        {listing.availability?.instantBook && (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg">
                            <Zap className="w-3 h-3 mr-1" />
                            {(t as any)?.listing?.instantBook || 'Instant Book'}
                          </span>
                        )}
                      </div>

                      {/* Enhanced Category Badge */}
                      <div className="absolute top-3 right-3">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg backdrop-blur-sm ${
                          listing.category === 'vehicle'
                            ? 'bg-blue-600/90'
                            : 'bg-green-600/90'
                        }`}>
                          {listing.category === 'vehicle' ? `🚗 ${(t as any)?.mapDetails?.vehicle || 'Vehicle'}` : `🏠 ${(t as any)?.mapDetails?.stay || 'Stay'}`}
                        </span>
                      </div>

                      {/* Enhanced Action Buttons */}
                      <div className="absolute bottom-3 right-3 flex space-x-2">
                        <button
                          className="p-2.5 bg-white/95 hover:bg-white rounded-full shadow-lg transition-all duration-200 hover:scale-110 backdrop-blur-sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <Camera className="w-4 h-4 text-gray-700" />
                        </button>
                        <button
                          className="p-2.5 bg-white/95 hover:bg-white rounded-full shadow-lg transition-all duration-200 hover:scale-110 backdrop-blur-sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <Heart className="w-4 h-4 text-gray-700 hover:text-red-500 transition-colors" />
                        </button>
                      </div>
                    </div>

                    {/* Enhanced Content Section */}
                    <div className="space-y-4 p-4">
                      {/* Title and Location with enhanced styling */}
                      <div>
                        <h4 className="font-bold text-gray-900 text-xl line-clamp-2 leading-tight mb-2 group-hover:text-[#FF6B35] transition-colors">
                          {listing.title}
                        </h4>
                        <p className="text-gray-600 text-sm flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                          {listing.address?.city || (t as any)?.mapDetails?.unknownCity || 'Unknown City'}, {listing.address?.state || (t as any)?.mapDetails?.algeria || 'Algeria'}
                        </p>
                      </div>

                      {/* Enhanced Stats Section */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <div className="flex items-center space-x-1 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-200">
                            <Star className="w-4 h-4 fill-current text-yellow-500" />
                            <span className="text-sm font-bold text-gray-900">
                              {listing.stats?.averageRating?.toFixed(1) || '4.8'}
                            </span>
                            {(listing.stats?.reviewCount > 0 || listing.stats?.totalReviews > 0) && (
                              <span className="text-xs text-gray-600">
                                ({listing.stats.reviewCount || listing.stats.totalReviews})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Eye className="w-3 h-3 mr-1" />
                            {listing.stats?.views || 0}
                          </span>
                          <span className="flex items-center">
                            <Heart className="w-3 h-3 mr-1" />
                            {listing.stats?.favorites || 0}
                          </span>
                        </div>
                      </div>

                      {/* Enhanced Property/Vehicle Details */}
                      {listing.category === 'stay' && listing.stayDetails && (
                        <div className="bg-gray-50 p-3 rounded-xl">
                          <div className="flex items-center space-x-4 text-sm text-gray-700">
                            {listing.stayDetails.bedrooms && (
                              <span className="flex items-center font-medium">
                                🛏️ {listing.stayDetails.bedrooms} {listing.stayDetails.bedrooms !== 1 ? (t as any)?.listing?.beds || 'Beds' : (t as any)?.listing?.bed || 'Bed'}
                              </span>
                            )}
                            {listing.stayDetails.bathrooms && (
                              <span className="flex items-center font-medium">
                                🚿 {listing.stayDetails.bathrooms} {listing.stayDetails.bathrooms !== 1 ? (t as any)?.listing?.baths || 'Baths' : (t as any)?.listing?.bath || 'Bath'}
                              </span>
                            )}
                            {listing.stayDetails.area && (
                              <span className="flex items-center font-medium">
                                📐 {listing.stayDetails.area}m²
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {listing.category === 'vehicle' && listing.vehicleDetails && (
                        <div className="bg-gray-50 p-3 rounded-xl">
                          <div className="flex items-center space-x-4 text-sm text-gray-700">
                            <span className="flex items-center font-medium">
                              🚗 {listing.vehicleDetails.year} {listing.vehicleDetails.make}
                            </span>
                            <span className="flex items-center font-medium">
                              ⚙️ {listing.vehicleDetails.transmission}
                            </span>
                            {listing.vehicleDetails.seats && (
                              <span className="flex items-center font-medium">
                                <Users className="w-3 h-3 mr-1" />
                                {listing.vehicleDetails.seats}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Enhanced Price Section */}
                      <div className="border-t border-gray-100 pt-4 mt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-baseline space-x-1">
                            <span className="text-2xl font-bold text-gray-900">
                              {formatPrice(listing)}
                            </span>
                            <span className="text-gray-600 text-sm font-medium">
                              {
                                listing.pricing?.pricingType === 'per_day' ? '/jour' :
                                listing.pricing?.pricingType === 'per_night' ? '/nuit' :
                                listing.pricing?.pricingType === 'per_hour' ? '/heure' :
                                listing.pricing?.pricingType === 'per_week' ? '/semaine' :
                                listing.pricing?.pricingType === 'per_month' ? '/mois' :
                                (listing.category === 'vehicle' ? '/jour' : '/nuit')
                              }
                            </span>
                          </div>

                          <button
                            className="bg-gradient-to-r from-[#FF6B35] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                            onClick={(e) => {
                              e.preventDefault();
                              window.open(`/listing/${listing._id}`, '_blank');
                            }}
                          >
                            {(t as any)?.listing?.viewDetails || 'View Details'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })()}
          </InfoWindow>
        )}
      </GoogleMap>

      {/* ✅ FIX: Airbnb-style Hover Preview Card - Positioned above marker with arrow */}
      {hoveredListing && hoveredMarkerId !== selectedMarkerId && (
        <OverlayView
          position={{
            lat: hoveredListing.displayCoordinates[0],
            lng: hoveredListing.displayCoordinates[1]
          }}
          mapPaneName={OverlayView.FLOAT_PANE}
          getPixelPositionOffset={(width, height) => ({
            x: -(width / 2),
            y: -(height + 60) // Position above the marker
          })}
        >
          <div
            className="relative z-[2500]"
            onMouseEnter={handlePreviewMouseEnter}
            onMouseLeave={handlePreviewMouseLeave}
          >
            {/* Card container with shadow and arrow */}
            <div className="relative">
              {/* Main card */}
              <div className="w-[280px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transform hover:scale-[1.02] transition-all duration-200 backdrop-blur-sm">
                <Link
                  href={`/listing/${hoveredListing._id}`}
                  className="block group"
                >
                  {/* Compact Image Section */}
                  <div className="relative overflow-hidden">
                    <div className="aspect-video w-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                      <Image
                        src={getListingImageUrl(hoveredListing, 0)}
                        alt={hoveredListing.title}
                        width={280}
                        height={157}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.jpg';
                        }}
                      />
                    </div>

                    {/* Compact overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

                    {/* Compact badges */}
                    <div className="absolute top-2 left-2 flex space-x-1">
                      {hoveredListing.featured && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-md">
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          {(t as any)?.listing?.featured || 'Featured'}
                        </span>
                      )}
                    </div>

                    {/* Category badge */}
                    <div className="absolute top-2 right-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold text-white shadow-md ${
                        hoveredListing.category === 'vehicle' ? 'bg-blue-600/90' : 'bg-green-600/90'
                      }`}>
                        {hoveredListing.category === 'vehicle' ? '🚗' : '🏠'}
                      </span>
                    </div>

                    {/* Price overlay */}
                    <div className="absolute bottom-2 left-2">
                      <div className="bg-white/95 backdrop-blur-sm px-2.5 py-1.5 rounded-lg shadow-lg">
                        <span className="text-base font-bold text-gray-900">
                          {formatPrice(hoveredListing)}
                        </span>
                        <span className="text-xs text-gray-600 ml-1">
                          {
                            hoveredListing.pricing?.pricingType === 'per_day' ? '/jour' :
                            hoveredListing.pricing?.pricingType === 'per_night' ? '/nuit' :
                            hoveredListing.pricing?.pricingType === 'per_hour' ? '/heure' :
                            hoveredListing.pricing?.pricingType === 'per_week' ? '/semaine' :
                            hoveredListing.pricing?.pricingType === 'per_month' ? '/mois' :
                            (hoveredListing.category === 'vehicle' ? '/jour' : '/nuit')
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Compact Content */}
                  <div className="p-3 space-y-2">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-[#FF6B35] transition-colors">
                        {hoveredListing.title}
                      </h4>
                      <p className="text-gray-600 text-xs flex items-center line-clamp-1 mt-1">
                        <MapPin className="w-3 h-3 mr-1 text-gray-400 flex-shrink-0" />
                        {hoveredListing.address?.city || (t as any)?.mapDetails?.unknownCity || 'Unknown City'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded-full border border-yellow-200">
                          <Star className="w-3 h-3 fill-current text-yellow-500" />
                          <span className="text-xs font-bold text-gray-900">
                            {hoveredListing.stats?.averageRating?.toFixed(1) || '4.8'}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {hoveredListing.stats?.views || 0}
                      </div>
                    </div>
                  </div>
                </Link>
              </div>

              {/* ✅ Arrow pointing down to marker (Airbnb-style) */}
              <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-2">
                <div className="w-4 h-4 bg-white border-b border-r border-gray-200 transform rotate-45 shadow-lg"></div>
              </div>
            </div>
          </div>
        </OverlayView>
      )}

      {/* Enhanced Controls and Info Panels */}
      {/* Listings Count Overlay */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 p-4 min-w-[240px] pointer-events-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-gradient-to-br from-[#FF6B35] to-orange-600 rounded-xl shadow-lg">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">
                  {processedListings.length}
                  {!showCluster && listings.length > MAX_INDIVIDUAL_MARKERS && (
                    <span className="text-sm text-gray-500 ml-1">/ {listings.length}</span>
                  )}
                </div>
                <div className="text-xs text-gray-600 font-medium">
                  {processedListings.length === 1 ? (t as any)?.mapDetails?.property || 'Property' : (t as any)?.mapDetails?.properties || 'Properties'} {(t as any)?.mapDetails?.found || 'found'}
                  {!showCluster && listings.length > MAX_INDIVIDUAL_MARKERS && (
                    <div className="text-xs text-orange-600 font-bold mt-1">
                      Zoom in to see all
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-1">
              {processedListings.filter(l => l.category === 'stay').length > 0 && (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-bold">
                  🏠 {processedListings.filter(l => l.category === 'stay').length}
                </span>
              )}
              {processedListings.filter(l => l.category === 'vehicle').length > 0 && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold">
                  🚗 {processedListings.filter(l => l.category === 'vehicle').length}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Map Controls */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col space-y-3 pointer-events-none">
        {processedListings.length > 1 && (
          <button
            onClick={fitMapToListings}
            className="flex items-center space-x-3 bg-white/95 backdrop-blur-lg hover:bg-white p-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-gray-200 group pointer-events-auto"
          >
            <div className="p-2 bg-gradient-to-br from-[#FF6B35] to-orange-600 rounded-xl group-hover:from-orange-600 group-hover:to-orange-700 transition-all duration-200">
              <Navigation className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900 group-hover:text-[#FF6B35] transition-colors">
              {(t as any)?.mapDetails?.fitAllProperties || 'Fit All Properties'}
            </span>
          </button>
        )}
      </div>

      {/* Enhanced Price Range Indicator */}
      {processedListings.length > 0 && (
        <div className="absolute top-4 right-4 z-10 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 p-4 pointer-events-auto">
            <div className="text-xs text-gray-600 font-medium mb-2">{(t as any)?.mapDetails?.priceRange || 'Price Range'}</div>
            <div className="flex items-center space-x-2 text-sm font-bold text-gray-900">
              <span>{formatPrice({pricing: {basePrice: Math.min(...processedListings.map(l => l.pricing?.basePrice || 0))}})}</span>
              <span className="text-gray-400">-</span>
              <span>{formatPrice({pricing: {basePrice: Math.max(...processedListings.map(l => l.pricing?.basePrice || 0))}})}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {currency === 'DZD' ? (t as any)?.mapDetails?.algerianDinar || 'Algerian Dinar' : (t as any)?.mapDetails?.euro || 'Euro'} • {processedListings.length} {(t as any)?.mapDetails?.results || 'results'}
            </div>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 p-3 pointer-events-auto">
          <div className="text-xs font-bold text-gray-900 mb-2">{(t as any)?.mapDetails?.legend || 'Legend'}</div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-3 h-3 bg-gradient-to-r from-[#FF6B35] to-orange-600 rounded-full"></div>
              <span className="text-gray-700">{(t as any)?.mapDetails?.selectedHovered || 'Selected/Hovered'}</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full"></div>
              <span className="text-gray-700">{(t as any)?.listing?.featured || 'Featured'}</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-3 h-3 bg-gradient-to-r from-gray-700 to-gray-800 rounded-full"></div>
              <span className="text-gray-700">{(t as any)?.mapDetails?.regular || 'Regular'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
