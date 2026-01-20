'use client';

import { useApp } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  FaCalendarAlt, FaUser, FaHome, FaMoneyBillWave,
  FaCheckCircle, FaClock, FaTimesCircle, FaEnvelope,
  FaEye, FaCheck, FaTimes, FaStar, FaPhone,
  FaExclamationTriangle
} from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function HostBookingsPage() {
  const { state } = useApp();
  const user = state.user;
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeForm, setDisputeForm] = useState({
    reason: '',
    description: ''
  });

  useEffect(() => {
    if (!user || user.role !== 'host') {
      router.push('/dashboard');
      return;
    }
    fetchBookings();
  }, [user, router]);

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
        { status: 'confirmed' },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      toast.success('Réservation acceptée !');
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
        { status: 'cancelled' },
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

  const handleSubmitDispute = async () => {
    if (!disputeForm.reason || !disputeForm.description) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (disputeForm.description.length < 20) {
      toast.error('La description doit contenir au moins 20 caractères');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/disputes`,
        {
          bookingId: selectedBooking._id,
          reason: disputeForm.reason,
          description: disputeForm.description
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      toast.success('Problème signalé avec succès');
      setShowDisputeModal(false);
      setDisputeForm({ reason: '', description: '' });
      fetchBookings();
    } catch (error: any) {
      console.error('Error creating dispute:', error);
      toast.error(error.response?.data?.message || 'Erreur lors du signalement');
    }
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
    : bookings.filter(b => b.status === filter);

  const getStatusBadge = (status: string) => {
    const badges: any = {
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Confirmée', icon: FaCheckCircle },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'En attente', icon: FaClock },
      active: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Active', icon: FaCheckCircle },
      completed: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Terminée', icon: FaCheckCircle },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Annulée', icon: FaTimesCircle }
    };
    
    const badge = badges[status] || badges.pending;
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
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    active: bookings.filter(b => b.status === 'active').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    pending: bookings.filter(b => b.status === 'pending').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length
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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <span className="text-4xl mr-3">🏠</span>
          Réservations Reçues
        </h1>
        <p className="text-gray-600 mt-2">
          Les réservations sur vos annonces - Système automatique activé ✨
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
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

      {/* Filters */}
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

      {/* Bookings List */}
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
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
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
                    
                    {/* Dates - FIX BQ-15 */}
                    <div className="flex items-center text-gray-600 mb-2">
                      <FaCalendarAlt className="text-gray-400 mr-2" />
                      <span>
                        {formatDate(getCheckInDate(booking))} 
                        {' → '}
                        {formatDate(getCheckOutDate(booking))}
                      </span>
                    </div>

                    {/* Contact */}
                    {booking.guest?.email && (
                      <div className="flex items-center text-sm text-gray-500 mt-2">
                        <FaEnvelope className="mr-2" />
                        {booking.guest.email}
                      </div>
                    )}
                    {booking.guest?.phone && (
                      <div className="flex items-center text-sm text-gray-500">
                        <FaPhone className="mr-2" />
                        {booking.guest.phone}
                      </div>
                    )}
                  </div>
                  
                  {/* Price and Status */}
                  <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center">
                      <FaMoneyBillWave className="text-[#FF6B35] mr-2" />
                      <span className="text-2xl font-bold text-[#FF6B35]">
                        {booking.pricing?.totalAmount || booking.totalPrice || 0} DZD
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
                      {selectedBooking.pricing?.totalAmount || selectedBooking.totalPrice || 0} DZD
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center">
                  <FaExclamationTriangle className="mr-3" />
                  Signaler un Problème
                </h2>
                <button
                  onClick={() => {
                    setShowDisputeModal(false);
                    setDisputeForm({ reason: '', description: '' });
                  }}
                  className="text-white hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Raison */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raison du problème *
                </label>
                <select
                  value={disputeForm.reason}
                  onChange={(e) => setDisputeForm({ ...disputeForm, reason: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Sélectionner une raison</option>
                  <option value="property_damage">Dégâts causés par le voyageur</option>
                  <option value="excessive_mess">Saleté excessive laissée par le voyageur</option>
                  <option value="guest_behavior">Comportement inapproprié du voyageur</option>
                  <option value="unauthorized_guests">Nombre de personnes non respecté</option>
                  <option value="noise_party">Bruit excessif / Fête non autorisée</option>
                  <option value="rule_violation">Non-respect des règles de la maison</option>
                  <option value="early_late">Arrivée/Départ non respecté</option>
                  <option value="smoking">Fumer dans le logement (interdit)</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description détaillée * (min. 20 caractères)
                </label>
                <textarea
                  value={disputeForm.description}
                  onChange={(e) => setDisputeForm({ ...disputeForm, description: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Décrivez le problème en détail..."
                />
                <p className="text-sm text-gray-500 mt-1">
                  {disputeForm.description.length} / 20 caractères minimum
                </p>
              </div>

              {/* Info */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ En signalant un problème, l'auto-completion de cette réservation sera bloquée jusqu'à résolution.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-b-xl flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDisputeModal(false);
                  setDisputeForm({ reason: '', description: '' });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmitDispute}
                disabled={!disputeForm.reason || disputeForm.description.length < 20}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Signaler le problème
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}