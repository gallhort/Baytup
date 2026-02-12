'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin, Users, Bed, Bath, Heart, Camera } from 'lucide-react';
import { Listing } from '@/types';
import { getListingImageUrl } from '@/utils/imageUtils';
import WishlistButton from '@/components/WishlistButton';
import { useTranslation } from '@/hooks/useTranslation';
import { convertCurrency } from '@/utils/priceUtils';

interface SearchResultsProps {
  listings: Listing[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  currency?: 'DZD' | 'EUR';
  language?: string;
  onListingHover?: (id: string | null) => void;
  hoveredListing?: string | null;
  // ✅ NEW: Search params to pass to listing detail page
  searchParams?: {
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    adults?: number;
    children?: number;
  };
}

export default function SearchResults({
  listings,
  loading = false,
  hasMore = false,
  onLoadMore,
  currency = 'DZD',
  language = 'en',
  onListingHover,
  hoveredListing,
  searchParams
}: SearchResultsProps) {
  const t = useTranslation('search');

  // ✅ FIX: Display price in user's selected currency with conversion
  const formatPrice = (price: number, listingCurrency: string) => {
    // Convert price if listing currency differs from user's selected currency
    let displayAmount = price;
    let displayCurrency = currency;

    if (listingCurrency && listingCurrency !== currency) {
      displayAmount = convertCurrency(price, listingCurrency as 'DZD' | 'EUR', currency);
    }

    if (displayCurrency === 'EUR') {
      return `€${displayAmount.toLocaleString('fr-FR')}`;
    }
    return `${displayAmount.toLocaleString('fr-FR')} DZD`;
  };

  // ✅ NEW: Build listing URL with search params for booking pre-fill
  const getListingUrl = (listingId: string) => {
    const params = new URLSearchParams();
    if (searchParams?.checkIn) params.set('checkIn', searchParams.checkIn);
    if (searchParams?.checkOut) params.set('checkOut', searchParams.checkOut);
    if (searchParams?.guests) params.set('guests', searchParams.guests.toString());
    if (searchParams?.adults) params.set('adults', searchParams.adults.toString());
    if (searchParams?.children) params.set('children', searchParams.children.toString());

    const queryString = params.toString();
    return `/listing/${listingId}${queryString ? `?${queryString}` : ''}`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 flex flex-col h-auto">
            <div className="w-full h-56 bg-gray-200 animate-pulse" />
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
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-gray-400 mb-4">
          <MapPin size={64} className="mx-auto" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {(t as any)?.empty?.noListings || 'Aucun logement trouvé'}
        </h3>
        <p className="text-gray-600">
          {(t as any)?.empty?.adjustFilters || 'Essayez d\'ajuster vos filtres'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Abritel-style horizontal compact cards */}
      <div className="space-y-4">
        {listings.map((listing) => {
          const listingId = listing._id || listing.id;
          if (!listingId) return null;

          const reviewCount = listing.stats?.reviewCount || listing.stats?.totalReviews || 0;
          const avgRating = listing.stats?.averageRating || 0;
          const hasRatings = reviewCount > 0 && avgRating > 0;

          // Determine rating badge style (Abritel uses green badges)
          const getRatingBadge = () => {
            if (!hasRatings) return null;
            if (avgRating >= 9) return { label: (t as any).ratings?.exceptional || 'Exceptionnel', color: 'bg-green-600' };
            if (avgRating >= 8) return { label: (t as any).ratings?.veryGood || 'Très bien', color: 'bg-green-500' };
            if (avgRating >= 7) return { label: (t as any).ratings?.good || 'Bien', color: 'bg-blue-500' };
            return { label: (t as any).ratings?.correct || 'Correct', color: 'bg-gray-500' };
          };

          const ratingBadge = getRatingBadge();

          return (
            <Link
              key={listingId}
              href={getListingUrl(listingId)}
              className="group block"
              prefetch={true}
              onMouseEnter={() => onListingHover?.(listingId)}
              onMouseLeave={() => onListingHover?.(null)}
            >
              {/* Card container - Always vertical for readability */}
              <div className={`bg-white rounded-lg overflow-hidden transition-all duration-200 flex flex-col h-auto border ${
                hoveredListing === listingId
                  ? 'shadow-lg border-gray-400'
                  : 'shadow-sm hover:shadow-md border-gray-200 hover:border-gray-300'
              }`}>

                {/* Image Section - Full width, consistent height */}
                <div className="relative w-full h-56 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                  <Image
                    src={getListingImageUrl(listing, 0)}
                    alt={listing.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.jpg';
                    }}
                  />

                  {/* Featured / Coup de coeur badges */}
                  {listing.featured && (
                    <div className="absolute top-2 start-2 px-2 py-1 bg-gradient-to-r from-[#FF6B35] to-orange-500 text-white rounded-md text-xs font-bold shadow-lg">
                      {(t as any).listingCard?.featured || 'En vedette'}
                    </div>
                  )}
                  {!listing.featured && (listing.stats?.averageRating || 0) >= 4.7 && (listing.stats?.reviewCount || 0) >= 3 && (
                    <div className="absolute top-2 start-2 px-2 py-1 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-md text-xs font-bold shadow-lg flex items-center gap-1">
                      <Heart className="w-3 h-3 fill-current" />
                      Coup de coeur
                    </div>
                  )}

                  {/* Wishlist button - absolute top end */}
                  <div className="absolute top-2 end-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg"
                    >
                      <Heart className="w-5 h-5 text-gray-700 hover:text-[#FF6B35]" />
                    </button>
                  </div>
                </div>

                {/* Content Section - Abritel layout: LEFT content + RIGHT price */}
                <div className="flex-1 p-4 flex flex-row justify-between gap-4 min-w-0">
                  {/* LEFT: Main content (ville, titre, détails, badge) */}
                  <div className="flex-1 flex flex-col justify-between min-w-0 text-start">
                    <div className="space-y-1.5">
                      {/* Arrondissement/Ville - Taille augmentée */}
                      <div className="text-sm text-gray-600 truncate">
                        {listing.address?.city || (t as any).listing?.city || 'Ville'}
                      </div>

                      {/* Title (bold, 2 lines) - Taille augmentée */}
                      <h3 className="font-bold text-gray-900 text-lg leading-snug line-clamp-2">
                        {listing.title}
                      </h3>

                      {/* Property details - Taille augmentée */}
                      <div className="text-base text-gray-600 line-clamp-1">
                        {listing.category === 'stay' ? (
                          <>
                            {(t as any).listingCard?.apartment || 'Appartement'} • {listing.stayDetails?.bedrooms || 1} {listing.stayDetails?.bedrooms === 1 ? ((t as any).listingCard?.bedroom || 'chambre') : ((t as any).listingCard?.bedrooms || 'chambres')}
                            {listing.stayDetails?.bathrooms && ` • ${listing.stayDetails.bathrooms} ${listing.stayDetails.bathrooms > 1 ? ((t as any).listingCard?.bathrooms || 'salles de bain') : ((t as any).listingCard?.bathroom || 'salle de bain')}`}
                          </>
                        ) : (
                          <>{(t as any).listingCard?.vehicle || 'Véhicule'} • {listing.vehicleDetails?.seats || 4} {(t as any).listingCard?.seats || 'places'}</>
                        )}
                      </div>

                      {/* Badge "Hôte professionnel" - Taille augmentée */}
                      {typeof listing.host === 'object' && listing.host.hostInfo?.superhost && (
                        <div className="text-sm text-gray-700 font-medium mt-1">
                          {(t as any).listingCard?.professionalHost || 'Hôte professionnel'}
                        </div>
                      )}

                      {/* Guest photo count indicator */}
                      {(listing as any).stats?.guestPhotoCount > 0 && (
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <Camera className="w-3.5 h-3.5" />
                          <span>{(listing as any).stats.guestPhotoCount} photo{(listing as any).stats.guestPhotoCount > 1 ? 's' : ''} voyageur{(listing as any).stats.guestPhotoCount > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>

                    {/* Rating badge at bottom - Taille augmentée */}
                    {hasRatings ? (
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className={`${ratingBadge?.color} text-white px-2 py-0.5 rounded text-sm font-bold`}>
                          {avgRating.toFixed(1)}
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{ratingBadge?.label}</span>
                        <span className="text-sm text-gray-500">{reviewCount} {(t as any).ratings?.reviews || 'avis'}</span>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 mt-2">
                        {(t as any).ratings?.noReviews || 'Pas encore d\'avis'}
                      </div>
                    )}
                  </div>

                  {/* RIGHT: Price section - Tailles augmentées */}
                  <div className="flex flex-col items-end justify-end text-end flex-shrink-0">
                    {/* Prix principal */}
                    <div className="font-bold text-2xl text-gray-900">
                      {formatPrice(listing.pricing?.basePrice || 0, listing.pricing?.currency || 'DZD')}
                    </div>

                    {/* "pour X nuits, 1 appartement" - Taille augmentée */}
                    <div className="text-sm text-gray-600 mt-0.5">
                      {(t as any).listingCard?.forOneNight || 'pour 1 nuit, 1'} {listing.category === 'stay' ? ((t as any).listingCard?.apartment || 'appartement') : ((t as any).listingCard?.vehicle || 'véhicule')}
                    </div>

                    {/* "X € par nuit" - Taille augmentée */}
                    <div className="text-sm text-gray-600">
                      {formatPrice(listing.pricing?.basePrice || 0, listing.pricing?.currency || 'DZD')} {(t as any).listingCard?.perNight || 'par nuit'}
                    </div>

                    {/* "taxes et frais compris" - Taille augmentée */}
                    <div className="text-sm text-gray-500">
                      {(t as any).listingCard?.taxes || 'taxes et frais compris'}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Load More Button */}
      {hasMore && onLoadMore && (
        <div className="text-center mt-8">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-[#FF6B35] to-orange-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? ((t as any).listingCard?.loading || 'Chargement...') : ((t as any).listingCard?.showMore || 'Afficher plus de résultats')}
          </button>
        </div>
      )}
    </div>
  );
}
