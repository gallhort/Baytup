'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronDown, SlidersHorizontal, Sparkles, Shield, Zap, Filter } from 'lucide-react';
import { listingsAPI } from '@/lib/api';
import { useTranslation } from '@/hooks/useTranslation';
import { useFeature } from '@/contexts/FeatureFlagsContext'; // ✅ Feature flags
import PriceInput from '@/components/common/PriceInput';
interface PropertyType {
  value: string;
  label: string;
  count: number;
}

interface FilterSidebarProps {
  filters: any;
  onFilterChange: (filters: any) => void;
  category?: string;
  isMobile?: boolean;
  onClose?: () => void;
}

export default function FilterSidebar({
  filters,
  onFilterChange,
  category = 'stays',
  isMobile = false,
  onClose
}: FilterSidebarProps) {
  const t = useTranslation('search') as any;
  const vehiclesEnabled = useFeature('vehiclesEnabled'); // ✅ Feature flag check
  const [filterData, setFilterData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    property: true,
    rooms: false,
    amenities: false,
    booking: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Fetch filter data when category changes
  useEffect(() => {
    const fetchFilterData = async () => {
      setLoading(true);
      try {
        const result = await listingsAPI.getFilterData(category);
        if (result.success) {
          setFilterData(result.data.data);
        } else {
          // Use fallback data
          setFilterData(result.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch filter data:', error);
        // ✅ FEATURE FLAG: Use fallback data with vehicle types only if enabled
        const stayTypes = [
          { value: 'apartment', label: 'Apartment', count: 0 },
          { value: 'house', label: 'House', count: 0 },
          { value: 'villa', label: 'Villa', count: 0 },
          { value: 'riad', label: 'Traditional Riad', count: 0 },
          { value: 'kasbah', label: 'Kasbah', count: 0 },
          { value: 'desert-camp', label: 'Desert Camp', count: 0 },
          { value: 'studio', label: 'Studio', count: 0 },
          { value: 'room', label: 'Room', count: 0 }
        ];

        const vehicleTypes = vehiclesEnabled ? [
          { value: 'car', label: 'Car', count: 0 },
          { value: 'suv', label: 'SUV/4x4', count: 0 },
          { value: 'van', label: 'Van', count: 0 },
          { value: 'motorcycle', label: 'Motorcycle', count: 0 },
          { value: 'truck', label: 'Truck', count: 0 },
          { value: 'scooter', label: 'Scooter', count: 0 }
        ] : [];

        const stayAmenities = [
          'wifi', 'parking', 'pool', 'ac', 'kitchen', 'washer',
          'tv', 'heating', 'balcony', 'garden', 'gym', 'elevator',
          'beachAccess', 'mountainView', 'terrace', 'security'
        ];

        const vehicleAmenities = vehiclesEnabled ? [
          'gps', 'bluetooth', 'ac', 'cruiseControl', 'backupCamera',
          'childSeat', 'sunroof', 'usbCharger', 'spareTire',
          'firstAidKit', 'phoneHolder', 'cooler'
        ] : [];

        setFilterData({
          propertyTypes: category === 'stays' ? stayTypes : vehicleTypes,
          amenities: category === 'stays' ? stayAmenities : vehicleAmenities
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFilterData();
  }, [category, vehiclesEnabled]);

  // Helper function to get translated property type label
  const getPropertyTypeLabel = (value: string) => {
    if (!value) return '';
    const key = value.replace(/-/g, '');
    return t.propertyTypes?.[key] || value;
  };

  // ✅ FEATURE FLAG: Use fetched data or fallback data with translations
  const propertyTypes = useMemo(() => {
    if (filterData?.propertyTypes) {
      return filterData.propertyTypes.map((type: PropertyType) => ({
        ...type,
        label: getPropertyTypeLabel(type?.value || '')
      }));
    }

    const stayTypes = [
      { value: 'apartment', label: t.propertyTypes?.apartment || 'Apartment', count: 0 },
      { value: 'house', label: t.propertyTypes?.house || 'House', count: 0 },
      { value: 'villa', label: t.propertyTypes?.villa || 'Villa', count: 0 },
      { value: 'riad', label: t.propertyTypes?.riad || 'Riad', count: 0 },
      { value: 'kasbah', label: t.propertyTypes?.kasbah || 'Kasbah', count: 0 },
      { value: 'desert-camp', label: t.propertyTypes?.desertCamp || 'Desert Camp', count: 0 },
      { value: 'studio', label: t.propertyTypes?.studio || 'Studio', count: 0 },
      { value: 'room', label: t.propertyTypes?.room || 'Room', count: 0 }
    ];

    const vehicleTypes = vehiclesEnabled ? [
      { value: 'car', label: t.propertyTypes?.car || 'Car', count: 0 },
      { value: 'suv', label: t.propertyTypes?.suv || 'SUV/4x4', count: 0 },
      { value: 'van', label: t.propertyTypes?.van || 'Van', count: 0 },
      { value: 'motorcycle', label: t.propertyTypes?.motorcycle || 'Motorcycle', count: 0 },
      { value: 'truck', label: t.propertyTypes?.truck || 'Truck', count: 0 },
      { value: 'scooter', label: t.propertyTypes?.scooter || 'Scooter', count: 0 }
    ] : [];

    return category === 'stays' ? stayTypes : vehicleTypes;
  }, [filterData, category, vehiclesEnabled, t.propertyTypes]);

  // Helper function to get translated amenity label
  const getAmenityLabel = (amenity: string) => {
    if (!amenity) return '';
    // Convert amenity string to camelCase key
    const key = amenity
      .toLowerCase()
      .replace(/\s+(.)/g, (_, char) => char.toUpperCase())
      .replace(/[^a-zA-Z]/g, '');
    return t.amenities?.[key] || amenity;
  };

  // ✅ FEATURE FLAG: Use fetched amenities or fallback with translations
  const amenities = useMemo(() => {
    if (filterData?.amenities) {
      return filterData.amenities;
    }

    const stayAmenities = [
      'wifi', 'parking', 'pool', 'ac', 'kitchen', 'washer',
      'tv', 'heating', 'balcony', 'garden', 'gym', 'elevator',
      'beachAccess', 'mountainView', 'terrace', 'security'
    ];

    const vehicleAmenities = vehiclesEnabled ? [
      'gps', 'bluetooth', 'ac', 'cruiseControl', 'backupCamera',
      'childSeat', 'sunroof', 'usbCharger', 'spareTire',
      'firstAidKit', 'phoneHolder', 'cooler'
    ] : [];

    return category === 'stays' ? stayAmenities : vehicleAmenities;
  }, [filterData, category, vehiclesEnabled]);

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    const numValue = parseInt(value) || 0;
    const newPriceRange = type === 'min'
      ? [numValue, filters.priceRange[1]]
      : [filters.priceRange[0], numValue];
    
    // Validation: Min cannot be greater than Max
    if (newPriceRange[0] > newPriceRange[1]) {
      // Show a toast or warning (optional)
      console.warn('Minimum price cannot be greater than maximum price');
      return; // Don't update if invalid
    }
    
    onFilterChange({
      ...filters,
      priceRange: newPriceRange
    });
  };

  return (
    <div className={`${isMobile ? 'h-full' : 'sticky top-28 lg:top-32'}`}>
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Enhanced Header with Gradient */}
        <div className="relative bg-gradient-to-r from-[#FF6B35] to-[#F7931E] p-6 text-white">
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <Filter className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{t.filters.smartFilters}</h2>
                <p className="text-white/90 text-sm">{t.filters.findYourPerfectMatch}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onFilterChange({
                  ...filters,
                  priceRange: [0, 100000],
                  propertyTypes: [],
                  amenities: [],
                  instantBook: false,
                  superhost: false,
                  bedrooms: 'any',
                  bathrooms: 'any'
                })}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-semibold hover:bg-white/30 transition-all duration-200 transform hover:scale-105"
              >
                {t.filters.clearAll}
              </button>
              {isMobile && (
                <button
                  onClick={onClose}
                  className="p-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* Enhanced Price Range Section */}
          <div className="group">
            <button
              onClick={() => toggleSection('price')}
              className="flex items-center justify-between w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200 group-hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#FF6B35]/10 rounded-lg">
                  <span className="text-[#FF6B35] font-bold text-lg">DA</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{t.filters.priceRange}</h3>
                  <p className="text-sm text-gray-600">{t.filters.setYourBudget}</p>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-[#FF6B35] transition-transform duration-200 ${
                  expandedSections.price ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedSections.price && (
              <div className="mt-4 p-4 bg-gray-50/50 rounded-xl space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">{t.filters.minimum}</label>
                    <div className="relative">
  <PriceInput
    value={filters.priceRange[0]}
    onChange={(value) => handlePriceChange('min', value.toString())}
    currency="DZD"
    placeholder="0"
    min={0}
    showCurrencySymbol={true}
  />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">{t.filters.dzd}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">{t.filters.maximum}</label>
                    <div className="relative">
  <PriceInput
    value={filters.priceRange[1]}
    onChange={(value) => handlePriceChange('max', value.toString())}
    currency="DZD"
    placeholder="100000"
    min={0}
    showCurrencySymbol={true}
  />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">{t.filters.dzd}</span>
                    </div>
                  </div>
                </div>

                {/* Price Range Display */}
                <div className="text-center p-3 bg-white border-2 border-[#FF6B35]/20 rounded-xl">
                  <div className="text-lg font-bold text-[#FF6B35]">
                    {filters.priceRange[0].toLocaleString()} - {filters.priceRange[1].toLocaleString()} DZD
                  </div>
                  <div className="text-sm text-gray-600">{t.filters.perDay}</div>
                </div>

                {/* Quick Price Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: t.filters.budget, min: 0, max: 5000 },
                    { label: t.filters.midRange, min: 5000, max: 15000 },
                    { label: t.filters.luxury, min: 15000, max: 50000 }
                  ].map((range) => (
                    <button
                      key={range.label}
                      onClick={() => onFilterChange({
                        ...filters,
                        priceRange: [range.min, range.max]
                      })}
                      className="p-3 text-sm font-semibold bg-white border-2 border-gray-200 rounded-xl
                               hover:border-[#FF6B35] hover:bg-[#FF6B35]/5 transition-all duration-200
                               transform hover:scale-105"
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Property/Vehicle Type Section */}
          <div className="group">
            <button
              onClick={() => toggleSection('property')}
              className="flex items-center justify-between w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200 group-hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#FF6B35]/10 rounded-lg">
                  <Sparkles className="w-5 h-5 text-[#FF6B35]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">
                    {category === 'stays' ? t.filters.propertyType : t.filters.vehicleTypes}
                  </h3>
                  <p className="text-sm text-gray-600">{t.filters.chooseYourStyle}</p>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-[#FF6B35] transition-transform duration-200 ${
                  expandedSections.property ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedSections.property && (
              <div className="mt-4 p-4 bg-gray-50/50 rounded-xl">
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                        </div>
                        <div className="w-8 h-5 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {propertyTypes.map((type: PropertyType) => (
                    <label
                      key={type.value}
                      className="flex items-center justify-between p-3 bg-white hover:bg-[#FF6B35]/5
                               rounded-xl cursor-pointer transition-all duration-200 group
                               border-2 border-transparent hover:border-[#FF6B35]/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={filters.propertyTypes?.includes(type.value) || false}
                            onChange={(e) => {
                              const types = filters.propertyTypes || [];
                              if (e.target.checked) {
                                onFilterChange({
                                  ...filters,
                                  propertyTypes: [...types, type.value]
                                });
                              } else {
                                onFilterChange({
                                  ...filters,
                                  propertyTypes: types.filter((t: string) => t !== type.value)
                                });
                              }
                            }}
                            className="w-5 h-5 text-[#FF6B35] border-2 border-gray-300 rounded-lg
                                     focus:ring-[#FF6B35] focus:ring-2 transition-all duration-200"
                          />
                        </div>
                        <span className="text-gray-900 font-semibold group-hover:text-[#FF6B35] transition-colors">
                          {type.label}
                        </span>
                      </div>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm font-semibold rounded-lg">
                        {type.count}
                      </span>
                    </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Enhanced Rooms & Beds Section (Stays only) */}
          {category === 'stays' && (
            <div className="group">
              <button
                onClick={() => toggleSection('rooms')}
                className="flex items-center justify-between w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200 group-hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#FF6B35]/10 rounded-lg">
                    <span className="text-[#FF6B35] font-bold text-lg">🛏️</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{t.filters.roomsAndBeds}</h3>
                    <p className="text-sm text-gray-600">{t.filters.spaceRequirements}</p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-[#FF6B35] transition-transform duration-200 ${
                    expandedSections.rooms ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedSections.rooms && (
                <div className="mt-4 p-4 bg-gray-50/50 rounded-xl space-y-6">
                  {/* Bedrooms */}
                  <div>
                    <label className="text-sm font-bold text-gray-700 mb-3 block">
                      {t.filters.bedrooms}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[t.filters.any, '1', '2', '3', '4', '5+'].map((num, idx) => {
                        const value = idx === 0 ? 'any' : num.toLowerCase();
                        return (
                        <button
                          key={num}
                          onClick={() => onFilterChange({
                            ...filters,
                            bedrooms: value
                          })}
                          className={`py-3 px-4 rounded-xl border-2 font-semibold transition-all duration-200 transform hover:scale-105 ${
                            filters.bedrooms === value
                              ? 'border-[#FF6B35] bg-[#FF6B35] text-white shadow-lg'
                              : 'border-gray-200 bg-white text-gray-900 hover:border-[#FF6B35]/50 hover:bg-[#FF6B35]/5'
                          }`}
                        >
                          {num}
                        </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bathrooms */}
                  <div>
                    <label className="text-sm font-bold text-gray-700 mb-3 block">
                      {t.filters.bathrooms}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[t.filters.any, '1', '2', '3', '4+'].map((num, idx) => {
                        const value = idx === 0 ? 'any' : num.toLowerCase();
                        return (
                        <button
                          key={num}
                          onClick={() => onFilterChange({
                            ...filters,
                            bathrooms: value
                          })}
                          className={`py-3 px-4 rounded-xl border-2 font-semibold transition-all duration-200 transform hover:scale-105 ${
                            filters.bathrooms === value
                              ? 'border-[#FF6B35] bg-[#FF6B35] text-white shadow-lg'
                              : 'border-gray-200 bg-white text-gray-900 hover:border-[#FF6B35]/50 hover:bg-[#FF6B35]/5'
                          }`}
                        >
                          {num}
                        </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Enhanced Amenities/Features Section */}
          <div className="group">
            <button
              onClick={() => toggleSection('amenities')}
              className="flex items-center justify-between w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200 group-hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#FF6B35]/10 rounded-lg">
                  <Zap className="w-5 h-5 text-[#FF6B35]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">
                    {category === 'stays' ? t.filters.amenities : t.filters.features}
                  </h3>
                  <p className="text-sm text-gray-600">{t.filters.essentialFeatures}</p>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-[#FF6B35] transition-transform duration-200 ${
                  expandedSections.amenities ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedSections.amenities && (
              <div className="mt-4 p-4 bg-gray-50/50 rounded-xl">
                <div className="grid grid-cols-2 gap-3">
                  {amenities.slice(0, 8).map((amenity: string) => (
                    <label
                      key={amenity}
                      className="flex items-center gap-3 p-3 bg-white hover:bg-[#FF6B35]/5
                               rounded-xl cursor-pointer transition-all duration-200 group
                               border-2 border-transparent hover:border-[#FF6B35]/20"
                    >
                      <input
                        type="checkbox"
                        checked={filters.amenities?.includes(amenity) || false}
                        onChange={(e) => {
                          const items = filters.amenities || [];
                          if (e.target.checked) {
                            onFilterChange({
                              ...filters,
                              amenities: [...items, amenity]
                            });
                          } else {
                            onFilterChange({
                              ...filters,
                              amenities: items.filter((a: string) => a !== amenity)
                            });
                          }
                        }}
                        className="w-4 h-4 text-[#FF6B35] border-2 border-gray-300 rounded
                                 focus:ring-[#FF6B35] focus:ring-2 transition-all duration-200"
                      />
                      <span className="text-sm font-semibold text-gray-900 group-hover:text-[#FF6B35] transition-colors">
                        {getAmenityLabel(amenity)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Booking Options */}
          <div className="group">
            <button
              onClick={() => toggleSection('booking')}
              className="flex items-center justify-between w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200 group-hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#FF6B35]/10 rounded-lg">
                  <Shield className="w-5 h-5 text-[#FF6B35]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{t.filters.bookingOptions}</h3>
                  <p className="text-sm text-gray-600">{t.filters.premiumFeatures}</p>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-[#FF6B35] transition-transform duration-200 ${
                  expandedSections.booking ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedSections.booking && (
              <div className="mt-4 p-4 bg-gray-50/50 rounded-xl space-y-4">
                <label className="flex items-center gap-4 p-4 bg-white hover:bg-[#FF6B35]/5
                               rounded-xl cursor-pointer transition-all duration-200 group
                               border-2 border-transparent hover:border-[#FF6B35]/20">
                  <input
                    type="checkbox"
                    checked={filters.instantBook || false}
                    onChange={(e) => onFilterChange({
                      ...filters,
                      instantBook: e.target.checked
                    })}
                    className="w-5 h-5 text-[#FF6B35] border-2 border-gray-300 rounded-lg
                             focus:ring-[#FF6B35] focus:ring-2 transition-all duration-200"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 group-hover:text-[#FF6B35] transition-colors">
                      ⚡ {t.filters.instantBook}
                    </div>
                    <div className="text-sm text-gray-600">
                      {t.filters.instantBookDesc}
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-4 p-4 bg-white hover:bg-[#FF6B35]/5
                               rounded-xl cursor-pointer transition-all duration-200 group
                               border-2 border-transparent hover:border-[#FF6B35]/20">
                  <input
                    type="checkbox"
                    checked={filters.superhost || false}
                    onChange={(e) => onFilterChange({
                      ...filters,
                      superhost: e.target.checked
                    })}
                    className="w-5 h-5 text-[#FF6B35] border-2 border-gray-300 rounded-lg
                             focus:ring-[#FF6B35] focus:ring-2 transition-all duration-200"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 group-hover:text-[#FF6B35] transition-colors">
                      🏆 {t.filters.superhost}
                    </div>
                    <div className="text-sm text-gray-600">
                      {t.filters.superhostDesc}
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-4 p-4 bg-white hover:bg-rose-50
                               rounded-xl cursor-pointer transition-all duration-200 group
                               border-2 border-transparent hover:border-rose-200">
                  <input
                    type="checkbox"
                    checked={filters.coupDeCoeur || false}
                    onChange={(e) => onFilterChange({
                      ...filters,
                      coupDeCoeur: e.target.checked
                    })}
                    className="w-5 h-5 text-rose-500 border-2 border-gray-300 rounded-lg
                             focus:ring-rose-500 focus:ring-2 transition-all duration-200"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 group-hover:text-rose-600 transition-colors">
                      ❤ Coup de coeur voyageurs
                    </div>
                    <div className="text-sm text-gray-600">
                      Note 4.7+ avec au moins 3 avis
                    </div>
                  </div>
                </label>
              </div>
            )}
          </div>

        </div>

        {/* Enhanced Apply Button (Mobile) */}
        {isMobile && (
          <div className="p-6 bg-gradient-to-r from-[#FF6B35] to-[#F7931E]">
            <button
              onClick={onClose}
              className="w-full py-4 bg-white text-[#FF6B35] rounded-xl font-bold text-lg
                       hover:bg-gray-50 transition-all duration-200 transform hover:scale-105
                       shadow-lg"
            >
              {t.filters.showResults}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}