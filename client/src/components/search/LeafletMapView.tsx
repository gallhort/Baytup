'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Star, Navigation, Eye, Heart, Camera, Zap, Crown, Users, Layers } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { getListingImageUrl } from '@/utils/imageUtils';
import { useTranslation } from '@/hooks/useTranslation';

// Fix pour les icônes Leaflet avec Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LeafletMapViewProps {
  listings: any[];
  center?: [number, number];
  zoom?: number;
  selectedListing?: string | null;
  hoveredListing?: string | null;
  onListingSelect?: (id: string) => void;
  onListingHover?: (id: string | null) => void;
  onMapBoundsChange?: (bounds: any) => void;
  onVisibleListingsChange?: (listings: any[]) => void;
  currency?: 'DZD' | 'EUR';
  className?: string;
  interactive?: boolean;
  fitBounds?: boolean;
  selectedCategory?: 'stay' | 'vehicle' | 'all';
}

// Styles de carte disponibles
const MAP_STYLES = {
  voyager: {
    name: 'Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  positron: {
    name: 'Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  dark: {
    name: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri'
  }
};

// Créer une icône de marqueur avec prix
const createPriceMarkerIcon = (price: string, isSelected: boolean, isHovered: boolean) => {
  const baseColor = '#FF6B35';
  const bgColor = isSelected || isHovered ? baseColor : 'white';
  const textColor = isSelected || isHovered ? 'white' : baseColor;
  const borderColor = isSelected || isHovered ? 'white' : baseColor;

  const svgIcon = `
    <svg width="80" height="42" viewBox="0 0 80 42" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow-${price}" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.3"/>
        </filter>
      </defs>

      <rect
        x="5"
        y="5"
        width="70"
        height="32"
        rx="8"
        ry="8"
        fill="${bgColor}"
        stroke="${borderColor}"
        stroke-width="2"
        filter="url(#shadow-${price})"
      />

      <text
        x="40"
        y="25"
        text-anchor="middle"
        fill="${textColor}"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="13"
        font-weight="700">
        ${price}
      </text>
    </svg>
  `;

  return new L.DivIcon({
    html: svgIcon,
    className: 'custom-marker-icon',
    iconSize: [80, 42],
    iconAnchor: [40, 21],
    popupAnchor: [0, -21],
  });
};

// Composant pour gérer les bounds de la carte
function MapBoundsHandler({ onBoundsChange }: { onBoundsChange?: (bounds: any) => void }) {
  const map = useMap();

  useMapEvents({
    moveend: () => {
      if (onBoundsChange) {
        const bounds = map.getBounds();
        onBoundsChange(bounds);
      }
    },
  });

  return null;
}

// Composant pour gérer les listings visibles dans les bounds actuels
function VisibleListingsHandler({
  listings,
  onVisibleListingsChange
}: {
  listings: any[];
  onVisibleListingsChange?: (listings: any[]) => void;
}) {
  const map = useMap();
  const lastVisibleIds = useRef<Set<string>>(new Set());

  const updateVisibleListings = useCallback(() => {
    if (!onVisibleListingsChange || listings.length === 0) return;

    const bounds = map.getBounds();
    const visibleListings = listings.filter(listing => {
      const coords = listing.displayCoordinates || listing.address?.coordinates || listing.location?.coordinates;
      if (!coords || !Array.isArray(coords) || coords.length < 2) return false;

      const position = L.latLng(coords[0], coords[1]);
      return bounds.contains(position);
    });

    // Only update if the set of visible listings has changed
    const currentVisibleIds = new Set(visibleListings.map(l => l._id || l.id));
    const hasChanged =
      currentVisibleIds.size !== lastVisibleIds.current.size ||
      Array.from(currentVisibleIds).some(id => !lastVisibleIds.current.has(id));

    if (hasChanged) {
      lastVisibleIds.current = currentVisibleIds;
      onVisibleListingsChange(visibleListings);
    }
  }, [listings, onVisibleListingsChange, map]);

  useMapEvents({
    moveend: updateVisibleListings,
    zoomend: updateVisibleListings,
  });

  // Update on initial mount and when listings change
  useEffect(() => {
    updateVisibleListings();
  }, [updateVisibleListings]);

  return null;
}

// Composant pour fit bounds automatiquement
function AutoFitBounds({ listings, fitBounds }: { listings: any[]; fitBounds: boolean }) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (fitBounds && listings.length > 0 && !hasFitted.current) {
      const bounds = L.latLngBounds(
        listings.map(listing => {
          const coords = listing.address?.coordinates || listing.displayCoordinates || listing.location?.coordinates;
          return [coords[0], coords[1]]; // [lat, lng]
        })
      );

      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      hasFitted.current = true;
    }
  }, [listings, fitBounds, map]);

  return null;
}

export default function LeafletMapView({
  listings,
  center = [36.7538, 3.0588],
  zoom = 10,
  selectedListing,
  hoveredListing,
  onListingSelect,
  onListingHover,
  onMapBoundsChange,
  onVisibleListingsChange,
  currency = 'DZD',
  className = '',
  interactive = true,
  fitBounds = true,
  selectedCategory = 'all'
}: LeafletMapViewProps) {
  const t = useTranslation('search');
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [mapStyle, setMapStyle] = useState<keyof typeof MAP_STYLES>('voyager');
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Synchronize internal hoveredMarkerId with external hoveredListing prop
  useEffect(() => {
    if (hoveredListing !== undefined) {
      setHoveredMarkerId(hoveredListing);
    }
  }, [hoveredListing]);

  // Function to offset markers with duplicate coordinates
  const offsetDuplicateCoordinates = useCallback((listings: any[]) => {
    const coordMap = new Map<string, any[]>();

    // Group listings by coordinates
    listings.forEach(listing => {
      const coords = listing.displayCoordinates;
      if (!coords) return;

      const key = `${coords[0].toFixed(6)}_${coords[1].toFixed(6)}`;
      if (!coordMap.has(key)) {
        coordMap.set(key, []);
      }
      coordMap.get(key)!.push(listing);
    });

    // Apply offset to duplicate coordinates
    const result: any[] = [];
    coordMap.forEach((group) => {
      if (group.length === 1) {
        result.push(group[0]);
      } else {
        // Multiple listings at same location - apply circular offset
        const offsetRadius = 0.0002; // ~20 meters offset
        group.forEach((listing, index) => {
          const angle = (index / group.length) * 2 * Math.PI;
          const offsetLat = offsetRadius * Math.cos(angle);
          const offsetLng = offsetRadius * Math.sin(angle);

          result.push({
            ...listing,
            displayCoordinates: [
              listing.displayCoordinates[0] + offsetLat,
              listing.displayCoordinates[1] + offsetLng
            ]
          });
        });
      }
    });

    return result;
  }, []);

  // Process listings with enhanced coordinate handling and offset for duplicates
  const processedListings = useMemo(() => {
    const filtered = listings.filter(listing => {
      const coords = listing.address?.coordinates || listing.displayCoordinates || listing.location?.coordinates;
      const hasCoords = coords &&
                       Array.isArray(coords) &&
                       coords.length === 2 &&
                       !isNaN(coords[0]) &&
                       !isNaN(coords[1]);

      if (!hasCoords) {
        return false;
      }

      // Filter by category if specified
      if (selectedCategory !== 'all' && listing.category !== selectedCategory) {
        return false;
      }

      return true;
    }).map(listing => {
      const coords = listing.address?.coordinates || listing.displayCoordinates || listing.location?.coordinates;
      return {
        ...listing,
        displayCoordinates: coords ? [coords[0], coords[1]] : null
      };
    });

    // Apply offset to duplicate coordinates
    return offsetDuplicateCoordinates(filtered);
  }, [listings, selectedCategory, offsetDuplicateCoordinates]);

  // Convert center coordinates
  const mapCenter = useMemo(() => ({
    lat: center[0],
    lng: center[1]
  }), [center]);

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

  // Handle marker interactions
  const handleMarkerClick = useCallback((listingId: string) => {
    setSelectedMarkerId(selectedMarkerId === listingId ? null : listingId);
    onListingSelect?.(listingId);
  }, [selectedMarkerId, onListingSelect]);

  // Fit map to show all listings
  const fitMapToListings = useCallback(() => {
    if (!mapRef.current || processedListings.length === 0) return;

    const bounds = L.latLngBounds(
      processedListings.map(listing => [
        listing.displayCoordinates[0],
        listing.displayCoordinates[1]
      ])
    );

    mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }, [processedListings]);

  return (
    <div className={`relative w-full h-full bg-gray-100 rounded-xl overflow-hidden ${className}`}>
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: '12px' }}
        scrollWheelZoom={true}
        ref={mapRef}
      >
        {/* Tuiles de carte avec style sélectionné */}
        <TileLayer
          attribution={MAP_STYLES[mapStyle].attribution}
          url={MAP_STYLES[mapStyle].url}
          maxZoom={20}
        />

        {/* Bounds handler */}
        <MapBoundsHandler onBoundsChange={onMapBoundsChange} />

        {/* Visible listings handler */}
        <VisibleListingsHandler
          listings={processedListings}
          onVisibleListingsChange={onVisibleListingsChange}
        />

        {/* Auto fit bounds */}
        <AutoFitBounds listings={processedListings} fitBounds={fitBounds} />

        {/* Render markers */}
        {processedListings.map((listing) => {
          const isSelected = selectedMarkerId === listing._id;
          const isHovered = hoveredMarkerId === listing._id;
          const price = formatPrice(listing);

          return (
            <Marker
              key={listing._id}
              position={[listing.displayCoordinates[0], listing.displayCoordinates[1]]}
              icon={createPriceMarkerIcon(price, isSelected, isHovered)}
              eventHandlers={{
                click: () => handleMarkerClick(listing._id),
                mouseover: () => {
                  if (interactive) {
                    setHoveredMarkerId(listing._id);
                    onListingHover?.(listing._id);
                  }
                },
                mouseout: () => {
                  if (interactive) {
                    setHoveredMarkerId(null);
                    onListingHover?.(null);
                  }
                }
              }}
            >
              <Popup maxWidth={280} minWidth={240} className="leaflet-popup-mobile-friendly">
                <div className="w-full bg-white rounded-lg overflow-hidden">
                  <Link
                    href={`/listing/${listing._id}`}
                    className="block hover:bg-gray-50/30 transition-all duration-300"
                  >
                    {/* Image Section - Compact */}
                    <div className="relative overflow-hidden">
                      <div className="aspect-video w-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                        <Image
                          src={getListingImageUrl(listing, 0)}
                          alt={listing.title}
                          width={280}
                          height={157}
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.jpg';
                          }}
                        />
                      </div>

                      {/* Compact Badges */}
                      <div className="absolute top-2 left-2 flex flex-col space-y-1">
                        {listing.featured && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg">
                            <Star className="w-2.5 h-2.5 mr-0.5 fill-current" />
                            Featured
                          </span>
                        )}
                      </div>

                      {/* Category Badge - Compact */}
                      <div className="absolute top-2 right-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold text-white shadow-lg ${
                          listing.category === 'vehicle' ? 'bg-blue-600/90' : 'bg-green-600/90'
                        }`}>
                          {listing.category === 'vehicle' ? '🚗' : '🏠'}
                        </span>
                      </div>
                    </div>

                    {/* Content Section - Compact */}
                    <div className="space-y-2 p-3">
                      {/* Title and Location */}
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm line-clamp-1 leading-tight mb-1">
                          {listing.title}
                        </h4>
                        <p className="text-gray-600 text-xs flex items-center">
                          <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                          {listing.address?.city || 'Unknown'}, {listing.address?.state || 'DZ'}
                        </p>
                      </div>

                      {/* Stats Section - Compact */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded-full border border-yellow-200">
                            <Star className="w-3 h-3 fill-current text-yellow-500" />
                            <span className="text-xs font-bold text-gray-900">
                              {listing.stats?.averageRating?.toFixed(1) || '4.8'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 text-[10px] text-gray-500">
                          <span className="flex items-center">
                            <Eye className="w-3 h-3 mr-0.5" />
                            {listing.stats?.views || 0}
                          </span>
                        </div>
                      </div>

                      {/* Property Details - Compact */}
                      {listing.category === 'stay' && listing.stayDetails && (
                        <div className="bg-gray-50 p-2 rounded-lg">
                          <div className="flex items-center space-x-3 text-xs text-gray-700">
                            {listing.stayDetails.bedrooms && (
                              <span className="flex items-center font-medium">
                                🛏️ {listing.stayDetails.bedrooms}
                              </span>
                            )}
                            {listing.stayDetails.bathrooms && (
                              <span className="flex items-center font-medium">
                                🚿 {listing.stayDetails.bathrooms}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Price Section - Compact */}
                      <div className="border-t border-gray-100 pt-2 mt-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-baseline space-x-1">
                            <span className="text-lg font-bold text-gray-900">
                              {formatPrice(listing)}
                            </span>
                            <span className="text-gray-600 text-[10px] font-medium">
                              {listing.category === 'vehicle' ? '/jour' : '/nuit'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Listings Count removed - already shown above list */}

      {/* Map Style Selector */}
      <div className="absolute top-4 right-4 z-[1000]">
        <div className="relative">
          <button
            onClick={() => setShowStyleSelector(!showStyleSelector)}
            className="flex items-center space-x-2 bg-white/95 backdrop-blur-lg hover:bg-white p-3 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-200"
          >
            <Layers className="w-4 h-4 text-gray-900" />
            <span className="text-sm font-bold text-gray-900">{MAP_STYLES[mapStyle].name}</span>
          </button>

          {showStyleSelector && (
            <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-2 min-w-[160px]">
              {Object.entries(MAP_STYLES).map(([key, style]) => (
                <button
                  key={key}
                  onClick={() => {
                    setMapStyle(key as keyof typeof MAP_STYLES);
                    setShowStyleSelector(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mapStyle === key
                      ? 'bg-[#FF6B35] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute bottom-4 left-4 z-[1000] flex flex-col space-y-3 pointer-events-none">
        {processedListings.length > 1 && (
          <button
            onClick={fitMapToListings}
            className="flex items-center space-x-3 bg-white/95 backdrop-blur-lg hover:bg-white p-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-gray-200 group pointer-events-auto"
          >
            <div className="p-2 bg-gradient-to-br from-[#FF6B35] to-orange-600 rounded-xl group-hover:from-orange-600 group-hover:to-orange-700 transition-all duration-200">
              <Navigation className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900 group-hover:text-[#FF6B35] transition-colors">
              Fit All Properties
            </span>
          </button>
        )}
      </div>

      {/* Price Range Indicator */}
      {processedListings.length > 0 && (
        <div className="absolute bottom-4 right-4 z-[1000] pointer-events-none">
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200 p-4 pointer-events-auto">
            <div className="text-xs text-gray-600 font-medium mb-2">Price Range</div>
            <div className="flex items-center space-x-2 text-sm font-bold text-gray-900">
              <span>{formatPrice({pricing: {basePrice: Math.min(...processedListings.map(l => l.pricing?.basePrice || 0))}})}</span>
              <span className="text-gray-400">-</span>
              <span>{formatPrice({pricing: {basePrice: Math.max(...processedListings.map(l => l.pricing?.basePrice || 0))}})}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
