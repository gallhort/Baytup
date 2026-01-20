'use client';

import React from 'react';
import Link from 'next/link';
import { Star, MapPin, Users, Bed, Bath, Heart } from 'lucide-react';
import { Listing } from '@/types';
import { getListingImageUrl } from '@/utils/imageUtils';
import WishlistButton from '@/components/WishlistButton';
import { useTranslation } from '@/hooks/useTranslation';

interface SearchResultsProps {
  listings: Listing[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  currency?: 'DZD' | 'EUR';
  language?: string;
  onListingHover?: (id: string | null) => void;
  hoveredListing?: string | null;
}

export default function SearchResults({
  listings,
  loading = false,
  hasMore = false,
  onLoadMore,
  currency = 'DZD',
  language = 'en',
  onListingHover,
  hoveredListing
}: SearchResultsProps) {
  const t = useTranslation('search');

  const formatPrice = (price: number, listingCurrency: string) => {
    if (currency === 'DZD' || listingCurrency === 'DZD') {
      return `${price.toLocaleString('fr-FR')} دج`;
    }
    return `€${price.toLocaleString('fr-FR')}`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 flex h-[180px]">
            <div className="w-[200px] sm:w-[240px] bg-gray-200 animate-pulse" />
            <div className="flex-1 p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
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
            if (avgRating >= 9) return { label: 'Exceptionnel', color: 'bg-green-600' };
            if (avgRating >= 8) return { label: 'Très bien', color: 'bg-green-500' };
            if (avgRating >= 7) return { label: 'Bien', color: 'bg-blue-500' };
            return { label: 'Correct', color: 'bg-gray-500' };
          };

          const ratingBadge = getRatingBadge();

          return (
            <Link
              key={listingId}
              href={`/listing/${listingId}`}
              className="group block"
              prefetch={true}
              onMouseEnter={() => onListingHover?.(listingId)}
              onMouseLeave={() => onListingHover?.(null)}
            >
              {/* Card container - horizontal on all screens */}
              <div className={`bg-white rounded-xl overflow-hidden transition-all duration-300 flex flex-col sm:flex-row h-auto sm:h-[180px] border ${
                hoveredListing === listingId
                  ? 'shadow-[0_8px_30px_rgba(0,0,0,0.15)] border-gray-300 scale-[1.01]'
                  : 'shadow-sm hover:shadow-md border-gray-200'
              }`}>

                {/* Image Section - Left side on desktop, top on mobile */}
                <div className="relative w-full sm:w-[200px] lg:w-[240px] h-48 sm:h-full flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                  <img
                    src={getListingImageUrl(listing, 0)}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.jpg';
                    }}
                  />

                  {/* Featured badge */}
                  {listing.featured && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-gradient-to-r from-[#FF6B35] to-orange-500 text-white rounded-md text-xs font-bold shadow-lg">
                      En vedette
                    </div>
                  )}

                  {/* Wishlist button - absolute top right */}
                  <div className="absolute top-2 right-2">
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

                {/* Content Section - Right side */}
                <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                  {/* Top section */}
                  <div className="space-y-1.5">
                    {/* Location (city) in small gray text */}
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">
                        {listing.address?.city || 'Ville'}{listing.address?.state ? `, ${listing.address.state}` : ''}
                      </span>
                    </div>

                    {/* Title in bold */}
                    <h3 className="font-bold text-gray-900 text-base lg:text-lg line-clamp-2 leading-tight">
                      {listing.title}
                    </h3>

                    {/* Property type and details */}
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      {listing.category === 'stay' ? (
                        <>
                          {listing.stayDetails?.bedrooms && (
                            <div className="flex items-center gap-1">
                              <Bed className="w-3.5 h-3.5" />
                              <span>{listing.stayDetails.bedrooms} ch.</span>
                            </div>
                          )}
                          {listing.stayDetails?.bathrooms && (
                            <div className="flex items-center gap-1">
                              <Bath className="w-3.5 h-3.5" />
                              <span>{listing.stayDetails.bathrooms} sdb</span>
                            </div>
                          )}
                          {listing.stayDetails?.area && (
                            <span>{listing.stayDetails.area}m²</span>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          <span>{listing.vehicleDetails?.seats || 4} places</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom section - Rating badge and price */}
                  <div className="flex items-end justify-between gap-4 mt-2">
                    {/* Rating badge (Abritel style - green) */}
                    {ratingBadge && (
                      <div className="flex items-center gap-2">
                        <div className={`${ratingBadge.color} text-white px-2 py-1 rounded text-xs font-bold`}>
                          {ratingBadge.label}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-current text-gray-900" />
                          <span className="text-sm font-bold text-gray-900">{avgRating.toFixed(1)}/10</span>
                        </div>
                        <span className="text-xs text-gray-500">({reviewCount} avis)</span>
                      </div>
                    )}

                    {/* Price section - always visible, aligned right */}
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="font-bold text-xl lg:text-2xl text-gray-900">
                          {formatPrice(listing.pricing?.basePrice || 0, listing.pricing?.currency || 'DZD')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        par {listing.category === 'stay' ? 'nuit' : 'jour'}
                      </div>
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
            {loading ? 'Chargement...' : 'Afficher plus de résultats'}
          </button>
        </div>
      )}
    </div>
  );
}
