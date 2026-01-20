import { useEffect, useState, useCallback, useRef } from 'react';
import socketService from '@/lib/socket';

// Hook for general socket connection status
export const useSocketConnection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const updateConnectionStatus = () => {
      setIsConnected(socketService.getConnectionStatus());
      setConnectionError(null);
    };

    const handleConnectionError = () => {
      setConnectionError('Failed to connect to server');
    };

    // Set initial status
    updateConnectionStatus();

    // Set up listeners
    const unsubscribeConnect = socketService.onConnect(updateConnectionStatus);
    const unsubscribeDisconnect = socketService.onDisconnect(() => {
      setIsConnected(false);
      setConnectionError('Connection lost');
    });

    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
    };
  }, []);

  return { isConnected, connectionError };
};

// Hook for listings with Socket.IO
export const useSocketListings = () => {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const currentFiltersRef = useRef<any>(null);

  // Search listings via Socket.IO
  const searchListings = useCallback(async (filters: any, append = false) => {
    try {
      setLoading(true);
      setError(null);
      currentFiltersRef.current = filters;

      // Wait for socket connection
      await socketService.waitForConnection();

      // Join the appropriate room
      socketService.joinListingsRoom(filters);

      // Perform search
      const response = await socketService.searchListings(filters);

      if (response.success) {
        const newListings = response.data.data?.listings || [];
        const pagination = response.data.pagination || {};

        // Transform listings to match expected interface
        const transformedListings = newListings.map((listing: any) => {
          // Convert GeoJSON [lng, lat] to Google Maps [lat, lng] format
          const coords = listing.location?.coordinates ?
            [listing.location.coordinates[1], listing.location.coordinates[0]] :
            [36.7538, 3.0588];

          return {
          id: listing._id || listing.id,
          _id: listing._id || listing.id, // MapView compatibility
          title: listing.title,
          category: listing.category,
          subcategory: listing.subcategory,
          address: listing.address,
          location: {
            coordinates: coords
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
            firstName: listing.host.firstName,
            lastName: listing.host.lastName,
            avatar: listing.host.avatar,
            hostInfo: listing.host.hostInfo || {}
          } : null,
          availability: listing.availability,
          status: listing.status,
          featured: listing.featured,
          // Category-specific details - provide both formats for component compatibility
          ...(listing.category === 'stay' && {
            // For SearchResults component
            propertyDetails: {
              propertyType: listing.stayDetails?.stayType,
              bedrooms: listing.stayDetails?.bedrooms,
              bathrooms: listing.stayDetails?.bathrooms,
              area: listing.stayDetails?.area,
              furnished: listing.stayDetails?.furnished,
              amenities: listing.stayDetails?.amenities || []
            },
            // For MapView component compatibility
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
          setListings(prev => [...prev, ...transformedListings]);
        } else {
          setListings(transformedListings);
        }

        setHasMore(pagination.hasNext || false);
        setTotalResults(pagination.total || 0);
      } else {
        throw new Error(response.error || 'Search failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search listings');
      if (!append) {
        setListings([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Load more listings (for pagination)
  const loadMore = useCallback(() => {
    if (!loading && hasMore && currentFiltersRef.current) {
      const nextPageFilters = {
        ...currentFiltersRef.current,
        page: (currentFiltersRef.current.page || 1) + 1
      };
      searchListings(nextPageFilters, true);
    }
  }, [loading, hasMore, searchListings]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = socketService.onListingsUpdate((data) => {

      if (data.type === 'new_listing' && currentFiltersRef.current) {
        // Check if new listing matches current filters
        const matchesFilter = !currentFiltersRef.current.category ||
                            data.listing.category === currentFiltersRef.current.category;

        if (matchesFilter) {
          setListings(prev => [data.listing, ...prev]);
          setTotalResults(prev => prev + 1);
        }
      } else if (data.type === 'listing_updated') {
        setListings(prev => prev.map(listing =>
          listing.id === data.listing.id ? { ...listing, ...data.listing } : listing
        ));
      } else if (data.type === 'listing_deleted') {
        setListings(prev => prev.filter(listing => listing.id !== data.listingId));
        setTotalResults(prev => Math.max(0, prev - 1));
      }
    });

    return unsubscribe;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      socketService.leaveListingsRoom();
    };
  }, []);

  return {
    listings,
    loading,
    error,
    hasMore,
    totalResults,
    searchListings,
    loadMore
  };
};

// Hook for individual listing with Socket.IO
export const useSocketListing = (listingId: string) => {
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch single listing
  const fetchListing = useCallback(async () => {
    if (!listingId) return;

    try {
      setLoading(true);
      setError(null);

      // Wait for socket connection
      await socketService.waitForConnection();

      // Join listing room for real-time updates
      socketService.joinListingRoom(listingId);

      // For now, we'll still use the REST API for individual listings
      // as it's more efficient for single requests
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listings/${listingId}`);

      if (response.ok) {
        const data = await response.json();
        setListing(data.data.listing);
      } else {
        throw new Error('Failed to fetch listing');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load listing');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  // Subscribe to real-time updates for this listing
  useEffect(() => {
    if (!listingId) return;

    const unsubscribe = socketService.onListingUpdate(listingId, (data) => {
      setListing((prev: any) => prev ? { ...prev, ...data } : data);
    });

    return unsubscribe;
  }, [listingId]);

  // Fetch listing on mount and when listingId changes
  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (listingId) {
        socketService.leaveListingRoom(listingId);
      }
    };
  }, [listingId]);

  return {
    listing,
    loading,
    error,
    refetch: fetchListing
  };
};

// Hook for generic socket events
export const useSocketEvent = (event: string, handler: (data: any) => void) => {
  useEffect(() => {
    const unsubscribe = socketService.on(event, handler);
    return unsubscribe;
  }, [event, handler]);
};