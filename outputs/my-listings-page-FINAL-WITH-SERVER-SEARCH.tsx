'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaBed, FaCar, FaEye, FaStar, FaEdit, FaTrash, FaPause, FaPlay,
  FaTimes, FaCheck, FaPlus, FaFilter, FaSearch, FaExclamationCircle,
  FaChartLine, FaClipboardCheck, FaMoneyBillWave, FaCalendar,
  FaInfoCircle, FaImage, FaMapMarkerAlt, FaSave, FaCopy, FaHome,
  FaWifi, FaParking, FaSnowflake, FaTv, FaUtensilSpoon, FaSwimmingPool,
  FaDumbbell, FaShieldAlt, FaSmoking, FaPaw, FaGlassCheers, FaChild,
  FaClock, FaDoorOpen, FaRulerCombined, FaCouch, FaCogs, FaGasPump,
  FaUsers, FaHeart, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

interface Listing {
  _id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  status: string;
  host: any;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode?: string;
    country: string;
  };
  location: {
    type: string;
    coordinates: number[];
  };
  stayDetails?: {
    stayType?: string;
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    floor?: number;
    furnished?: string;
    amenities?: string[];
  };
  vehicleDetails?: {
    vehicleType?: string;
    make?: string;
    model?: string;
    year?: number;
    transmission?: string;
    fuelType?: string;
    seats?: number;
    features?: string[];
  };
  pricing: {
    basePrice: number;
    currency: string;
    pricingType: string;
    cleaningFee?: number;
    serviceFee?: number;
    securityDeposit?: number;
  };
  availability: {
    instantBook: boolean;
    minStay: number;
    maxStay: number;
    advanceNotice: number;
    preparationTime: number;
    checkInFrom: string;
    checkInTo: string;
    checkOutBefore: string;
  };
  rules: {
    smoking: string;
    pets: string;
    parties: string;
    children: string;
    additionalRules?: string[];
  };
  images: Array<{ url: string; caption: string; isPrimary?: boolean }>;
  stats: {
    views: number;
    favorites: number;
    bookings: number;
    totalRevenue: number;
    averageRating: number;
    reviewCount: number;
  };
  blockedDates?: Array<{ startDate: Date; endDate: Date; reason: string }>;
  featured: boolean;
  featuredUntil?: Date;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

// Helper function to get amenity icons
const getAmenityIcon = (amenity: string) => {
  const amenityLower = amenity.toLowerCase();
  if (amenityLower.includes('wifi') || amenityLower.includes('internet')) return <FaWifi className="text-[#FF6B35]" />;
  if (amenityLower.includes('parking')) return <FaParking className="text-[#FF6B35]" />;
  if (amenityLower.includes('ac') || amenityLower.includes('air')) return <FaSnowflake className="text-[#FF6B35]" />;
  if (amenityLower.includes('tv')) return <FaTv className="text-[#FF6B35]" />;
  if (amenityLower.includes('kitchen')) return <FaUtensilSpoon className="text-[#FF6B35]" />;
  if (amenityLower.includes('pool')) return <FaSwimmingPool className="text-[#FF6B35]" />;
  if (amenityLower.includes('gym')) return <FaDumbbell className="text-[#FF6B35]" />;
  if (amenityLower.includes('security')) return <FaShieldAlt className="text-[#FF6B35]" />;
  return <FaCheck className="text-[#FF6B35]" />;
};

export default function MyListingsPage() {
  const router = useRouter();
  const t = useTranslation('my-listings');
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalListings, setTotalListings] = useState(0);
  const [itemsPerPage] = useState(12);

  // Handlers that reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setFilterStatus(value);
    setCurrentPage(1);
  };

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    basePrice: 0,
    status: 'active'
  });

  // Status change state
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');

  useEffect(() => {
    fetchListings();
  }, [currentPage, filterStatus, searchTerm]); // Reload when page, status filter, or search changes

  useEffect(() => {
    filterListings();
  }, [filterCategory, listings]); // Only category filter is client-side now

  const fetchListings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Build query params for pagination, filters, and search
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/listings/my/listings?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Handle different response structures
      const listingsData = response.data.data?.listings || response.data.data || response.data.listings || response.data || [];
      setListings(Array.isArray(listingsData) ? listingsData : []);
      
      // Extract pagination info
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.pages || 1);
        setTotalListings(response.data.pagination.total || 0);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast.error((t as any)?.messages?.error?.failed || 'Failed to load listings');
      setListings([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const filterListings = () => {
    // Ensure listings is an array
    if (!Array.isArray(listings)) {
      setFilteredListings([]);
      return;
    }

    let filtered = [...listings];

    // Category filter (client-side only)
    // Note: Status filter and search are now handled server-side for proper pagination
    if (filterCategory !== 'all') {
      filtered = filtered.filter(listing => listing.category === filterCategory);
    }

    setFilteredListings(filtered);
  };

  const openViewModal = (listing: Listing) => {
    setSelectedListing(listing);
    setShowViewModal(true);
  };

  const openEditModal = (listing: Listing) => {
    setSelectedListing(listing);
    setEditForm({
      title: listing.title,
      description: listing.description,
      basePrice: listing.pricing.basePrice,
      status: listing.status
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (listing: Listing) => {
    setSelectedListing(listing);
    setShowDeleteModal(true);
  };

  const openStatusModal = (listing: Listing, status: string) => {
    setSelectedListing(listing);
    setNewStatus(status);
    setStatusReason('');
    setShowStatusModal(true);
  };

  const openDuplicateModal = (listing: Listing) => {
    setSelectedListing(listing);
    setShowDuplicateModal(true);
  };

  const closeAllModals = () => {
    setShowViewModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowStatusModal(false);
    setShowDuplicateModal(false);
    setSelectedListing(null);
    setStatusReason('');
  };

  const handleEdit = async () => {
    if (!selectedListing) return;

    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/listings/${selectedListing._id}`,
        {
          title: editForm.title,
          description: editForm.description,
          'pricing.basePrice': editForm.basePrice,
          status: editForm.status
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      toast.success((t as any)?.messages?.success?.updated || 'Listing updated successfully');
      closeAllModals();
      fetchListings();
    } catch (error: any) {
      toast.error(error.response?.data?.message || (t as any)?.messages?.error?.updateFailed || 'Failed to update listing');
    }
  };

  const handleDelete = async () => {
    if (!selectedListing) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/listings/${selectedListing._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      toast.success((t as any)?.messages?.success?.deleted || 'Listing deleted successfully');
      closeAllModals();
      fetchListings();
    } catch (error: any) {
      toast.error(error.response?.data?.message || (t as any)?.messages?.error?.deleteFailed || 'Failed to delete listing');
    }
  };

  const handleStatusChange = async () => {
    if (!selectedListing || !newStatus) return;

    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/listings/${selectedListing._id}/status`,
        {
          status: newStatus,
          reason: statusReason
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      toast.success((t as any)?.messages?.success?.statusChanged || 'Status changed successfully');
      closeAllModals();
      fetchListings();
    } catch (error: any) {
      toast.error(error.response?.data?.message || (t as any)?.messages?.error?.statusFailed || 'Failed to change status');
    }
  };

  const handleDuplicate = async () => {
    if (!selectedListing) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/listings/${selectedListing._id}/duplicate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      toast.success((t as any)?.messages?.success?.duplicated || 'Listing duplicated successfully');
      closeAllModals();
      fetchListings();
    } catch (error: any) {
      toast.error(error.response?.data?.message || (t as any)?.messages?.error?.duplicateFailed || 'Failed to duplicate listing');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#FF6B35] mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">{(t as any)?.loading?.message || 'Loading your listings...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{(t as any)?.header?.title || 'My Listings'}</h1>
          <p className="text-gray-600 mt-1">{(t as any)?.header?.subtitle || 'Manage and monitor your listings'}</p>
        </div>
        <Link
          href="/dashboard/my-listings/create"
          className="flex items-center space-x-2 px-6 py-3 bg-[#FF6B35] text-white rounded-lg hover:bg-[#ff8255] transition-colors shadow-sm"
        >
          <FaPlus />
          <span>{(t as any)?.header?.createButton || 'Create New Listing'}</span>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.totalListings || 'Total Listings'}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalListings}</p>
              {totalPages > 1 && (
                <p className="text-xs text-gray-500 mt-1">Tous les listings</p>
              )}
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <FaBed className="text-blue-600 text-xl" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.active || 'Active'}</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {filteredListings.filter(l => l.status === 'active').length}
              </p>
              {totalPages > 1 && (
                <p className="text-xs text-gray-500 mt-1">Sur cette page</p>
              )}
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <FaCheck className="text-green-600 text-xl" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.totalViews || 'Total Views'}</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {filteredListings.reduce((sum, l) => sum + (l.stats?.views || 0), 0)}
              </p>
              {totalPages > 1 && (
                <p className="text-xs text-gray-500 mt-1">Sur cette page</p>
              )}
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <FaEye className="text-purple-600 text-xl" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{(t as any)?.stats?.totalBookings || 'Total Bookings'}</p>
              <p className="text-2xl font-bold text-[#FF6B35] mt-1">
                {filteredListings.reduce((sum, l) => sum + (l.stats?.bookings || 0), 0)}
              </p>
              {totalPages > 1 && (
                <p className="text-xs text-gray-500 mt-1">Sur cette page</p>
              )}
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <FaClipboardCheck className="text-[#FF6B35] text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaSearch className="inline mr-2" />
              {(t as any)?.filters?.search || 'Search'}
            </label>
            <input
              type="text"
              placeholder={(t as any)?.filters?.searchPlaceholder || 'Search listings...'}
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaFilter className="inline mr-2" />
              {(t as any)?.filters?.status || 'Status'}
            </label>
            <select
              value={filterStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            >
              <option value="all">{(t as any)?.filters?.allStatus || 'All Status'}</option>
              <option value="active">{(t as any)?.filters?.statusActive || 'Active'}</option>
              <option value="draft">{(t as any)?.filters?.statusDraft || 'Draft'}</option>
              <option value="paused">{(t as any)?.filters?.statusPaused || 'Paused'}</option>
              <option value="pending">{(t as any)?.filters?.statusPending || 'Pending'}</option>
              <option value="inactive">{(t as any)?.filters?.statusInactive || 'Inactive'}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaFilter className="inline mr-2" />
              {(t as any)?.filters?.category || 'Category'}
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
            >
              <option value="all">{(t as any)?.filters?.allCategories || 'All Categories'}</option>
              <option value="stay">{(t as any)?.filters?.categoryStays || 'Stays'}</option>
              <option value="vehicle">{(t as any)?.filters?.categoryVehicles || 'Vehicles'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Listings Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[#FF6B35] to-[#ff8255] text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any)?.table?.headers?.listing || 'Listing'}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any)?.table?.headers?.category || 'Category'}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any)?.table?.headers?.price || 'Price'}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any)?.table?.headers?.stats || 'Stats'}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any)?.table?.headers?.status || 'Status'}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any)?.table?.headers?.actions || 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredListings.length > 0 ? (
                filteredListings.map((listing) => (
                  <tr key={listing._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 shadow-sm">
                          {listing.images?.[0] ? (
                            <img
                              src={listing.images[0].url}
                              alt={listing.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              {listing.category === 'vehicle' ? <FaCar size={24} /> : <FaBed size={24} />}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 truncate">{listing.title}</h3>
                          <p className="text-sm text-gray-500 flex items-center mt-1">
                            <FaMapMarkerAlt className="mr-1" />
                            {listing.address.city}, {listing.address.state}
                          </p>
                          {listing.featured && (
                            <span className="inline-flex items-center px-2 py-1 mt-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              <FaStar className="mr-1" />
                              {(t as any)?.badges?.featured || 'Featured'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {listing.category === 'vehicle' ? <FaCar className="text-gray-400" /> : <FaBed className="text-gray-400" />}
                        <span className="text-sm text-gray-700 capitalize">{listing.subcategory}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-lg font-bold text-[#FF6B35]">
                        {listing.pricing.basePrice.toLocaleString()} {listing.pricing.currency}
                      </p>
                      <p className="text-xs text-gray-500">{(t as any)?.pricing?.perNight || 'per night'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-600">
                          <FaEye className="mr-2 text-blue-500" />
                          {listing.stats?.views || 0} {(t as any)?.stats?.views || 'views'}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <FaStar className="mr-2 text-yellow-400" />
                          {listing.stats?.averageRating?.toFixed(1) || '0.0'}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <FaClipboardCheck className="mr-2 text-green-500" />
                          {listing.stats?.bookings || 0} {(t as any)?.stats?.bookings || 'bookings'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(listing.status)}`}>
                        {listing.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openViewModal(listing)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={(t as any)?.actions?.viewDetails || 'View Details'}
                        >
                          <FaInfoCircle size={18} />
                        </button>
                        <Link
                          href={`/dashboard/my-listings/edit/${listing._id}`}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors inline-block"
                          title={(t as any)?.actions?.edit || 'Edit'}
                        >
                          <FaEdit size={18} />
                        </Link>
                        <button
                          onClick={() => openDuplicateModal(listing)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title={(t as any)?.actions?.duplicate || 'Duplicate'}
                        >
                          <FaCopy size={18} />
                        </button>
                        <button
                          onClick={() => openStatusModal(listing, listing.status === 'active' ? 'paused' : 'active')}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                          title={listing.status === 'active' ? ((t as any)?.actions?.pause || 'Pause') : ((t as any)?.actions?.activate || 'Activate')}
                        >
                          {listing.status === 'active' ? <FaPause size={18} /> : <FaPlay size={18} />}
                        </button>
                        <button
                          onClick={() => openDeleteModal(listing)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={(t as any)?.actions?.delete || 'Delete'}
                        >
                          <FaTrash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <FaExclamationCircle className="mx-auto text-4xl text-gray-300 mb-3" />
                    <p className="text-gray-500 mb-4">{(t as any)?.table?.empty?.message || 'No listings found'}</p>
                    <Link
                      href="/listings/create"
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-[#FF6B35] text-white rounded-lg hover:bg-[#ff8255] transition-colors"
                    >
                      <FaPlus />
                      <span>{(t as any)?.table?.empty?.action || 'Create Your First Listing'}</span>
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Page Info */}
            <div className="text-sm text-gray-600">
              Affichage de <span className="font-semibold text-gray-900">{((currentPage - 1) * itemsPerPage) + 1}</span> à{' '}
              <span className="font-semibold text-gray-900">{Math.min(currentPage * itemsPerPage, totalListings)}</span> sur{' '}
              <span className="font-semibold text-gray-900">{totalListings}</span> listings
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FaChevronLeft className="inline mr-2" />
                Précédent
              </button>

              {/* Page Numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                  // Show first page, last page, current page, and pages around current
                  const showPage = 
                    pageNum === 1 || 
                    pageNum === totalPages || 
                    Math.abs(pageNum - currentPage) <= 1;
                  
                  const showEllipsis = 
                    (pageNum === 2 && currentPage > 3) ||
                    (pageNum === totalPages - 1 && currentPage < totalPages - 2);

                  if (showEllipsis) {
                    return <span key={pageNum} className="px-2 text-gray-400">...</span>;
                  }

                  if (!showPage) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-[#FF6B35] text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Suivant
                <FaChevronRight className="inline ml-2" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedListing && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeAllModals}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-gradient-to-r from-[#FF6B35] to-[#ff8255] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">{(t as any)?.viewModal?.title || 'Listing Details'}</h3>
                  <button onClick={closeAllModals} className="text-white hover:text-gray-200">
                    <FaTimes />
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 max-h-[80vh] overflow-y-auto">
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <FaInfoCircle className="mr-2 text-[#FF6B35]" />
                      {(t as any)?.viewModal?.basicInfo?.title || 'Basic Information'}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.basicInfo?.titleLabel || 'Title'}</p>
                        <p className="text-base text-gray-900">{selectedListing.title}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.basicInfo?.categoryType || 'Category & Type'}</p>
                        <p className="text-base text-gray-900 capitalize flex items-center">
                          {selectedListing.category === 'vehicle' ? <FaCar className="mr-2" /> : <FaHome className="mr-2" />}
                          {selectedListing.category} - {selectedListing.subcategory}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.basicInfo?.description || 'Description'}</p>
                        <p className="text-base text-gray-900">{selectedListing.description}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.basicInfo?.status || 'Status'}</p>
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedListing.status)}`}>
                          {selectedListing.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.basicInfo?.slug || 'Slug'}</p>
                        <p className="text-sm text-gray-700">{selectedListing.slug}</p>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <FaMapMarkerAlt className="mr-2 text-[#FF6B35]" />
                      {(t as any)?.viewModal?.location?.title || 'Location'}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.location?.street || 'Street'}</p>
                        <p className="text-base text-gray-900">{selectedListing.address?.street || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.location?.city || 'City'}</p>
                        <p className="text-base text-gray-900">{selectedListing.address?.city}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.location?.state || 'State'}</p>
                        <p className="text-base text-gray-900">{selectedListing.address?.state}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.location?.postalCode || 'Postal Code'}</p>
                        <p className="text-base text-gray-900">{selectedListing.address?.postalCode || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.location?.country || 'Country'}</p>
                        <p className="text-base text-gray-900">{selectedListing.address?.country}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.location?.coordinates || 'Coordinates'}</p>
                        <p className="text-sm text-gray-700">
                          {selectedListing.location?.coordinates?.[1]?.toFixed(6)}, {selectedListing.location?.coordinates?.[0]?.toFixed(6)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stay Details */}
                  {selectedListing.category === 'stay' && selectedListing.stayDetails && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                        <FaHome className="mr-2 text-[#FF6B35]" />
                        {(t as any)?.viewModal?.stayDetails?.title || 'Stay Details'}
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.stayDetails?.propertyType || 'Property Type'}</p>
                          <p className="text-base text-gray-900 capitalize">{selectedListing.stayDetails.stayType || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.stayDetails?.bedrooms || 'Bedrooms'}</p>
                          <p className="text-base text-gray-900 flex items-center">
                            <FaBed className="mr-2 text-gray-400" />
                            {selectedListing.stayDetails.bedrooms || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.stayDetails?.bathrooms || 'Bathrooms'}</p>
                          <p className="text-base text-gray-900">{selectedListing.stayDetails.bathrooms || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.stayDetails?.area || 'Area'}</p>
                          <p className="text-base text-gray-900 flex items-center">
                            <FaRulerCombined className="mr-2 text-gray-400" />
                            {selectedListing.stayDetails.area || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.stayDetails?.floor || 'Floor'}</p>
                          <p className="text-base text-gray-900">{selectedListing.stayDetails.floor || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.stayDetails?.furnished || 'Furnished'}</p>
                          <p className="text-base text-gray-900 capitalize flex items-center">
                            <FaCouch className="mr-2 text-gray-400" />
                            {selectedListing.stayDetails.furnished || 'N/A'}
                          </p>
                        </div>
                        {selectedListing.stayDetails.amenities && selectedListing.stayDetails.amenities.length > 0 && (
                          <div className="col-span-3">
                            <p className="text-sm font-medium text-gray-500 mb-2">{(t as any)?.viewModal?.stayDetails?.amenities || 'Amenities'}</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedListing.stayDetails.amenities.map((amenity, idx) => (
                                <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white border border-gray-200">
                                  {getAmenityIcon(amenity)}
                                  <span className="ml-2">{amenity}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Vehicle Details */}
                  {selectedListing.category === 'vehicle' && selectedListing.vehicleDetails && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                        <FaCar className="mr-2 text-[#FF6B35]" />
                        {(t as any)?.viewModal?.vehicleDetails?.title || 'Vehicle Details'}
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.vehicleDetails?.vehicleType || 'Vehicle Type'}</p>
                          <p className="text-base text-gray-900 capitalize">{selectedListing.vehicleDetails.vehicleType || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.vehicleDetails?.make || 'Make'}</p>
                          <p className="text-base text-gray-900">{selectedListing.vehicleDetails.make || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.vehicleDetails?.model || 'Model'}</p>
                          <p className="text-base text-gray-900">{selectedListing.vehicleDetails.model || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.vehicleDetails?.year || 'Year'}</p>
                          <p className="text-base text-gray-900">{selectedListing.vehicleDetails.year || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.vehicleDetails?.transmission || 'Transmission'}</p>
                          <p className="text-base text-gray-900 capitalize flex items-center">
                            <FaCogs className="mr-2 text-gray-400" />
                            {selectedListing.vehicleDetails.transmission || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.vehicleDetails?.fuelType || 'Fuel Type'}</p>
                          <p className="text-base text-gray-900 capitalize flex items-center">
                            <FaGasPump className="mr-2 text-gray-400" />
                            {selectedListing.vehicleDetails.fuelType || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.vehicleDetails?.seats || 'Seats'}</p>
                          <p className="text-base text-gray-900 flex items-center">
                            <FaUsers className="mr-2 text-gray-400" />
                            {selectedListing.vehicleDetails.seats || 'N/A'}
                          </p>
                        </div>
                        {selectedListing.vehicleDetails.features && selectedListing.vehicleDetails.features.length > 0 && (
                          <div className="col-span-3">
                            <p className="text-sm font-medium text-gray-500 mb-2">{(t as any)?.viewModal?.vehicleDetails?.features || 'Features'}</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedListing.vehicleDetails.features.map((feature, idx) => (
                                <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white border border-gray-200">
                                  <FaCheck className="mr-2 text-green-600" />
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <FaMoneyBillWave className="mr-2 text-[#FF6B35]" />
                      {(t as any)?.viewModal?.pricing?.title || 'Pricing'}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.pricing?.basePrice || 'Base Price'}</p>
                        <p className="text-3xl font-bold text-[#FF6B35]">
                          {selectedListing.pricing.basePrice.toLocaleString()} {selectedListing.pricing.currency}
                        </p>
                        <p className="text-sm text-gray-500 capitalize">{(t as any)?.viewModal?.pricing?.per || 'per'} {selectedListing.pricing.pricingType || 'night'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.pricing?.cleaningFee || 'Cleaning Fee'}</p>
                        <p className="text-base text-gray-900">
                          {selectedListing.pricing.cleaningFee ? `${selectedListing.pricing.cleaningFee} ${selectedListing.pricing.currency}` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.pricing?.serviceFee || 'Service Fee'}</p>
                        <p className="text-base text-gray-900">
                          {selectedListing.pricing.serviceFee ? `${selectedListing.pricing.serviceFee} ${selectedListing.pricing.currency}` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.pricing?.securityDeposit || 'Security Deposit'}</p>
                        <p className="text-base text-gray-900">
                          {selectedListing.pricing.securityDeposit ? `${selectedListing.pricing.securityDeposit} ${selectedListing.pricing.currency}` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Availability & Booking */}
                  {selectedListing.availability && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                        <FaCalendar className="mr-2 text-[#FF6B35]" />
                        {(t as any)?.viewModal?.availability?.title || 'Availability & Booking'}
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.availability?.instantBook || 'Instant Book'}</p>
                          <p className="text-base text-gray-900">
                            {selectedListing.availability.instantBook ? (
                              <span className="text-green-600 flex items-center"><FaCheck className="mr-2" /> {(t as any)?.viewModal?.availability?.yes || 'Yes'}</span>
                            ) : (
                              <span className="text-red-600 flex items-center"><FaTimes className="mr-2" /> {(t as any)?.viewModal?.availability?.no || 'No'}</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.availability?.minStay || 'Minimum Stay'}</p>
                          <p className="text-base text-gray-900">{selectedListing.availability.minStay || 1}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.availability?.maxStay || 'Maximum Stay'}</p>
                          <p className="text-base text-gray-900">{selectedListing.availability.maxStay || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.availability?.advanceNotice || 'Advance Notice'}</p>
                          <p className="text-base text-gray-900 flex items-center">
                            <FaClock className="mr-2 text-gray-400" />
                            {selectedListing.availability.advanceNotice || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.availability?.preparationTime || 'Preparation Time'}</p>
                          <p className="text-base text-gray-900">{selectedListing.availability.preparationTime || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.availability?.checkInTime || 'Check-in Time'}</p>
                          <p className="text-base text-gray-900 flex items-center">
                            <FaDoorOpen className="mr-2 text-gray-400" />
                            {selectedListing.availability.checkInFrom} - {selectedListing.availability.checkInTo}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.availability?.checkOutTime || 'Check-out Time'}</p>
                          <p className="text-base text-gray-900">{selectedListing.availability.checkOutBefore}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* House Rules */}
                  {selectedListing.rules && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                        <FaClipboardCheck className="mr-2 text-[#FF6B35]" />
                        {(t as any)?.viewModal?.rules?.title || 'House Rules'}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500 flex items-center">
                            <FaSmoking className="mr-2" /> {(t as any)?.viewModal?.rules?.smoking || 'Smoking'}
                          </p>
                          <p className={`text-base font-semibold ${selectedListing.rules.smoking === 'allowed' ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedListing.rules.smoking === 'allowed' ? ((t as any)?.viewModal?.rules?.allowed || 'Allowed') : ((t as any)?.viewModal?.rules?.notAllowed || 'Not Allowed')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 flex items-center">
                            <FaPaw className="mr-2" /> {(t as any)?.viewModal?.rules?.pets || 'Pets'}
                          </p>
                          <p className={`text-base font-semibold ${selectedListing.rules.pets === 'allowed' ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedListing.rules.pets === 'allowed' ? ((t as any)?.viewModal?.rules?.allowed || 'Allowed') : ((t as any)?.viewModal?.rules?.notAllowed || 'Not Allowed')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 flex items-center">
                            <FaGlassCheers className="mr-2" /> {(t as any)?.viewModal?.rules?.parties || 'Parties'}
                          </p>
                          <p className={`text-base font-semibold ${selectedListing.rules.parties === 'allowed' ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedListing.rules.parties === 'allowed' ? ((t as any)?.viewModal?.rules?.allowed || 'Allowed') : ((t as any)?.viewModal?.rules?.notAllowed || 'Not Allowed')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 flex items-center">
                            <FaChild className="mr-2" /> {(t as any)?.viewModal?.rules?.children || 'Children'}
                          </p>
                          <p className={`text-base font-semibold ${selectedListing.rules.children === 'allowed' ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedListing.rules.children === 'allowed' ? ((t as any)?.viewModal?.rules?.allowed || 'Allowed') : ((t as any)?.viewModal?.rules?.notAllowed || 'Not Allowed')}
                          </p>
                        </div>
                        {selectedListing.rules.additionalRules && selectedListing.rules.additionalRules.length > 0 && (
                          <div className="col-span-2">
                            <p className="text-sm font-medium text-gray-500 mb-2">{(t as any)?.viewModal?.rules?.additionalRules || 'Additional Rules'}</p>
                            <ul className="list-disc list-inside space-y-1">
                              {selectedListing.rules.additionalRules.map((rule, idx) => (
                                <li key={idx} className="text-sm text-gray-700">{rule}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Images */}
                  {selectedListing.images && selectedListing.images.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                        <FaImage className="mr-2 text-[#FF6B35]" />
                        {(t as any)?.viewModal?.images?.title || 'Images'} ({selectedListing.images.length})
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        {selectedListing.images.map((image, idx) => (
                          <div key={idx} className="relative">
                            <img src={image.url} alt={image.caption} className="w-full h-40 object-cover rounded-lg" />
                            {image.isPrimary && (
                              <span className="absolute top-2 right-2 bg-[#FF6B35] text-white px-2 py-1 rounded text-xs font-semibold">
                                {(t as any)?.viewModal?.images?.primary || 'Primary'}
                              </span>
                            )}
                            {image.caption && (
                              <p className="text-xs text-gray-600 mt-1 truncate">{image.caption}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Statistics */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <FaChartLine className="mr-2 text-[#FF6B35]" />
                      {(t as any)?.viewModal?.statistics?.title || 'Statistics'}
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500 flex items-center">
                          <FaEye className="mr-2 text-blue-500" /> {(t as any)?.viewModal?.statistics?.totalViews || 'Total Views'}
                        </p>
                        <p className="text-2xl font-bold text-gray-900">{selectedListing.stats?.views || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 flex items-center">
                          <FaHeart className="mr-2 text-red-500" /> {(t as any)?.viewModal?.statistics?.favorites || 'Favorites'}
                        </p>
                        <p className="text-2xl font-bold text-gray-900">{selectedListing.stats?.favorites || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 flex items-center">
                          <FaClipboardCheck className="mr-2 text-green-500" /> {(t as any)?.viewModal?.statistics?.bookings || 'Bookings'}
                        </p>
                        <p className="text-2xl font-bold text-gray-900">{selectedListing.stats?.bookings || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 flex items-center">
                          <FaMoneyBillWave className="mr-2 text-[#FF6B35]" /> {(t as any)?.viewModal?.statistics?.totalRevenue || 'Total Revenue'}
                        </p>
                        <p className="text-xl font-bold text-[#FF6B35]">
                          {selectedListing.stats?.totalRevenue?.toLocaleString() || 0} {selectedListing.pricing.currency}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 flex items-center">
                          <FaStar className="mr-2 text-yellow-400" /> {(t as any)?.viewModal?.statistics?.averageRating || 'Average Rating'}
                        </p>
                        <p className="text-2xl font-bold text-gray-900">{selectedListing.stats?.averageRating?.toFixed(1) || '0.0'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.statistics?.reviewCount || 'Review Count'}</p>
                        <p className="text-2xl font-bold text-gray-900">{selectedListing.stats?.reviewCount || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                      <FaClock className="mr-2 text-[#FF6B35]" />
                      {(t as any)?.viewModal?.timestamps?.title || 'Timestamps'}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.timestamps?.createdAt || 'Created At'}</p>
                        <p className="text-base text-gray-900">{new Date(selectedListing.createdAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">{(t as any)?.viewModal?.timestamps?.lastUpdated || 'Last Updated'}</p>
                        <p className="text-base text-gray-900">{new Date(selectedListing.updatedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end">
                <button onClick={closeAllModals} className="px-4 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#ff8255]">{(t as any)?.viewModal?.closeButton || 'Close'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedListing && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeAllModals}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-gradient-to-r from-[#FF6B35] to-[#ff8255] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white flex items-center">
                    <FaEdit className="mr-2" />
                    {(t as any)?.editModal?.title || 'Edit Listing'}
                  </h3>
                  <button onClick={closeAllModals} className="text-white hover:text-gray-200">
                    <FaTimes />
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{(t as any)?.editModal?.titleLabel || 'Title'}</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{(t as any)?.editModal?.description || 'Description'}</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{(t as any)?.editModal?.basePrice || 'Base Price'}</label>
                    <input
                      type="number"
                      value={editForm.basePrice}
                      onChange={(e) => setEditForm({ ...editForm, basePrice: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{(t as any)?.editModal?.status || 'Status'}</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                    >
                      <option value="active">{(t as any)?.editModal?.statusActive || 'Active'}</option>
                      <option value="paused">{(t as any)?.editModal?.statusPaused || 'Paused'}</option>
                      <option value="inactive">{(t as any)?.editModal?.statusInactive || 'Inactive'}</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button onClick={closeAllModals} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">{(t as any)?.editModal?.cancelButton || 'Cancel'}</button>
                <button onClick={handleEdit} className="px-4 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#ff8255] flex items-center space-x-2">
                  <FaSave />
                  <span>{(t as any)?.editModal?.saveButton || 'Save Changes'}</span>
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
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeAllModals}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 py-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <FaTrash className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{(t as any)?.deleteModal?.title || 'Delete Listing'}</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {(t as any)?.deleteModal?.message || 'Are you sure you want to delete'} <span className="font-semibold">"{selectedListing.title}"</span>? {(t as any)?.deleteModal?.warning || 'This action cannot be undone.'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button onClick={closeAllModals} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">{(t as any)?.deleteModal?.cancelButton || 'Cancel'}</button>
                <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2">
                  <FaTrash />
                  <span>{(t as any)?.deleteModal?.deleteButton || 'Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && selectedListing && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeAllModals}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-gradient-to-r from-[#FF6B35] to-[#ff8255] px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">{(t as any)?.statusModal?.title || 'Change Status'}</h3>
                  <button onClick={closeAllModals} className="text-white hover:text-gray-200">
                    <FaTimes />
                  </button>
                </div>
              </div>
              <div className="px-6 py-4">
                <p className="text-sm text-gray-700 mb-4">
                  {(t as any)?.statusModal?.message || 'Change status of'} <span className="font-semibold">"{selectedListing.title}"</span> {(t as any)?.statusModal?.to || 'to'} <span className="font-semibold capitalize">{newStatus}</span>?
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{(t as any)?.statusModal?.reasonLabel || 'Reason (Optional)'}</label>
                  <textarea
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    rows={3}
                    placeholder={(t as any)?.statusModal?.reasonPlaceholder || 'Enter reason for status change...'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                  />
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button onClick={closeAllModals} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">{(t as any)?.statusModal?.cancelButton || 'Cancel'}</button>
                <button onClick={handleStatusChange} className="px-4 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#ff8255]">{(t as any)?.statusModal?.confirmButton || 'Confirm'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Modal */}
      {showDuplicateModal && selectedListing && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={closeAllModals}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 py-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <FaCopy className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{(t as any)?.duplicateModal?.title || 'Duplicate Listing'}</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {(t as any)?.duplicateModal?.message || 'Create a copy of'} <span className="font-semibold">"{selectedListing.title}"</span>? {(t as any)?.duplicateModal?.info || 'A new listing will be created with the same details.'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                <button onClick={closeAllModals} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">{(t as any)?.duplicateModal?.cancelButton || 'Cancel'}</button>
                <button onClick={handleDuplicate} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2">
                  <FaCopy />
                  <span>{(t as any)?.duplicateModal?.duplicateButton || 'Duplicate'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
