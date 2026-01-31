'use client';

import { useState, useEffect } from 'react';
import {
  AlertCircle, Clock, CheckCircle, XCircle, Eye, Filter,
  ChevronLeft, ChevronRight, MessageSquare, Calendar, Home, User, X, Search,
  BarChart3, TrendingUp, Users as UsersIcon, Target
} from 'lucide-react';
import { FaExclamationTriangle } from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useApp } from '@/contexts/AppContext';
import { formatDateWithWeekday } from '@/utils/dateFormatter';
import EvidenceGallery from '@/components/dispute/EvidenceGallery';
import AddEvidenceModal from '@/components/dispute/AddEvidenceModal';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface Dispute {
  _id: string;
  booking: {
    _id: string;
    listing: {
      title: string;
      address: { city: string; state: string; };
    };
    guest: { firstName: string; lastName: string; };
    host: { firstName: string; lastName: string; };
    startDate: string;
    endDate: string;
  };
  reportedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  reason: string;
  description: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  resolution?: string;
  resolvedBy?: { firstName: string; lastName: string; };
  notes: Array<{
    user: { _id: string; firstName: string; lastName: string; };
    message: string;
    createdAt: string;
  }>;
  evidence?: Array<{
    url: string;
    type: 'image' | 'document' | 'video';
    uploadedBy: string;
    uploadedAt: string;
    description?: string;
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
  smoking: 'Fumer dans le logement',
  dirty_arrival: 'Logement sale à l\'arrivée',
  amenities_missing: 'Équipements manquants',
  safety_issue: 'Problème de sécurité',
  misleading_listing: 'Annonce trompeuse',
  no_access: 'Problème d\'accès',
  host_unresponsive: 'Hôte injoignable',
  noise_disturbance: 'Nuisances sonores',
  cancellation_host: 'Annulation par l\'hôte',
  payment: 'Problème de paiement',
  other: 'Autre'
};

interface AnalyticsData {
  overview: {
    totalDisputes: number;
    resolvedCount: number;
    resolutionRate: number;
    avgResolutionTime: number;
  };
  byStatus: Array<{ _id: string; count: number }>;
  byPriority: Array<{ _id: string; count: number }>;
  topReasons: Array<{ _id: string; count: number }>;
  monthlyTrend: Array<{ month: string; count: number }>;
  repeatOffenders: Array<{
    user: { _id: string; firstName: string; lastName: string };
    disputeCount: number;
  }>;
  guestVsHost: {
    guestReported: number;
    hostReported: number;
  };
}

export default function AdminDisputesPage() {
  const { state } = useApp();
  const user = state.user;
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [resolutionText, setResolutionText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (user) fetchDisputes();
  }, [statusFilter, priorityFilter, page, user]);

  useEffect(() => {
    if (user && activeTab === 'analytics' && !analytics) {
      fetchAnalytics();
    }
  }, [activeTab, user]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      params.append('page', page.toString());
      params.append('limit', '20');

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/disputes?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDisputes(response.data.data.disputes || []);
      setTotalPages(response.data.data.pagination?.pages || 1);
    } catch (error) {
      toast.error('Erreur chargement disputes');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/disputes/analytics`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnalytics(response.data.data);
    } catch (error) {
      toast.error('Erreur chargement analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return toast.error('Message requis');
    try {
      setAddingNote(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/disputes/${selectedDispute?._id}/notes`,
        { message: noteText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Note ajoutée');
      setNoteText('');
      fetchDisputes();
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/disputes/${selectedDispute?._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedDispute(response.data.data.dispute);
    } catch (error: any) {
      console.error('Erreur ajout note:', error);
      const message = error.response?.data?.message || error.message || 'Erreur ajout note';
      toast.error(message);
    } finally {
      setAddingNote(false);
    }
  };

  const handleResolve = async () => {
    if (!resolutionText.trim()) return toast.error('Résolution requise');
    try {
      setResolving(true);
      const token = localStorage.getItem('token');
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/disputes/${selectedDispute?._id}/resolve`,
        { resolution: resolutionText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Dispute résolue');
      setResolutionText('');
      setShowDetailsModal(false);
      fetchDisputes();
    } catch (error: any) {
      console.error('Erreur résolution:', error);
      const message = error.response?.data?.message || error.message || 'Erreur résolution';
      toast.error(message);
    } finally {
      setResolving(false);
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
    return <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${badge.color}`}>{badge.label}</span>;
  };

  const stats = {
    total: disputes.length,
    open: disputes.filter(d => d.status === 'open').length,
    pending: disputes.filter(d => d.status === 'pending').length,
    resolved: disputes.filter(d => d.status === 'resolved').length
  };

  const filteredDisputes = disputes.filter(d => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.booking?.listing?.title?.toLowerCase().includes(term) ||
      d.booking?.guest?.firstName?.toLowerCase().includes(term) ||
      d.booking?.host?.firstName?.toLowerCase().includes(term) ||
      d._id.toLowerCase().includes(term)
    );
  });

  // Colors for charts
  const COLORS = {
    status: ['#EF4444', '#F59E0B', '#10B981', '#6B7280'],
    priority: ['#3B82F6', '#F59E0B', '#F97316', '#DC2626'],
    pie: ['#FF6B35', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899']
  };

  if (loading && disputes.length === 0 && activeTab === 'list') {
    return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#FF6B35]"></div></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <FaExclamationTriangle className="text-orange-500 mr-3" />
          Gestion des Litiges
        </h1>
        <p className="text-gray-600">Administration de tous les signalements</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-3 px-4 font-medium transition-all ${
              activeTab === 'list'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Liste des litiges
            </div>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 px-4 font-medium transition-all ${
              activeTab === 'analytics'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Analytics & Métriques
            </div>
          </button>
        </div>
      </div>

      {/* LIST TAB */}
      {activeTab === 'list' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-gray-600">Total</p><p className="text-2xl font-bold">{stats.total}</p></div>
                <FaExclamationTriangle className="w-6 h-6 text-gray-400" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-gray-600">Ouverts</p><p className="text-2xl font-bold text-red-600">{stats.open}</p></div>
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-gray-600">En cours</p><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p></div>
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-gray-600">Résolus</p><p className="text-2xl font-bold text-green-600">{stats.resolved}</p></div>
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-4 py-2 border rounded-lg">
            <option value="">Tous statuts</option>
            <option value="open">Ouverts</option>
            <option value="pending">En cours</option>
            <option value="resolved">Résolus</option>
            <option value="closed">Fermés</option>
          </select>
          <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }} className="px-4 py-2 border rounded-lg">
            <option value="">Toutes priorités</option>
            <option value="low">Faible</option>
            <option value="medium">Moyen</option>
            <option value="high">Élevé</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

          {filteredDisputes.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg shadow-sm border">
              <FaExclamationTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun litige</h3>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {filteredDisputes.map((dispute) => (
              <div key={dispute._id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition cursor-pointer" onClick={() => { setSelectedDispute(dispute); setShowDetailsModal(true); }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{reasonLabels[dispute.reason] || dispute.reason}</h3>
                      {getPriorityBadge(dispute.priority)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Home className="w-4 h-4" />
                      <span>{dispute.booking?.listing?.title || 'Listing supprimé'}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>Guest: {dispute.booking?.guest?.firstName} {dispute.booking?.guest?.lastName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>Host: {dispute.booking?.host?.firstName} {dispute.booking?.host?.lastName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                      <Calendar className="w-4 h-4" />
                      <span>Signalé le {new Date(dispute.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                      <span className="text-gray-400">par</span>
                      <span className="font-medium">{dispute.reportedBy?.firstName} ({dispute.reportedBy?.role})</span>
                    </div>
                  </div>
                  {getStatusBadge(dispute.status)}
                </div>
                <p className="text-gray-700 mb-4 line-clamp-2">{dispute.description}</p>
                {dispute.resolution && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-green-800 mb-1">Résolution :</p>
                    <p className="text-sm text-green-700">{dispute.resolution}</p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {dispute.notes && dispute.notes.length > 0 && (
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{dispute.notes.length} note{dispute.notes.length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedDispute(dispute); setShowDetailsModal(true); }} className="inline-flex items-center px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm">
                    <Eye className="w-4 h-4 mr-1" />
                    Gérer
                  </button>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-2 rounded-lg bg-white border hover:bg-gray-50 disabled:opacity-50"><ChevronLeft className="w-5 h-5" /></button>
              <span className="text-sm">Page {page} sur {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-2 rounded-lg bg-white border hover:bg-gray-50 disabled:opacity-50"><ChevronRight className="w-5 h-5" /></button>
            </div>
          )}
            </>
          )}
        </>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <>
          {analyticsLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#FF6B35]"></div>
            </div>
          ) : analytics ? (
            <div className="space-y-6">
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm mb-1">Total Disputes</p>
                      <p className="text-4xl font-bold">{analytics.overview.totalDisputes}</p>
                    </div>
                    <FaExclamationTriangle className="w-12 h-12 text-orange-200 opacity-50" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm mb-1">Résolus</p>
                      <p className="text-4xl font-bold">{analytics.overview.resolvedCount}</p>
                    </div>
                    <CheckCircle className="w-12 h-12 text-green-200 opacity-50" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm mb-1">Taux de résolution</p>
                      <p className="text-4xl font-bold">{analytics.overview.resolutionRate.toFixed(0)}%</p>
                    </div>
                    <Target className="w-12 h-12 text-blue-200 opacity-50" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm mb-1">Temps moyen résolution</p>
                      <p className="text-4xl font-bold">{analytics.overview.avgResolutionTime.toFixed(1)}</p>
                      <p className="text-purple-100 text-xs">jours</p>
                    </div>
                    <Clock className="w-12 h-12 text-purple-200 opacity-50" />
                  </div>
                </div>
              </div>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-orange-500" />
                    Tendance sur 6 mois
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="count" stroke="#FF6B35" strokeWidth={2} name="Disputes" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Disputes by Status */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
                    Répartition par statut
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.byStatus.map(item => ({
                          name: item._id === 'open' ? 'Ouverts' : item._id === 'pending' ? 'En cours' : item._id === 'resolved' ? 'Résolus' : 'Fermés',
                          value: item.count
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {analytics.byStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS.status[index % COLORS.status.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Charts Row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Disputes by Priority */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FaExclamationTriangle className="w-5 h-5 mr-2 text-orange-500" />
                    Répartition par priorité
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.byPriority.map(item => ({
                      name: item._id === 'low' ? 'Faible' : item._id === 'medium' ? 'Moyen' : item._id === 'high' ? 'Élevé' : 'Urgent',
                      value: item.count,
                      priority: item._id
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" name="Disputes">
                        {analytics.byPriority.map((entry, index) => {
                          const color = entry._id === 'low' ? '#3B82F6' : entry._id === 'medium' ? '#F59E0B' : entry._id === 'high' ? '#F97316' : '#DC2626';
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Top Dispute Reasons */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-orange-500" />
                    Top 10 Raisons
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.topReasons.map(item => ({
                      name: reasonLabels[item._id] || item._id,
                      value: item.count
                    }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#FF6B35" name="Nombre" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Guest vs Host */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <UsersIcon className="w-5 h-5 mr-2 text-orange-500" />
                  Guest vs Host - Qui signale?
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-600 mb-2">Signalements par Guests</p>
                    <p className="text-4xl font-bold text-blue-700">{analytics.guestVsHost.guestReported}</p>
                    <p className="text-sm text-blue-600 mt-1">
                      {((analytics.guestVsHost.guestReported / (analytics.guestVsHost.guestReported + analytics.guestVsHost.hostReported)) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                    <p className="text-sm text-orange-600 mb-2">Signalements par Hosts</p>
                    <p className="text-4xl font-bold text-orange-700">{analytics.guestVsHost.hostReported}</p>
                    <p className="text-sm text-orange-600 mt-1">
                      {((analytics.guestVsHost.hostReported / (analytics.guestVsHost.guestReported + analytics.guestVsHost.hostReported)) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Repeat Offenders */}
              {analytics.repeatOffenders.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <UsersIcon className="w-5 h-5 mr-2 text-red-500" />
                    Utilisateurs récurrents (3+ disputes)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre de disputes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {analytics.repeatOffenders.map((offender, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {offender.user.firstName} {offender.user.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{offender.user._id}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                {offender.disputeCount} disputes
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-600">Aucune donnée disponible</p>
            </div>
          )}
        </>
      )}

      {showDetailsModal && selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Gestion du Litige</h2>
                <button onClick={() => setShowDetailsModal(false)} className="text-white hover:text-gray-200"><X className="w-6 h-6" /></button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedDispute.status)}
                {getPriorityBadge(selectedDispute.priority)}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Raison</h3>
                <p className="text-lg font-semibold">{reasonLabels[selectedDispute.reason] || selectedDispute.reason}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Réservation</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm"><Home className="w-4 h-4 text-gray-500" /><span className="font-medium">{selectedDispute.booking?.listing?.title || 'Listing supprimé'}</span></div>
                  <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-gray-500" /><span>Guest: {selectedDispute.booking?.guest?.firstName} {selectedDispute.booking?.guest?.lastName}</span></div>
                  <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-gray-500" /><span>Host: {selectedDispute.booking?.host?.firstName} {selectedDispute.booking?.host?.lastName}</span></div>
                  <div className="flex items-center gap-2 text-sm text-gray-600"><Calendar className="w-4 h-4" /><span>{selectedDispute.booking?.startDate && formatDateWithWeekday(selectedDispute.booking.startDate)} → {selectedDispute.booking?.endDate && formatDateWithWeekday(selectedDispute.booking.endDate)}</span></div>
                </div>
              </div>
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
                    currentUserId={(user as any)?._id}
                  />
                </div>
              )}

              {/* Add Evidence Button (Admin can also add evidence) */}
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

              {selectedDispute.resolution && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-green-800 mb-2">Résolution</h3>
                  <p className="text-green-700">{selectedDispute.resolution}</p>
                  {selectedDispute.resolvedBy && <p className="text-xs text-green-600 mt-2">Par: {selectedDispute.resolvedBy.firstName} {selectedDispute.resolvedBy.lastName}</p>}
                  {selectedDispute.resolvedAt && <p className="text-xs text-green-600">Le {new Date(selectedDispute.resolvedAt).toLocaleString('fr-FR')}</p>}
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Historique</h3>
                {selectedDispute.notes && selectedDispute.notes.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {selectedDispute.notes.map((note, index) => (
                      <div key={index} className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">{note.user?.firstName} {note.user?.lastName}</span>
                          <span className="text-xs text-blue-600">{new Date(note.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm text-blue-800">{note.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mb-4">Aucune note</p>
                )}
                <div>
                  <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Ajouter une note..." rows={3} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 mb-2" />
                  <button onClick={handleAddNote} disabled={addingNote || !noteText.trim()} className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50">{addingNote ? 'Ajout...' : 'Ajouter note'}</button>
                </div>
              </div>
              {selectedDispute.status !== 'resolved' && selectedDispute.status !== 'closed' && (
                <div className="border-t pt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Résoudre le litige</h3>
                  <textarea value={resolutionText} onChange={(e) => setResolutionText(e.target.value)} placeholder="Expliquez la résolution..." rows={4} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 mb-2" />
                  <button onClick={handleResolve} disabled={resolving || !resolutionText.trim()} className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50">{resolving ? 'Résolution...' : 'Marquer comme résolu'}</button>
                </div>
              )}
              <div className="text-xs text-gray-500 pt-4 border-t">
                <p>Créé le {new Date(selectedDispute.createdAt).toLocaleString('fr-FR')}</p>
                <p>ID: {selectedDispute._id}</p>
              </div>
            </div>
            <div className="bg-gray-50 p-6 rounded-b-xl flex justify-end">
              <button onClick={() => setShowDetailsModal(false)} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Fermer</button>
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