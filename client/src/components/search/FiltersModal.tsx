'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Minus, Plus } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useFeature } from '@/contexts/FeatureFlagsContext'; // ✅ Feature flags

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: any;
  onFilterChange: (filters: any) => void;
  category?: string;
  searchRadius?: number;
  onRadiusChange?: (radius: number) => void;
  totalResults?: number;
  allListings?: any[]; // Pour calculer le nombre dynamique
}

export default function FiltersModal({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  category = 'stay',
  searchRadius = 50,
  onRadiusChange,
  totalResults = 0,
  allListings = []
}: FiltersModalProps) {
  const t = useTranslation('search') as any;
  const vehiclesEnabled = useFeature('vehiclesEnabled'); // ✅ Feature flag check
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // ✅ Calculate filtered results count dynamically based on local filters
  const filteredCount = useMemo(() => {
    if (!allListings || allListings.length === 0) return totalResults;

    return allListings.filter(listing => {
      // Filter by property type
      if (localFilters.propertyTypes && localFilters.propertyTypes.length > 0) {
        const propertyType = listing.stayDetails?.stayType || listing.vehicleDetails?.vehicleType;
        if (!localFilters.propertyTypes.includes(propertyType)) return false;
      }

      // Filter by price range
      const price = listing.pricing?.basePrice || 0;
      if (localFilters.minPrice && price < localFilters.minPrice) return false;
      if (localFilters.maxPrice && price > localFilters.maxPrice) return false;

      // Filter by bedrooms (stays only)
      if (category === 'stay' && localFilters.bedrooms) {
        const bedrooms = listing.stayDetails?.bedrooms || 0;
        if (bedrooms < localFilters.bedrooms) return false;
      }

      // Filter by bathrooms (stays only)
      if (category === 'stay' && localFilters.bathrooms) {
        const bathrooms = listing.stayDetails?.bathrooms || 0;
        if (bathrooms < localFilters.bathrooms) return false;
      }

      // Filter by beds (stays only)
      if (category === 'stay' && localFilters.beds) {
        const beds = listing.stayDetails?.beds || 0;
        if (beds < localFilters.beds) return false;
      }

      // Filter by amenities
      if (localFilters.amenities && localFilters.amenities.length > 0) {
        const listingAmenities = listing.stayDetails?.amenities || listing.vehicleDetails?.features || [];
        const hasAllAmenities = localFilters.amenities.every((amenity: string) =>
          listingAmenities.includes(amenity)
        );
        if (!hasAllAmenities) return false;
      }

      // Filter by instant book
      if (localFilters.instantBook && !listing.availability?.instantBook) return false;

      // Filter by superhost
      if (localFilters.superhost && !listing.host?.hostInfo?.superhost) return false;

      return true;
    }).length;
  }, [allListings, localFilters, category, totalResults]);

  // ✅ FEATURE FLAG: Conditionally show vehicle types only if enabled
  // IMPORTANT: Must be before early return to avoid hook order violation
  const propertyTypes = useMemo(() => {
    const stayTypes = [
      { value: 'apartment', label: 'Appartement', icon: '🏢' },
      { value: 'house', label: 'Maison', icon: '🏠' },
      { value: 'villa', label: 'Villa', icon: '🏡' },
      { value: 'studio', label: 'Studio', icon: '🛋️' },
      { value: 'riad', label: 'Riad', icon: '🕌' },
    ];

    const vehicleTypes = [
      { value: 'car', label: 'Voiture', icon: '🚗' },
      { value: 'suv', label: 'SUV/4x4', icon: '🚙' },
      { value: 'van', label: 'Van', icon: '🚐' },
      { value: 'motorcycle', label: 'Moto', icon: '🏍️' },
    ];

    // Return stay types if category is 'stay'
    // Return vehicle types only if category is 'vehicle' AND feature is enabled
    return category === 'stay' ? stayTypes :
           (vehiclesEnabled ? vehicleTypes : []);
  }, [category, vehiclesEnabled]);

  // ✅ FEATURE FLAG: Conditionally show vehicle amenities only if enabled
  const amenities = useMemo(() => {
    const stayAmenities = [
      { value: 'wifi', label: 'WiFi', icon: '📶' },
      { value: 'parking', label: 'Parking gratuit', icon: '🅿️' },
      { value: 'kitchen', label: 'Cuisine', icon: '🍳' },
      { value: 'ac', label: 'Climatisation', icon: '❄️' },
      { value: 'pool', label: 'Piscine', icon: '🏊' },
      { value: 'washer', label: 'Lave-linge', icon: '🧺' },
    ];

    const vehicleAmenities = [
      { value: 'gps', label: 'GPS', icon: '🗺️' },
      { value: 'bluetooth', label: 'Bluetooth', icon: '📱' },
      { value: 'ac', label: 'Climatisation', icon: '❄️' },
      { value: 'childSeat', label: 'Siège enfant', icon: '👶' },
    ];

    // Normalize category (handle both 'stay' and 'stays', 'vehicle' and 'vehicles')
    const normalizedCategory = category === 'stays' ? 'stay' : category === 'vehicles' ? 'vehicle' : category;

    // Return stay amenities if category is 'stay' or 'stays'
    // Return vehicle amenities only if category is 'vehicle'/'vehicles' AND feature is enabled
    return normalizedCategory === 'stay' ? stayAmenities :
           (vehiclesEnabled ? vehicleAmenities : stayAmenities);
  }, [category, vehiclesEnabled]);

  const adjustCounter = (field: string, operation: 'increment' | 'decrement') => {
    const currentValue = localFilters[field] || 0;
    const newValue = operation === 'increment' ? currentValue + 1 : Math.max(0, currentValue - 1);
    setLocalFilters({ ...localFilters, [field]: newValue || undefined });
  };

  const togglePropertyType = (type: string) => {
    const types = localFilters.propertyTypes || [];
    setLocalFilters({
      ...localFilters,
      propertyTypes: types.includes(type)
        ? types.filter((t: string) => t !== type)
        : [...types, type]
    });
  };

  const toggleAmenity = (amenity: string) => {
    const currentAmenities = localFilters.amenities || [];
    setLocalFilters({
      ...localFilters,
      amenities: currentAmenities.includes(amenity)
        ? currentAmenities.filter((a: string) => a !== amenity)
        : [...currentAmenities, amenity]
    });
  };

  const handleApply = () => {
    onFilterChange(localFilters);
    onClose();
  };

  const handleClearAll = () => {
    const clearedFilters = {
      location: filters.location,
      category: filters.category,
      checkIn: filters.checkIn,
      checkOut: filters.checkOut,
      guests: filters.guests,
      minPrice: undefined,
      maxPrice: undefined,
      propertyTypes: [],
      bedrooms: undefined,
      bathrooms: undefined,
      beds: undefined,
      amenities: [],
      instantBook: false,
      superhost: false
    };
    setLocalFilters(clearedFilters);
  };

  // Utiliser Portal pour rendre au-dessus de la carte Leaflet (comme le sélecteur de langue)
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50"
      style={{ zIndex: 999999 }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative', zIndex: 1000000 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold">Filtres</h2>
          <div className="w-9"></div> {/* Spacer for centering */}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-8">
            {/* Property Type Section */}
            <div>
              <h3 className="text-lg font-bold mb-4">Type de {category === 'stay' ? 'logement' : 'véhicule'}</h3>
              <div className="grid grid-cols-3 gap-3">
                {propertyTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => togglePropertyType(type.value)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all hover:border-gray-400 ${
                      localFilters.propertyTypes?.includes(type.value)
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-300'
                    }`}
                  >
                    <span className="text-3xl mb-2">{type.icon}</span>
                    <span className="text-sm font-medium text-center">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search Radius */}
            {onRadiusChange && (
              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-lg font-bold mb-4">Rayon de recherche</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{searchRadius} km</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="200"
                    step="5"
                    value={searchRadius}
                    onChange={(e) => onRadiusChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF6B35]"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>5 km</span>
                    <span>200 km</span>
                  </div>
                </div>
              </div>
            )}

            {/* Price Range Section */}
            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-lg font-bold mb-4">Fourchette de prix</h3>
              <p className="text-sm text-gray-600 mb-4">Prix par {category === 'stay' ? 'nuit' : 'jour'}, tous frais compris</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Minimum (DZD)</label>
                  <input
                    type="number"
                    value={localFilters.minPrice ? localFilters.minPrice / 1000 : ''}
                    onChange={(e) => setLocalFilters({
                      ...localFilters,
                      minPrice: e.target.value ? parseInt(e.target.value) * 1000 : undefined
                    })}
                    placeholder="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Maximum (DZD)</label>
                  <input
                    type="number"
                    value={localFilters.maxPrice ? localFilters.maxPrice / 1000 : ''}
                    onChange={(e) => setLocalFilters({
                      ...localFilters,
                      maxPrice: e.target.value ? parseInt(e.target.value) * 1000 : undefined
                    })}
                    placeholder="∞"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  />
                </div>
              </div>
            </div>

            {/* Rooms and Beds Section (stays only) */}
            {category === 'stay' && (
              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-lg font-bold mb-4">Chambres et lits</h3>
                <div className="space-y-6">
                  {/* Bedrooms */}
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Chambres</span>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => adjustCounter('bedrooms', 'decrement')}
                        disabled={!localFilters.bedrooms || localFilters.bedrooms <= 0}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-900 disabled:opacity-30 disabled:hover:border-gray-300 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{localFilters.bedrooms || 'Tout'}</span>
                      <button
                        onClick={() => adjustCounter('bedrooms', 'increment')}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-900 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Beds */}
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Lits</span>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => adjustCounter('beds', 'decrement')}
                        disabled={!localFilters.beds || localFilters.beds <= 0}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-900 disabled:opacity-30 disabled:hover:border-gray-300 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{localFilters.beds || 'Tout'}</span>
                      <button
                        onClick={() => adjustCounter('beds', 'increment')}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-900 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Bathrooms */}
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Salles de bain</span>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => adjustCounter('bathrooms', 'decrement')}
                        disabled={!localFilters.bathrooms || localFilters.bathrooms <= 0}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-900 disabled:opacity-30 disabled:hover:border-gray-300 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{localFilters.bathrooms || 'Tout'}</span>
                      <button
                        onClick={() => adjustCounter('bathrooms', 'increment')}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-900 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Amenities Section */}
            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-lg font-bold mb-4">Équipements</h3>
              <div className="grid grid-cols-2 gap-3">
                {amenities.map((amenity) => (
                  <button
                    key={amenity.value}
                    onClick={() => toggleAmenity(amenity.value)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:border-gray-400 ${
                      localFilters.amenities?.includes(amenity.value)
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-300'
                    }`}
                  >
                    <span className="text-2xl">{amenity.icon}</span>
                    <span className="text-sm font-medium">{amenity.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Special Options */}
            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-lg font-bold mb-4">Options de réservation</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl cursor-pointer">
                  <div>
                    <div className="font-medium">Réservation instantanée</div>
                    <div className="text-sm text-gray-600">Réservez sans attendre la confirmation</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localFilters.instantBook || false}
                    onChange={(e) => setLocalFilters({ ...localFilters, instantBook: e.target.checked })}
                    className="w-6 h-6 text-[#FF6B35] border-gray-300 rounded focus:ring-[#FF6B35]"
                  />
                </label>

                <label className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl cursor-pointer">
                  <div>
                    <div className="font-medium">Superhôte uniquement</div>
                    <div className="text-sm text-gray-600">Hôtes avec excellentes évaluations</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localFilters.superhost || false}
                    onChange={(e) => setLocalFilters({ ...localFilters, superhost: e.target.checked })}
                    className="w-6 h-6 text-[#FF6B35] border-gray-300 rounded focus:ring-[#FF6B35]"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <button
            onClick={handleClearAll}
            className="text-sm font-medium underline hover:text-gray-700 transition-colors"
          >
            Tout effacer
          </button>
          <button
            onClick={handleApply}
            className="bg-gradient-to-r from-[#FF6B35] to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Afficher {filteredCount > 0 ? `${filteredCount} logement${filteredCount > 1 ? 's' : ''}` : 'les résultats'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
