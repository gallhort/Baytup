'use client';

import { useState, useEffect } from 'react';
import {
  Calendar, Clock, MapPin, CheckCircle, XCircle,
  AlertCircle, Eye, Filter, ChevronLeft, ChevronRight,
  DollarSign, Users, X, Star, CreditCard, Home, Ban, Search, List, Grid, Building
} from 'lucide-react';
import { FaExclamationTriangle } from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import BookingCalendar from '@/components/booking/BookingCalendar';
import BookingDetailsModal from '@/components/booking/BookingDetailsModal';
import ReportDisputeModal from '@/components/dispute/ReportDisputeModal';
import { formatPrice } from '@/utils/priceUtils';
import { getListingImageUrl, getAvatarUrl, getPrimaryListingImage } from '@/utils/imageHelper';
import { formatDateWithWeekday } from '@/utils/dateFormatter';

// ✅ Computed Status Function (Airbnb-style)
// Calculate display status based on dates - doesn't modify database
function getBookingDisplayStatus(booking: any): string {
  if (!booking) return 'unknown';
  
  const now = new Date();
  const checkIn = new Date(booking.startDate);
  const checkOut = new Date(booking.endDate);
  
  // Only compute for paid/confirmed bookings
  if (booking.payment?.status !== 'paid' && booking.status !== 'confirmed') {
    return booking.status;
  }
  
  // Booking ended → Display as "completed"
  if (checkOut < now) {
    return 'completed';
  }
  
  // Booking ongoing → Display as "active"
  if (checkIn <= now && checkOut >= now) {
    return 'active';
  }
  
  // Booking future → Display original status
  return booking.status;
}

// Types
interface Listing {
  _id: string;
  title: string;
  category: string;
  subcategory: string;
  images: { url: string; isPrimary?: boolean }[];
  address: {
    street?: string;
    city: string;
    state: string;
    country: string;
  };
  pricing: {
    basePrice: number;
    currency: string;
  };
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  avatar: string;
  email?: string;
  phone?: string;
}

interface Review {
  _id: string;
  rating: {
    overall: number;
  };
  comment: string;
  status: string;
}

interface Booking {
  _id: string;
  listing: Listing;
  guest: User;
  host: User;
  startDate: string;
  endDate: string;
  checkInTime: string;
  checkOutTime: string;
  status: string;
  pricing: {
    basePrice?: number;
    nights: number;
    subtotal?: number;
    cleaningFee?: number;
    serviceFee?: number;
    taxes?: number;
    totalAmount: number;
    currency: string;
  };
  guestCount: {
    adults: number;
    children: number;
    infants: number;
  };
  specialRequests?: string;
  hostMessage?: string;
  payment: {
    status: string;
    method: string;
    transactionId?: string;
    paidAt?: string;
  };
  guestReview?: Review;
  hostReview?: Review;
  createdAt: string;
}

interface Stats {
  total: number;
  pending: number;
  confirmed: number;
  active: number;
  completed: number;
  cancelled: number;
  payment_pending: number;
  payment_completed: number;
}

export default function BookingsPage() {
  const { state } = useApp();
  const user = state.user;
  const t = useTranslation('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    confirmed: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
    payment_pending: 0,
    payment_completed: 0
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // View mode and modal state
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ✅ Dispute state (nouveau composant)
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  // ✅ Guard clause : Vérifier que user est chargé
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#FF6B35] mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">
            {(t as any)?.loading?.user || 'Loading user data...'}
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [statusFilter, page, user]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      // ✅ Vérification user (sécurité supplémentaire)
      if (!user) {
        console.error('[Bookings] User not loaded');
        return;
      }

      const token = localStorage.getItem('token');
      
      // ✅ Vérification token
      if (!token) {
        console.error('[Bookings] No authentication token');
        toast.error((t as any)?.toast?.authRequired || 'Authentication required');
        return;
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', page.toString());
      params.append('limit', '20');
      params.append('sort', '-createdAt');

      // ✅ FIX: Cette page "Mes Réservations" affiche les réservations effectuées PAR l'utilisateur (en tant que guest)
      // Les réservations REÇUES (en tant que host) sont affichées dans /dashboard/host-bookings
      // Un utilisateur avec le rôle "host" peut aussi être guest chez d'autres
      let endpoint = '';
      if (user.role === 'admin') {
        // Admin voit toutes les réservations
        endpoint = `${process.env.NEXT_PUBLIC_API_URL}/bookings/admin/all`;
      } else {
        // Guest ET Host voient leurs propres réservations (celles qu'ils ont effectuées)
        endpoint = `${process.env.NEXT_PUBLIC_API_URL}/bookings/guest`;
      }

      console.log('[Bookings] Fetching from:', endpoint, 'with params:', params.toString());
      console.log('[Bookings] Status filter:', statusFilter);

      const response = await axios.get(
        `${endpoint}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('[Bookings] Response received:', response.data);
      console.log('[Bookings] Full response structure:', {
        hasData: !!response.data.data,
        hasBookings: !!response.data.bookings,
        hasDataBookings: !!response.data.data?.bookings,
        dataType: typeof response.data.data,
        bookingsType: typeof response.data.bookings
      });

      // ✅ FIX BQ-45: Improved response parsing with multiple fallbacks
      let bookingsData = [];

      if (response.data.data && Array.isArray(response.data.data.bookings)) {
        bookingsData = response.data.data.bookings;
        console.log('[Bookings] ✅ Parsed from response.data.data.bookings');
      } else if (Array.isArray(response.data.bookings)) {
        bookingsData = response.data.bookings;
        console.log('[Bookings] ✅ Parsed from response.data.bookings');
      } else if (Array.isArray(response.data.data)) {
        bookingsData = response.data.data;
        console.log('[Bookings] ✅ Parsed from response.data.data (direct array)');
      } else {
        console.error('[Bookings] ❌ Could not parse bookings from response:', response.data);
        bookingsData = [];
      }

      console.log('[Bookings] Number of bookings parsed:', bookingsData.length);

      // ✅ Debug logs when filtering
      if (statusFilter && bookingsData.length === 0) {
        console.warn(`[Bookings] ⚠️ No bookings found with status "${statusFilter}"`);
        console.log('[Bookings] Try checking if bookings exist in database with this exact status');
      }
      if (bookingsData.length > 0) {
        console.log('[Bookings] Booking statuses:', bookingsData.map((b: any) => b.status));
        console.log('[Bookings] Sample booking:', bookingsData[0]);
      }

      // ✅ FIX BQ-45: Ensure we're setting an array
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setStats(response.data.stats || stats);
      setTotalPages(response.data.pagination?.pages || 1);

      console.log('[Bookings] ✅ State updated - Bookings:', bookingsData.length, 'Stats:', response.data.stats || 'none');
      
    } catch (error: any) {
      console.error('[Bookings] Error:', error);
      
      // ✅ Gestion d'erreur détaillée par code HTTP
      if (error.response?.status === 401) {
        toast.error((t as any)?.toast?.sessionExpired || 'Session expired. Please login again.');
      } else if (error.response?.status === 403) {
        toast.error((t as any)?.toast?.accessDenied || 'Access denied. Insufficient permissions.');
      } else if (error.response?.status === 404) {
        toast.error((t as any)?.toast?.notFound || 'Bookings endpoint not found. Please contact support.');
      } else {
        toast.error(error.response?.data?.message || (t as any)?.toast?.failedToLoad || 'Failed to load bookings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm((t as any)?.toast?.confirmCancel || 'Are you sure you want to cancel this booking?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/cancel`,
        { reason: 'admin_action' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success((t as any)?.toast?.cancelSuccess || 'Booking cancelled successfully');
      fetchBookings();
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.cancelFailed || 'Failed to cancel booking');
    }
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success((t as any)?.toast?.updateSuccess || 'Booking status updated successfully');
      fetchBookings();
    } catch (error: any) {
      console.error('Error updating booking status:', error);
      toast.error(error.response?.data?.message || (t as any)?.toast?.updateFailed || 'Failed to update booking status');
    }
  };

  // ✅ NOUVEAU : Fonction pour signaler un problème
  const handleReportProblem = (booking: any) => {
    setSelectedBooking(booking);
    setShowDisputeModal(true);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: (t as any)?.status?.pending || 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      pending_payment: { label: (t as any)?.status?.awaitingPayment || 'Awaiting Payment', color: 'bg-orange-100 text-orange-800', icon: CreditCard },
      confirmed: { label: (t as any)?.status?.confirmed || 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      paid: { label: (t as any)?.status?.paid || 'Paid', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      active: { label: (t as any)?.status?.active || 'Active', color: 'bg-green-100 text-green-800', icon: Home },
      completed: { label: (t as any)?.status?.completed || 'Completed', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
      cancelled_by_guest: { label: (t as any)?.status?.cancelledByGuest || 'Cancelled by Guest', color: 'bg-red-100 text-red-800', icon: Ban },
      cancelled_by_host: { label: (t as any)?.status?.cancelledByHost || 'Cancelled by Host', color: 'bg-red-100 text-red-800', icon: Ban },
      expired: { label: (t as any)?.status?.expired || 'Expired', color: 'bg-red-100 text-red-800', icon: XCircle },
    };

    const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4 mr-1" />
        {badge.label}
      </span>
    );
  };

  // Filter bookings by search term
  const filteredBookings = bookings.filter(booking => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    
    // Null-safe extraction of searchable fields
    const listingTitle = booking.listing?.title?.toLowerCase() || '';
    const guestFirstName = booking.guest?.firstName?.toLowerCase() || '';
    const guestLastName = booking.guest?.lastName?.toLowerCase() || '';
    const hostFirstName = booking.host?.firstName?.toLowerCase() || '';
    const hostLastName = booking.host?.lastName?.toLowerCase() || '';
    const bookingId = booking._id?.toLowerCase() || '';
    
    return (
      listingTitle.includes(term) ||
      guestFirstName.includes(term) ||
      guestLastName.includes(term) ||
      hostFirstName.includes(term) ||
      hostLastName.includes(term) ||
      bookingId.includes(term)
    );
  });

  // Handle booking click from calendar
  const handleBookingClick = (booking: any) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  // Handle booking cancel from modal
  const handleCancelFromModal = async (bookingId: string) => {
    await handleCancelBooking(bookingId);
    setIsModalOpen(false);
    setSelectedBooking(null);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        {/* Header Skeleton */}
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>

        {/* Filters Skeleton */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>

        {/* Booking Cards Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Image Skeleton */}
                <div className="w-full md:w-48 h-32 bg-gray-200 rounded-lg"></div>
                
                {/* Content Skeleton */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded-full w-24"></div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <div className="h-9 bg-gray-200 rounded w-24"></div>
                    <div className="h-9 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Get role-specific title and subtitle
  // ✅ FIX: Cette page affiche les "trips" (voyages effectués) pour tous les utilisateurs
  // Les hosts ont une page séparée (/dashboard/host-bookings) pour leurs réservations reçues
  const getHeaderContent = () => {
    if (user?.role === 'admin') {
      return {
        title: (t as any)?.header?.title || 'All Bookings Management',
        subtitle: (t as any)?.header?.subtitle || 'Manage all bookings across the platform'
      };
    } else {
      // Guest ET Host voient "My Trips" - leurs propres réservations effectuées
      return {
        title: (t as any)?.header?.guestTitle || 'My Trips',
        subtitle: (t as any)?.header?.guestSubtitle || 'View and manage your upcoming and past trips'
      };
    }
  };

  const headerContent = getHeaderContent();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{headerContent.title}</h1>
        <p className="text-gray-600">{headerContent.subtitle}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">{(t as any)?.stats?.total || 'Total'}</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Calendar className="w-6 h-6 text-[#FF6B35]" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">{(t as any)?.stats?.pending || 'Pending'}</p>
              <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
            </div>
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">{(t as any)?.stats?.confirmed || 'Confirmed'}</p>
              <p className="text-xl font-bold text-gray-900">{stats.confirmed}</p>
            </div>
            <CheckCircle className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">{(t as any)?.stats?.active || 'Active'}</p>
              <p className="text-xl font-bold text-gray-900">{stats.active}</p>
            </div>
            <Home className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">{(t as any)?.stats?.completed || 'Completed'}</p>
              <p className="text-xl font-bold text-gray-900">{stats.completed}</p>
            </div>
            <CheckCircle className="w-6 h-6 text-gray-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">{(t as any)?.stats?.cancelled || 'Cancelled'}</p>
              <p className="text-xl font-bold text-gray-900">{stats.cancelled}</p>
            </div>
            <Ban className="w-6 h-6 text-red-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">{(t as any)?.stats?.paymentPending || 'Pay Pending'}</p>
              <p className="text-xl font-bold text-gray-900">{stats.payment_pending}</p>
            </div>
            <CreditCard className="w-6 h-6 text-orange-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">{(t as any)?.stats?.paymentCompleted || 'Pay Done'}</p>
              <p className="text-xl font-bold text-gray-900">{stats.payment_completed}</p>
            </div>
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* Filters and View Toggle */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={(t as any)?.filters?.searchPlaceholder || 'Search by listing, guest, host, or booking ID...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent appearance-none ${
                statusFilter ? 'border-[#FF6B35] bg-orange-50' : 'border-gray-300'
              }`}
            >
              <option value="">{(t as any)?.filters?.allStatuses || 'All Statuses'}</option>
              <option value="pending">{(t as any)?.filters?.pending || 'Pending'}</option>
              <option value="pending_payment">{(t as any)?.filters?.pendingPayment || 'Pending Payment'}</option>
              <option value="confirmed">{(t as any)?.filters?.confirmed || 'Confirmed'}</option>
              <option value="active">{(t as any)?.filters?.active || 'Active'}</option>
              <option value="completed">{(t as any)?.filters?.completed || 'Completed'}</option>
              <option value="cancelled_by_guest">{(t as any)?.filters?.cancelledByGuest || 'Cancelled by Guest'}</option>
              <option value="cancelled_by_host">{(t as any)?.filters?.cancelledByHost || 'Cancelled by Host'}</option>
              <option value="expired">{(t as any)?.filters?.expired || 'Expired'}</option>
            </select>
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>

          {/* View Mode Toggle + Reset Filters */}
          <div className="flex items-center gap-2 justify-end">
            {/* Reset Filters Button */}
            {(searchTerm || statusFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setPage(1);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                {(t as any)?.filters?.clearFilters || 'Clear Filters'}
              </button>
            )}
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <List className="w-5 h-5" />
              <span className="font-medium">{(t as any)?.view?.list || 'List'}</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                viewMode === 'calendar'
                  ? 'bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Grid className="w-5 h-5" />
              <span className="font-medium">{(t as any)?.view?.calendar || 'Calendar'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar or List View */}
      {viewMode === 'calendar' ? (
        <BookingCalendar
          bookings={filteredBookings}
          onBookingClick={handleBookingClick}
        />
      ) : (
        <>
          {/* Bookings List */}
          {filteredBookings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="max-w-md mx-auto">
                <Calendar className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                  {searchTerm || statusFilter
                    ? ((t as any)?.emptyState?.noResults || 'No bookings match your filters')
                    : user?.role === 'host'
                    ? ((t as any)?.emptyState?.noBookingsHost || 'No bookings yet')
                    : user?.role === 'admin'
                    ? ((t as any)?.emptyState?.noBookingsAdmin || 'No bookings in the system')
                    : ((t as any)?.emptyState?.noBookingsGuest || 'No trips booked yet')
                  }
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || statusFilter
                    ? ((t as any)?.emptyState?.tryDifferentFilters || 'Try adjusting your filters or search terms')
                    : user?.role === 'host'
                    ? ((t as any)?.emptyState?.messageHost || 'Your bookings will appear here once guests start booking your listings')
                    : user?.role === 'admin'
                    ? ((t as any)?.emptyState?.messageAdmin || 'All platform bookings will be displayed here')
                    : ((t as any)?.emptyState?.messageGuest || 'Start exploring amazing places and book your first adventure')
                  }
                </p>
                
                {/* Action Buttons */}
                {!searchTerm && !statusFilter && (
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {user?.role === 'guest' && (
                      <Link
                        href="/search"
                        className="inline-flex items-center justify-center px-6 py-3 bg-[#FF6B35] text-white rounded-lg hover:bg-[#E55A2B] transition-colors font-medium"
                      >
                        <Search className="w-5 h-5 mr-2" />
                        {(t as any)?.emptyState?.exploreListings || 'Explore Listings'}
                      </Link>
                    )}
                    {user?.role === 'host' && (
                      <Link
                        href="/dashboard/host/listings"
                        className="inline-flex items-center justify-center px-6 py-3 bg-[#FF6B35] text-white rounded-lg hover:bg-[#E55A2B] transition-colors font-medium"
                      >
                        <Building className="w-5 h-5 mr-2" />
                        {(t as any)?.emptyState?.viewListings || 'View My Listings'}
                      </Link>
                    )}
                  </div>
                )}
                
                {/* Clear Filters Button (if filters are active) */}
                {(searchTerm || statusFilter) && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('');
                      setPage(1);
                    }}
                    className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    <X className="w-5 h-5 mr-2" />
                    {(t as any)?.emptyState?.clearAllFilters || 'Clear All Filters'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
          <div className="space-y-4 mb-6">
            {filteredBookings.map((booking) => {
              const displayStatus = getBookingDisplayStatus(booking);
              const canReportProblem = displayStatus === 'confirmed' || displayStatus === 'active';
              
              return (
              <div
                key={booking._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Image */}
                  <div className="md:w-64 h-48 md:h-auto relative">
                    {booking.listing ? (
                      <img
                        src={getPrimaryListingImage(booking.listing?.images || [])}
                        alt={booking.listing?.title || 'Listing'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.jpg';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-sm">
                        Deleted
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        {booking.listing ? (
                          <>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {booking.listing?.title || 'Untitled Listing'}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <MapPin className="w-4 h-4" />
                              {booking.listing?.address?.city || 'Unknown'}, {booking.listing?.address?.state || 'Unknown'}
                            </div>
                          </>
                        ) : (
                          <>
                            <h3 className="text-lg font-semibold text-gray-400 mb-1">
                              Listing Deleted
                            </h3>
                            <p className="text-sm text-gray-500">This listing is no longer available</p>
                          </>
                        )}
                        <p className="text-xs text-gray-500">{(t as any)?.card?.bookingId || 'Booking ID:'} {booking._id}</p>
                      </div>
                      {/* ✅ Use computed status for display */}
                      {getStatusBadge(displayStatus)}
                    </div>

                    {/* Host Info (pour "Mes Voyages", on affiche seulement l'hôte, pas le guest car c'est l'utilisateur lui-même) */}
                    {/* Pour Admin, on affiche les deux */}
                    <div className={`grid grid-cols-1 ${user?.role === 'admin' ? 'md:grid-cols-2' : ''} gap-4 mb-4`}>
                      {/* Guest info - seulement pour Admin (qui supervise toutes les réservations) */}
                      {user?.role === 'admin' && booking.guest && (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                          <img
                            src={getAvatarUrl(booking.guest?.avatar)}
                            alt={`${booking.guest?.firstName || ''} ${booking.guest?.lastName || ''}`}
                            className="w-10 h-10 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/uploads/users/default-avatar.png';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-600 mb-0.5">{(t as any)?.card?.guest || 'Guest'}</p>
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {booking.guest?.firstName || 'Unknown'} {booking.guest?.lastName || 'Guest'}
                            </p>
                          </div>
                        </div>
                      )}
                      {user?.role === 'admin' && !booking.guest && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-600 mb-0.5">{(t as any)?.card?.guest || 'Guest'}</p>
                            <p className="font-medium text-gray-900 text-sm">Guest Data Missing</p>
                          </div>
                        </div>
                      )}

                      {/* Host info - toujours affiché (c'est l'hôte chez qui on réserve) */}
                      {booking.host && (
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                          <img
                            src={getAvatarUrl(booking.host?.avatar)}
                            alt={`${booking.host?.firstName || ''} ${booking.host?.lastName || ''}`}
                            className="w-10 h-10 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/uploads/users/default-avatar.png';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-600 mb-0.5">{(t as any)?.card?.host || 'Host'}</p>
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {booking.host?.firstName || 'Unknown'} {booking.host?.lastName || 'Host'}
                            </p>
                          </div>
                        </div>
                      )}
                      {!booking.host && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <Home className="w-5 h-5 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-600 mb-0.5">{(t as any)?.card?.host || 'Host'}</p>
                            <p className="font-medium text-gray-900 text-sm">Host Data Missing</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Dates and Pricing */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-600">{(t as any)?.card?.checkIn || 'Check-in'}</p>
                          <p className="font-medium text-gray-900">{formatDateWithWeekday(booking.startDate)}</p>
                          <p className="text-xs text-gray-600">{booking.checkInTime}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-600">{(t as any)?.card?.checkOut || 'Check-out'}</p>
                          <p className="font-medium text-gray-900">{formatDateWithWeekday(booking.endDate)}</p>
                          <p className="text-xs text-gray-600">{booking.checkOutTime}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-600">{(t as any)?.card?.totalAmount || 'Total Amount'}</p>
                          <p className="font-bold text-[#FF6B35]">
                            {formatPrice(booking.pricing.totalAmount, booking.pricing.currency)}
                          </p>
                          <p className="text-xs text-gray-600">
                            {booking.pricing.nights} {booking.pricing.nights > 1 ? ((t as any)?.card?.nights || 'nights') : ((t as any)?.card?.night || 'night')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Payment and Guest Count */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700">
                            {booking.guestCount.adults + booking.guestCount.children} {(booking.guestCount.adults + booking.guestCount.children) > 1 ? ((t as any)?.card?.guests || 'guests') : ((t as any)?.card?.guest || 'guest')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700">
                            {(t as any)?.card?.payment || 'Payment:'} <span className={`font-medium ${booking.payment.status === 'completed' || booking.payment.status === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                              {(t as any)?.paymentStatus?.[booking.payment.status] || booking.payment.status}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Reviews */}
                      {(booking.guestReview || booking.hostReview) && (
                        <div className="flex items-center gap-2">
                          {booking.guestReview && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-gray-700">{booking.guestReview.rating.overall}</span>
                            </div>
                          )}
                          {booking.hostReview && (
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="w-4 h-4 fill-blue-400 text-blue-400" />
                              <span className="text-gray-700">{booking.hostReview.rating.overall}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/bookings/${booking._id}`}
                        className="inline-flex items-center px-4 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#E55A24] transition text-sm"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {(t as any)?.card?.viewDetails || 'View Details'}
                      </Link>

                      {/* ✅ Use computed status for business logic */}
                      {displayStatus !== 'completed' && displayStatus !== 'cancelled_by_guest' && displayStatus !== 'cancelled_by_host' && (
                        <button
                          onClick={() => handleCancelBooking(booking._id)}
                          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          {(t as any)?.card?.cancelBooking || 'Cancel Booking'}
                        </button>
                      )}

                      {/* ✅ NOUVEAU : Bouton Signaler Problème */}
                      {canReportProblem && (
                        <button
                          onClick={() => handleReportProblem(booking)}
                          className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm"
                        >
                          <FaExclamationTriangle className="w-4 h-4 mr-2" />
                          {(t as any)?.actions?.reportProblem || 'Report a Problem'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-700">
                {(t as any)?.pagination?.page || 'Page'} {page} {(t as any)?.pagination?.of || 'of'} {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
          )}
        </>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <BookingDetailsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedBooking(null);
          }}
          booking={selectedBooking}
          onCancel={handleCancelFromModal}
          userRole={user?.role || 'guest'}
        />
      )}

      {/* ✅ Nouveau Modal Dispute avec upload de preuves */}
      {showDisputeModal && selectedBooking && (
        <ReportDisputeModal
          booking={selectedBooking}
          userRole="guest"
          onClose={() => setShowDisputeModal(false)}
          onSuccess={() => {
            fetchBookings();
            setSelectedBooking(null);
          }}
        />
      )}
    </div>
  );
}