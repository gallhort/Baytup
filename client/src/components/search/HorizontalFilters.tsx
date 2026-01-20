'use client';

import React, { useState, useRef, useMemo } from 'react';
import { ChevronDown, DollarSign, Home, Star, Zap, SlidersHorizontal, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useClickAway } from 'react-use';
import { useFeature } from '@/contexts/FeatureFlagsContext'; // ✅ Feature flags

interface HorizontalFiltersProps {
  filters: any;
  onFilterChange: (filters: any) => void;
  category?: string;
  searchRadius?: number;
  onRadiusChange?: (radius: number) => void;
}

export default function HorizontalFilters({
  filters,
  onFilterChange,
  category = 'stay',
  searchRadius = 50,
  onRadiusChange
}: HorizontalFiltersProps) {
  const t = useTranslation('search') as any;
  const vehiclesEnabled = useFeature('vehiclesEnabled'); // ✅ Feature flag check
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const priceRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const roomsRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useClickAway(priceRef, () => openFilter === 'price' && setOpenFilter(null));
  useClickAway(typeRef, () => openFilter === 'type' && setOpenFilter(null));
  useClickAway(roomsRef, () => openFilter === 'rooms' && setOpenFilter(null));
  useClickAway(moreRef, () => openFilter === 'more' && setOpenFilter(null));

  const toggleFilter = (filterName: string) => {
    setOpenFilter(openFilter === filterName ? null : filterName);
  };

  // ✅ FEATURE FLAG: Conditionally show vehicle types only if enabled
  const propertyTypes = useMemo(() => {
    const stayTypes = [
      { value: 'apartment', label: 'Appartement' },
      { value: 'house', label: 'Maison' },
      { value: 'villa', label: 'Villa' },
      { value: 'studio', label: 'Studio' },
      { value: 'riad', label: 'Riad' },
    ];

    const vehicleTypes = [
      { value: 'car', label: 'Voiture' },
      { value: 'suv', label: 'SUV/4x4' },
      { value: 'van', label: 'Van' },
      { value: 'motorcycle', label: 'Moto' },
    ];

    // Return stay types if category is 'stay'
    // Return vehicle types only if category is 'vehicle' AND feature is enabled
    return category === 'stay' ? stayTypes :
           (vehiclesEnabled ? vehicleTypes : []);
  }, [category, vehiclesEnabled]);

  const hasActiveFilters = filters.minPrice || filters.maxPrice ||
    (filters.propertyTypes && filters.propertyTypes.length > 0) ||
    filters.bedrooms || filters.bathrooms ||
    filters.instantBook || filters.superhost;

  const clearAllFilters = () => {
    onFilterChange({
      ...filters,
      minPrice: undefined,
      maxPrice: undefined,
      propertyTypes: [],
      bedrooms: undefined,
      bathrooms: undefined,
      instantBook: false,
      superhost: false
    });
    setOpenFilter(null);
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-[72px] z-10 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 py-4 overflow-x-auto">
          {/* Price Filter */}
          <div className="relative" ref={priceRef}>
            <button
              onClick={() => toggleFilter('price')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all whitespace-nowrap ${
                openFilter === 'price' || filters.minPrice || filters.maxPrice
                  ? 'border-gray-900 bg-gray-50 shadow-sm'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-medium">
                {filters.minPrice || filters.maxPrice ?
                  `${filters.minPrice || 0}K - ${filters.maxPrice || '∞'}K` :
                  'Prix'
                }
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${openFilter === 'price' ? 'rotate-180' : ''}`} />
            </button>

            {openFilter === 'price' && (
              <div className="absolute top-full mt-2 left-0 bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 w-80 z-50">
                <h3 className="font-bold text-lg mb-4">Gamme de prix</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prix minimum (DZD)</label>
                    <input
                      type="number"
                      value={filters.minPrice || ''}
                      onChange={(e) => onFilterChange({ ...filters, minPrice: e.target.value ? parseInt(e.target.value) * 1000 : undefined })}
                      placeholder="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prix maximum (DZD)</label>
                    <input
                      type="number"
                      value={filters.maxPrice || ''}
                      onChange={(e) => onFilterChange({ ...filters, maxPrice: e.target.value ? parseInt(e.target.value) * 1000 : undefined })}
                      placeholder="∞"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Property Type Filter */}
          <div className="relative" ref={typeRef}>
            <button
              onClick={() => toggleFilter('type')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all whitespace-nowrap ${
                openFilter === 'type' || (filters.propertyTypes && filters.propertyTypes.length > 0)
                  ? 'border-gray-900 bg-gray-50 shadow-sm'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="text-sm font-medium">
                {filters.propertyTypes && filters.propertyTypes.length > 0
                  ? `Type (${filters.propertyTypes.length})`
                  : 'Type de logement'
                }
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${openFilter === 'type' ? 'rotate-180' : ''}`} />
            </button>

            {openFilter === 'type' && (
              <div className="absolute top-full mt-2 left-0 bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 w-72 z-50">
                <h3 className="font-bold text-lg mb-4">Type de {category === 'stay' ? 'logement' : 'véhicule'}</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {propertyTypes.map((type) => (
                    <label key={type.value} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.propertyTypes?.includes(type.value) || false}
                        onChange={(e) => {
                          const types = filters.propertyTypes || [];
                          onFilterChange({
                            ...filters,
                            propertyTypes: e.target.checked
                              ? [...types, type.value]
                              : types.filter((t: string) => t !== type.value)
                          });
                        }}
                        className="w-4 h-4 text-[#FF6B35] border-gray-300 rounded focus:ring-[#FF6B35]"
                      />
                      <span className="text-sm">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Rooms Filter (stays only) */}
          {category === 'stay' && (
            <div className="relative" ref={roomsRef}>
              <button
                onClick={() => toggleFilter('rooms')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all whitespace-nowrap ${
                  openFilter === 'rooms' || filters.bedrooms || filters.bathrooms
                    ? 'border-gray-900 bg-gray-50 shadow-sm'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <span className="text-sm font-medium">
                  {filters.bedrooms || filters.bathrooms
                    ? `${filters.bedrooms || 0} ch, ${filters.bathrooms || 0} sdb`
                    : 'Chambres & salles de bain'
                  }
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${openFilter === 'rooms' ? 'rotate-180' : ''}`} />
              </button>

              {openFilter === 'rooms' && (
                <div className="absolute top-full mt-2 left-0 bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 w-80 z-50">
                  <h3 className="font-bold text-lg mb-4">Chambres et salles de bain</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Chambres minimum</label>
                      <select
                        value={filters.bedrooms || ''}
                        onChange={(e) => onFilterChange({ ...filters, bedrooms: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      >
                        <option value="">Toutes</option>
                        <option value="1">1+</option>
                        <option value="2">2+</option>
                        <option value="3">3+</option>
                        <option value="4">4+</option>
                        <option value="5">5+</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Salles de bain minimum</label>
                      <select
                        value={filters.bathrooms || ''}
                        onChange={(e) => onFilterChange({ ...filters, bathrooms: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                      >
                        <option value="">Toutes</option>
                        <option value="1">1+</option>
                        <option value="2">2+</option>
                        <option value="3">3+</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* More Filters */}
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => toggleFilter('more')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all whitespace-nowrap ${
                openFilter === 'more' || filters.instantBook || filters.superhost
                  ? 'border-gray-900 bg-gray-50 shadow-sm'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-sm font-medium">Plus de filtres</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${openFilter === 'more' ? 'rotate-180' : ''}`} />
            </button>

            {openFilter === 'more' && (
              <div className="absolute top-full mt-2 left-0 bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 w-80 z-50">
                <h3 className="font-bold text-lg mb-4">Plus d'options</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.instantBook || false}
                      onChange={(e) => onFilterChange({ ...filters, instantBook: e.target.checked })}
                      className="w-5 h-5 text-[#FF6B35] border-gray-300 rounded focus:ring-[#FF6B35]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-green-600" />
                        <span className="font-medium">Réservation instantanée</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Réservez sans attendre la confirmation</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.superhost || false}
                      onChange={(e) => onFilterChange({ ...filters, superhost: e.target.checked })}
                      className="w-5 h-5 text-[#FF6B35] border-gray-300 rounded focus:ring-[#FF6B35]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="font-medium">Superhôte uniquement</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Hôtes avec excellentes évaluations</p>
                    </div>
                  </label>

                  {onRadiusChange && (
                    <div className="pt-4 border-t border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rayon de recherche: {searchRadius}km
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="200"
                        step="5"
                        value={searchRadius}
                        onChange={(e) => onRadiusChange(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF6B35]"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>5km</span>
                        <span>200km</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Clear All Button */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-300 hover:border-gray-400 transition-all whitespace-nowrap text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Effacer tout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
