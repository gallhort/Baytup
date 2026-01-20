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
              {/* Card container - Abritel exact size */}
              <div className={`bg-white rounded-lg overflow-hidden transition-all duration-200 flex flex-col sm:flex-row h-auto sm:h-[185px] border ${
                hoveredListing === listingId
                  ? 'shadow-lg border-gray-400'
                  : 'shadow-sm hover:shadow-md border-gray-200 hover:border-gray-300'
              }`}>

                {/* Image Section - Abritel exact size (140-150px) */}
                <div className="relative w-full sm:w-[140px] lg:w-[150px] h-44 sm:h-full flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
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

                {/* Content Section - Abritel layout: LEFT content + RIGHT price */}
                <div className="flex-1 p-4 flex justify-between gap-4 min-w-0">
                  {/* LEFT: Main content (ville, titre, détails, badge) */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div className="space-y-1.5">
                      {/* Arrondissement/Ville - Taille augmentée */}
                      <div className="text-sm text-gray-600 truncate">
                        {listing.address?.city || 'Ville'}
                      </div>

                      {/* Title (bold, 2 lines) - Taille augmentée */}
                      <h3 className="font-bold text-gray-900 text-lg leading-snug line-clamp-2">
                        {listing.title}
                      </h3>

                      {/* Property details - Taille augmentée */}
                      <div className="text-base text-gray-600 line-clamp-1">
                        {listing.category === 'stay' ? (
                          <>
                            Appartement • {listing.stayDetails?.bedrooms || 1} {listing.stayDetails?.bedrooms === 1 ? 'chambre' : 'chambres'}
                            {listing.stayDetails?.bathrooms && ` • ${listing.stayDetails.bathrooms} salle${listing.stayDetails.bathrooms > 1 ? 's' : ''} de bain`}
                          </>
                        ) : (
                          <>Véhicule • {listing.vehicleDetails?.seats || 4} places</>
                        )}
                      </div>

                      {/* Badge "Hôte professionnel" - Taille augmentée */}
                      {typeof listing.host === 'object' && listing.host.hostInfo?.superhost && (
                        <div className="text-sm text-gray-700 font-medium mt-1">
                          Hôte professionnel
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
                        <span className="text-sm text-gray-500">{reviewCount} avis</span>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 mt-2">
                        Pas encore d'avis
                      </div>
                    )}
                  </div>

                  {/* RIGHT: Price section - Tailles augmentées */}
                  <div className="flex flex-col items-end justify-end text-right flex-shrink-0">
                    {/* Prix barré si discount */}
                    {listing.pricing?.convertedPrice && listing.pricing.convertedPrice > (listing.pricing?.basePrice || 0) && (
                      <div className="text-base text-gray-500 line-through">
                        {formatPrice(listing.pricing.convertedPrice, listing.pricing?.currency || 'DZD')}
                      </div>
                    )}

                    {/* Prix principal (GROS) - Taille augmentée */}
                    <div className="font-bold text-2xl text-gray-900">
                      {formatPrice(listing.pricing?.basePrice || 0, listing.pricing?.currency || 'DZD')}
                    </div>

                    {/* "pour X nuits, 1 appartement" - Taille augmentée */}
                    <div className="text-sm text-gray-600 mt-0.5">
                      pour 1 nuit, 1 {listing.category === 'stay' ? 'appartement' : 'véhicule'}
                    </div>

                    {/* "X € par nuit" - Taille augmentée */}
                    <div className="text-sm text-gray-600">
                      {formatPrice(listing.pricing?.basePrice || 0, listing.pricing?.currency || 'DZD')} par nuit
                    </div>

                    {/* "taxes et frais compris" - Taille augmentée */}
                    <div className="text-sm text-gray-500">
                      taxes et frais compris
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
