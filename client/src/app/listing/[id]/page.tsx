'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { getImageUrl } from '@/utils/imageUtils';
import { formatPrice } from '@/utils/priceUtils';
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
  const { language, currency } = useLanguage();
  const t = useTranslation('listing');

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
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Booking state
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestDetails, setGuestDetails] = useState({
    adults: 1,
    children: 0,
    infants: 0
  });

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

      console.log('[ListingDetail] Fetching listing:', id);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listings/${id}`);

      if (!response.ok) {
        console.error('[ListingDetail] HTTP Error:', response.status);
        throw new Error((t as any)?.errors?.fetchError || 'Failed to fetch listing details');
      }

      const data = await response.json();
      console.log('[ListingDetail] API Response:', data);

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
        console.log('[ListingDetail] Listing loaded:', listingData._id || listingData.id);
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reviews?listing=${listingId}&status=published&limit=10`);

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.data?.reviews) {
          setReviews(data.data.reviews);
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

    const basePrice = (listing.pricing?.basePrice || 0) * nights;
    const cleaningFee = listing.pricing?.cleaningFee || 0;
    const serviceFee = Math.round(basePrice * 0.10); // 10% service fee
    const taxes = Math.round((basePrice + cleaningFee + serviceFee) * 0.05); // 5% taxes

    return basePrice + cleaningFee + serviceFee + taxes;
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

  return (
    <div className="min-h-screen bg-white">
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
      <div className="border-b border-gray-200 sticky top-0 bg-white z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                {copied ? <CheckIcon className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                <span className="font-semibold hidden sm:inline">{copied ? (t as any)?.header?.copied || 'Copied!' : (t as any)?.header?.share || 'Share'}</span>
              </button>
              <div className="flex items-center gap-2">
                <WishlistButton
                  listingId={listing._id || listing.id || ''}
                  size="md"
                  showTooltip={false}
                />
                <span className="font-semibold hidden sm:inline">{(t as any)?.header?.save || 'Save'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Section */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{listing.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 fill-current text-[#FF6B35]" />
              <span className="font-semibold">{listing.stats?.averageRating?.toFixed(1) || (t as any)?.title?.new || 'New'}</span>
              {listing.stats?.reviewCount && listing.stats.reviewCount > 0 && (
                <span className="text-gray-600">({listing.stats.reviewCount} {(t as any)?.title?.reviews || 'reviews'})</span>
              )}
            </div>
            <span className="text-gray-400">•</span>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-gray-600" />
              <span className="text-gray-700 font-medium">
                {listing.address?.city}, {listing.address?.state}, {listing.address?.country}
              </span>
            </div>
            {host?.hostInfo?.superhost && (
              <>
                <span className="text-gray-400">•</span>
                <div className="flex items-center gap-1 px-3 py-1 bg-[#FF6B35]/10 rounded-full">
                  <Award className="w-4 h-4 text-[#FF6B35]" />
                  <span className="text-[#FF6B35] font-semibold">{(t as any)?.title?.superhost || 'Superhost'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Images Grid */}
        <div className="mb-8 rounded-2xl overflow-hidden">
          {displayImages.length === 0 ? (
            <div className="aspect-[16/9] bg-gray-200 flex items-center justify-center">
              <Camera className="w-16 h-16 text-gray-400" />
            </div>
          ) : displayImages.length === 1 ? (
            <div className="relative aspect-[16/9] bg-gray-100">
              <img
                src={getImageFromListing(displayImages[0])}
                alt={listing.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = getImageUrl('');
                }}
              />
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 h-[500px]">
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
                        {(t as any)?.imageGallery?.showAll?.replace('{count}', displayImages.length.toString())}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {displayImages.length > 5 && (
            <button
              onClick={() => setShowAllPhotos(true)}
              className="absolute bottom-6 right-6 flex items-center gap-2 px-6 py-3 bg-white rounded-xl font-semibold shadow-lg hover:scale-105 transition-transform"
            >
              <Camera className="w-5 h-5" />
              {(t as any)?.imageGallery?.showAll?.replace('{count}', displayImages.length.toString())}
            </button>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Host Info */}
            <div className="pb-8 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {listing.category === 'stay' ? (t as any)?.host?.propertyHostedBy || 'Property hosted by' : (t as any)?.host?.vehicleHostedBy || 'Vehicle hosted by'} {host?.firstName} {host?.lastName}
                  </h2>
                  {listing.category === 'stay' && listing.stayDetails && (
                    <div className="flex items-center gap-4 text-gray-600">
                      {listing.stayDetails.bedrooms && (
                        <div className="flex items-center gap-1">
                          <Bed className="w-4 h-4" />
                          <span>{listing.stayDetails.bedrooms} {listing.stayDetails.bedrooms > 1 ? (t as any)?.host?.bedrooms || 'bedrooms' : (t as any)?.host?.bedroom || 'bedroom'}</span>
                        </div>
                      )}
                      {listing.stayDetails.bathrooms && (
                        <div className="flex items-center gap-1">
                          <Bath className="w-4 h-4" />
                          <span>{listing.stayDetails.bathrooms} {listing.stayDetails.bathrooms > 1 ? (t as any)?.host?.bathrooms || 'bathrooms' : (t as any)?.host?.bathroom || 'bathroom'}</span>
                        </div>
                      )}
                      {listing.stayDetails.area && (
                        <div className="flex items-center gap-1">
                          <Home className="w-4 h-4" />
                          <span>{listing.stayDetails.area}m²</span>
                        </div>
                      )}
                    </div>
                  )}
                  {listing.category === 'vehicle' && listing.vehicleDetails && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      {listing.vehicleDetails.vehicleType && (
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                          <Car className="w-5 h-5 text-[#FF6B35]" />
                          <div>
                            <div className="text-xs text-gray-500">{(t as any)?.host?.type || 'Type'}</div>
                            <div className="font-semibold">{getVehicleTypeLabel(listing.vehicleDetails.vehicleType)}</div>
                          </div>
                        </div>
                      )}
                      {listing.vehicleDetails.make && listing.vehicleDetails.model && (
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                          <Car className="w-5 h-5 text-[#FF6B35]" />
                          <div>
                            <div className="text-xs text-gray-500">{(t as any)?.host?.makeAndModel || 'Make & Model'}</div>
                            <div className="font-semibold">{listing.vehicleDetails.make} {listing.vehicleDetails.model}</div>
                          </div>
                        </div>
                      )}
                      {listing.vehicleDetails.year && (
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                          <Calendar className="w-5 h-5 text-[#FF6B35]" />
                          <div>
                            <div className="text-xs text-gray-500">{(t as any)?.host?.year || 'Year'}</div>
                            <div className="font-semibold">{listing.vehicleDetails.year}</div>
                          </div>
                        </div>
                      )}
                      {listing.vehicleDetails.seats && (
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                          <Users className="w-5 h-5 text-[#FF6B35]" />
                          <div>
                            <div className="text-xs text-gray-500">{(t as any)?.host?.seats || 'Seats'}</div>
                            <div className="font-semibold">{listing.vehicleDetails.seats} {(t as any)?.host?.seatsValue || 'seats'}</div>
                          </div>
                        </div>
                      )}
                      {listing.vehicleDetails.transmission && (
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                          <Settings className="w-5 h-5 text-[#FF6B35]" />
                          <div>
                            <div className="text-xs text-gray-500">{(t as any)?.host?.transmission || 'Transmission'}</div>
                            <div className="font-semibold">{getTransmissionLabel(listing.vehicleDetails.transmission)}</div>
                          </div>
                        </div>
                      )}
                      {listing.vehicleDetails.fuelType && (
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                          <Droplet className="w-5 h-5 text-[#FF6B35]" />
                          <div>
                            <div className="text-xs text-gray-500">{(t as any)?.host?.fuelType || 'Fuel Type'}</div>
                            <div className="font-semibold">{getFuelTypeLabel(listing.vehicleDetails.fuelType)}</div>
                          </div>
                        </div>
                      )}
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

              {host?.hostInfo && (
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {host.hostInfo.responseRate && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="text-2xl font-bold text-gray-900">{host.hostInfo.responseRate}%</div>
                      <div className="text-sm text-gray-600">{(t as any)?.host?.responseRate || 'Response rate'}</div>
                    </div>
                  )}
                  {host.hostInfo.responseTime && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="text-2xl font-bold text-gray-900">&lt;{host.hostInfo.responseTime}h</div>
                      <div className="text-sm text-gray-600">{(t as any)?.host?.responseTime || 'Response time'}</div>
                    </div>
                  )}
                  {host.hostInfo.hostSince && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="text-2xl font-bold text-gray-900">
                        {new Date(host.hostInfo.hostSince).getFullYear()}
                      </div>
                      <div className="text-sm text-gray-600">{(t as any)?.host?.hostSince || 'Host since'}</div>
                    </div>
                  )}
                  {host.stats?.totalReviews && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="text-2xl font-bold text-gray-900">{host.stats.totalReviews}</div>
                      <div className="text-sm text-gray-600">{(t as any)?.host?.reviews || 'Reviews'}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="pb-8 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {listing.category === 'stay' ? (t as any)?.description?.aboutPlace || 'About this place' : (t as any)?.description?.aboutVehicle || 'About this vehicle'}
              </h2>
              <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
            </div>

            {/* Amenities/Features */}
            <div className="pb-8 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {listing.category === 'stay' ? (t as any)?.amenities?.title || 'Amenities' : (t as any)?.amenities?.featuresTitle || 'Features'}
              </h2>

              {listing.category === 'stay' && listing.stayDetails?.amenities ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(showAllAmenities ? listing.stayDetails.amenities : listing.stayDetails.amenities.slice(0, 10)).map((amenity, index) => {
                    const Icon = amenityIcons[amenity] || Check;
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <Icon className="w-6 h-6 text-[#FF6B35]" />
                        <span className="font-medium text-gray-900">{getAmenityName(amenity)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : listing.category === 'vehicle' && listing.vehicleDetails?.features ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(showAllAmenities ? listing.vehicleDetails.features : listing.vehicleDetails.features.slice(0, 10)).map((feature, index) => {
                    const Icon = amenityIcons[feature] || Check;
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <Icon className="w-6 h-6 text-[#FF6B35]" />
                        <span className="font-medium text-gray-900">{getAmenityName(feature)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500">{(t as any)?.amenities?.noAmenities || 'No amenities listed'}</p>
              )}

              {((listing.category === 'stay' && listing.stayDetails?.amenities && listing.stayDetails.amenities.length > 10) ||
                (listing.category === 'vehicle' && listing.vehicleDetails?.features && listing.vehicleDetails.features.length > 10)) && (
                <button
                  onClick={() => setShowAllAmenities(!showAllAmenities)}
                  className="mt-6 px-6 py-3 border-2 border-gray-900 text-gray-900 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  {showAllAmenities
                    ? (t as any)?.amenities?.showLess || 'Show less'
                    : listing.category === 'stay'
                      ? (t as any)?.amenities?.showAll?.replace('{count}', listing.stayDetails?.amenities?.length.toString() || '0')
                      : (t as any)?.amenities?.showAllFeatures?.replace('{count}', listing.vehicleDetails?.features?.length.toString() || '0')
                  }
                </button>
              )}
            </div>

            {/* House Rules */}
            {listing.rules && (
              <div className="pb-8 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{(t as any)?.houseRules?.title || 'House Rules'}</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {listing.rules.smoking === 'allowed' ? (
                      <>
                        <Cigarette className="w-6 h-6 text-green-600" />
                        <span className="text-gray-700">{(t as any)?.houseRules?.smokingAllowed || 'Smoking allowed'}</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-6 h-6 text-red-600" />
                        <span className="text-gray-700">{(t as any)?.houseRules?.noSmoking || 'No smoking'}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {listing.rules.pets === 'allowed' ? (
                      <>
                        <Dog className="w-6 h-6 text-green-600" />
                        <span className="text-gray-700">{(t as any)?.houseRules?.petsAllowed || 'Pets allowed'}</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-6 h-6 text-red-600" />
                        <span className="text-gray-700">{(t as any)?.houseRules?.noPets || 'No pets'}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {listing.rules.parties === 'allowed' ? (
                      <>
                        <Music className="w-6 h-6 text-green-600" />
                        <span className="text-gray-700">{(t as any)?.houseRules?.partiesAllowed || 'Parties allowed'}</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-6 h-6 text-red-600" />
                        <span className="text-gray-700">{(t as any)?.houseRules?.noPartiesOrEvents || 'No parties or events'}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {listing.rules.children === 'allowed' ? (
                      <>
                        <Baby className="w-6 h-6 text-green-600" />
                        <span className="text-gray-700">{(t as any)?.houseRules?.childrenWelcome || 'Children welcome'}</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-6 h-6 text-red-600" />
                        <span className="text-gray-700">{(t as any)?.houseRules?.notSuitableForChildren || 'Not suitable for children'}</span>
                      </>
                    )}
                  </div>
                  {listing.availability?.checkInFrom && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-6 h-6 text-[#FF6B35]" />
                      <span className="text-gray-700">
                        {(t as any)?.houseRules?.checkIn || 'Check-in:'} {listing.availability.checkInFrom} - {listing.availability.checkInTo}
                      </span>
                    </div>
                  )}
                  {listing.availability?.checkOutBefore && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-6 h-6 text-[#FF6B35]" />
                      <span className="text-gray-700">
                        {(t as any)?.houseRules?.checkOut || 'Check-out: Before'} {listing.availability.checkOutBefore}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            {reviews.length > 0 && (
              <div className="pb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Star className="w-7 h-7 fill-current text-[#FF6B35]" />
                    {listing.stats?.averageRating?.toFixed(1)} • {listing.stats?.reviewCount} {(t as any)?.reviews?.title || 'reviews'}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  {(showAllReviews ? reviews : reviews.slice(0, 6)).map((review) => (
                    <div key={review.id} className="space-y-3">
                      <div className="flex items-center gap-3">
                        {typeof review.reviewer === 'object' && review.reviewer.avatar ? (
                          <img
                            src={getImageUrl(review.reviewer.avatar)}
                            alt={`${review.reviewer.firstName} ${review.reviewer.lastName}`}
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/uploads/users/default-avatar.png';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B35] to-[#F7931E] rounded-full flex items-center justify-center">
                            <span className="text-white font-bold">
                              {typeof review.reviewer === 'object' && review.reviewer.firstName ? review.reviewer.firstName.charAt(0) : 'U'}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900">
                            {typeof review.reviewer === 'object' ? `${review.reviewer.firstName} ${review.reviewer.lastName}` : (t as any)?.reviews?.user || 'User'}
                          </div>
                          <div className="text-sm text-gray-600">{review.age || (t as any)?.reviews?.recently || 'Recently'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < (review.rating?.overall || 0) ? 'fill-current text-[#FF6B35]' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-gray-700 leading-relaxed line-clamp-4">{review.comment}</p>
                    </div>
                  ))}
                </div>

                {reviews.length > 6 && (
                  <button
                    onClick={() => setShowAllReviews(!showAllReviews)}
                    className="px-6 py-3 border-2 border-gray-900 text-gray-900 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                  >
                    {showAllReviews
                      ? (t as any)?.reviews?.showLess || 'Show less'
                      : (t as any)?.reviews?.showAll?.replace('{count}', reviews.length.toString())
                    }
                  </button>
                )}
              </div>
            )}

            {/* Map Section */}
            <div className="pb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{(t as any)?.location?.title || 'Location'}</h2>

              {/* Leaflet Map (100% FREE - OpenStreetMap) */}
              {listing.location?.coordinates && (
                <div className="mb-6">
                  <LeafletMap
                    coordinates={listing.location.coordinates}
                    title={listing.title}
                    address={listing.address || {}}
                  />
                </div>
              )}

              {/* Address Information */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <MapPin className="w-5 h-5 text-[#FF6B35] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{(t as any)?.location?.exactLocation || 'Exact location provided after booking'}</h3>
                  <p className="text-gray-700">
                    {listing.address?.street && `${listing.address.street}, `}
                    {listing.address?.city}, {listing.address?.state}, {listing.address?.country}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {(t as any)?.location?.exactLocationDescription || "We'll share the precise address once your reservation is confirmed"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="border-2 border-gray-200 rounded-2xl p-6 shadow-xl">
                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {formatPrice(listing.pricing?.basePrice || 0, listing.pricing?.currency || 'DZD')}
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
                </div>

                {/* Booking Form */}
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">{(t as any)?.booking?.checkIn || 'CHECK-IN'}</label>
                      <input
                        type="date"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">{(t as any)?.booking?.checkout || 'CHECKOUT'}</label>
                      <input
                        type="date"
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        min={checkIn || new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                      />
                    </div>
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

                {/* Reserve Button */}
                <button
                  className="w-full py-4 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white font-bold text-lg rounded-xl hover:shadow-xl transition-all transform hover:scale-105"
                  onClick={() => {
                    if (!checkIn || !checkOut) {
                      alert((t as any)?.errors?.selectDates || 'Please select check-in and check-out dates');
                      return;
                    }
                    setShowBookingModal(true);
                  }}
                >
                  {listing.availability?.instantBook ? (t as any)?.booking?.reserve || 'Reserve' : (t as any)?.booking?.requestToBook || 'Request to Book'}
                </button>

                <p className="text-center text-sm text-gray-600 mt-4">
                  {(t as any)?.booking?.notChargedYet || "You won't be charged yet"}
                </p>

                {/* Price Breakdown */}
                {checkIn && checkOut && (
                  <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                    {(() => {
                      const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
                      const basePrice = listing.pricing?.basePrice || 0;
                      const subtotal = basePrice * nights;
                      const cleaningFee = listing.pricing?.cleaningFee || 0;
                      const serviceFee = Math.round(subtotal * 0.10);
                      const taxes = Math.round((subtotal + cleaningFee + serviceFee) * 0.05);

                      return (
                        <>
                          <div className="flex justify-between text-gray-700">
                            <span>{formatPrice(basePrice, listing.pricing?.currency || 'DZD')} x {nights} {nights > 1 ? (t as any)?.booking?.nights || 'nights' : (t as any)?.booking?.night || 'night'}</span>
<span>{formatPrice(subtotal, listing.pricing?.currency || 'DZD')}</span>
</div>
{cleaningFee > 0 && (
<div className="flex justify-between text-gray-700">
<span>{(t as any)?.booking?.cleaningFee || 'Cleaning fee'}</span>
<span>{formatPrice(cleaningFee, listing.pricing?.currency || 'DZD')}</span>
</div>
)}
<div className="flex justify-between text-gray-700">
<span>{(t as any)?.booking?.serviceFee || 'Service fee (10%)'}</span>
<span>{formatPrice(serviceFee, listing.pricing?.currency || 'DZD')}</span>
</div>
<div className="flex justify-between text-gray-700">
<span>{(t as any)?.booking?.taxes || 'Taxes (5%)'}</span>
<span>{formatPrice(taxes, listing.pricing?.currency || 'DZD')}</span>
</div>
<div className="pt-3 border-t border-gray-200 flex justify-between font-bold text-lg">
<span>{(t as any)?.booking?.total || 'Total'}</span>
<span>{formatPrice(calculateTotalPrice(), listing.pricing?.currency || 'DZD')}</span>
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
</div>
);
}