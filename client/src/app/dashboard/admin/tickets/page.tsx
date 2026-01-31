'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Ticket as TicketIcon, MessageCircle, User, Clock, TrendingUp } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface Ticket {
  _id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  user: { _id: string; firstName: string; lastName: string; email: string };
  assignedTo?: { _id: string; firstName: string; lastName: string };
  messages: any[];
  createdAt: string;
}

interface Stats {
  overview: {
    total: number;
    open: number;
    pending: number;
    resolved: number;
    closed: number;
    avgResolutionTime: number;
  };
  byCategory: Array<{ _id: string; count: number }>;
  byPriority: Array<{ _id: string; count: number }>;
  recentTickets: Ticket[];
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', priority: '', category: '' });

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [filter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams(filter as any);
      const res = await axios.get(`${API_URL}/tickets?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(res.data.data.tickets);
    } catch (error: any) {
      toast.error('Erreur chargement tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/tickets/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data.data);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const updateStatus = async (ticketId: string, status: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/tickets/${ticketId}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Statut mis à jour');
      fetchTickets();
      fetchStats();
    } catch (error: any) {
      toast.error('Erreur mise à jour');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
        <TicketIcon className="w-8 h-8 text-[#FF6B35]" />
        Gestion des Tickets
      </h1>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow border">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl font-bold">{stats.overview.total}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
            <p className="text-sm text-blue-600">Ouverts</p>
            <p className="text-2xl font-bold text-blue-700">{stats.overview.open}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200">
            <p className="text-sm text-yellow-600">En cours</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.overview.pending}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
            <p className="text-sm text-green-600">Résolus</p>
            <p className="text-2xl font-bold text-green-700">{stats.overview.resolved}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg shadow border border-gray-200">
            <p className="text-sm text-gray-600">Temps moyen</p>
            <p className="text-2xl font-bold text-gray-700">{Math.floor(stats.overview.avgResolutionTime / 60)}h</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-3 gap-4">
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} className="px-4 py-2 border rounded-lg">
          <option value="">Tous les statuts</option>
          <option value="open">Ouvert</option>
          <option value="pending">En cours</option>
          <option value="resolved">Résolu</option>
          <option value="closed">Fermé</option>
        </select>
        <select value={filter.priority} onChange={(e) => setFilter({ ...filter, priority: e.target.value })} className="px-4 py-2 border rounded-lg">
          <option value="">Toutes priorités</option>
          <option value="urgent">Urgente</option>
          <option value="high">Élevée</option>
          <option value="normal">Normale</option>
          <option value="low">Faible</option>
        </select>
        <select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })} className="px-4 py-2 border rounded-lg">
          <option value="">Toutes catégories</option>
          <option value="account">Compte</option>
          <option value="booking">Réservation</option>
          <option value="payment">Paiement</option>
          <option value="listing">Annonce</option>
          <option value="technical">Technique</option>
          <option value="dispute">Litige</option>
          <option value="other">Autre</option>
        </select>
      </div>

      {/* Tickets Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35]"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priorité</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <tr key={ticket._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-xs font-mono text-gray-500">{ticket.ticketNumber}</p>
                      <p className="font-medium text-gray-900 line-clamp-1">{ticket.subject}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {ticket.user.firstName} {ticket.user.lastName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 capitalize">{ticket.category}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      ticket.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={ticket.status}
                      onChange={(e) => updateStatus(ticket._id, e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="open">Ouvert</option>
                      <option value="pending">En cours</option>
                      <option value="resolved">Résolu</option>
                      <option value="closed">Fermé</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`/dashboard/admin/tickets/${ticket._id}`}
                      className="text-[#FF6B35] hover:text-orange-600 text-sm font-medium"
                    >
                      Voir détails
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
