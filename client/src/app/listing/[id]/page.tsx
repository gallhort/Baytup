'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Share2, Star, MapPin, Users, Bed, Bath, Home,
  Wifi, Car, Calendar, Clock, Shield, Award, ChevronLeft,
  ChevronRight, X, Check, AlertCircle, MessageCircle, Phone,
  Mail, Globe, Sparkles, Camera, Maximize2, Info, Flag,
  CheckCircle, Ban, Baby, Cigarette, Music, Dog, Copy, Check as CheckIcon,
  Heart, DollarSign, Zap, TrendingUp, Package, Gauge,
  Droplet, Settings, Wind, Sun
} from 'lucide-react';
import { Listing, Review as ReviewType } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useApp } from '@/contexts/AppContext';
import { getImageUrl } from '@/utils/imageUtils';
import { formatPrice, convertCurrency } from '@/utils/priceUtils';
import WishlistButton from '@/components/WishlistButton';
import LoadingSpinner from '@/components/LoadingSpinner';
import BookingModal from '@/components/booking/BookingModal';
import dynamic from 'next/dynamic';

// Dynamically import LeafletMap to avoid SSR issues (100% FREE - no Google Maps)
const LeafletMap = dynamic(
  () => import('@/components/listing/LeafletMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[480px] bg-gray-100 rounded-2xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }
);

// Import types
interface Host {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  stats?: {
    averageRating: number;
    totalReviews: number;
  };
  hostInfo?: {
    superhost: boolean;
    hostSince?: string;
    responseRate?: number;
    responseTime?: number;
  };
}

// Amenities icons mapping
const amenityIcons: { [key: string]: any } = {
  wifi: Wifi,
  parking: Car,
  pool: Home,
  gym: Users,
  garden: Home,
  terrace: Home,
  elevator: Home,
  security: Shield,
  ac: Wind,
  heating: Sun,
  kitchen: Home,
  balcony: Home,
  tv: Home,
  washer: Home,
  beach_access: MapPin,
  mountain_view: MapPin,
  // Vehicle features
  gps: MapPin,
  bluetooth: Wifi,
  sunroof: Car,
  backup_camera: Camera,
  cruise_control: Car,
  heated_seats: Sun,
  wifi_hotspot: Wifi,
  child_seat: Baby,
  ski_rack: Car,
  bike_rack: Car
};

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, currency } = useLanguage();
  const t = useTranslation('listing');
  const { state } = useApp();
  const currentUser = state.user;

  const [listing, setListing] = useState<Listing | null>(null);
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [copied, setCopied] = useState(false);

  // Guest photos state
  const [guestPhotos, setGuestPhotos] = useState<{ url: string; caption: string; reviewerName: string }[]>([]);
  const [showGuestPhotoLightbox, setShowGuestPhotoLightbox] = useState(false);
  const [guestPhotoIndex, setGuestPhotoIndex] = useState(0);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Booking state - initialized from URL params if available
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestDetails, setGuestDetails] = useState({
    adults: 1,
    children: 0,
    infants: 0
  });
  const [dateError, setDateError] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showDesktopCalendar, setShowDesktopCalendar] = useState(false);

  // ✅ NEW: Initialize booking state from URL params (from search page)
  useEffect(() => {
    const urlCheckIn = searchParams?.get('checkIn');
    const urlCheckOut = searchParams?.get('checkOut');
    const urlGuests = searchParams?.get('guests');
    const urlAdults = searchParams?.get('adults');
    const urlChildren = searchParams?.get('children');

    if (urlCheckIn) setCheckIn(urlCheckIn);
    if (urlCheckOut) setCheckOut(urlCheckOut);
    if (urlAdults || urlChildren || urlGuests) {
      setGuestDetails({
        adults: urlAdults ? parseInt(urlAdults) : (urlGuests ? parseInt(urlGuests) : 1),
        children: urlChildren ? parseInt(urlChildren) : 0,
        infants: 0
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (params?.id) {
      fetchListingDetails(params.id as string);
    }
  }, [params?.id]);

  // ✅ FIX BQ-39: Keyboard navigation for lightbox (Escape, Arrow keys)
  useEffect(() => {
    if (!showAllPhotos) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAllPhotos(false);
      } else if (e.key === 'ArrowLeft') {
        prevImage();
      } else if (e.key === 'ArrowRight') {
        nextImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAllPhotos]);

  // ✅ FIX: Disable body scroll and handle browser back button when lightbox is open
  useEffect(() => {
    if (showAllPhotos) {
      // Disable body scroll
      document.body.style.overflow = 'hidden';

      // Push a new history state so back button closes lightbox instead of navigating away
      window.history.pushState({ lightboxOpen: true }, '');

      // Handle back button
      const handlePopState = (e: PopStateEvent) => {
        setShowAllPhotos(false);
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        // Re-enable body scroll
        document.body.style.overflow = 'unset';
        window.removeEventListener('popstate', handlePopState);
      };
    } else {
      // Ensure body scroll is enabled when lightbox closes
      document.body.style.overflow = 'unset';
    }
  }, [showAllPhotos]);

  const fetchListingDetails = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listings/${id}`);

      if (!response.ok) {
        console.error('[ListingDetail] HTTP Error:', response.status);
        throw new Error((t as any)?.errors?.fetchError || 'Failed to fetch listing details');
      }

      const data = await response.json();

      // ✅ Support de multiples structures de réponse
      let listingData = null;
      
      // Structure 1: { status: 'success', data: { listing: {...} } }
      if (data.status === 'success' && data.data?.listing) {
        listingData = data.data.listing;
      } 
      // Structure 2: { data: { listing: {...} } }
      else if (data.data?.listing) {
        listingData = data.data.listing;
      }
      // Structure 3: { data: {...} }
      else if (data.data && data.data._id) {
        listingData = data.data;
      } 
      // Structure 4: { listing: {...} }
      else if (data.listing) {
        listingData = data.listing;
      } 
      // Structure 5: {...} (direct object)
      else if (data._id) {
        listingData = data;
      }

      if (listingData && (listingData._id || listingData.id)) {
        setListing(listingData);

        // Fetch reviews for this listing
        fetchReviews(listingData._id || listingData.id);
      } else {
        console.error('[ListingDetail] Invalid listing data:', data);
        throw new Error((t as any)?.errors?.notFound || 'Listing not found');
      }
    } catch (err: any) {
      console.error('[ListingDetail] Error fetching listing:', err);
      setError(err.message || (t as any)?.errors?.loadError || 'Failed to load listing');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (listingId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reviews?listing=${listingId}&status=published&limit=50`);

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.data?.reviews) {
          setReviews(data.data.reviews);

          // Extract guest photos from all reviews
          const allPhotos: { url: string; caption: string; reviewerName: string }[] = [];
          data.data.reviews.forEach((review: any) => {
            if (review.photos && review.photos.length > 0) {
              const name = typeof review.reviewer === 'object' ? review.reviewer.firstName : 'Voyageur';
              review.photos.forEach((photo: any) => {
                allPhotos.push({
                  url: photo.url,
                  caption: photo.caption || '',
                  reviewerName: name
                });
              });
            }
          });
          setGuestPhotos(allPhotos);
        }
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const shareText = listing?.category === 'stay' ? (t as any)?.share?.property : (t as any)?.share?.vehicle;

    if (navigator.share) {
      try {
        await navigator.share({
          title: listing?.title,
          text: shareText || `Check out this ${listing?.category === 'stay' ? 'property' : 'vehicle'} on Baytup`,
          url: url,
        });
      } catch (err) {
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const nextImage = () => {
    if (listing?.images) {
      setCurrentImageIndex((prev) => (prev + 1) % listing.images.length);
    }
  };

  const prevImage = () => {
    if (listing?.images) {
      setCurrentImageIndex((prev) => (prev - 1 + listing.images.length) % listing.images.length);
    }
  };

  const getImageFromListing = (img: any) => {
    if (typeof img === 'string') {
      return getImageUrl(img);
    }
    return getImageUrl(img?.url || img);
  };

  // Helper function to get amenity name
  const getAmenityName = (amenity: string) => {
    const amenityKey = amenity.replace(/_/g, '');
    const camelCaseKey = amenityKey.charAt(0).toLowerCase() + amenityKey.slice(1).replace(/[A-Z]/g, letter => letter.toLowerCase());

    // Map amenity keys to translation keys
    const amenityMap: { [key: string]: string } = {
      'wifi': 'wifi',
      'parking': 'parking',
      'pool': 'pool',
      'gym': 'gym',
      'garden': 'garden',
      'terrace': 'terrace',
      'elevator': 'elevator',
      'security': 'security',
      'ac': 'ac',
      'heating': 'heating',
      'kitchen': 'kitchen',
      'balcony': 'balcony',
      'tv': 'tv',
      'washer': 'washer',
      'beach_access': 'beachAccess',
      'beachaccess': 'beachAccess',
      'mountain_view': 'mountainView',
      'mountainview': 'mountainView',
      'gps': 'gps',
      'bluetooth': 'bluetooth',
      'sunroof': 'sunroof',
      'backup_camera': 'backupCamera',
      'backupcamera': 'backupCamera',
      'cruise_control': 'cruiseControl',
      'cruisecontrol': 'cruiseControl',
      'heated_seats': 'heatedSeats',
      'heatedseats': 'heatedSeats',
      'wifi_hotspot': 'wifiHotspot',
      'wifihotspot': 'wifiHotspot',
      'child_seat': 'childSeat',
      'childseat': 'childSeat',
      'ski_rack': 'skiRack',
      'skirack': 'skiRack',
      'bike_rack': 'bikeRack',
      'bikerack': 'bikeRack'
    };

    const translationKey = amenityMap[amenity.toLowerCase()] || amenityMap[camelCaseKey];
    return translationKey ? (t as any)?.amenities?.[translationKey] || amenity : amenity;
  };

  // Helper function to get vehicle type label
  const getVehicleTypeLabel = (type: string) => {
    return (t as any)?.vehicleTypes?.[type] || type;
  };

  // Helper function to get transmission label
  const getTransmissionLabel = (transmission: string) => {
    return (t as any)?.transmission?.[transmission] || transmission;
  };

  // Helper function to get fuel type label
  const getFuelTypeLabel = (fuelType: string) => {
    return (t as any)?.fuelTypes?.[fuelType] || fuelType;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-lg">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{(t as any)?.errors?.notFound || 'Listing Not Found'}</h2>
          <p className="text-gray-600 mb-6">{error || (t as any)?.errors?.notFoundDescription || 'The listing you are looking for does not exist.'}</p>
          <button
            onClick={() => router.push('/search')}
            className="px-6 py-3 bg-[#FF6B35] text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
          >
            {(t as any)?.errors?.browseListings || 'Browse Listings'}
          </button>
        </div>
      </div>
    );
  }

  const host = (typeof listing.host === 'string' ? { _id: listing.host } : listing.host) as Host;
  const displayImages = listing.images || [];
  const hasMultipleImages = displayImages.length > 1;

  // Calculate total price for selected dates
  const calculateTotalPrice = () => {
    if (!checkIn || !checkOut) return 0;

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (nights <= 0) return 0;

    const subtotal = (listing.pricing?.basePrice || 0) * nights;
    const cleaningFee = listing.pricing?.cleaningFee || 0;
    // Baytup fee: 8% on (subtotal + cleaning), no taxes
    const baseAmount = subtotal + cleaningFee;
    const serviceFee = Math.round(baseAmount * 0.08); // 8% service fee

    return subtotal + cleaningFee + serviceFee;
  };

  // ✅ FIX: Calculate max capacity based on listing details
  const getMaxCapacity = (): number => {
    if (!listing) return 2; // Default minimum capacity

    // ✅ PRIORITY #1: Use host-defined capacity if available (for both stays and vehicles)
    if (listing.category === 'stay' && listing.stayDetails?.capacity) {
      return listing.stayDetails.capacity;
    }
    if (listing.category === 'vehicle' && listing.vehicleDetails?.capacity) {
      return listing.vehicleDetails.capacity;
    }

    // ⚠️ FALLBACK: Calculate capacity when host hasn't specified one

    // For vehicles: use seats as fallback
    if (listing.category === 'vehicle' && listing.vehicleDetails?.seats) {
      return listing.vehicleDetails.seats;
    }

    // For stays: use bedrooms (heuristic: 2 people per bedroom + 2 for living space)
    if (listing.category === 'stay' && listing.stayDetails?.bedrooms) {
      return Math.max(2, listing.stayDetails.bedrooms * 2 + 2);
    }

    // Default fallback based on stay type
    if (listing.category === 'stay') {
      const stayType = listing.stayDetails?.stayType;
      if (stayType === 'studio' || stayType === 'room') return 2;
      if (stayType === 'apartment') return 4;
      if (stayType === 'house' || stayType === 'villa') return 6;
      if (stayType === 'riad' || stayType === 'guesthouse') return 8;
      return 4; // Default for stays
    }

    return 2; // Absolute minimum
  };

  const maxCapacity = getMaxCapacity();
  const totalGuests = guestDetails.adults + guestDetails.children + guestDetails.infants;

  // ✅ FIX: Check if listing accepts the user's selected currency
  const listingAcceptsCurrency = (targetCurrency: string): boolean => {
    const primaryCurrency = listing?.pricing?.currency || 'DZD';
    const altCurrency = (listing?.pricing as any)?.altCurrency;

    return primaryCurrency === targetCurrency || altCurrency === targetCurrency;
  };

  // ✅ FIX: Get the appropriate price for the user's currency
  const getDisplayPrice = (amount: number, isAltAmount?: number): { price: string; isConverted: boolean } => {
    const primaryCurrency = listing?.pricing?.currency || 'DZD';
    const altCurrency = (listing?.pricing as any)?.altCurrency;
    const userCurrency = currency as 'DZD' | 'EUR';

    // If user's currency matches primary, use primary price
    if (primaryCurrency === userCurrency) {
      return { price: formatPrice(amount, primaryCurrency), isConverted: false };
    }

    // If user's currency matches alt and alt price exists, use alt price
    if (altCurrency === userCurrency && isAltAmount !== undefined) {
      return { price: formatPrice(isAltAmount, altCurrency), isConverted: false };
    }

    // Otherwise, convert from primary (indicative price)
    const convertedAmount = convertCurrency(amount, primaryCurrency as 'DZD' | 'EUR', userCurrency);
    return { price: formatPrice(convertedAmount, userCurrency), isConverted: true };
  };

  // Helper to display price (simplified for template)
  const displayPrice = (amount: number): string => {
    const result = getDisplayPrice(amount);
    return result.price;
  };

  // Check if we need to show currency warning
  const showCurrencyWarning = !listingAcceptsCurrency(currency);

  // JSON-LD structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': listing.category === 'vehicle' ? 'Product' : 'LodgingBusiness',
    name: listing.title,
    description: listing.description,
    image: displayImages.map((img: any) => getImageUrl(img.url)),
    address: {
      '@type': 'PostalAddress',
      streetAddress: listing.address?.street,
      addressLocality: listing.address?.city,
      addressRegion: listing.address?.state,
      addressCountry: listing.address?.country || 'DZ'
    },
    ...(listing.location?.coordinates ? {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: listing.location.coordinates[1],
        longitude: listing.location.coordinates[0]
      }
    } : {}),
    ...((listing.stats?.reviewCount ?? 0) > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: listing.stats.averageRating,
        reviewCount: listing.stats.reviewCount,
        bestRating: 5,
        worstRating: 1
      }
    } : {}),
    offers: {
      '@type': 'Offer',
      price: listing.pricing?.basePrice,
      priceCurrency: listing.pricing?.currency || 'DZD',
      availability: listing.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Booking Modal */}
      <BookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        listing={listing}
        checkIn={checkIn}
        checkOut={checkOut}
        guests={guestDetails}
        onGuestsChange={setGuestDetails}
      />

      {/* ✅ FIX BQ-37, BQ-38, BQ-39: Lightbox Modal with Navigation */}
      {showAllPhotos && (
        <div
          className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          onClick={(e) => {
            // Close only if clicking on backdrop, not on image
            if (e.target === e.currentTarget) {
              setShowAllPhotos(false);
            }
          }}
        >
          {/* Close Button */}
          <button
            onClick={() => setShowAllPhotos(false)}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-20"
            aria-label="Close gallery"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Image Counter */}
          <div className="absolute top-4 left-4 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full z-20">
            <span className="text-white font-medium">
              {currentImageIndex + 1} / {displayImages.length}
            </span>
          </div>

          {/* Previous Button */}
          {displayImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-20"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-8 h-8 text-white" />
            </button>
          )}

          {/* Current Image */}
          <div className="max-w-7xl max-h-[90vh] px-16 py-8">
            <img
              src={getImageFromListing(displayImages[currentImageIndex])}
              alt={`${listing.title} - Photo ${currentImageIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onError={(e) => {
                e.currentTarget.src = getImageUrl('');
              }}
            />
          </div>

          {/* Next Button */}
          {displayImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-20"
              aria-label="Next image"
            >
              <ChevronRight className="w-8 h-8 text-white" />
            </button>
          )}

          {/* Thumbnail Strip */}
          {displayImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90vw] px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full z-20">
              {displayImages.slice(0, 10).map((img, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(index);
                  }}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentImageIndex
                      ? 'border-white scale-110'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={getImageFromListing(img)}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
              {displayImages.length > 10 && (
                <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center">
                  <span className="text-white text-sm">+{displayImages.length - 10}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 bg-white z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                const fromEditor = searchParams.get('from') === 'editor';
                if (fromEditor && params.id) {
                  router.push(`/dashboard/my-listings/edit/${params.id}`);
                } else {
                  router.back();
                }
              }}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Retour"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={handleShare}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Partager"
              >
                {copied ? <CheckIcon className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
              </button>
              <WishlistButton
                listingId={listing._id || listing.id || ''}
                size="md"
                showTooltip={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Section */}
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900 mb-2">{listing.title}</h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-700">
            {listing.stats?.reviewCount && listing.stats.reviewCount > 0 ? (
              <>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-current text-gray-900" />
                  <span className="font-medium">{listing.stats?.averageRating?.toFixed(1)}</span>
                </div>
                <span>·</span>
                <span className="underline">{listing.stats.reviewCount} {listing.stats.reviewCount > 1 ? 'commentaires' : 'commentaire'}</span>
                <span>·</span>
              </>
            ) : (
              <>
                <span className="text-gray-500">Nouveau</span>
                <span>·</span>
              </>
            )}
            {host?.hostInfo?.superhost && (
              <>
                <div className="flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  <span>Superhôte</span>
                </div>
                <span>·</span>
              </>
            )}
            {((listing.stats?.averageRating || 0) >= 4.7 && (listing.stats?.reviewCount || 0) >= 3) && (
              <>
                <div className="flex items-center gap-1 text-rose-600">
                  <Heart className="w-4 h-4 fill-current" />
                  <span className="font-medium">Coup de coeur</span>
                </div>
                <span>·</span>
              </>
            )}
            <span className="underline">
              {listing.address?.city}, {listing.address?.country}
            </span>
          </div>
        </div>

        {/* Images - Mobile Carousel / Desktop Grid */}
        <div className="mb-8 rounded-2xl overflow-hidden">
          {displayImages.length === 0 ? (
            <div className="aspect-[16/9] bg-gray-200 flex items-center justify-center">
              <Camera className="w-16 h-16 text-gray-400" />
            </div>
          ) : (
            <>
              {/* Mobile: Full-width carousel */}
              <div className="lg:hidden relative">
                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                  <img
                    src={getImageFromListing(displayImages[currentImageIndex])}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = getImageUrl('');
                    }}
                    onClick={() => setShowAllPhotos(true)}
                  />
                  {/* Image counter badge */}
                  <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full">
                    <span className="text-white text-sm font-medium">
                      {currentImageIndex + 1} / {displayImages.length}
                    </span>
                  </div>
                  {/* Navigation arrows */}
                  {displayImages.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); prevImage(); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); nextImage(); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Desktop: Grid layout */}
              <div className="hidden lg:grid grid-cols-4 gap-2 h-[500px]">
                {/* Main large image */}
                <div
                  className="col-span-2 row-span-2 relative group cursor-pointer"
                  onClick={() => {
                    setCurrentImageIndex(0);
                    setShowAllPhotos(true);
                  }}
                >
                  <img
                    src={getImageFromListing(displayImages[0])}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:brightness-90 transition-all"
                    onError={(e) => {
                      e.currentTarget.src = getImageUrl('');
                    }}
                  />
                </div>

                {/* Smaller images */}
                {displayImages.slice(1, 5).map((img, index) => (
                  <div
                    key={index}
                    className="relative group cursor-pointer"
                    onClick={() => {
                      setCurrentImageIndex(index + 1);
                      setShowAllPhotos(true);
                    }}
                  >
                    <img
                      src={getImageFromListing(img)}
                      alt={`${listing.title} - Photo ${index + 2}`}
                      className="w-full h-full object-cover group-hover:brightness-90 transition-all"
                      onError={(e) => {
                        e.currentTarget.src = getImageUrl('');
                      }}
                    />
                    {index === 3 && displayImages.length > 5 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <button className="flex items-center gap-2 px-6 py-3 bg-white rounded-xl font-semibold hover:scale-105 transition-transform">
                          <Maximize2 className="w-5 h-5" />
                          {(t as any)?.imageGallery?.showAll?.replace('{count}', displayImages.length.toString()) || `Voir les ${displayImages.length} photos`}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Host Info */}
            <div className="pb-8 border-b border-gray-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-2xl font-semibold text-gray-900 mb-2">
                    {listing.category === 'stay' ? (t as any)?.host?.propertyHostedBy || 'Logement entier hébergé par' : (t as any)?.host?.vehicleHostedBy || 'Véhicule proposé par'} {host?.firstName}
                  </h2>
                  {listing.category === 'stay' && listing.stayDetails && (
                    <div className="text-sm md:text-base text-gray-600">
                      <span>
                        {[
                          listing.stayDetails.capacity && `${listing.stayDetails.capacity} voyageurs`,
                          listing.stayDetails.bedrooms !== undefined && listing.stayDetails.bedrooms > 0 && `${listing.stayDetails.bedrooms} ${listing.stayDetails.bedrooms > 1 ? 'chambres' : 'chambre'}`,
                          (listing.stayDetails as any).beds !== undefined && (listing.stayDetails as any).beds > 0 && `${(listing.stayDetails as any).beds} ${(listing.stayDetails as any).beds > 1 ? 'lits' : 'lit'}`,
                          listing.stayDetails.bathrooms !== undefined && listing.stayDetails.bathrooms > 0 && `${listing.stayDetails.bathrooms} ${listing.stayDetails.bathrooms > 1 ? 'salles de bain' : 'salle de bain'}`
                        ].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  )}
                  {listing.category === 'vehicle' && listing.vehicleDetails && (
                    <div className="text-sm md:text-base text-gray-600 mt-1">
                      <span>
                        {[
                          listing.vehicleDetails.make && listing.vehicleDetails.model && `${listing.vehicleDetails.make} ${listing.vehicleDetails.model}`,
                          listing.vehicleDetails.year && `${listing.vehicleDetails.year}`,
                          listing.vehicleDetails.seats && `${listing.vehicleDetails.seats} places`,
                          listing.vehicleDetails.transmission && getTransmissionLabel(listing.vehicleDetails.transmission),
                          listing.vehicleDetails.fuelType && getFuelTypeLabel(listing.vehicleDetails.fuelType)
                        ].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {host?.avatar ? (
                    <img
                      src={getImageUrl(host.avatar)}
                      alt={`${host.firstName} ${host.lastName}`}
                      className="w-16 h-16 rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/uploads/users/default-avatar.png';
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B35] to-[#F7931E] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-2xl">
                        {host?.firstName?.charAt(0)}{host?.lastName?.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {host?.hostInfo && (host.hostInfo.responseRate || host.hostInfo.responseTime || host.stats?.totalReviews) && (
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
                  {host.stats?.totalReviews && host.stats.totalReviews > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      <span>{host.stats.totalReviews} avis</span>
                    </div>
                  )}
                  {host.hostInfo.responseRate && (
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      <span>Taux de réponse : {host.hostInfo.responseRate}%</span>
                    </div>
                  )}
                  {host.hostInfo.responseTime && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>Répond en moins de {host.hostInfo.responseTime}h</span>
                    </div>
                  )}
                </div>
              )}

              {/* Contact Host Button */}
              {currentUser && host && (currentUser as any)._id !== host._id && (
                <button
                  onClick={() => router.push(`/dashboard/messages?user=${host._id}&listing=${listing.id || (listing as any)._id}`)}
                  className="mt-4 text-gray-900 underline font-medium text-sm"
                >
                  Contacter l'hôte
                </button>
              )}
              {!currentUser && (
                <button
                  onClick={() => router.push(`/login?redirect=/listing/${params.id}`)}
                  className="mt-4 text-gray-500 underline text-sm"
                >
                  Connectez-vous pour contacter l'hôte
                </button>
              )}
            </div>

            {/* Description */}
            <div className="pb-8 border-b border-gray-200">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
              {listing.description && listing.description.length > 200 && (
                <button className="mt-3 text-gray-900 underline font-medium text-sm flex items-center gap-1">
                  Afficher plus
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Amenities/Features */}
            <div className="pb-8 border-b border-gray-200">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6">
                {listing.category === 'stay' ? (t as any)?.amenities?.title || 'Ce que propose ce logement' : (t as any)?.amenities?.featuresTitle || 'Équipements'}
              </h2>

              {listing.category === 'stay' && listing.stayDetails?.amenities ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {(showAllAmenities ? listing.stayDetails.amenities : listing.stayDetails.amenities.slice(0, 6)).map((amenity, index) => {
                    const Icon = amenityIcons[amenity] || Check;
                    return (
                      <div key={index} className="flex items-center gap-3 py-2">
                        <Icon className="w-6 h-6 text-gray-700" />
                        <span className="text-gray-700">{getAmenityName(amenity)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : listing.category === 'vehicle' && listing.vehicleDetails?.features ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {(showAllAmenities ? listing.vehicleDetails.features : listing.vehicleDetails.features.slice(0, 6)).map((feature, index) => {
                    const Icon = amenityIcons[feature] || Check;
                    return (
                      <div key={index} className="flex items-center gap-3 py-2">
                        <Icon className="w-6 h-6 text-gray-700" />
                        <span className="text-gray-700">{getAmenityName(feature)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500">{(t as any)?.amenities?.noAmenities || 'Aucun équipement listé'}</p>
              )}

              {((listing.category === 'stay' && listing.stayDetails?.amenities && listing.stayDetails.amenities.length > 6) ||
                (listing.category === 'vehicle' && listing.vehicleDetails?.features && listing.vehicleDetails.features.length > 6)) && (
                <button
                  onClick={() => setShowAllAmenities(!showAllAmenities)}
                  className="mt-4 md:mt-6 w-full md:w-auto px-6 py-3 border border-gray-900 text-gray-900 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  {showAllAmenities
                    ? (t as any)?.amenities?.showLess || 'Afficher moins'
                    : `Afficher les ${listing.category === 'stay' ? listing.stayDetails?.amenities?.length : listing.vehicleDetails?.features?.length} équipements`
                  }
                </button>
              )}
            </div>

            {/* House Rules */}
            {listing.rules && (
              <div className="pb-8 border-b border-gray-200">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6">{(t as any)?.houseRules?.title || 'À savoir'}</h2>

                {/* Check-in/Check-out times */}
                {(listing.availability?.checkInFrom || listing.availability?.checkOutBefore) && (
                  <div className="mb-6 pb-6 border-b border-gray-100">
                    <div className="grid grid-cols-2 gap-4">
                      {listing.availability?.checkInFrom && (
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Arrivée</div>
                          <div className="font-medium text-gray-900">{listing.availability.checkInFrom} - {listing.availability.checkInTo || '22:00'}</div>
                        </div>
                      )}
                      {listing.availability?.checkOutBefore && (
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Départ</div>
                          <div className="font-medium text-gray-900">Avant {listing.availability.checkOutBefore}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Rules list */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 py-1">
                    {listing.rules.smoking === 'allowed' ? (
                      <Cigarette className="w-5 h-5 text-gray-700" />
                    ) : (
                      <Ban className="w-5 h-5 text-gray-700" />
                    )}
                    <span className="text-gray-700">
                      {listing.rules.smoking === 'allowed' ? 'Vous pouvez fumer' : 'Interdiction de fumer'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 py-1">
                    {listing.rules.pets === 'allowed' ? (
                      <Dog className="w-5 h-5 text-gray-700" />
                    ) : (
                      <Ban className="w-5 h-5 text-gray-700" />
                    )}
                    <span className="text-gray-700">
                      {listing.rules.pets === 'allowed' ? 'Animaux acceptés' : 'Animaux non autorisés'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 py-1">
                    {listing.rules.parties === 'allowed' ? (
                      <Music className="w-5 h-5 text-gray-700" />
                    ) : (
                      <Ban className="w-5 h-5 text-gray-700" />
                    )}
                    <span className="text-gray-700">
                      {listing.rules.parties === 'allowed' ? 'Fêtes et événements autorisés' : 'Pas de fête ni d\'événement'}
                    </span>
                  </div>
                  {listing.rules.children !== undefined && (
                    <div className="flex items-center gap-3 py-1">
                      {listing.rules.children === 'allowed' ? (
                        <Baby className="w-5 h-5 text-gray-700" />
                      ) : (
                        <Ban className="w-5 h-5 text-gray-700" />
                      )}
                      <span className="text-gray-700">
                        {listing.rules.children === 'allowed' ? 'Enfants bienvenus' : 'Non adapté aux enfants'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cancellation Policy Section */}
            {listing.cancellationPolicy && (
              <div className="pb-8 border-b border-gray-200">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6">{(t as any)?.cancellation?.title || 'Conditions d\'annulation'}</h2>

                {listing.cancellationPolicy === 'flexible' && (
                  <div>
                    <p className="text-gray-900 font-medium mb-2">
                      Annulation gratuite avant l'arrivée
                    </p>
                    <p className="text-gray-600 text-sm">
                      Remboursement intégral jusqu'à 24 heures avant l'arrivée.
                    </p>
                  </div>
                )}
                {listing.cancellationPolicy === 'moderate' && (
                  <div>
                    <p className="text-gray-900 font-medium mb-2">
                      Annulation gratuite 5 jours avant l'arrivée
                    </p>
                    <p className="text-gray-600 text-sm">
                      Remboursement intégral jusqu'à 5 jours avant l'arrivée. Après, remboursement de 50%.
                    </p>
                  </div>
                )}
                {listing.cancellationPolicy === 'strict' && (
                  <div>
                    <p className="text-gray-900 font-medium mb-2">
                      Annulation stricte
                    </p>
                    <p className="text-gray-600 text-sm">
                      Remboursement de 50% jusqu'à 1 semaine avant l'arrivée. Après, aucun remboursement.
                    </p>
                  </div>
                )}
                {listing.cancellationPolicy === 'strict_long_term' && (
                  <div>
                    <p className="text-gray-900 font-medium mb-2">
                      Conditions strictes pour les longs séjours
                    </p>
                    <p className="text-gray-600 text-sm">
                      Pour 28+ nuits: remboursement intégral si annulation dans les 48h et 28+ jours avant l'arrivée.
                    </p>
                  </div>
                )}
                {listing.cancellationPolicy === 'non_refundable' && (
                  <div>
                    <p className="text-gray-900 font-medium mb-2">
                      Non remboursable
                    </p>
                    <p className="text-gray-600 text-sm">
                      Cette réservation n'est pas remboursable.
                    </p>
                  </div>
                )}

                <button className="mt-4 text-gray-900 underline font-medium text-sm">
                  En savoir plus
                </button>
              </div>
            )}

            {/* Garantie Baytup - Trust Box */}
            <div className="pb-8 border-b border-gray-200">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 bg-green-100 rounded-xl">
                    <Shield className="w-6 h-6 text-green-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Réservez en toute sérénité</h3>
                    <p className="text-sm text-green-700 font-medium">La garantie Baytup</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Hôtes vérifiés</p>
                      <p className="text-xs text-gray-600">Identité et logement vérifiés par Baytup</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Paiement sécurisé</p>
                      <p className="text-xs text-gray-600">Vos données bancaires sont protégées</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Réservation garantie</p>
                      <p className="text-xs text-gray-600">Confirmation instantanée ou sous 24h</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Support 7j/7</p>
                      <p className="text-xs text-gray-600">Une équipe disponible pour vous aider</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            {reviews.length > 0 && (
              <div className="pb-8 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-6">
                  <Star className="w-5 h-5 fill-current text-gray-900" />
                  <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                    {listing.stats?.averageRating?.toFixed(1)} · {listing.stats?.reviewCount} {(listing.stats?.reviewCount || 0) > 1 ? 'commentaires' : 'commentaire'}
                  </h2>
                </div>

                <div className="space-y-6 md:grid md:grid-cols-2 md:gap-8 md:space-y-0 mb-6">
                  {(showAllReviews ? reviews : reviews.slice(0, 4)).map((review) => (
                    <div key={review.id} className="space-y-3">
                      <div className="flex items-center gap-3">
                        {typeof review.reviewer === 'object' && review.reviewer.avatar ? (
                          <img
                            src={getImageUrl(review.reviewer.avatar)}
                            alt={`${review.reviewer.firstName}`}
                            className="w-10 h-10 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/uploads/users/default-avatar.png';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {typeof review.reviewer === 'object' && review.reviewer.firstName ? review.reviewer.firstName.charAt(0) : 'U'}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">
                            {typeof review.reviewer === 'object' ? review.reviewer.firstName : 'Utilisateur'}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{review.age || 'Récemment'}</span>
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                              <CheckCircle className="w-3 h-3" />
                              Séjour vérifié
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < (review.rating?.overall || 0) ? 'fill-current text-gray-900' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">{review.comment}</p>
                      {/* Review photos inline */}
                      {(review as any).photos && (review as any).photos.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {(review as any).photos.slice(0, 3).map((photo: any, pIdx: number) => (
                            <img
                              key={pIdx}
                              src={getImageUrl(photo.url)}
                              alt={photo.caption || 'Photo du voyageur'}
                              className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
                              onClick={() => {
                                const globalIdx = guestPhotos.findIndex(gp => gp.url === photo.url);
                                if (globalIdx >= 0) {
                                  setGuestPhotoIndex(globalIdx);
                                  setShowGuestPhotoLightbox(true);
                                }
                              }}
                            />
                          ))}
                          {(review as any).photos.length > 3 && (
                            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-600 font-medium">
                              +{(review as any).photos.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {reviews.length > 4 && (
                  <button
                    onClick={() => setShowAllReviews(!showAllReviews)}
                    className="w-full md:w-auto px-6 py-3 border border-gray-900 text-gray-900 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    {showAllReviews
                      ? 'Afficher moins'
                      : `Afficher les ${reviews.length} commentaires`
                    }
                  </button>
                )}
              </div>
            )}

            {/* Guest Photos Section */}
            {guestPhotos.length > 0 && (
              <div className="pb-8 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="w-5 h-5 text-gray-900" />
                  <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
                    Photos des voyageurs ({guestPhotos.length})
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {guestPhotos.slice(0, 8).map((photo, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setGuestPhotoIndex(idx);
                        setShowGuestPhotoLightbox(true);
                      }}
                      className="aspect-square rounded-xl overflow-hidden group relative"
                    >
                      <img
                        src={getImageUrl(photo.url)}
                        alt={photo.caption || `Photo par ${photo.reviewerName}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="text-white text-xs font-medium truncate">{photo.reviewerName}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {guestPhotos.length > 8 && (
                  <button
                    onClick={() => {
                      setGuestPhotoIndex(0);
                      setShowGuestPhotoLightbox(true);
                    }}
                    className="mt-4 px-6 py-3 border border-gray-900 text-gray-900 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Voir les {guestPhotos.length} photos
                  </button>
                )}
              </div>
            )}

            {/* Guest Photo Lightbox */}
            {showGuestPhotoLightbox && guestPhotos.length > 0 && (
              <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={() => setShowGuestPhotoLightbox(false)}>
                <button
                  onClick={() => setShowGuestPhotoLightbox(false)}
                  className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full z-10"
                >
                  <X className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setGuestPhotoIndex(prev => (prev - 1 + guestPhotos.length) % guestPhotos.length); }}
                  className="absolute left-4 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition z-10"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="max-w-4xl max-h-[80vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                  <img
                    src={getImageUrl(guestPhotos[guestPhotoIndex].url)}
                    alt={guestPhotos[guestPhotoIndex].caption}
                    className="max-h-[70vh] object-contain rounded-lg"
                  />
                  <div className="mt-4 text-center text-white">
                    <p className="font-medium">{guestPhotos[guestPhotoIndex].reviewerName}</p>
                    {guestPhotos[guestPhotoIndex].caption && (
                      <p className="text-sm text-gray-300 mt-1">{guestPhotos[guestPhotoIndex].caption}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">{guestPhotoIndex + 1} / {guestPhotos.length}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setGuestPhotoIndex(prev => (prev + 1) % guestPhotos.length); }}
                  className="absolute right-4 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition z-10"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            )}

            {/* Map Section */}
            <div className="pb-8">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6">{(t as any)?.location?.title || 'Où se situe le logement'}</h2>

              {/* Location Summary */}
              <p className="text-gray-700 mb-4">
                {listing.address?.city}, {listing.address?.state}, {listing.address?.country}
              </p>

              {/* Leaflet Map (100% FREE - OpenStreetMap) */}
              {listing.location?.coordinates && (
                <div className="mb-4 rounded-xl overflow-hidden relative z-0 isolate">
                  <LeafletMap
                    coordinates={listing.location.coordinates}
                    title={listing.title}
                    address={listing.address || {}}
                  />
                </div>
              )}

              {/* Address Note */}
              <p className="text-sm text-gray-500">
                {(t as any)?.location?.exactAddressNote || "L'adresse exacte vous sera communiquée une fois la réservation confirmée."}
              </p>
            </div>

            {/* Date Selection Calendar - Visible on mobile */}
            <div className="lg:hidden pb-8 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Sélectionnez la date d'arrivée</h2>
              <p className="text-sm text-gray-500 mb-4">Ajoutez vos dates de voyage pour connaître le prix exact</p>

              {/* Inline Calendar */}
              <div className="bg-white">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                    disabled={calendarMonth.getMonth() === new Date().getMonth() && calendarMonth.getFullYear() === new Date().getFullYear()}
                    className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-medium text-gray-900">
                    {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                  </span>
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Days of week header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, idx) => (
                    <div key={idx} className="p-2 text-center text-xs font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const year = calendarMonth.getFullYear();
                    const month = calendarMonth.getMonth();
                    const firstDay = new Date(year, month, 1);
                    const lastDay = new Date(year, month + 1, 0);
                    const daysInMonth = lastDay.getDate();
                    let startingDayOfWeek = firstDay.getDay() - 1;
                    if (startingDayOfWeek < 0) startingDayOfWeek = 6;

                    const days: (Date | null)[] = [];
                    for (let i = 0; i < startingDayOfWeek; i++) {
                      days.push(null);
                    }
                    for (let day = 1; day <= daysInMonth; day++) {
                      days.push(new Date(year, month, day));
                    }

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const parseLocalDate = (dateStr: string): Date | null => {
                      if (!dateStr) return null;
                      const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
                      return new Date(y, m - 1, d);
                    };

                    const selectedCheckInDate = checkIn ? parseLocalDate(checkIn) : null;
                    const selectedCheckOutDate = checkOut ? parseLocalDate(checkOut) : null;

                    return days.map((date, index) => {
                      if (!date) {
                        return <div key={index} className="p-2"></div>;
                      }

                      const isPast = date < today;
                      const isCheckIn = selectedCheckInDate && date.getTime() === selectedCheckInDate.getTime();
                      const isCheckOut = selectedCheckOutDate && date.getTime() === selectedCheckOutDate.getTime();
                      const inRange = selectedCheckInDate && selectedCheckOutDate && date > selectedCheckInDate && date < selectedCheckOutDate;
                      const isToday = date.getTime() === today.getTime();

                      return (
                        <button
                          key={date.getTime()}
                          onClick={() => {
                            if (isPast) return;
                            const formatDateLocal = (d: Date): string => {
                              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                            };
                            if (!checkIn || (checkIn && checkOut)) {
                              setCheckIn(formatDateLocal(date));
                              setCheckOut('');
                            } else {
                              if (selectedCheckInDate && date > selectedCheckInDate) {
                                setCheckOut(formatDateLocal(date));
                              } else {
                                setCheckIn(formatDateLocal(date));
                                setCheckOut('');
                              }
                            }
                          }}
                          disabled={isPast}
                          className={`
                            p-2 text-sm font-medium rounded-full transition-all
                            ${isPast ? 'text-gray-300 cursor-not-allowed' : 'text-gray-900 hover:bg-gray-100 cursor-pointer'}
                            ${isCheckIn || isCheckOut ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}
                            ${inRange ? 'bg-gray-100' : ''}
                            ${isToday && !isCheckIn && !isCheckOut ? 'ring-1 ring-gray-400' : ''}
                          `}
                        >
                          {date.getDate()}
                        </button>
                      );
                    });
                  })()}
                </div>

                {/* Clear dates button */}
                {(checkIn || checkOut) && (
                  <button
                    onClick={() => {
                      setCheckIn('');
                      setCheckOut('');
                    }}
                    className="mt-4 text-sm font-medium text-gray-600 hover:text-gray-900 underline"
                  >
                    Effacer les dates
                  </button>
                )}

                {/* Selected dates display */}
                {checkIn && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Arrivée: </span>
                        <span className="font-medium">{new Date(checkIn + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      {checkOut && (
                        <>
                          <span className="text-gray-400">→</span>
                          <div>
                            <span className="text-gray-500">Départ: </span>
                            <span className="font-medium">{new Date(checkOut + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Booking Card (Desktop only) */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24">
              <div className="border-2 border-gray-200 rounded-2xl p-6 shadow-xl">
                {/* Price - ✅ FIX: Use user's selected currency */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {displayPrice(listing.pricing?.basePrice || 0)}
                    </span>
                    <span className="text-gray-600">
                      / {
                        listing.pricing?.pricingType === 'per_day' ? 'jour' :
                        listing.pricing?.pricingType === 'per_night' ? 'nuit' :
                        listing.pricing?.pricingType === 'per_hour' ? 'heure' :
                        listing.pricing?.pricingType === 'per_week' ? 'semaine' :
                        listing.pricing?.pricingType === 'per_month' ? 'mois' :
                        (listing.category === 'stay' ? 'nuit' : 'jour')
                      }
                    </span>
                  </div>
                  {listing.stats?.averageRating && listing.stats.averageRating > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Star className="w-4 h-4 fill-current text-[#FF6B35]" />
                      <span className="font-semibold">{listing.stats.averageRating.toFixed(1)}</span>
                      {listing.stats?.reviewCount && listing.stats.reviewCount > 0 && (
                        <span className="text-gray-600">({listing.stats.reviewCount} {(t as any)?.booking?.reviews || 'reviews'})</span>
                      )}
                    </div>
                  )}
                  {/* ✅ Currency warning if listing doesn't accept user's currency */}
                  {showCurrencyWarning && (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-orange-800">
                          <p className="font-medium">
                            {language === 'fr'
                              ? `Cette annonce n'accepte que les paiements en ${listing.pricing?.currency}`
                              : language === 'ar'
                              ? `هذا الإعلان يقبل الدفع بـ ${listing.pricing?.currency} فقط`
                              : `This listing only accepts payments in ${listing.pricing?.currency}`
                            }
                          </p>
                          <p className="text-xs mt-1 text-orange-600">
                            {language === 'fr'
                              ? '(Prix indicatif converti)'
                              : language === 'ar'
                              ? '(سعر تقريبي محوّل)'
                              : '(Converted indicative price)'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Booking Form */}
                <div className="space-y-4 mb-6">
                  {/* Date Selection - Click to open calendar */}
                  <div className="relative">
                    <div
                      onClick={() => setShowDesktopCalendar(!showDesktopCalendar)}
                      className={`grid grid-cols-2 border-2 rounded-xl cursor-pointer transition-all ${showDesktopCalendar ? 'border-[#FF6B35] shadow-md' : 'border-gray-300 hover:border-gray-400'}`}
                    >
                      <div className="px-4 py-3 border-r border-gray-200">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">ARRIVÉE</p>
                        <p className={`text-sm mt-0.5 ${checkIn ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                          {checkIn
                            ? new Date(checkIn + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'Sélectionner'}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">DÉPART</p>
                        <p className={`text-sm mt-0.5 ${checkOut ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                          {checkOut
                            ? new Date(checkOut + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'Sélectionner'}
                        </p>
                      </div>
                    </div>

                    {/* Desktop Calendar Dropdown */}
                    {showDesktopCalendar && (
                      <>
                      {/* Click-outside overlay */}
                      <div className="fixed inset-0 z-40" onClick={() => setShowDesktopCalendar(false)} />
                      <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl p-4">
                        {/* Month Navigation */}
                        <div className="flex items-center justify-between mb-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1));
                            }}
                            disabled={calendarMonth.getMonth() === new Date().getMonth() && calendarMonth.getFullYear() === new Date().getFullYear()}
                            className="p-1.5 hover:bg-gray-100 rounded-full disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="font-semibold text-gray-900 text-sm">
                            {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1));
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded-full"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Days of week header */}
                        <div className="grid grid-cols-7 gap-1 mb-1">
                          {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map((day, idx) => (
                            <div key={idx} className="p-1.5 text-center text-xs font-medium text-gray-500">
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Calendar days */}
                        <div className="grid grid-cols-7 gap-1">
                          {(() => {
                            const year = calendarMonth.getFullYear();
                            const month = calendarMonth.getMonth();
                            const firstDay = new Date(year, month, 1);
                            const lastDay = new Date(year, month + 1, 0);
                            const daysInMonth = lastDay.getDate();
                            let startingDayOfWeek = firstDay.getDay() - 1;
                            if (startingDayOfWeek < 0) startingDayOfWeek = 6;

                            const days: (Date | null)[] = [];
                            for (let i = 0; i < startingDayOfWeek; i++) {
                              days.push(null);
                            }
                            for (let day = 1; day <= daysInMonth; day++) {
                              days.push(new Date(year, month, day));
                            }

                            const today = new Date();
                            today.setHours(0, 0, 0, 0);

                            const parseLocalDate = (dateStr: string): Date | null => {
                              if (!dateStr) return null;
                              const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
                              return new Date(y, m - 1, d);
                            };

                            const selectedCheckInDate = checkIn ? parseLocalDate(checkIn) : null;
                            const selectedCheckOutDate = checkOut ? parseLocalDate(checkOut) : null;

                            return days.map((date, index) => {
                              if (!date) {
                                return <div key={index} className="p-1.5"></div>;
                              }

                              const isPast = date < today;
                              const isCheckIn = selectedCheckInDate && date.getTime() === selectedCheckInDate.getTime();
                              const isCheckOut = selectedCheckOutDate && date.getTime() === selectedCheckOutDate.getTime();
                              const inRange = selectedCheckInDate && selectedCheckOutDate && date > selectedCheckInDate && date < selectedCheckOutDate;
                              const isToday = date.getTime() === today.getTime();

                              return (
                                <button
                                  key={date.getTime()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isPast) return;
                                    const formatDateLocal = (d: Date): string => {
                                      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                    };
                                    if (!checkIn || (checkIn && checkOut)) {
                                      setCheckIn(formatDateLocal(date));
                                      setCheckOut('');
                                    } else {
                                      if (selectedCheckInDate && date > selectedCheckInDate) {
                                        setCheckOut(formatDateLocal(date));
                                        setShowDesktopCalendar(false);
                                      } else {
                                        setCheckIn(formatDateLocal(date));
                                        setCheckOut('');
                                      }
                                    }
                                  }}
                                  disabled={isPast}
                                  className={`
                                    p-1.5 text-sm font-medium rounded-full transition-all
                                    ${isPast ? 'text-gray-300 cursor-not-allowed' : 'text-gray-900 hover:bg-gray-100 cursor-pointer'}
                                    ${isCheckIn ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}
                                    ${isCheckOut ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}
                                    ${inRange ? 'bg-gray-100' : ''}
                                    ${isToday && !isCheckIn && !isCheckOut ? 'ring-1 ring-gray-400' : ''}
                                  `}
                                >
                                  {date.getDate()}
                                </button>
                              );
                            });
                          })()}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-500">
                            {!checkIn ? 'Sélectionnez la date d\'arrivée' : !checkOut ? 'Sélectionnez la date de départ' : `${Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))} nuit(s)`}
                          </p>
                          <div className="flex gap-2">
                            {(checkIn || checkOut) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCheckIn('');
                                  setCheckOut('');
                                }}
                                className="text-xs font-medium text-gray-600 hover:text-gray-900 underline"
                              >
                                Effacer
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDesktopCalendar(false);
                              }}
                              className="text-xs font-medium text-[#FF6B35] hover:text-[#e55a2b]"
                            >
                              Fermer
                            </button>
                          </div>
                        </div>
                      </div>
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">{(t as any)?.booking?.guests || 'GUESTS'}</label>
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{(t as any)?.booking?.adults || 'Adults'}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setGuestDetails(prev => ({ ...prev, adults: Math.max(1, prev.adults - 1) }))}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-[#FF6B35] transition-colors"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-medium">{guestDetails.adults}</span>
                            <button
                              onClick={() => {
                                const newTotal = guestDetails.adults + 1 + guestDetails.children + guestDetails.infants;
                                if (newTotal <= maxCapacity) {
                                  setGuestDetails(prev => ({ ...prev, adults: prev.adults + 1 }));
                                }
                              }}
                              disabled={guestDetails.adults + guestDetails.children + guestDetails.infants >= maxCapacity}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-[#FF6B35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{(t as any)?.booking?.children || 'Children'}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setGuestDetails(prev => ({ ...prev, children: Math.max(0, prev.children - 1) }))}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-[#FF6B35] transition-colors"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-medium">{guestDetails.children}</span>
                            <button
                              onClick={() => {
                                const newTotal = guestDetails.adults + guestDetails.children + 1 + guestDetails.infants;
                                if (newTotal <= maxCapacity) {
                                  setGuestDetails(prev => ({ ...prev, children: prev.children + 1 }));
                                }
                              }}
                              disabled={guestDetails.adults + guestDetails.children + guestDetails.infants >= maxCapacity}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-[#FF6B35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{(t as any)?.booking?.infants || 'Infants'}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setGuestDetails(prev => ({ ...prev, infants: Math.max(0, prev.infants - 1) }))}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-[#FF6B35] transition-colors"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-medium">{guestDetails.infants}</span>
                            <button
                              onClick={() => {
                                const newTotal = guestDetails.adults + guestDetails.children + guestDetails.infants + 1;
                                if (newTotal <= maxCapacity) {
                                  setGuestDetails(prev => ({ ...prev, infants: prev.infants + 1 }));
                                }
                              }}
                              disabled={guestDetails.adults + guestDetails.children + guestDetails.infants >= maxCapacity}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-[#FF6B35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                      {/* Capacity Info */}
                      <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
                        <span>Maximum capacity: {maxCapacity} {maxCapacity === 1 ? 'guest' : 'guests'}</span>
                        {totalGuests >= maxCapacity && (
                          <span className="text-orange-600 font-medium">Limit reached</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reserve Button - ✅ FIX: Hide when currency mismatch */}
                {/* Date Error Message */}
                {dateError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <span className="text-sm text-red-700 font-medium">
                      {(t as any)?.errors?.selectDates || 'Veuillez sélectionner les dates d\'arrivée et de départ'}
                    </span>
                  </div>
                )}

                {showCurrencyWarning ? (
                  <div className="w-full py-4 bg-gray-100 text-gray-500 font-medium text-center rounded-xl flex items-center justify-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    <span>
                      {language === 'fr'
                        ? `Passez en ${listing.pricing?.currency} pour réserver`
                        : language === 'ar'
                        ? `غيّر عملتك إلى ${listing.pricing?.currency} للحجز`
                        : `Switch to ${listing.pricing?.currency} to book`
                      }
                    </span>
                  </div>
                ) : (
                  <button
                    className="w-full py-4 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white font-bold text-lg rounded-xl hover:shadow-xl transition-all transform hover:scale-105"
                    onClick={() => {
                      if (!checkIn || !checkOut) {
                        setDateError(true);
                        setTimeout(() => setDateError(false), 4000);
                        return;
                      }
                      setShowBookingModal(true);
                    }}
                  >
                    {listing.availability?.instantBook ? (t as any)?.booking?.reserve || 'Reserve' : (t as any)?.booking?.requestToBook || 'Request to Book'}
                  </button>
                )}

                {!showCurrencyWarning && (
                  <p className="text-center text-sm text-gray-600 mt-4">
                    {(t as any)?.booking?.notChargedYet || "You won't be charged yet"}
                  </p>
                )}

                {/* Price Breakdown */}
                {checkIn && checkOut && (
                  <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                    {(() => {
                      const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
                      const basePrice = listing.pricing?.basePrice || 0;
                      const subtotal = basePrice * nights;
                      const cleaningFee = listing.pricing?.cleaningFee || 0;
                      // Baytup fee: 8% on (subtotal + cleaning), no taxes
                      const baseAmount = subtotal + cleaningFee;
                      const serviceFee = Math.round(baseAmount * 0.08);

                      return (
                        <>
                          <div className="flex justify-between text-gray-700">
                            <span>{displayPrice(basePrice)} x {nights} {nights > 1 ? (t as any)?.booking?.nights || 'nights' : (t as any)?.booking?.night || 'night'}</span>
                            <span>{displayPrice(subtotal)}</span>
                          </div>
                          {cleaningFee > 0 && (
                            <div className="flex justify-between text-gray-700">
                              <span>{(t as any)?.booking?.cleaningFee || 'Cleaning fee'}</span>
                              <span>{displayPrice(cleaningFee)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-gray-700">
                            <span>{(t as any)?.booking?.serviceFee || 'Frais de service (8%)'}</span>
                            <span>{displayPrice(serviceFee)}</span>
                          </div>
                          <div className="pt-3 border-t border-gray-200 flex justify-between font-bold text-lg">
                            <span>{(t as any)?.booking?.total || 'Total'}</span>
                            <span>{displayPrice(calculateTotalPrice())}</span>
                          </div>
                        </>
                      );
})()}
</div>
)}
</div>
          {/* Report Listing */}
          <button className="w-full mt-4 flex items-center justify-center gap-2 py-3 text-gray-600 hover:text-gray-900 transition-colors">
            <Flag className="w-4 h-4" />
            <span className="underline font-medium">{(t as any)?.booking?.reportListing || 'Report this listing'}</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  {/* Mobile Sticky Bottom Bar */}
  <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
    {/* Mobile Date Error Message */}
    {dateError && (
      <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center justify-center gap-2 animate-in slide-in-from-bottom-2 duration-200">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <span className="text-sm text-red-700">Veuillez sélectionner les dates</span>
      </div>
    )}
    <div className="px-4 py-3 flex items-center justify-between max-w-lg mx-auto">
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-base font-semibold text-gray-900">
            {displayPrice(listing.pricing?.basePrice || 0)}
          </span>
          <span className="text-sm text-gray-600">
            / {listing.category === 'stay' ? 'nuit' : 'jour'}
          </span>
        </div>
        {listing.stats?.reviewCount && listing.stats.reviewCount > 0 ? (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Star className="w-3 h-3 fill-current text-gray-900" />
            <span className="font-medium">{listing.stats?.averageRating?.toFixed(1)}</span>
            <span>· <span className="underline">{listing.stats.reviewCount} avis</span></span>
          </div>
        ) : (
          <button
            onClick={() => setShowBookingModal(true)}
            className="text-xs text-gray-500 underline"
          >
            Choisir des dates
          </button>
        )}
      </div>
      <button
        onClick={() => {
          if (!checkIn || !checkOut) {
            setDateError(true);
            setTimeout(() => setDateError(false), 4000);
            return;
          }
          setShowBookingModal(true);
        }}
        className="px-5 py-2.5 bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white font-semibold rounded-lg text-sm"
      >
        Réserver
      </button>
    </div>
  </div>

  {/* Bottom padding for mobile to account for sticky bar */}
  <div className="lg:hidden h-20" />
</div>
);
}