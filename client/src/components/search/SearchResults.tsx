'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Star, MapPin, Users, Bed, Bath, Car, Fuel, Award, Zap, Shield, Camera, ArrowLeft, ArrowRight } from 'lucide-react';
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
}

export default function SearchResults({
  listings,
  loading = false,
  hasMore = false,
  onLoadMore,
  currency = 'DZD',
  language = 'en'
}: SearchResultsProps) {
  const t = useTranslation('search');
  const [currentImageIndex, setCurrentImageIndex] = useState<{[key: string]: number}>({});

  const formatPrice = (price: number, listingCurrency: string) => {
    if (currency === 'DZD' || listingCurrency === 'DZD') {
      return `${price.toLocaleString('fr-FR')} دج`;
    }
    return `€${price.toLocaleString('fr-FR')}`;
  };

  const nextImage = (listingId: string, maxImages: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // ✅ Empêche la propagation vers le Link parent
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation();
    }
    setCurrentImageIndex(prev => ({
      ...prev,
      [listingId]: ((prev[listingId] || 0) + 1) % maxImages
    }));
  };

  const prevImage = (listingId: string, maxImages: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // ✅ Empêche la propagation vers le Link parent
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation();
    }
    setCurrentImageIndex(prev => ({
      ...prev,
      [listingId]: ((prev[listingId] || 0) - 1 + maxImages) % maxImages
    }));
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="group">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
              {/* Enhanced Image Skeleton */}
              <div className="relative aspect-[4/3] bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer">
                <div className="absolute inset-0 skeleton-shimmer"></div>
                <div className="absolute top-4 left-4">
                  <div className="w-16 h-6 bg-white/70 rounded-lg"></div>
                </div>
                <div className="absolute top-4 right-4">
                  <div className="w-8 h-8 bg-white/70 rounded-full"></div>
                </div>
                <div className="absolute bottom-4 right-4">
                  <div className="w-12 h-5 bg-black/30 rounded-md"></div>
                </div>
              </div>

              {/* Enhanced Content Skeleton */}
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="h-5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg w-3/4 skeleton-shimmer"></div>
                    <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg w-1/2 skeleton-shimmer"></div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-8"></div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-12"></div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-12"></div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-baseline">
                    <div className="space-y-1">
                      <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-24 skeleton-shimmer"></div>
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                </div>
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
          {(t as any)?.empty?.noListings || 'No listings found'}
        </h3>
        <p className="text-gray-600">
          {(t as any)?.empty?.adjustFilters || 'Try adjusting your filters or search criteria'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {listings.map((listing) => {
          // ✅ Vérification robuste de l'ID
          const listingId = listing._id || listing.id;
          if (!listingId) {
            console.error('[SearchResults] Listing sans ID:', listing);
            return null;
          }

          const imageIndex = currentImageIndex[listingId] || 0;
          const maxImages = listing.images?.length || 1;

          return (
            <Link
              key={listingId}
              href={`/listing/${listingId}`}
              className="group cursor-pointer h-full"
              prefetch={true}
            >
              <div className="bg-white rounded-2xl md:rounded-3xl overflow-hidden border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-500 hover:translate-y-[-4px] hover:scale-[1.01] group-hover:ring-2 group-hover:ring-[#FF6B35]/20 flex flex-row md:flex-col h-full">
                {/* Enhanced Image Carousel - Horizontal on mobile, vertical on desktop */}
                <div className="relative w-32 h-32 md:w-full md:aspect-[3/2] flex-shrink-0 bg-gray-100 overflow-hidden">
                  <img
                    src={getListingImageUrl(listing, imageIndex)}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.jpg';
                    }}
                  />

                  {/* Enhanced Image Navigation - Hidden on mobile for horizontal layout */}
                  {listing.images && listing.images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => prevImage(listingId, maxImages, e)}
                        className="hidden md:block absolute left-3 top-1/2 transform -translate-y-1/2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <ArrowLeft className="w-4 h-4 text-gray-800" />
                      </button>
                      <button
                        onClick={(e) => nextImage(listingId, maxImages, e)}
                        className="hidden md:block absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <ArrowRight className="w-4 h-4 text-gray-800" />
                      </button>

                      {/* Image Dots - Hidden on mobile */}
                      <div className="hidden md:flex absolute bottom-4 left-1/2 transform -translate-x-1/2 gap-1">
                        {Array.from({ length: Math.min(maxImages, 5) }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full transition-all ${
                              i === imageIndex ? 'bg-white shadow-md' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Enhanced Image Counter */}
                      <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-black/70 backdrop-blur-sm text-white px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-semibold flex items-center gap-1">
                        <Camera className="w-2.5 h-2.5 md:w-3 md:h-3" />
                        {imageIndex + 1}/{maxImages}
                      </div>
                    </>
                  )}

                  {/* Enhanced Badges - More compact on mobile */}
                  <div className="absolute top-2 left-2 md:top-4 md:left-4 flex flex-col gap-1 md:gap-2">
                    {listing.featured && (
                      <div className="px-2 py-0.5 md:px-3 md:py-1 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white rounded-full text-[10px] md:text-xs font-bold shadow-lg flex items-center gap-0.5 md:gap-1">
                        <Award className="w-2.5 h-2.5 md:w-3 md:h-3" />
                        <span className="hidden md:inline">{(t as any)?.listing?.featured || 'Featured'}</span>
                      </div>
                    )}
                    {listing.availability?.instantBook && (
                      <div className="hidden md:flex px-3 py-1 bg-white/95 backdrop-blur-sm text-gray-900 rounded-full text-xs font-semibold shadow-lg items-center gap-1">
                        <Zap className="w-3 h-3 text-[#FF6B35]" />
                        {(t as any)?.listing?.instantBook || 'Instant Book'}
                      </div>
                    )}
                    {typeof listing.host === 'object' && listing.host.hostInfo?.superhost && (
                      <div className="px-2 py-0.5 md:px-3 md:py-1 bg-[#FF6B35] text-white rounded-full text-[10px] md:text-xs font-semibold shadow-lg flex items-center gap-0.5 md:gap-1">
                        <Shield className="w-2.5 h-2.5 md:w-3 md:h-3" />
                        <span className="hidden md:inline">{(t as any)?.listing?.superhost || 'Superhost'}</span>
                      </div>
                    )}
                  </div>

                  {/* Enhanced Wishlist Button - Repositioned for mobile */}
                  <div className="absolute top-2 right-2 md:bottom-4 md:top-auto md:right-4">
                    <WishlistButton
                      listingId={listingId}
                      size="md"
                      className="shadow-lg scale-75 md:scale-100"
                    />
                  </div>
                </div>

                {/* Enhanced Content Section - Compact on mobile, full on desktop */}
                <div className="p-3 md:p-8 flex flex-col flex-1">
                  {/* Title & Rating Row */}
                  <div className="flex justify-between items-start mb-2 md:mb-4">
                    <h3 className="font-bold text-gray-900 flex-1 line-clamp-1 md:line-clamp-2 text-sm md:text-xl leading-tight hover:text-[#FF6B35] transition-colors duration-200">
                      {listing.title}
                    </h3>
                    {/* Only show rating if there are actual reviews */}
                    {(() => {
                      const reviewCount = listing.stats?.reviewCount || listing.stats?.totalReviews || 0;
                      const avgRating = listing.stats?.averageRating || 0;

                      // Don't show badge if no reviews or rating is 0
                      if (reviewCount === 0 || avgRating === 0) return null;

                      return (
                        <div className="flex items-center gap-0.5 md:gap-1 ml-2 md:ml-3 flex-shrink-0 bg-gradient-to-r from-amber-50 to-orange-50 px-1.5 md:px-3 py-1 md:py-2 rounded-full border border-amber-200">
                          <Star className="w-3 h-3 md:w-4 md:h-4 fill-current text-[#FF6B35]" />
                          <span className="text-xs md:text-sm font-bold text-gray-900">{avgRating.toFixed(1)}</span>
                          <span className="hidden md:inline text-xs text-gray-600">({reviewCount})</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Location with enhanced styling */}
                  <div className="flex items-center gap-1 md:gap-2 mb-2 md:mb-4">
                    <div className="p-0.5 md:p-1 bg-[#FF6B35]/10 rounded-lg">
                      <MapPin className="w-3 h-3 md:w-4 md:h-4 text-[#FF6B35]" />
                    </div>
                    <p className="text-gray-700 text-xs md:text-sm font-medium line-clamp-1">
                      {listing.address?.city || (t as any)?.listing?.city || 'City'}{listing.address?.state ? `, ${listing.address.state}` : ''}
                    </p>
                  </div>

                  {/* Enhanced Category Details - Hidden on mobile for compact layout */}
                  {listing.category === 'stay' ? (
                    <div className="hidden md:grid grid-cols-3 gap-3 mb-4">
                      {listing.stayDetails?.bedrooms && listing.stayDetails.bedrooms > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <Bed className="w-4 h-4 text-[#FF6B35]" />
                          <span className="text-sm font-semibold text-gray-900">
                            {listing.stayDetails.bedrooms} {listing.stayDetails.bedrooms > 1 ? ((t as any)?.listing?.beds || 'beds') : ((t as any)?.listing?.bed || 'bed')}
                          </span>
                        </div>
                      )}
                      {listing.stayDetails?.bathrooms && listing.stayDetails.bathrooms > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <Bath className="w-4 h-4 text-[#FF6B35]" />
                          <span className="text-sm font-semibold text-gray-900">
                            {listing.stayDetails.bathrooms} {listing.stayDetails.bathrooms > 1 ? ((t as any)?.listing?.baths || 'baths') : ((t as any)?.listing?.bath || 'bath')}
                          </span>
                        </div>
                      )}
                      {listing.stayDetails?.area && listing.stayDetails.area > 0 && (
                        <div className="flex items-center justify-center p-2 bg-[#FF6B35]/10 rounded-lg">
                          <span className="text-sm font-bold text-[#FF6B35]">
                            {listing.stayDetails.area}m²
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="hidden md:block space-y-3 mb-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Car className="w-5 h-5 text-[#FF6B35] flex-shrink-0" />
                        <span className="font-semibold text-gray-900 line-clamp-1">
                          {listing.vehicleDetails?.make} {listing.vehicleDetails?.model} {listing.vehicleDetails?.year}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {listing.vehicleDetails?.seats && listing.vehicleDetails.seats > 0 && (
                          <div className="flex items-center gap-1 p-2 bg-gray-50 rounded-lg">
                            <Users className="w-4 h-4 text-[#FF6B35]" />
                            <span className="text-sm font-semibold text-gray-900">{listing.vehicleDetails.seats}</span>
                          </div>
                        )}
                        {listing.vehicleDetails?.transmission && (
                          <div className="flex items-center justify-center p-2 bg-gray-50 rounded-lg">
                            <span className="text-sm font-semibold text-gray-900 capitalize">
                              {listing.vehicleDetails.transmission}
                            </span>
                          </div>
                        )}
                        {listing.vehicleDetails?.fuelType && (
                          <div className="flex items-center gap-1 p-2 bg-gray-50 rounded-lg">
                            <Fuel className="w-4 h-4 text-[#FF6B35]" />
                            <span className="text-sm font-semibold text-gray-900">{listing.vehicleDetails.fuelType}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Enhanced Host Info - Hidden on mobile */}
                  {typeof listing.host === 'object' && (
                    <div className="hidden md:flex items-center gap-2 mb-4 p-3 bg-gradient-to-r from-[#FF6B35]/5 to-[#F7931E]/5 rounded-lg border border-[#FF6B35]/10">
                      <div className="w-8 h-8 bg-[#FF6B35] rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {typeof listing.host === 'object' ? listing.host.firstName?.charAt(0) : 'H'}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {(t as any)?.listing?.hostedBy || 'Hosted by'} {typeof listing.host === 'object' ? `${listing.host.firstName} ${listing.host.lastName}` : ((t as any)?.listing?.host || 'Host')}
                      </span>
                    </div>
                  )}

                  {/* Enhanced Price Section - Compact on mobile */}
                  <div className="pt-2 md:pt-6 border-t md:border-t-2 border-gray-100 mt-auto">
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-1 md:gap-2">
                        <span className="font-bold text-base md:text-3xl text-gray-900">
                          {formatPrice(listing.pricing?.basePrice || 0, listing.pricing?.currency || 'DZD')}
                        </span>
                        <span className="text-gray-600 text-xs md:text-base font-medium">
                          /{listing.category === 'stay' ? ((t as any)?.listing?.night || 'night') : ((t as any)?.listing?.day || 'day')}
                        </span>
                      </div>
                      {listing.pricing?.convertedPrice && listing.pricing.convertedPrice > (listing.pricing?.basePrice || 0) && (
                        <div className="hidden md:block text-right">
                          <div className="text-sm text-gray-400 line-through">
                            {formatPrice(listing.pricing.convertedPrice, listing.pricing?.currency || 'DZD')}
                          </div>
                          <div className="text-sm text-green-600 font-semibold">
                            {(t as any)?.listing?.save || 'Save'} {Math.round(((listing.pricing.convertedPrice - (listing.pricing?.basePrice || 0)) / listing.pricing.convertedPrice) * 100)}%
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Enhanced Load More Button */}
      {hasMore && onLoadMore && (
        <div className="text-center mt-12">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="group relative px-12 py-4 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <div className="relative flex items-center gap-3">
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {(t as any)?.listing?.loadingMore || 'Loading more...'}
                </>
              ) : (
                <>
                  <span>{(t as any)?.listing?.loadMore || 'Load more'}</span>
                  <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </div>
          </button>
          <p className="text-gray-600 text-sm mt-4">
            {((t as any)?.results?.showingCount || 'Showing {count} listings').replace('{count}', listings.length.toString())}
          </p>
        </div>
      )}
    </div>
  );
}