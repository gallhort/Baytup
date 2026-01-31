'use client';

import { useState, useEffect } from 'react';
import {
  AlertCircle, Clock, CheckCircle, XCircle, Eye, Filter,
  ChevronLeft, ChevronRight, MessageSquare, Calendar, Home, User, X
} from 'lucide-react';
import { FaExclamationTriangle } from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useApp } from '@/contexts/AppContext';
import { formatDateWithWeekday } from '@/utils/dateFormatter';
import EvidenceGallery from '@/components/dispute/EvidenceGallery';
import AddEvidenceModal from '@/components/dispute/AddEvidenceModal';

interface Dispute {
  _id: string;
  booking: {
    _id: string;
    listing: {
      title: string;
      address: {
        city: string;
        state: string;
      };
    };
    guest: {
      firstName: string;
      lastName: string;
    };
    startDate: string;
    endDate: string;
    totalPrice: number;
  };
  reportedBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  reason: string;
  description: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  resolution?: string;
  notes: Array<{
    user: {
      _id: string;
      firstName: string;
      lastName: string;
    };
    message: string;
    createdAt: string;
  }>;
  createdAt: string;
  resolvedAt?: string;
}

const reasonLabels: Record<string, string> = {
  property_damage: 'Dégâts causés par le voyageur',
  excessive_mess: 'Saleté excessive laissée',
  guest_behavior: 'Comportement inapproprié du voyageur',
  unauthorized_guests: 'Nombre de personnes non respecté',
  noise_party: 'Bruit excessif / Fête non autorisée',
  rule_violation: 'Non-respect des règles',
  early_late: 'Arrivée/Départ non respecté',
  smoking: 'Fumer dans le logement (interdit)',
  payment: 'Problème de paiement',
  other: 'Autre'
};

export default function HostDisputesPage() {
  const { state } = useApp();
  const user = state.user;
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDisputes();
    }
  }, [statusFilter, page, user]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', page.toString());
      params.append('limit', '10');

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/disputes?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDisputes(response.data.data.disputes || []);
      setTotalPages(response.data.data.pagination?.pages || 1);
    } catch (error: any) {
      console.error('Error fetching disputes:', error);
      toast.error('Erreur lors du chargement des signalements');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) {
      toast.error('Veuillez entrer un message');
      return;
    }

    try {
      setAddingNote(true);
      const token = localStorage.getItem('token');
      
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/disputes/${selectedDispute?._id}/notes`,
        { message: noteText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Note ajoutée avec succès');
      setNoteText('');
      fetchDisputes();
      
      // Refresh selected dispute
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/disputes/${selectedDispute?._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedDispute(response.data.data.dispute);
    } catch (error: any) {
      console.error('Error adding note:', error);
      toast.error('Erreur lors de l\'ajout de la note');
    } finally {
      setAddingNote(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string; icon: any }> = {
      open: { label: 'Ouvert', color: 'bg-red-100 text-red-800', icon: AlertCircle },
      pending: { label: 'En cours', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      resolved: { label: 'Résolu', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      closed: { label: 'Fermé', color: 'bg-gray-100 text-gray-800', icon: XCircle }
    };

    const badge = badges[status] || badges.open;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4 mr-1" />
        {badge.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      low: { label: 'Faible', color: 'bg-blue-100 text-blue-800' },
      medium: { label: 'Moyen', color: 'bg-yellow-100 text-yellow-800' },
      high: { label: 'Élevé', color: 'bg-orange-100 text-orange-800' },
      urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800' }
    };

    const badge = badges[priority] || badges.medium;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const stats = {
    total: disputes.length,
    open: disputes.filter(d => d.status === 'open').length,
    pending: disputes.filter(d => d.status === 'pending').length,
    resolved: disputes.filter(d => d.status === 'resolved').length,
    closed: disputes.filter(d => d.status === 'closed').length
  };

  if (loading && disputes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#FF6B35]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <FaExclamationTriangle className="text-orange-500 mr-3" />
          Signalements Créés
        </h1>
        <p className="text-gray-600">
          Suivez les problèmes que vous avez signalés et leur résolution
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <FaExclamationTriangle className="w-6 h-6 text-gray-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Ouverts</p>
              <p className="text-2xl font-bold text-red-600">{stats.open}</p>
            </div>
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">En cours</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Résolus</p>
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Fermés</p>
              <p className="text-2xl font-bold text-gray-600">{stats.closed}</p>
            </div>
            <XCircle className="w-6 h-6 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none ${
                statusFilter ? 'border-orange-500 bg-orange-50' : 'border-gray-300'
              }`}
            >
              <option value="">Tous les statuts</option>
              <option value="open">Ouverts</option>
              <option value="pending">En cours</option>
              <option value="resolved">Résolus</option>
              <option value="closed">Fermés</option>
            </select>
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>

          {statusFilter && (
            <button
              onClick={() => {
                setStatusFilter('');
                setPage(1);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Disputes List */}
      {disputes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
          <FaExclamationTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {statusFilter ? 'Aucun signalement avec ce statut' : 'Aucun signalement'}
          </h3>
          <p className="text-gray-600">
            {statusFilter 
              ? 'Essayez un autre filtre'
              : 'Vos signalements de problèmes avec les voyageurs apparaîtront ici'
            }
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {disputes.map((dispute) => (
              <div
                key={dispute._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer"
                onClick={() => {
                  setSelectedDispute(dispute);
                  setShowDetailsModal(true);
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {reasonLabels[dispute.reason] || dispute.reason}
                      </h3>
                      {getPriorityBadge(dispute.priority)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Home className="w-4 h-4" />
                      <span>{dispute.booking?.listing?.title || 'Listing supprimé'}</span>
                      <span className="text-gray-400">•</span>
                      <User className="w-4 h-4" />
                      <span>
                        {dispute.booking?.guest?.firstName} {dispute.booking?.guest?.lastName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Signalé le {new Date(dispute.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(dispute.status)}
                </div>

                <p className="text-gray-700 mb-4 line-clamp-2">
                  {dispute.description}
                </p>

                {dispute.resolution && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-green-800 mb-1">Résolution :</p>
                    <p className="text-sm text-green-700">{dispute.resolution}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {dispute.notes && dispute.notes.length > 0 && (
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{dispute.notes.length} note{dispute.notes.length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDispute(dispute);
                      setShowDetailsModal(true);
                    }}
                    className="inline-flex items-center px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Voir détails
                  </button>
                </div>
              </div>
            ))}
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
                Page {page} sur {totalPages}
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

      {/* Details Modal - Identique à la version guest */}
      {showDetailsModal && selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Détails du Signalement</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-white hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status & Priority */}
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedDispute.status)}
                {getPriorityBadge(selectedDispute.priority)}
              </div>

              {/* Reason */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Raison</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {reasonLabels[selectedDispute.reason] || selectedDispute.reason}
                </p>
              </div>

              {/* Booking Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Réservation concernée</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Home className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{selectedDispute.booking?.listing?.title || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>Voyageur : {selectedDispute.booking?.guest?.firstName} {selectedDispute.booking?.guest?.lastName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {selectedDispute.booking?.startDate && formatDateWithWeekday(selectedDispute.booking.startDate)}
                      {' → '}
                      {selectedDispute.booking?.endDate && formatDateWithWeekday(selectedDispute.booking.endDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                <p className="text-gray-900 whitespace-pre-wrap">{selectedDispute.description}</p>
              </div>

              {/* Evidence/Preuves */}
              {selectedDispute.evidence && selectedDispute.evidence.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Preuves fournies</h3>
                  <EvidenceGallery
                    evidence={selectedDispute.evidence}
                    currentUserId={user?._id}
                  />
                </div>
              )}

              {/* Add Evidence Button */}
              {selectedDispute.status !== 'closed' && selectedDispute.status !== 'resolved' && (
                <div>
                  <button
                    onClick={() => setShowEvidenceModal(true)}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Ajouter des preuves supplémentaires
                  </button>
                </div>
              )}

              {/* Resolution */}
              {selectedDispute.resolution && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-green-800 mb-2">Résolution</h3>
                  <p className="text-green-700">{selectedDispute.resolution}</p>
                  {selectedDispute.resolvedAt && (
                    <p className="text-xs text-green-600 mt-2">
                      Résolu le {new Date(selectedDispute.resolvedAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Historique des échanges</h3>
                
                {selectedDispute.notes && selectedDispute.notes.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {selectedDispute.notes.map((note, index) => (
                      <div key={index} className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">
                            {note.user?.firstName} {note.user?.lastName}
                          </span>
                          <span className="text-xs text-blue-600">
                            {new Date(note.createdAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-blue-800">{note.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mb-4">Aucune note pour le moment</p>
                )}

                {/* Add Note */}
                {selectedDispute.status !== 'closed' && (
                  <div>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Ajouter une note ou une information supplémentaire..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-2"
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={addingNote || !noteText.trim()}
                      className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingNote ? 'Ajout en cours...' : 'Ajouter une note'}
                    </button>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
                <p>Créé le {new Date(selectedDispute.createdAt).toLocaleString('fr-FR')}</p>
                <p>ID: {selectedDispute._id}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-b-xl flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Evidence Modal */}
      {showEvidenceModal && selectedDispute && (
        <AddEvidenceModal
          disputeId={selectedDispute._id}
          onClose={() => setShowEvidenceModal(false)}
          onSuccess={() => {
            setShowEvidenceModal(false);
            fetchDisputes();
            // Refresh selected dispute
            const token = localStorage.getItem('token');
            axios.get(
              `${process.env.NEXT_PUBLIC_API_URL}/disputes/${selectedDispute._id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            ).then(response => {
              setSelectedDispute(response.data.data.dispute);
            });
          }}
        />
      )}
    </div>
  );
}