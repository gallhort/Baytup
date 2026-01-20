'use client';

import { useState, useEffect } from 'react';
import {
  FaHeart, FaMapMarkerAlt, FaStar, FaUsers, FaBed, FaCar,
  FaFilter, FaSort, FaTh, FaList, FaTrash, FaEye, FaShare,
  FaChevronDown, FaInfoCircle, FaCheckCircle, FaHome, FaExternalLinkAlt
} from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';

interface SavedListing {
  _id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  categoryLabel: string;
  images: { url: string; isPrimary: boolean }[];
  primaryImage: string;
  pricing: {
    basePrice: number;
    currency: string;
    pricingType: string;
  };
  displayPrice: number;
  currency: string;
  address: {
    city: string;
    country: string;
    state?: string;
  };
  host: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    hostInfo?: {
      superhost: boolean;
    };
  };
  stats: {
    averageRating: number;
    reviewCount: number;
    favorites: number;
  };
  availability?: {
    instantBook: boolean;
  };
  isSaved: boolean;
  createdAt: string;
}

interface Stats {
  totalSaved: number;
  byCategory: {
    stay: number;
    car: number;
  };
  totalValue: number;
  averagePrice: number;
}

export default function SavedListingsPage() {
  const t = useTranslation('saved');
  const [savedListings, setSavedListings] = useState<SavedListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<SavedListing[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('-createdAt');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  useEffect(() => {
    fetchSavedListings();
    fetchStats();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [savedListings, categoryFilter, sortBy, priceRange]);

  const fetchSavedListings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/wishlists`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setSavedListings(response.data.data);
    } catch (error: any) {
      console.error('Error fetching saved listings:', error);
      toast.error(error.response?.data?.message || (t as any).toast.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/wishlists/stats`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setStats(response.data.data);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...savedListings];

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Price range filter
    if (priceRange.min || priceRange.max) {
      filtered = filtered.filter(item => {
        const price = item.displayPrice;
        if (priceRange.min && price < parseFloat(priceRange.min)) return false;
        if (priceRange.max && price > parseFloat(priceRange.max)) return false;
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case '-createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'createdAt':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'price-asc':
          return a.displayPrice - b.displayPrice;
        case 'price-desc':
          return b.displayPrice - a.displayPrice;
        case 'rating':
          return (b.stats?.averageRating || 0) - (a.stats?.averageRating || 0);
        default:
          return 0;
      }
    });

    setFilteredListings(filtered);
  };

  const handleRemoveFromSaved = async (listingId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/wishlists/${listingId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSavedListings(prev => prev.filter(item => item._id !== listingId));
      toast.success((t as any).toast.removed);
      fetchStats();
    } catch (error: any) {
      console.error('Error removing from saved:', error);
      toast.error(error.response?.data?.message || (t as any).toast.removeFailed);
    }
  };

  const handleClearAll = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/wishlists/clear`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSavedListings([]);
      setShowClearModal(false);
      toast.success((t as any).toast.cleared);
      fetchStats();
    } catch (error: any) {
      console.error('Error clearing saved listings:', error);
      toast.error(error.response?.data?.message || (t as any).toast.clearFailed);
    }
  };

  const handleShare = async (listing: SavedListing) => {
    const url = `${window.location.origin}/listing/${listing._id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success((t as any).toast.linkCopied);
    } catch (error) {
      toast.error((t as any).toast.linkFailed);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'DZD') {
      return `${price.toLocaleString()} DZD`;
    }
    return `€${price.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#FF6B35] mx-auto mb-4"></div>
          <p className="text-gray-600">{(t as any).loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] rounded-2xl p-8 text-white shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FaHeart className="text-4xl" />
                <h1 className="text-3xl font-bold">{(t as any).header.title}</h1>
              </div>
              <p className="text-white/90">{(t as any).header.subtitle}</p>
            </div>
            {stats && (
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">{stats.totalSaved}</div>
                  <div className="text-sm text-white/80">{(t as any).stats.totalSaved}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{stats.byCategory.stay}</div>
                  <div className="text-sm text-white/80">{(t as any).stats.stays}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{stats.byCategory.car}</div>
                  <div className="text-sm text-white/80">{(t as any).stats.cars}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Left side - Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <FaFilter />
                {(t as any).filters.filtersButton}
                <FaChevronDown className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
              >
                <option value="all">{(t as any).filters.allCategories}</option>
                <option value="stay">{(t as any).filters.stays}</option>
                <option value="car">{(t as any).filters.carRentals}</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
              >
                <option value="-createdAt">{(t as any).filters.newestFirst}</option>
                <option value="createdAt">{(t as any).filters.oldestFirst}</option>
                <option value="price-asc">{(t as any).filters.priceLowToHigh}</option>
                <option value="price-desc">{(t as any).filters.priceHighToLow}</option>
                <option value="rating">{(t as any).filters.highestRated}</option>
              </select>
            </div>

            {/* Right side - View and Actions */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setView('grid')}
                  className={`p-2 rounded ${view === 'grid' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
                >
                  <FaTh />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`p-2 rounded ${view === 'list' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
                >
                  <FaList />
                </button>
              </div>

              {savedListings.length > 0 && (
                <button
                  onClick={() => setShowClearModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <FaTrash />
                  {(t as any).filters.clearAll}
                </button>
              )}
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any).filters.minPrice}
                  </label>
                  <input
                    type="number"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any).filters.maxPrice}
                  </label>
                  <input
                    type="number"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                    placeholder="100000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="max-w-7xl mx-auto mb-4">
        <p className="text-gray-600">
          {(t as any).results.showing} {filteredListings.length} {(t as any).results.of} {savedListings.length} {(t as any).results.savedListings}
        </p>
      </div>

      {/* Listings */}
      <div className="max-w-7xl mx-auto">
        {filteredListings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaHeart className="text-4xl text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">{(t as any).empty.title}</h3>
            <p className="text-gray-600 mb-6">
              {(t as any).empty.description}
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF6B35] text-white rounded-lg hover:bg-[#FF5722] transition-colors"
            >
              <FaHome />
              {(t as any).empty.exploreButton}
            </Link>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <div
                key={listing._id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow group"
              >
                {/* Image */}
                <div className="relative h-64 overflow-hidden">
                  <Image
                    src={listing.primaryImage}
                    alt={listing.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/uploads/listings/default.jpg';
                    }}
                  />

                  {/* Category Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium flex items-center gap-1">
                      {listing.category === 'stay' ? <FaBed /> : <FaCar />}
                      {listing.categoryLabel}
                    </span>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveFromSaved(listing._id)}
                    className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <FaHeart className="text-xl" />
                  </button>

                  {/* Instant Book Badge */}
                  {listing.availability?.instantBook && (
                    <div className="absolute bottom-3 left-3">
                      <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                        <FaCheckCircle />
                        {(t as any).card.instantBook}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Title and Location */}
                  <Link href={`/listing/${listing._id}`}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-[#FF6B35] transition-colors line-clamp-2">
                      {listing.title}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-2 text-gray-600 text-sm mb-3">
                    <FaMapMarkerAlt className="text-[#FF6B35]" />
                    <span>{listing.address.city}, {listing.address.country}</span>
                  </div>

                  {/* Host Info */}
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
                    <Image
                      src={listing.host.avatar}
                      alt={listing.host.firstName}
                      width={32}
                      height={32}
                      className="rounded-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/uploads/users/default-avatar.png';
                      }}
                    />
                    <span className="text-sm text-gray-700">
                      {listing.host.firstName} {listing.host.lastName}
                    </span>
                    {listing.host.hostInfo?.superhost && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                        {(t as any).card.superhost}
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      <FaStar className="text-yellow-400" />
                      <span className="font-medium">{listing.stats?.averageRating?.toFixed(1) || (t as any).card.new}</span>
                      {listing.stats?.reviewCount > 0 && (
                        <span className="text-sm text-gray-600">({listing.stats.reviewCount})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 text-sm">
                      <FaHeart />
                      <span>{listing.stats?.favorites || 0}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-gray-900">
                        {formatPrice(listing.displayPrice, listing.currency)}
                      </span>
                      <span className="text-sm text-gray-600 ml-1">
                        /{listing.pricing.pricingType === 'per_night' ? (t as any).card.night : (t as any).card.day}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/listing/${listing._id}`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#FF5722] transition-colors"
                      title={(t as any).card.viewDetails}
                    >
                      <FaEye />
                      {(t as any).card.view}
                    </Link>
                    <button
                      onClick={() => handleShare(listing)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      title={(t as any).card.share}
                    >
                      <FaShare />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredListings.map((listing) => (
              <div
                key={listing._id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Image */}
                  <div className="relative w-full md:w-80 h-64 md:h-auto flex-shrink-0">
                    <Image
                      src={listing.primaryImage}
                      alt={listing.title}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/uploads/listings/default.jpg';
                      }}
                    />

                    {/* Remove Button */}
                    <button
                      onClick={() => handleRemoveFromSaved(listing._id)}
                      className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <FaHeart className="text-xl" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium flex items-center gap-1">
                            {listing.category === 'stay' ? <FaBed /> : <FaCar />}
                            {listing.categoryLabel}
                          </span>
                          {listing.availability?.instantBook && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                              <FaCheckCircle />
                              {(t as any).card.instantBook}
                            </span>
                          )}
                        </div>

                        <Link href={`/listing/${listing._id}`}>
                          <h3 className="text-2xl font-semibold text-gray-900 mb-2 hover:text-[#FF6B35] transition-colors">
                            {listing.title}
                          </h3>
                        </Link>

                        <div className="flex items-center gap-2 text-gray-600 mb-3">
                          <FaMapMarkerAlt className="text-[#FF6B35]" />
                          <span>{listing.address.city}, {listing.address.country}</span>
                        </div>

                        <p className="text-gray-600 line-clamp-2 mb-4">
                          {listing.description}
                        </p>

                        {/* Host Info */}
                        <div className="flex items-center gap-2 mb-4">
                          <Image
                            src={listing.host.avatar}
                            alt={listing.host.firstName}
                            width={40}
                            height={40}
                            className="rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/uploads/users/default-avatar.png';
                            }}
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {listing.host.firstName} {listing.host.lastName}
                            </p>
                            {listing.host.hostInfo?.superhost && (
                              <span className="text-xs text-purple-600">{(t as any).card.superhost}</span>
                            )}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <FaStar className="text-yellow-400" />
                            <span className="font-medium">{listing.stats?.averageRating?.toFixed(1) || (t as any).card.new}</span>
                            {listing.stats?.reviewCount > 0 && (
                              <span className="text-sm text-gray-600">({listing.stats.reviewCount} {(t as any).card.reviews})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <FaHeart />
                            <span>{listing.stats?.favorites || 0} {(t as any).card.favorites}</span>
                          </div>
                        </div>
                      </div>

                      {/* Price and Actions */}
                      <div className="text-right ml-6">
                        <div className="mb-4">
                          <div className="text-3xl font-bold text-gray-900">
                            {formatPrice(listing.displayPrice, listing.currency)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {(t as any).card.per} {listing.pricing.pricingType === 'per_night' ? (t as any).card.night : (t as any).card.day}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Link
                            href={`/listing/${listing._id}`}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#FF6B35] text-white rounded-lg hover:bg-[#FF5722] transition-colors"
                          >
                            <FaEye />
                            {(t as any).card.viewDetails}
                          </Link>
                          <button
                            onClick={() => handleShare(listing)}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <FaShare />
                            {(t as any).card.share}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clear All Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <FaTrash className="text-red-600 text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">{(t as any).modal.title}</h3>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex gap-2">
                <FaInfoCircle className="text-yellow-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-700">
                    {(t as any).modal.warningPrefix} {savedListings.length} {(t as any).modal.warningSuffix}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                {(t as any).modal.cancel}
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                {(t as any).modal.clearAll}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
