'use client';

import { useApp } from '@/contexts/AppContext';
import { useSocket } from '@/contexts/SocketContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  FaCalendarAlt, FaUser, FaHome, FaMoneyBillWave,
  FaCheckCircle, FaClock, FaTimesCircle, FaEnvelope,
  FaEye, FaCheck, FaTimes, FaStar, FaPhone,
  FaExclamationTriangle
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import ReportDisputeModal from '@/components/dispute/ReportDisputeModal';

export default function HostBookingsPage() {
  const { state } = useApp();
  const user = state.user;
  const router = useRouter();
  const { socket } = useSocket();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  useEffect(() => {
    if (!user) return; // Wait for user to load
    if (user.role !== 'host') {
      router.push('/dashboard');
      return;
    }
    fetchBookings();
  }, [user, router]);

  // Prevent rendering for non-hosts (P2 #39)
  if (!user || user.role !== 'host') {
    return null;
  }

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/host`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // ✅ FIX BQ-45: Handle different response structures
      const bookingsData = response.data.data?.bookings || response.data.bookings || response.data.data || [];

      console.log('[Host Bookings] API Response:', {
        total: bookingsData.length,
        structure: Object.keys(response.data),
        sample: bookingsData[0]
      });

      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
      setBookings([]); // ✅ FIX BQ-45: Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Format price with correct currency
  const formatPrice = (booking: any) => {
    const amount = booking.pricing?.totalAmount || booking.totalPrice || 0;
    const currency = booking.pricing?.currency || booking.currency || 'DZD';
    if (currency === 'EUR' || currency === 'eur') {
      return `€${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${amount.toLocaleString('fr-FR')} DZD`;
  };

  // Socket.IO auto-refresh on booking notifications
  useEffect(() => {
    if (!socket) return;
    const bookingNotifTypes = [
      'booking_approved', 'booking_rejected', 'booking_request',
      'booking_request_sent', 'booking_created', 'booking_confirmed',
      'booking_payment_successful', 'booking_cancelled_by_host',
      'booking_cancelled_by_guest', 'payment_confirmed_by_host',
      'booking_check_in', 'booking_check_out', 'booking_completed'
    ];
    const handleNotification = (data: { notification: { type: string } }) => {
      if (bookingNotifTypes.includes(data.notification.type)) {
        fetchBookings();
      }
    };
    socket.on('new_notification', handleNotification);
    return () => { socket.off('new_notification', handleNotification); };
  }, [socket]);

  // ✅ FIX BQ-15 : Fonction robuste pour formatter les dates
  const formatDate = (dateValue: any): string => {
    if (!dateValue) return 'N/A';
    
    try {
      let date: Date;
      
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
        date = new Date(dateValue);
      } else if (dateValue.$date) {
        date = new Date(dateValue.$date);
      } else {
        return 'N/A';
      }
      
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Date invalide';
    }
  };

  const formatDateTime = (dateValue: any): string => {
    if (!dateValue) return 'N/A';
    
    try {
      let date: Date;
      
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
        date = new Date(dateValue);
      } else if (dateValue.$date) {
        date = new Date(dateValue.$date);
      } else {
        return 'N/A';
      }
      
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      
      return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const getCheckInDate = (booking: any) => {
    return booking.checkIn || booking.startDate || booking.start || booking.dates?.checkIn;
  };

  const getCheckOutDate = (booking: any) => {
    return booking.checkOut || booking.endDate || booking.end || booking.dates?.checkOut;
  };

  // Actions
  const handleContactGuest = (booking: any) => {
    router.push(`/dashboard/messages?userId=${booking.guest?._id}`);
  };

  const handleViewDetails = (booking: any) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const handleAcceptBooking = async (bookingId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/status`,
        { status: 'pending_payment' },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      toast.success('Réservation acceptée ! En attente du paiement du voyageur.');
      fetchBookings();
    } catch (error) {
      console.error('Error accepting booking:', error);
      toast.error('Erreur lors de l\'acceptation');
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir refuser cette réservation ?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/status`,
        { status: 'cancelled_by_host' },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      toast.success('Réservation refusée');
      fetchBookings();
    } catch (error) {
      console.error('Error rejecting booking:', error);
      toast.error('Erreur lors du refus');
    }
  };

  const handleCompleteNow = async (bookingId: string) => {
    if (!confirm('Terminer cette réservation maintenant ?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/status`,
        { status: 'completed' },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      toast.success('Réservation terminée !');
      fetchBookings();
    } catch (error) {
      console.error('Error completing booking:', error);
      toast.error('Erreur');
    }
  };

  const handleReportProblem = (booking: any) => {
    setSelectedBooking(booking);
    setShowDisputeModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#FF6B35]"></div>
      </div>
    );
  }

  const filteredBookings = filter === 'all'
    ? bookings
    : filter === 'confirmed'
      ? bookings.filter(b => ['confirmed', 'paid', 'pending_payment'].includes(b.status))
      : filter === 'cancelled'
        ? bookings.filter(b => ['cancelled', 'cancelled_by_guest', 'cancelled_by_host', 'cancelled_by_admin', 'expired'].includes(b.status))
        : bookings.filter(b => b.status === filter);

  const getStatusBadge = (status: string) => {
    const badges: any = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'En attente', icon: FaClock },
      pending_payment: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Paiement en attente', icon: FaMoneyBillWave },
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Confirmée', icon: FaCheckCircle },
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Payée', icon: FaCheckCircle },
      active: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Active', icon: FaCheckCircle },
      completed: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Terminée', icon: FaCheckCircle },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Annulée', icon: FaTimesCircle },
      cancelled_by_guest: { bg: 'bg-red-100', text: 'text-red-800', label: 'Annulée par voyageur', icon: FaTimesCircle },
      cancelled_by_host: { bg: 'bg-red-100', text: 'text-red-800', label: 'Annulée par hôte', icon: FaTimesCircle },
      cancelled_by_admin: { bg: 'bg-red-100', text: 'text-red-800', label: 'Annulée par admin', icon: FaTimesCircle },
      expired: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Expirée', icon: FaTimesCircle },
      disputed: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'En litige', icon: FaExclamationTriangle }
    };

    const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status, icon: FaClock };
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        <Icon className="mr-1" />
        {badge.label}
      </span>
    );
  };

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => ['confirmed', 'paid', 'pending_payment'].includes(b.status)).length,
    active: bookings.filter(b => b.status === 'active').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    pending: bookings.filter(b => b.status === 'pending').length,
    cancelled: bookings.filter(b => ['cancelled', 'cancelled_by_guest', 'cancelled_by_host', 'cancelled_by_admin', 'expired'].includes(b.status)).length
  };

  // Boutons d'action selon le status
  const renderActionButtons = (booking: any) => {
    const buttons = [];

    // Bouton Contacter (toujours)
    buttons.push(
      <button
        key="contact"
        onClick={() => handleContactGuest(booking)}
        className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
      >
        <FaEnvelope className="mr-2" />
        Contacter
      </button>
    );

    // Bouton Détails (toujours)
    buttons.push(
      <button
        key="details"
        onClick={() => handleViewDetails(booking)}
        className="flex items-center px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
      >
        <FaEye className="mr-2" />
        Détails
      </button>
    );

    // Actions selon status
    switch (booking.status) {
      case 'pending':
        buttons.push(
          <button
            key="accept"
            onClick={() => handleAcceptBooking(booking._id)}
            className="flex items-center px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
          >
            <FaCheck className="mr-2" />
            Accepter
          </button>,
          <button
            key="reject"
            onClick={() => handleRejectBooking(booking._id)}
            className="flex items-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
          >
            <FaTimes className="mr-2" />
            Refuser
          </button>
        );
        break;

      case 'confirmed':
        // Info au lieu de bouton
        const checkInDate = new Date(getCheckInDate(booking));
        buttons.push(
          <div key="auto-info" className="flex items-center px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
            <FaClock className="mr-2" />
            <span className="text-xs">Active automatiquement le {formatDate(checkInDate)}</span>
          </div>
        );
        
        // Bouton Signaler Problème
        buttons.push(
          <button
            key="dispute"
            onClick={() => handleReportProblem(booking)}
            className="flex items-center px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
          >
            <FaExclamationTriangle className="mr-2" />
            Signaler
          </button>
        );
        break;

      case 'active':
        // Info au lieu de bouton
        const checkoutDate = new Date(getCheckOutDate(booking));
        const autoCompleteDate = new Date(checkoutDate.getTime() + 6 * 60 * 60 * 1000);
        
        buttons.push(
          <div key="auto-info" className="flex items-center px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm">
            <FaClock className="mr-2" />
            <span className="text-xs">Terminée auto le {formatDateTime(autoCompleteDate)}</span>
          </div>
        );
        
        // Bouton Terminer Maintenant (optionnel)
        buttons.push(
          <button
            key="complete-now"
            onClick={() => handleCompleteNow(booking._id)}
            className="flex items-center px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
          >
            <FaCheck className="mr-2" />
            Terminer
          </button>
        );
        
        // Bouton Signaler Problème
        buttons.push(
          <button
            key="dispute"
            onClick={() => handleReportProblem(booking)}
            className="flex items-center px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
          >
            <FaExclamationTriangle className="mr-2" />
            Signaler
          </button>
        );
        break;

      case 'completed':
        buttons.push(
          <button
            key="review"
            onClick={() => router.push(`/bookings/${booking._id}/review`)}
            className="flex items-center px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm"
          >
            <FaStar className="mr-2" />
            Laisser un avis
          </button>
        );
        break;
    }

    return buttons;
  };

  // Mobile action buttons (simplified)
  const renderMobileActions = (booking: any) => {
    const buttons = [];

    if (booking.status === 'pending') {
      buttons.push(
        <button
          key="accept"
          onClick={() => handleAcceptBooking(booking._id)}
          className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-500 text-white rounded-lg text-xs font-medium"
        >
          <FaCheck className="w-3 h-3" />
          Accepter
        </button>,
        <button
          key="reject"
          onClick={() => handleRejectBooking(booking._id)}
          className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-500 text-white rounded-lg text-xs font-medium"
        >
          <FaTimes className="w-3 h-3" />
          Refuser
        </button>
      );
    } else if (booking.status === 'active') {
      buttons.push(
        <button
          key="complete"
          onClick={() => handleCompleteNow(booking._id)}
          className="flex-1 flex items-center justify-center gap-1 py-2 bg-purple-500 text-white rounded-lg text-xs font-medium"
        >
          <FaCheck className="w-3 h-3" />
          Terminer
        </button>
      );
    } else if (booking.status === 'completed') {
      buttons.push(
        <button
          key="review"
          onClick={() => router.push(`/bookings/${booking._id}/review`)}
          className="flex-1 flex items-center justify-center gap-1 py-2 bg-yellow-500 text-white rounded-lg text-xs font-medium"
        >
          <FaStar className="w-3 h-3" />
          Évaluer
        </button>
      );
    }

    // Always show contact and details
    buttons.push(
      <button
        key="contact"
        onClick={() => handleContactGuest(booking)}
        className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium"
      >
        <FaEnvelope className="w-3 h-3" />
        Message
      </button>,
      <button
        key="details"
        onClick={() => handleViewDetails(booking)}
        className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium"
      >
        <FaEye className="w-3 h-3" />
        Détails
      </button>
    );

    return buttons;
  };

  // Get status badge for mobile (compact)
  const getMobileStatusBadge = (status: string) => {
    const badges: any = {
      confirmed: { bg: 'bg-green-500', label: 'Confirmée' },
      pending: { bg: 'bg-yellow-500', label: 'En attente' },
      active: { bg: 'bg-blue-500', label: 'Active' },
      completed: { bg: 'bg-purple-500', label: 'Terminée' },
      cancelled: { bg: 'bg-red-500', label: 'Annulée' }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`absolute top-2 left-2 px-2 py-0.5 ${badge.bg} text-white text-[10px] font-semibold rounded-full`}>
        {badge.label}
      </span>
    );
  };

  // Get listing image
  const getListingImage = (booking: any) => {
    if (booking.listing?.images && booking.listing.images.length > 0) {
      return booking.listing.images[0];
    }
    return '/placeholder-listing.jpg';
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* ========== MOBILE LAYOUT ========== */}
      <div className="lg:hidden">
        {/* Mobile Header Compact */}
        <div className="px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-10">
          <h1 className="text-lg font-bold text-gray-900">Réservations Reçues</h1>
          <p className="text-xs text-gray-500">{stats.total} réservation{stats.total > 1 ? 's' : ''} au total</p>
        </div>

        {/* Mobile Stats Grid 2x2 */}
        <div className="px-4 py-3 bg-gray-50">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">En attente</p>
                  <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <FaClock className="w-4 h-4 text-yellow-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Confirmées</p>
                  <p className="text-xl font-bold text-green-600">{stats.confirmed}</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <FaCheckCircle className="w-4 h-4 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Actives</p>
                  <p className="text-xl font-bold text-blue-600">{stats.active}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FaCheckCircle className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Terminées</p>
                  <p className="text-xl font-bold text-purple-600">{stats.completed}</p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <FaCheckCircle className="w-4 h-4 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Filter Pills - Horizontal Scroll */}
        <div className="px-4 py-2 bg-white border-b border-gray-100 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {[
              { key: 'all', label: 'Toutes', count: stats.total },
              { key: 'pending', label: 'En attente', count: stats.pending },
              { key: 'confirmed', label: 'Confirmées', count: stats.confirmed },
              { key: 'active', label: 'Actives', count: stats.active },
              { key: 'completed', label: 'Terminées', count: stats.completed },
              { key: 'cancelled', label: 'Annulées', count: stats.cancelled }
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === item.key
                    ? 'bg-[#FF385C] text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {item.label}
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                  filter === item.key ? 'bg-white/20' : 'bg-gray-200'
                }`}>
                  {item.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Bookings List - Airbnb Style Cards */}
        <div className="px-4 py-3 space-y-3 pb-24">
          {filteredBookings.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <FaCalendarAlt className="mx-auto text-3xl text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Aucune réservation</p>
            </div>
          ) : (
            filteredBookings.map((booking: any) => (
              <div key={booking._id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Card Header with Image */}
                <div className="relative">
                  <div className="flex">
                    {/* Listing Image */}
                    <div className="w-24 h-24 flex-shrink-0">
                      <img
                        src={getListingImage(booking)}
                        alt={booking.listing?.title || 'Listing'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder-listing.jpg';
                        }}
                      />
                    </div>
                    {/* Booking Info */}
                    <div className="flex-1 p-3 min-w-0">
                      {/* Status Badge */}
                      {getMobileStatusBadge(booking.status)}

                      {/* Guest Name */}
                      <h3 className="font-semibold text-gray-900 text-sm truncate mt-4">
                        {booking.guest?.firstName || 'Voyageur'} {booking.guest?.lastName?.charAt(0) || ''}.
                      </h3>

                      {/* Listing Title */}
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {booking.listing?.title || 'Annonce'}
                      </p>

                      {/* Dates */}
                      <p className="text-xs text-gray-600 mt-1">
                        {formatDate(getCheckInDate(booking))} → {formatDate(getCheckOutDate(booking))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-[#FF385C]">
                      {formatPrice(booking)}
                    </span>
                    {booking.status === 'pending' && (
                      <span className="text-[10px] text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                        Action requise
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {renderMobileActions(booking)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ========== DESKTOP LAYOUT ========== */}
      <div className="hidden lg:block">
        {/* Desktop Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <span className="text-4xl mr-3">🏠</span>
            Réservations Reçues
          </h1>
          <p className="text-gray-600 mt-2">
            Les réservations sur vos annonces - Système automatique activé
          </p>
        </div>

        {/* Desktop Stats Cards */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-400">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-400">
            <div className="text-sm text-gray-600">En attente</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-400">
            <div className="text-sm text-gray-600">Confirmées</div>
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-400">
            <div className="text-sm text-gray-600">Actives</div>
            <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-400">
            <div className="text-sm text-gray-600">Terminées</div>
            <div className="text-2xl font-bold text-purple-600">{stats.completed}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-400">
            <div className="text-sm text-gray-600">Annulées</div>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
          </div>
        </div>

        {/* Desktop Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'confirmed', 'active', 'completed', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? 'bg-[#FF6B35] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'Toutes' :
                 status === 'pending' ? 'En attente' :
                 status === 'confirmed' ? 'Confirmées' :
                 status === 'active' ? 'Actives' :
                 status === 'completed' ? 'Terminées' : 'Annulées'}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Bookings List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredBookings.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FaCalendarAlt className="mx-auto text-4xl text-gray-300 mb-3" />
              <p>Aucune réservation pour ce filtre</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredBookings.map((booking: any) => (
                <div key={booking._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    {/* Listing Image */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={getListingImage(booking)}
                        alt={booking.listing?.title || 'Listing'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder-listing.jpg';
                        }}
                      />
                    </div>

                    <div className="flex-1">
                      {/* Guest Info */}
                      <div className="flex items-center mb-2">
                        <FaUser className="text-gray-400 mr-2" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {booking.guest?.firstName || 'N/A'} {booking.guest?.lastName || ''}
                        </h3>
                      </div>

                      {/* Listing Info */}
                      <div className="flex items-center text-gray-600 mb-2">
                        <FaHome className="text-gray-400 mr-2" />
                        <span>{booking.listing?.title || 'Listing N/A'}</span>
                      </div>

                      {/* Dates */}
                      <div className="flex items-center text-gray-600 mb-2">
                        <FaCalendarAlt className="text-gray-400 mr-2" />
                        <span>
                          {formatDate(getCheckInDate(booking))}
                          {' → '}
                          {formatDate(getCheckOutDate(booking))}
                        </span>
                      </div>

                      {/* Contact */}
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                        {booking.guest?.email && (
                          <div className="flex items-center">
                            <FaEnvelope className="mr-1" />
                            {booking.guest.email}
                          </div>
                        )}
                        {booking.guest?.phone && (
                          <div className="flex items-center">
                            <FaPhone className="mr-1" />
                            {booking.guest.phone}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Price and Status */}
                    <div className="flex flex-col items-end gap-3">
                      <div className="flex items-center">
                        <FaMoneyBillWave className="text-[#FF6B35] mr-2" />
                        <span className="text-2xl font-bold text-[#FF6B35]">
                          {formatPrice(booking)}
                        </span>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
                    {renderActionButtons(booking)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Détails */}
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#FF6B35] to-orange-500 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Détails de la Réservation</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-white hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Guest */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <FaUser className="mr-2 text-[#FF6B35]" />
                  Voyageur
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium">{selectedBooking.guest?.firstName} {selectedBooking.guest?.lastName}</p>
                  {selectedBooking.guest?.email && (
                    <p className="text-sm text-gray-600 mt-1">📧 {selectedBooking.guest.email}</p>
                  )}
                  {selectedBooking.guest?.phone && (
                    <p className="text-sm text-gray-600">📱 {selectedBooking.guest.phone}</p>
                  )}
                </div>
              </div>

              {/* Listing */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <FaHome className="mr-2 text-[#FF6B35]" />
                  Annonce
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium">{selectedBooking.listing?.title || 'N/A'}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Catégorie: {selectedBooking.listing?.category || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Dates */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <FaCalendarAlt className="mr-2 text-[#FF6B35]" />
                  Dates
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Arrivée</p>
                      <p className="font-medium">{formatDate(getCheckInDate(selectedBooking))}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Départ</p>
                      <p className="font-medium">{formatDate(getCheckOutDate(selectedBooking))}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prix */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <FaMoneyBillWave className="mr-2 text-[#FF6B35]" />
                  Prix
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span>Montant total</span>
                    <span className="text-2xl font-bold text-[#FF6B35]">
                      {formatPrice(selectedBooking)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Statut</h3>
                <div className="flex items-center justify-center">
                  {getStatusBadge(selectedBooking.status)}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  handleContactGuest(selectedBooking);
                  setShowDetailsModal(false);
                }}
                className="px-4 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Contacter le voyageur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dispute */}
      {showDisputeModal && selectedBooking && (
        <ReportDisputeModal
          booking={selectedBooking}
          userRole="host"
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