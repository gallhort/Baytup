'use client';

import React, { useState, useEffect, useCallback, Suspense, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSocketListings, useSocketConnection } from '@/hooks/useSocket';
import FilterSidebar from '@/components/search/FilterSidebar';
import HorizontalFilters from '@/components/search/HorizontalFilters';
import HorizontalFilterChips from '@/components/search/HorizontalFilterChips';
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
    )
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
  // ✅ Abritel-style: Search on map move
  const [searchOnMapMove, setSearchOnMapMove] = useState(false);

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
    <div className="bg-white flex flex-col" style={{ height: '100vh', paddingTop: '72px' }}>
      {/* SEO Head Tags */}
      <head>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
      </head>

      {/* Abritel-style Top Bar with Horizontal Filters */}
      <div className="bg-white border-b border-gray-200 z-20 shadow-sm flex-shrink-0">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          {/* Results count - Abritel style: "18 logements • Ville" */}
          <div className="py-3">
            <div className="text-base font-normal text-gray-900">
              {loading ? (
                <span className="inline-block w-48 h-5 bg-gray-200 rounded animate-pulse" />
              ) : (
                <>
                  <span className="font-semibold">{listingsToDisplay.length}</span>
                  {' '}{listingsToDisplay.length > 1 ? 'logements' : 'logement'}
                  {filters.location && (
                    <>
                      {' '}• <span className="font-normal">{filters.location.split(',')[0]}</span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Horizontal Filter Chips */}
          <HorizontalFilterChips
            onFiltersClick={() => setIsFiltersModalOpen(true)}
            activeFiltersCount={0}
            sortValue={filters.sort}
            onSortChange={(value) => handleFilterChange({ ...filters, sort: value })}
            searchOnMapMove={searchOnMapMove}
            onSearchOnMapMoveChange={setSearchOnMapMove}
          />
        </div>
      </div>

      {/* Abritel-style Split Screen Layout: 40% List + 60% Map (Fixed) */}
      <div className="flex-1 overflow-hidden w-full flex">
        {/* Left: Listings Panel (40% - Scrollable) */}
        <div
          ref={listContainerRef}
          className="w-full lg:w-[40%] flex-shrink-0 overflow-y-auto hide-scrollbar bg-gray-50"
        >
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                {error}
              </div>
            )}

            {loading && listingsToDisplay.length === 0 ? (
              <div className="space-y-4">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 flex h-[185px]">
                    <div className="w-[140px] lg:w-[150px] bg-gray-200 animate-pulse" />
                    <div className="flex-1 p-4 flex justify-between gap-4">
                      <div className="flex-1 space-y-2.5">
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-1/4" />
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-3/5" />
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-2/5 mt-auto" />
                      </div>
                      <div className="w-32 space-y-1.5 flex flex-col items-end justify-end">
                        <div className="h-6 bg-gray-200 rounded animate-pulse w-24" />
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : listingsToDisplay.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                  <MapPin className="w-12 h-12 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Aucun logement trouvé
                </h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Essayez d'ajuster vos filtres ou de chercher dans une autre zone
                </p>
                <button
                  onClick={() => handleFilterChange({ ...filters, location: '' })}
                  className="px-6 py-3 bg-[#FF6B35] hover:bg-orange-600 text-white rounded-xl font-medium transition-colors duration-200"
                >
                  Effacer la localisation
                </button>
              </div>
            ) : (
              <div>
                {/* Connection Status */}
                {!isConnected && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
                    Mode hors ligne. Mises à jour en temps réel désactivées.
                  </div>
                )}

                {/* Abritel-style Search Results */}
                <SearchResults
                  listings={listingsToDisplay}
                  loading={loading}
                  hasMore={hasMore}
                  onLoadMore={handleLoadMore}
                  currency={currency}
                  language={language}
                  onListingHover={handleListingHover}
                  hoveredListing={hoveredListing}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: Map Panel (60% - Fixed, hidden on mobile) */}
        <div className="hidden lg:block lg:w-[60%] flex-shrink-0 h-full relative bg-gray-100">
          <div className="h-full w-full">
            <LeafletMapView
              listings={listings}
              center={mapCenter}
              zoom={12}
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

        {/* Mobile: Floating Map Button (only visible on mobile) */}
        <div className="lg:hidden fixed bottom-6 right-6 z-30">
          <button
            onClick={() => setIsMapModalOpen(true)}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-3 rounded-full shadow-2xl transition-all duration-300"
          >
            <MapPin className="w-5 h-5" />
            <span className="font-bold">Carte</span>
            {listingsToDisplay.length > 0 && (
              <span className="bg-white/20 text-white text-sm font-semibold px-2 py-0.5 rounded-full">
                {listingsToDisplay.length}
              </span>
            )}
          </button>
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