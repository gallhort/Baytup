'use client';

import React, { useState, useEffect, useCallback, Suspense, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSocketListings, useSocketConnection } from '@/hooks/useSocket';
import FilterSidebar from '@/components/search/FilterSidebar';
import HorizontalFilters from '@/components/search/HorizontalFilters';
import FiltersModal from '@/components/search/FiltersModal';
import SearchResults from '@/components/search/SearchResults';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useFeature } from '@/contexts/FeatureFlagsContext'; // ✅ Feature flags
import { Listing } from '@/types';
import { MapPin, Grid3X3, SlidersHorizontal } from 'lucide-react';

// Enhanced lazy loading with better error boundaries
import dynamic from 'next/dynamic';

const LeafletMapView = dynamic(
  () => import('@/components/search/LeafletMapView'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    ),
    ssr: false
  }
);

const MapModal = dynamic(
  () => import('@/components/search/MapModal'),
  {
    loading: () => <div>Loading map modal...</div>,
    ssr: false
  }
);

interface SearchFilters {
  location: string;
  category: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  adults: number;
  children: number;
  priceRange: [number, number];
  propertyTypes: string[];
  bedrooms: string;
  bathrooms: string;
  amenities: string[];
  instantBook: boolean;
  superhost: boolean;
  sort: string;
  // Vehicle-specific
  driverAge: string;
  pickupTime: string;
  returnTime: string;
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, currency } = useLanguage();
  const t = useTranslation('search') as any;
  const vehiclesEnabled = useFeature('vehiclesEnabled'); // ✅ Feature flag

  // Socket.IO hooks
  const { isConnected, connectionError } = useSocketConnection();
  const {
    listings: socketListings,
    loading: socketLoading,
    error: socketError,
    hasMore: socketHasMore,
    totalResults: socketTotalResults,
    searchListings,
    loadMore
  } = useSocketListings();

  // Enhanced state management with split-screen support
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  // ✅ FIX: Default to 'split' view (Airbnb-style) on desktop, 'list' on mobile
  const [viewMode, setViewMode] = useState<'list' | 'split' | 'map'>(() => {
    if (searchParams?.get('view') === 'map') return 'map';
    if (searchParams?.get('view') === 'split') return 'split';
    if (searchParams?.get('view') === 'list') return 'list';
    // Default to split on desktop (width >= 1024), list on mobile
    return typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'split' : 'list';
  });
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [hoveredListing, setHoveredListing] = useState<string | null>(null);
  // ✅ NEW: Track visible listings from map for dynamic list synchronization
  const [mapVisibleListings, setMapVisibleListings] = useState<Listing[]>([]);

  // ✅ SIMPLIFIED: Simple radius-based search only
  const [searchRadius, setSearchRadius] = useState(50); // km
  const initialCoordinatesRef = useRef<{ lat: number; lng: number } | null>(null);

  // ✅ NEW: Prevent scroll jump when list updates
  const listContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const isUpdatingListings = useRef<boolean>(false);

  // Enhanced state for REST API fallback
  const [restApiListings, setRestApiListings] = useState<Listing[]>([]);
  const [restApiLoading, setRestApiLoading] = useState(false);
  const [restApiError, setRestApiError] = useState<string | null>(null);

  // Derive state from socket data or REST API fallback
  const useRestAPI = !isConnected;
  const listings = useRestAPI ? restApiListings : socketListings;
  const loading = useRestAPI ? restApiLoading : socketLoading;
  const error = useRestAPI ? restApiError : (socketError || (connectionError ? `${t.connection?.error || 'Connection error'}: ${connectionError}` : null));
  const totalResults = useRestAPI ? restApiListings.length : socketTotalResults;
  const hasMore = useRestAPI ? false : socketHasMore;

  // Initialize filters from URL params with enhanced support
  const [filters, setFilters] = useState<SearchFilters>(() => {
    let category = searchParams?.get('category') || 'stays';
    // ✅ FEATURE FLAG: Forcer 'stays' si vehicles désactivé
    if (!vehiclesEnabled && (category === 'vehicles' || category === 'vehicle')) {
      category = 'stays';
    }

    return {
      location: searchParams?.get('location') || '',
      category,
      checkIn: searchParams?.get('checkIn') || '',
      checkOut: searchParams?.get('checkOut') || '',
      guests: parseInt(searchParams?.get('guests') || '0'),
      adults: parseInt(searchParams?.get('adults') || '1'),
      children: parseInt(searchParams?.get('children') || '0'),
      priceRange: [0, 100000],
      propertyTypes: [],
      bedrooms: searchParams?.get('bedrooms') || 'any',
      bathrooms: searchParams?.get('bathrooms') || 'any',
      amenities: [],
      instantBook: false,
      superhost: false,
      sort: 'recommended',
      // Vehicle-specific
      driverAge: searchParams?.get('driverAge') || '25+',
      pickupTime: searchParams?.get('pickupTime') || '',
      returnTime: searchParams?.get('returnTime') || '',
    };
  });

  // ✅ SIMPLIFIED: Single search with radius only
  const performSearch = useCallback(async (pageNum = 1, append = false) => {
    // ✅ FEATURE FLAG: Déterminer category selon feature flag
    let apiCategory = filters.category === 'stays' ? 'stay' :
                      filters.category === 'vehicles' ? 'vehicle' :
                      filters.category === 'stay' || filters.category === 'vehicle' ? filters.category :
                      'stay';

    // Si vehicles désactivé, forcer 'stay'
    if (!vehiclesEnabled && (apiCategory === 'vehicle' || apiCategory === 'vehicles')) {
      apiCategory = 'stay';
    }

    const apiFilters: any = {
      ...filters,
      category: apiCategory,
      // Map checkIn/checkOut to startDate/endDate for API (only if they exist)
      startDate: filters.checkIn || undefined,
      endDate: filters.checkOut || undefined,
      // Remove checkIn/checkOut to avoid confusion
      checkIn: undefined,
      checkOut: undefined,
      // ✅ FIX: Don't send guests=0, send undefined instead
      guests: filters.guests > 0 ? filters.guests : undefined,
      adults: filters.adults > 0 ? filters.adults : undefined,
      children: filters.children > 0 ? filters.children : undefined,
      page: pageNum,
      limit: 20
    };

    // ✅ SIMPLIFIED: Simple lat/lng + radius search
    if (filters.location) {
      const lat = searchParams?.get('lat');
      const lng = searchParams?.get('lng');

      // Store coordinates on first load
      if (lat && lng && !initialCoordinatesRef.current) {
        initialCoordinatesRef.current = {
          lat: parseFloat(lat),
          lng: parseFloat(lng)
        };
      }

      // Use stored or URL coordinates
      const coords = initialCoordinatesRef.current || (lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null);

      if (coords) {
        apiFilters.lat = coords.lat;
        apiFilters.lng = coords.lng;
        apiFilters.radius = searchRadius;
      }
    }

    // ✅ DEBUG: Log search parameters
    console.log('🔍 Search parameters:', {
      location: apiFilters.location,
      lat: apiFilters.lat,
      lng: apiFilters.lng,
      category: apiFilters.category,
      bounds: apiFilters.bounds,
      center: apiFilters.center,
      radius: apiFilters.radius,
      guests: apiFilters.guests,
      startDate: apiFilters.startDate,
      endDate: apiFilters.endDate,
      priceRange: apiFilters.priceRange,
      propertyTypes: apiFilters.propertyTypes,
      amenities: apiFilters.amenities
    });

    try {
      if (!useRestAPI) {
        await searchListings(apiFilters, append);
      } else {
        setRestApiLoading(true);
        setRestApiError(null);

        const { listingsAPI } = await import('@/lib/api');
        const response = await listingsAPI.searchListings(apiFilters);

        if (response.success) {
          const newListings = response.data.data.listings || [];

          // Enhanced listing transformation with CONSISTENT coordinate handling (SAME AS HOMEPAGE)
          const transformedListings = newListings.map((listing: any) => {
            // IMPORTANT: Convert GeoJSON [lng, lat] to Google Maps [lat, lng] format
            const coords = listing.location?.coordinates ?
              [listing.location.coordinates[1], listing.location.coordinates[0]] : // Swap [lng, lat] to [lat, lng]
              [36.7538, 3.0588]; // Default to Algiers [lat, lng]

            return {
            id: listing._id || listing.id,
            _id: listing._id || listing.id,
            title: listing.title,
            category: listing.category,
            subcategory: listing.subcategory,
            // IMPORTANT: Set up address structure SAME AS HOMEPAGE
            address: {
              street: listing.address?.street || '',
              city: listing.address?.city || '',
              state: listing.address?.state || '',
              country: listing.address?.country || '',
              zipCode: listing.address?.zipCode || '',
              // Store coordinates in Google Maps [lat, lng] format for consistency
              coordinates: coords
            },
            location: {
              // Keep original for backward compatibility
              coordinates: listing.location?.coordinates || [3.0588, 36.7538]
            },
            // Add displayCoordinates for EnhancedMapView compatibility
            displayCoordinates: coords,
            pricing: {
              basePrice: listing.pricing?.basePrice || 0,
              currency: listing.pricing?.currency || 'DZD',
              convertedPrice: listing.pricing?.convertedPrice,
              cleaningFee: listing.pricing?.cleaningFee || 0,
              serviceFee: listing.pricing?.serviceFee || 0,
              securityDeposit: listing.pricing?.securityDeposit || 0
            },
            stats: {
              averageRating: listing.stats?.averageRating || 0,
              reviewCount: listing.stats?.reviewCount || 0,
              views: listing.stats?.views || 0,
              favorites: listing.stats?.favorites || 0
            },
            images: (listing.images || []).map((img: any) =>
              typeof img === 'string' ? img : (img?.url || img)
            ).filter(Boolean),
            host: listing.host ? {
              _id: listing.host._id || listing.host.id,
              firstName: listing.host.firstName,
              lastName: listing.host.lastName,
              avatar: listing.host.avatar,
              stats: {
                averageRating: listing.host.stats?.averageRating || 0
              },
              hostInfo: {
                superhost: listing.host.hostInfo?.superhost || false
              }
            } : null,
            availability: listing.availability,
            status: listing.status,
            featured: listing.featured,
            // Enhanced category-specific details
            ...(listing.category === 'stay' && {
              propertyDetails: {
                propertyType: listing.stayDetails?.stayType,
                bedrooms: listing.stayDetails?.bedrooms,
                bathrooms: listing.stayDetails?.bathrooms,
                area: listing.stayDetails?.area,
                furnished: listing.stayDetails?.furnished,
                amenities: listing.stayDetails?.amenities || []
              },
              stayDetails: {
                stayType: listing.stayDetails?.stayType,
                bedrooms: listing.stayDetails?.bedrooms,
                bathrooms: listing.stayDetails?.bathrooms,
                area: listing.stayDetails?.area,
                furnished: listing.stayDetails?.furnished,
                amenities: listing.stayDetails?.amenities || []
              }
            }),
            ...(listing.category === 'vehicle' && {
              vehicleDetails: {
                vehicleType: listing.vehicleDetails?.vehicleType,
                make: listing.vehicleDetails?.make,
                model: listing.vehicleDetails?.model,
                year: listing.vehicleDetails?.year,
                transmission: listing.vehicleDetails?.transmission,
                fuelType: listing.vehicleDetails?.fuelType,
                seats: listing.vehicleDetails?.seats,
                features: listing.vehicleDetails?.features || []
              }
            })
          };
          });

          if (append) {
            setRestApiListings(prev => [...prev, ...transformedListings]);
          } else {
            setRestApiListings(transformedListings);
          }
        }
      }
    } catch (error: any) {
      if (useRestAPI) {
        setRestApiError(error.message || t.connection?.failed || 'Failed to search listings');
      }
    } finally {
      if (useRestAPI) {
        setRestApiLoading(false);
      }
    }
  }, [filters, searchListings, isConnected, useRestAPI, vehiclesEnabled]);

  // Update filters when URL params change
  useEffect(() => {
    if (searchParams) {
      setFilters(prev => ({
        ...prev,
        location: searchParams.get('location') || prev.location,
        category: searchParams.get('category') || prev.category,
        checkIn: searchParams.get('checkIn') || prev.checkIn,
        checkOut: searchParams.get('checkOut') || prev.checkOut,
        guests: parseInt(searchParams.get('guests') || '0') || prev.guests,
        adults: parseInt(searchParams.get('adults') || '1') || prev.adults,
        children: parseInt(searchParams.get('children') || '0') || prev.children,
      }));
    }
  }, [searchParams]);

  // Search listings when filters change
  useEffect(() => {
    performSearch(1, false);
  }, [performSearch]);

  // ✅ SIMPLIFIED: Reset coordinates when location changes
  useEffect(() => {
    initialCoordinatesRef.current = null;
  }, [filters.location, filters.category, filters.checkIn, filters.checkOut]);

  // ✅ SIMPLIFIED: Just update filtered listings
  useEffect(() => {
    setFilteredListings(listings);
  }, [listings]);

  // ✅ SIMPLIFIED: Client-side filtering and sorting
  useEffect(() => {
    let filtered = [...listings];

    // Apply instant filters
    if (filters.instantBook) {
      filtered = filtered.filter(l => l.availability?.instantBook);
    }
    if (filters.superhost) {
      filtered = filtered.filter(l => l.host?.hostInfo?.superhost);
    }

    // Apply sorting
    switch (filters.sort) {
      case 'price_low':
        filtered.sort((a, b) => (a.pricing?.basePrice || 0) - (b.pricing?.basePrice || 0));
        break;
      case 'price_high':
        filtered.sort((a, b) => (b.pricing?.basePrice || 0) - (a.pricing?.basePrice || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.stats?.averageRating || 0) - (a.stats?.averageRating || 0));
        break;
      case 'reviews':
        filtered.sort((a, b) => (b.stats?.reviewCount || 0) - (a.stats?.reviewCount || 0));
        break;
      case 'featured':
        filtered.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return (b.stats?.averageRating || 0) - (a.stats?.averageRating || 0);
        });
        break;
    }

    setFilteredListings(filtered);
  }, [listings, filters.instantBook, filters.superhost, filters.sort]);

  // Handle load more
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadMore();
    }
  };

  // Enhanced URL management
  const updateURL = useCallback((newFilters: SearchFilters) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== 'any' && value !== 0 && (Array.isArray(value) ? value.length > 0 : true)) {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, String(value));
        }
      }
    });
    router.push(`/search?${params.toString()}`, { scroll: false });
  }, [router]);

  // Handle filter changes
  const handleFilterChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    updateURL(newFilters);
  };

  // ✅ Enhanced view mode handling with split-screen support (3 modes)
  const handleViewModeChange = (mode: 'list' | 'split' | 'map') => {
    setViewMode(mode);

    // Only open modal on mobile or when explicitly requested
    if (mode === 'map' && window.innerWidth < 768) {
      setIsMapModalOpen(true);
    }

    const params = new URLSearchParams(window.location.search);
    if (mode === 'map' || mode === 'split') {
      params.set('view', mode);
    } else {
      params.delete('view');
    }
    router.push(`/search?${params.toString()}`, { scroll: false });
  };

  // Handle listing interactions
  const handleListingSelect = (id: string) => {
    setSelectedListing(selectedListing === id ? null : id);
  };

  const handleListingHover = (id: string | null) => {
    setHoveredListing(id);
  };

  // ✅ NEW: Handle visible listings change from map (for dynamic list synchronization)
  const handleVisibleListingsChange = useCallback((visibleListings: any[]) => {
    // Save scroll position before updating (always use container scroll now)
    if (listContainerRef.current) {
      scrollPositionRef.current = listContainerRef.current.scrollTop;
    }

    isUpdatingListings.current = true;
    setMapVisibleListings(visibleListings);
  }, []);

  // ✅ NEW: Restore scroll position after list updates
  useEffect(() => {
    if (isUpdatingListings.current && scrollPositionRef.current > 0) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        if (listContainerRef.current) {
          listContainerRef.current.scrollTop = scrollPositionRef.current;
        }
        isUpdatingListings.current = false;
      });
    }
  }, [mapVisibleListings]);

  // ✅ SIMPLIFIED: Map doesn't trigger searches anymore - just displays results

  // Enhanced Loading Skeleton
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
          <div className="aspect-[4/3] bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );

  const seoTitle = useMemo(() => {
    const categoryText = filters.category === 'stays' ? (t.categories?.properties || 'Properties') : (t.categories?.vehicles || 'Vehicles');
    const location = filters.location || (t.seo?.algeria || 'Algeria');
    return `${t.seo?.find || 'Find'} ${categoryText} ${t.seo?.in || 'in'} ${location} - ${t.seo?.baytup || 'Baytup'}`;
  }, [filters, t]);

  const seoDescription = useMemo(() => {
    const categoryText = filters.category === 'stays' ? (t.categories?.accommodations || 'accommodations') : (t.categories?.vehicles?.toLowerCase() || 'vehicles');
    return `${t.seo?.discover || 'Discover and book amazing'} ${categoryText} ${t.seo?.in || 'in'} ${t.seo?.algeria || 'Algeria'}. ${t.seo?.browse || 'Browse'} ${totalResults}+ ${t.seo?.verified || 'verified listings with instant booking, reviews, and competitive prices.'}`;
  }, [filters, totalResults, t]);

  // Enhanced breadcrumb navigation
  const breadcrumbs = [
    { name: t.breadcrumbs?.home || 'Home', href: '/' },
    { name: t.breadcrumbs?.search || 'Search', href: '/search' },
    ...(filters.location ? [{ name: filters.location, href: `/search?location=${filters.location}` }] : [])
  ];

  // Calculate map center from search coordinates
  const mapCenter = useMemo(() => {
    const lat = searchParams?.get('lat');
    const lng = searchParams?.get('lng');

    if (lat && lng) {
      return [parseFloat(lat), parseFloat(lng)] as [number, number];
    }

    // Default Algeria center
    return [36.7538, 3.0588] as [number, number];
  }, [searchParams]);

  // ✅ NEW: Determine which listings to display in list based on view mode
  const listingsToDisplay = useMemo(() => {
    // In split view, show only listings visible on the map
    if (viewMode === 'split' && mapVisibleListings.length > 0) {
      return mapVisibleListings;
    }
    // In list-only view, show all filtered listings
    return filteredListings;
  }, [viewMode, mapVisibleListings, filteredListings]);

  return (
    <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col" style={{ height: '100vh', paddingTop: '72px' }}>
      {/* SEO Head Tags */}
      <head>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
      </head>

      {/* Simplified Compact Header */}
      <div className="bg-white border-b border-gray-200 z-20 shadow-sm flex-shrink-0 mt-3">
        <div className="w-full px-12 py-2.5">
          <div className="flex items-center justify-between">
            {/* Simplified Results Count with Radius and Location */}
            <div className="text-sm text-gray-700">
              {loading ? (
                <span className="inline-block w-48 h-4 bg-gray-200 rounded animate-pulse" />
              ) : (
                <>
                  <span className="font-semibold text-[#FF6B35]">{listingsToDisplay.length}</span>
                  {' '}{listingsToDisplay.length > 1 ? 'logements trouvés' : 'logement trouvé'}
                  {' '}dans un rayon de <span className="font-medium">{searchRadius} km</span>
                  {filters.location && (
                    <> autour de <span className="font-medium">{filters.location.split(',')[0]}</span></>
                  )}
                </>
              )}
            </div>

            {/* Filters Button and View Mode */}
            <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsFiltersModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:border-gray-900 hover:shadow-md transition-all duration-200"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="font-medium">Filtres</span>
                  </button>

                  {/* ✅ View Mode Toggle with 3 modes (List | List+Map | Map) */}
                  <div className="hidden md:flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
                  <button
                    onClick={() => handleViewModeChange('list')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                      viewMode === 'list'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title={t.view?.list || 'List only'}
                  >
                    <Grid3X3 className="w-4 h-4" />
                    {t.view?.list || 'List'}
                  </button>
                  <button
                    onClick={() => handleViewModeChange('split')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                      viewMode === 'split'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title={t.view?.split || 'List + Map (50/50)'}
                  >
                    <Grid3X3 className="w-4 h-4" />
                    <MapPin className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleViewModeChange('map')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                      viewMode === 'map'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title={t.view?.map || 'Map only'}
                  >
                    <MapPin className="w-4 h-4" />
                    {t.view?.map || 'Map'}
                  </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

      {/* Main Content Area - Full Width (Airbnb-style) */}
      <div className="flex-1 overflow-hidden w-full">
        {/* ✅ Sidebar removed - Using Airbnb-style modal filters instead */}

        {/* ✅ Main Results Area with Split-Screen Support (3 modes) */}
        <div className={`h-full ${viewMode === 'split' ? 'flex' : ''}`}>
            {/* List Section (50% in split, 100% in list, hidden in map-only) */}
            {(viewMode === 'list' || viewMode === 'split') && (
              <div
                ref={listContainerRef}
                className={`hide-scrollbar ${viewMode === 'split' ? 'w-1/2 flex-shrink-0 overflow-y-auto h-full' : 'w-full overflow-y-auto h-full'}`}
                onScroll={(e) => {
                  // Track scroll position in real-time (only if not currently updating)
                  if (!isUpdatingListings.current) {
                    if (listContainerRef.current) {
                      scrollPositionRef.current = listContainerRef.current.scrollTop;
                    }
                  }
                }}
              >
                {/* Padding inside scrollable container */}
                <div className={viewMode === 'split' ? 'pl-12 pr-12 py-6' : 'px-12 py-6'}>
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                    {error}
                  </div>
                )}

                {loading && listingsToDisplay.length === 0 ? (
                  <LoadingSkeleton />
                ) : listingsToDisplay.length === 0 ? (
                  /* Enhanced Empty State */
                  <div className="bg-white rounded-3xl shadow-sm p-12 text-center">
                    <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                      <MapPin className="w-16 h-16 text-gray-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">
                      {t.empty?.title || 'No results found'}
                    </h2>
                    <p className="text-gray-600 mb-8 max-w-md mx-auto">
                      {t.empty?.description || 'Try adjusting your filters or search in a different area'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button
                        onClick={() => handleFilterChange({ ...filters, location: '' })}
                        className="px-6 py-3 bg-[#FF6B35] hover:bg-orange-600 text-white rounded-xl font-medium transition-colors duration-200"
                      >
                        {t.empty?.clearLocation || 'Clear Location'}
                      </button>
                      <button
                        onClick={() => window.location.href = '/'}
                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors duration-200"
                      >
                        {t.empty?.backToHome || 'Back to Home'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Connection Status */}
                    {!isConnected && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
                        {t.connection?.offline || 'Using offline mode. Real-time updates disabled.'}
                      </div>
                    )}

                    {/* Enhanced Search Results */}
                    <SearchResults
                      listings={listingsToDisplay}
                      loading={loading}
                      hasMore={hasMore}
                      onLoadMore={handleLoadMore}
                      currency={currency}
                      language={language}
                    />
                  </div>
                )}
                </div>
                {/* End padding div */}
              </div>
            )}

            {/* ✅ Map Section (50% in split, 100% in map-only, hidden in list-only) */}
            {(viewMode === 'split' || viewMode === 'map') && (
              <div className={viewMode === 'split' ? 'w-1/2 flex-shrink-0 h-full pr-12 py-6' : 'w-full h-full px-12 py-6'}>
                <div className="h-full rounded-2xl overflow-hidden shadow-xl">
                  <LeafletMapView
                    listings={listings}
                    center={mapCenter}
                    zoom={10}
                    selectedListing={selectedListing}
                    onListingSelect={handleListingSelect}
                    onListingHover={handleListingHover}
                    onVisibleListingsChange={handleVisibleListingsChange}
                    currency={currency}
                    className="w-full h-full"
                    interactive={true}
                    fitBounds={false}
                  />
                </div>
              </div>
            )}

            {/* Floating Map Button - Only visible in list-only mode */}
            {viewMode === 'list' && listingsToDisplay.length > 0 && (
              <div className="fixed bottom-8 right-8 z-30">
                <button
                  onClick={() => setIsMapModalOpen(true)}
                  className="group flex items-center gap-3 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] hover:from-[#E55A2B] hover:to-[#E57F1B] text-white pl-6 pr-7 py-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                >
                  <MapPin className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span className="font-bold text-base">
                    {t.map?.showCategoryOnMap?.replace('{category}', filters.category === 'stays' ? t.categories?.stays : t.categories?.vehicles) || 'Show on Map'}
                  </span>
                  {listingsToDisplay.length > 0 && (
                    <span className="bg-white/20 text-white text-sm font-semibold px-2.5 py-1 rounded-full">
                      {listingsToDisplay.length}
                    </span>
                  )}
                </button>
              </div>
            )}
        </div>
      </div>

      {/* Enhanced Map Modal - SAME AS HOMEPAGE with persistent filtering */}
      <MapModal
        isOpen={isMapModalOpen}
        onClose={() => {
          setIsMapModalOpen(false);
          setViewMode('list');
        }}
        listings={listings}
        selectedListing={selectedListing}
        onListingSelect={handleListingSelect}
        onListingHover={handleListingHover}
        filters={filters}
        onFilterChange={handleFilterChange}
        title={t.map?.title?.replace('Properties', filters.category === 'stays' ? (t.categories?.stays || 'Stays') : (t.categories?.vehicles || 'Vehicles')) || 'Explore on Map'}
      />

      {/* ✅ Airbnb-style Filters Modal */}
      <FiltersModal
        isOpen={isFiltersModalOpen}
        onClose={() => setIsFiltersModalOpen(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        category={filters.category}
        searchRadius={searchRadius}
        onRadiusChange={setSearchRadius}
        totalResults={listingsToDisplay.length}
        allListings={filteredListings}
      />
    </div>
  );
}

// Enhanced Loading skeleton for the entire page
const SearchPageSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="bg-white border-b">
      <div className="container mx-auto px-4 py-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" />
      </div>
    </div>
    <div className="container mx-auto px-4 py-8">
      <div className="flex gap-8">
        <div className="hidden lg:block w-80">
          <div className="bg-white rounded-2xl h-96 animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="aspect-[4/3] bg-gray-200 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Main component with enhanced Suspense boundary
export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <SearchPageContent />
    </Suspense>
  );
}