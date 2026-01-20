'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import { formatPrice } from '@/utils/priceUtils';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
  FaHome,
  FaCar,
  FaTrash,
  FaEye,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaTimes,
  FaBan,
  FaStar,
  FaMapMarkerAlt,
  FaUser,
  FaCalendar,
  FaMoneyBillWave,
  FaHeart,
  FaEyeSlash,
  FaToggleOn,
  FaToggleOff,
  FaClock
} from 'react-icons/fa';
import Image from 'next/image';

interface Listing {
  _id: string;
  title: string;
  description: string;
  category: 'stay' | 'vehicle';
  subcategory: string;
  host: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  images: Array<{
    url: string;
    caption: string;
    isPrimary: boolean;
  }>;
  pricing: {
    basePrice: number;
    currency: string;
    pricingType: string;
  };
  address: {
    city: string;
    state: string;
    country: string;
  };
  stats: {
    views: number;
    favorites: number;
    bookings: number;
    averageRating: number;
    reviewCount: number;
  };
  status: 'active' | 'inactive' | 'pending' | 'rejected';
  featured: boolean;
  featuredUntil?: string;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  featured: number;
  stays: number;
  vehicles: number;
}

export default function AdminListingsPage() {
  const router = useRouter();
  const { state } = useApp();
  const user = state.user;
  const t = useTranslation('listings');

  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    inactive: 0,
    pending: 0,
    featured: 0,
    stays: 0,
    vehicles: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [sortBy, setSortBy] = useState('-createdAt');

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  // Helper function to get listing image URL
  const getListingImageUrl = (imageUrl: string | undefined) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    if (!imageUrl) return `${baseUrl}/uploads/listings/default-listing.jpg`;
    if (imageUrl.startsWith('http')) return imageUrl;

    return `${baseUrl}${imageUrl}`;
  };

  // Helper function to get avatar URL
  const getAvatarUrl = (avatar: string | undefined) => {
    if (!avatar) return '/uploads/users/default-avatar.png';
    if (avatar.startsWith('http')) return avatar;

    // Remove /api from the URL for static files
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${avatar}`;
  };

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error((t as any)?.toast?.accessDenied || 'Access denied. Admin only.');
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch listings
  const fetchListings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sort: sortBy,
        includeInactive: 'true'
      });

      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await axios.get(
        `${API_BASE_URL}/listings?${params.toString()}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.status === 'success') {
        setListings(response.data.data.listings || []);
        setTotalPages(response.data.pagination?.pages || 1);
        setTotalResults(response.data.pagination?.total || 0);

        // Calculate stats from all listings
        const allListings = response.data.data.listings || [];
        setStats({
          total: allListings.length,
          active: allListings.filter((l: Listing) => l.status === 'active').length,
          inactive: allListings.filter((l: Listing) => l.status === 'inactive').length,
          pending: allListings.filter((l: Listing) => l.status === 'pending').length,
          featured: allListings.filter((l: Listing) => l.featured).length,
          stays: allListings.filter((l: Listing) => l.category === 'stay').length,
          vehicles: allListings.filter((l: Listing) => l.category === 'vehicle').length
        });
      }
    } catch (error: any) {
      console.error('Error fetching listings:', error);
      if (error.response?.status === 403) {
        toast.error((t as any)?.toast?.accessDenied || 'Access denied');
        router.push('/dashboard');
      } else {
        toast.error((t as any)?.toast?.failedToLoad || 'Failed to load listings');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchListings();
    }
  }, [currentPage, categoryFilter, statusFilter, sortBy]);

  // Handle search with debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (currentPage === 1) {
        fetchListings();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Delete listing
  const handleDelete = async () => {
    if (!selectedListing) return;

    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const response = await axios.delete(
        `${API_BASE_URL}/listings/${selectedListing._id}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.data.status === 'success') {
        toast.success((t as any)?.toast?.deleteSuccess || 'Listing deleted successfully');
        closeDeleteModal();
        fetchListings();
      }
    } catch (error: any) {
      console.error('Error deleting listing:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.deleteFailed || 'Failed to delete listing');
    }
  };

  // Toggle listing status
  const handleToggleStatus = async (listing: Listing) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const newStatus = listing.status === 'active' ? 'inactive' : 'active';

      const response = await axios.put(
        `${API_BASE_URL}/listings/${listing._id}`,
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        toast.success(newStatus === 'active' ? ((t as any)?.toast?.activateSuccess || 'Listing activated') : ((t as any)?.toast?.deactivateSuccess || 'Listing deactivated'));
        fetchListings();
      }
    } catch (error: any) {
      console.error('Error toggling status:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.statusUpdateFailed || 'Failed to update status');
    }
  };

  // Toggle featured status
  const handleToggleFeatured = async (listing: Listing) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const response = await axios.put(
        `${API_BASE_URL}/listings/${listing._id}`,
        {
          featured: !listing.featured,
          featuredUntil: !listing.featured ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        toast.success(!listing.featured ? ((t as any)?.toast?.featureSuccess || 'Listing featured') : ((t as any)?.toast?.unfeatureSuccess || 'Listing unfeatured'));
        fetchListings();
      }
    } catch (error: any) {
      console.error('Error toggling featured:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.featureUpdateFailed || 'Failed to update featured status');
    }
  };

  // Open modals
  const openViewModal = (listing: Listing) => {
    setSelectedListing(listing);
    setShowViewModal(true);
  };

  const openDeleteModal = (listing: Listing) => {
    setSelectedListing(listing);
    setShowDeleteModal(true);
  };

  // Close modals
  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedListing(null);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedListing(null);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const badges = {
      active: { color: 'bg-green-100 text-green-800', label: (t as any)?.status?.active || 'Active' },
      inactive: { color: 'bg-gray-100 text-gray-800', label: (t as any)?.status?.inactive || 'Inactive' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: (t as any)?.status?.pending || 'Pending' },
      rejected: { color: 'bg-red-100 text-red-800', label: (t as any)?.status?.rejected || 'Rejected' }
    };

    const badge = badges[status as keyof typeof badges] || badges.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (loading && listings.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35] mx-auto"></div>
          <p className="mt-4 text-gray-600">{(t as any)?.toast?.loading || 'Loading listings...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{(t as any)?.header?.title || 'All Listings'}</h1>
          <p className="text-gray-600 mt-1">{(t as any)?.header?.subtitle || 'Manage all property and vehicle listings'}</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.total || 'Total'}</p>
              <p className="text-2xl font-bold text-gray-900">{totalResults}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <FaHome className="text-blue-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.active || 'Active'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <FaCheck className="text-green-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.inactive || 'Inactive'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inactive}</p>
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
              <FaEyeSlash className="text-gray-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.pending || 'Pending'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <FaClock className="text-yellow-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.featured || 'Featured'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.featured}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <FaStar className="text-orange-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.stays || 'Stays'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.stays}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <FaHome className="text-purple-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.vehicles || 'Vehicles'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.vehicles}</p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-lg">
              <FaCar className="text-indigo-600 text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={(t as any)?.filters?.searchPlaceholder || 'Search by title, location, or description...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            >
              <option value="all">{(t as any)?.filters?.allCategories || 'All Categories'}</option>
              <option value="stay">{(t as any)?.filters?.stays || 'Stays'}</option>
              <option value="vehicle">{(t as any)?.filters?.vehicles || 'Vehicles'}</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            >
              <option value="all">{(t as any)?.filters?.allStatus || 'All Status'}</option>
              <option value="active">{(t as any)?.filters?.statusActive || 'Active'}</option>
              <option value="inactive">{(t as any)?.filters?.statusInactive || 'Inactive'}</option>
              <option value="pending">{(t as any)?.filters?.statusPending || 'Pending'}</option>
              <option value="rejected">{(t as any)?.filters?.statusRejected || 'Rejected'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {listings.map((listing) => (
          <div key={listing._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            {/* Image */}
            <div className="relative h-48 bg-gray-200">
              {listing.images && listing.images.length > 0 ? (
                <Image
                  src={getListingImageUrl(listing.images.find(img => img.isPrimary)?.url || listing.images[0]?.url)}
                  alt={listing.title}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  {listing.category === 'vehicle' ? (
                    <FaCar className="text-gray-400 text-4xl" />
                  ) : (
                    <FaHome className="text-gray-400 text-4xl" />
                  )}
                </div>
              )}

              {/* Status Badge */}
              <div className="absolute top-2 right-2">
                {getStatusBadge(listing.status)}
              </div>

              {/* Featured Badge */}
              {listing.featured && (
                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FF6B35] text-white">
                    <FaStar className="mr-1" />
                    {(t as any)?.card?.featured || 'Featured'}
                  </span>
                </div>
              )}

              {/* Category Badge */}
              <div className="absolute bottom-2 left-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-gray-800">
                  {listing.category === 'vehicle' ? <FaCar className="mr-1" /> : <FaHome className="mr-1" />}
                  {listing.category === 'vehicle' ? ((t as any)?.filters?.vehicles || 'Vehicles') : ((t as any)?.filters?.stays || 'Stays')}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 truncate" title={listing.title}>
                {listing.title}
              </h3>

              {/* Location */}
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <FaMapMarkerAlt className="mr-1" />
                {listing.address.city}, {listing.address.state}
              </div>

              {/* Host */}
              <div className="flex items-center mt-2">
                <div className="h-6 w-6 flex-shrink-0">
                  {listing.host?.avatar ? (
                    <img
                      className="h-6 w-6 rounded-full object-cover"
                      src={getAvatarUrl(listing.host.avatar)}
                      alt={listing.host.firstName}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : null}
                  <div className={`h-6 w-6 rounded-full bg-[#FF6B35] flex items-center justify-center text-xs text-white ${listing.host?.avatar ? 'hidden' : ''}`}>
                    {listing.host?.firstName?.charAt(0) || 'H'}
                  </div>
                </div>
                <span className="ml-2 text-sm text-gray-600">
                  {listing.host?.firstName} {listing.host?.lastName}
                </span>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between mt-3 text-sm text-gray-600">
                <div className="flex items-center">
                  <FaStar className="text-yellow-500 mr-1" />
                  {listing.stats.averageRating.toFixed(1)} ({listing.stats.reviewCount})
                </div>
                <div className="flex items-center">
                  <FaHeart className="text-red-500 mr-1" />
                  {listing.stats.favorites}
                </div>
              </div>

              {/* Price */}
<div className="mt-3">
                <span className="text-lg font-bold text-[#FF6B35]">
                  {formatPrice(listing.pricing.basePrice, listing.pricing.currency)}
                </span>
                <span className="text-sm text-gray-500"> / {
                  listing.pricing.pricingType === 'per_night' ? ((t as any)?.pricing?.perNight || 'per night') :
                  listing.pricing.pricingType === 'per_hour' ? ((t as any)?.pricing?.perHour || 'per hour') :
                  listing.pricing.pricingType === 'per_day' ? ((t as any)?.pricing?.perDay || 'per day') :
                  listing.pricing.pricingType.replace('_', ' ')
                }</span>
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center space-x-2">
                <button
                  onClick={() => openViewModal(listing)}
                  className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  title={(t as any)?.card?.viewDetails || 'View Details'}
                >
                  <FaEye className="mr-1" />
                  {(t as any)?.card?.viewDetails || 'View Details'}
                </button>
                <button
                  onClick={() => openDeleteModal(listing)}
                  className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                  title={(t as any)?.card?.delete || 'Delete'}
                >
                  <FaTrash />
                </button>
              </div>

              {/* Toggle Actions */}
              <div className="mt-2 flex items-center space-x-2">
                <button
                  onClick={() => handleToggleStatus(listing)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-center ${
                    listing.status === 'active'
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                  title={listing.status === 'active' ? ((t as any)?.card?.deactivate || 'Deactivate') : ((t as any)?.card?.activate || 'Activate')}
                >
                  {listing.status === 'active' ? <FaToggleOff className="mr-1" /> : <FaToggleOn className="mr-1" />}
                  {listing.status === 'active' ? ((t as any)?.card?.deactivate || 'Deactivate') : ((t as any)?.card?.activate || 'Activate')}
                </button>
                <button
                  onClick={() => handleToggleFeatured(listing)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-center ${
                    listing.featured
                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={listing.featured ? ((t as any)?.card?.unfeature || 'Unfeature') : ((t as any)?.card?.feature || 'Feature')}
                >
                  <FaStar className="mr-1" />
                  {listing.featured ? ((t as any)?.card?.unfeature || 'Unfeature') : ((t as any)?.card?.feature || 'Feature')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(t as any)?.pagination?.previous || 'Previous'}
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(t as any)?.pagination?.next || 'Next'}
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                {(t as any)?.pagination?.showing || 'Showing'} <span className="font-medium">{(currentPage - 1) * 20 + 1}</span> {(t as any)?.pagination?.to || 'to'}{' '}
                <span className="font-medium">{Math.min(currentPage * 20, totalResults)}</span> {(t as any)?.pagination?.of || 'of'}{' '}
                <span className="font-medium">{totalResults}</span> {(t as any)?.pagination?.results || 'results'}
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaChevronLeft />
                </button>
                {[...Array(totalPages)].map((_, index) => {
                  const page = index + 1;
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === currentPage
                            ? 'z-10 bg-[#FF6B35] border-[#FF6B35] text-white'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <span
                        key={page}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                      >
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaChevronRight />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedListing && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={closeViewModal}
            ></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              {/* Header */}
              <div className="bg-[#FF6B35] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">{(t as any)?.viewModal?.title || 'Listing Details'}</h3>
                  <button
                    onClick={closeViewModal}
                    className="text-white hover:text-gray-200"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-4 max-h-96 overflow-y-auto">
                <div className="space-y-4">
                  {/* Images */}
                  {selectedListing.images && selectedListing.images.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">{(t as any)?.viewModal?.images || 'Images'}</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedListing.images.slice(0, 6).map((image, index) => (
                          <div key={index} className="relative h-32">
                            <Image
                              src={getListingImageUrl(image.url)}
                              alt={image.caption || `Image ${index + 1}`}
                              fill
                              className="object-cover rounded-lg"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.titleLabel || 'Title'}</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedListing.title}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.category || 'Category'}</label>
                      <p className="mt-1 text-sm text-gray-900 capitalize">{selectedListing.category}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.subcategory || 'Subcategory'}</label>
                      <p className="mt-1 text-sm text-gray-900 capitalize">{selectedListing.subcategory}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.status || 'Status'}</label>
                      <p className="mt-1">{getStatusBadge(selectedListing.status)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.price || 'Price'}</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatPrice(selectedListing.pricing.basePrice, selectedListing.pricing.currency)} / {selectedListing.pricing.pricingType.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.location || 'Location'}</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedListing.address.city}, {selectedListing.address.state}, {selectedListing.address.country}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.description || 'Description'}</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedListing.description}</p>
                  </div>

                  {/* Host Info */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.host || 'Host'}</label>
                    <div className="mt-1 flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        {selectedListing.host?.avatar ? (
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={getAvatarUrl(selectedListing.host.avatar)}
                            alt={selectedListing.host.firstName}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-[#FF6B35] flex items-center justify-center">
                            <span className="text-white font-medium">
                              {selectedListing.host?.firstName?.charAt(0) || 'H'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {selectedListing.host?.firstName} {selectedListing.host?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{selectedListing.host?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.views || 'Views'}</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedListing.stats.views}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.favorites || 'Favorites'}</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedListing.stats.favorites}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.bookings || 'Bookings'}</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedListing.stats.bookings}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.rating || 'Rating'}</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedListing.stats.averageRating.toFixed(1)} ({selectedListing.stats.reviewCount} {(t as any)?.viewModal?.reviews || 'reviews'})
                      </p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.createdAt || 'Created At'}</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {new Date(selectedListing.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{(t as any)?.viewModal?.updatedAt || 'Updated At'}</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {new Date(selectedListing.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end">
                <button
                  onClick={closeViewModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {(t as any)?.viewModal?.close || 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedListing && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeDeleteModal}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 py-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <FaTrash className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{(t as any)?.deleteModal?.title || 'Delete Listing'}</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {(t as any)?.deleteModal?.message || 'Are you sure you want to delete'} "<span className="font-semibold">{selectedListing.title}</span>"?
                    </p>
                    <p className="mt-1 text-sm text-red-600 font-medium">
                      {(t as any)?.deleteModal?.warning || 'This action cannot be undone.'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={closeDeleteModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {(t as any)?.deleteModal?.cancel || 'Cancel'}
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                  <FaTrash />
                  <span>{(t as any)?.deleteModal?.confirmDelete || 'Delete Listing'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}