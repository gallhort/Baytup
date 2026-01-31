'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  Ticket as TicketIcon,
  Plus,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Star
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface Ticket {
  _id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  messages: Array<{
    _id?: string;
    sender: {
      _id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    senderType: 'user' | 'agent' | 'system';
    content: string;
    createdAt: string;
  }>;
  createdAt: string;
  resolvedAt?: string;
  satisfaction?: {
    rating: number;
    feedback: string;
  };
}

const categoryLabels: Record<string, string> = {
  account: 'Compte',
  booking: 'Réservation',
  payment: 'Paiement',
  listing: 'Annonce',
  technical: 'Technique',
  dispute: 'Litige',
  verification: 'Vérification',
  other: 'Autre'
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Create ticket form
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    category: 'other',
    priority: 'normal'
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(res.data.data.tickets);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du chargement des tickets');
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async () => {
    if (!newTicket.subject || !newTicket.description) {
      return toast.error('Sujet et description requis');
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/tickets`, newTicket, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Ticket créé avec succès');
      setTickets([res.data.data.ticket, ...tickets]);
      setShowCreateModal(false);
      setNewTicket({ subject: '', description: '', category: 'other', priority: 'normal' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la création');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    try {
      setSending(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/tickets/${selectedTicket._id}/messages`,
        { content: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedTicket(res.data.data.ticket);
      setNewMessage('');
      toast.success('Message envoyé');
      fetchTickets(); // Refresh list
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const rateTicket = async (rating: number) => {
    if (!selectedTicket) return;

    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_URL}/tickets/${selectedTicket._id}/rate`,
        { rating },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Merci pour votre évaluation!');
      fetchTickets();
      if (selectedTicket) {
        // Refresh selected ticket
        const res = await axios.get(`${API_URL}/tickets/${selectedTicket._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSelectedTicket(res.data.data.ticket);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'évaluation');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      open: { label: 'Ouvert', color: 'bg-blue-100 text-blue-800' },
      pending: { label: 'En cours', color: 'bg-yellow-100 text-yellow-800' },
      resolved: { label: 'Résolu', color: 'bg-green-100 text-green-800' },
      closed: { label: 'Fermé', color: 'bg-gray-100 text-gray-800' }
    };
    return badges[status as keyof typeof badges] || badges.open;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <TicketIcon className="w-8 h-8 text-[#FF6B35]" />
            Support
          </h1>
          <p className="text-gray-600 mt-1">Créez et suivez vos demandes de support</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF6B35] to-orange-600 text-white rounded-lg hover:shadow-lg transition"
        >
          <Plus className="w-5 h-5" />
          Nouveau Ticket
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Mes Tickets ({tickets.length})</h2>
            {tickets.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center border">
                <TicketIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Aucun ticket</p>
              </div>
            ) : (
              tickets.map((ticket) => {
                const status = getStatusBadge(ticket.status);
                return (
                  <div
                    key={ticket._id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`bg-white rounded-lg p-4 cursor-pointer border transition hover:shadow-md ${
                      selectedTicket?._id === ticket._id ? 'ring-2 ring-[#FF6B35]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-mono text-gray-500">{ticket.ticketNumber}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{ticket.subject}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{ticket.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {ticket.messages.length}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Ticket Detail */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <div className="bg-white rounded-lg shadow border">
                {/* Header */}
                <div className="border-b p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-mono text-gray-500">{selectedTicket.ticketNumber}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(selectedTicket.status).color}`}>
                          {getStatusBadge(selectedTicket.status).label}
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedTicket.subject}</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {categoryLabels[selectedTicket.category]} • {new Date(selectedTicket.createdAt).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="p-6 max-h-96 overflow-y-auto space-y-4">
                  {selectedTicket.messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-md rounded-lg p-4 ${
                        msg.senderType === 'user'
                          ? 'bg-[#FF6B35] text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-sm">
                            {msg.senderType === 'user' ? 'Vous' : `${msg.sender.firstName} ${msg.sender.lastName}`}
                          </span>
                          {msg.senderType === 'agent' && (
                            <span className="text-xs bg-white bg-opacity-20 px-2 py-0.5 rounded">Support</span>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <span className="text-xs opacity-75 mt-2 block">
                          {new Date(msg.createdAt).toLocaleString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply */}
                {selectedTicket.status !== 'closed' && (
                  <div className="border-t p-4">
                    <div className="flex gap-2">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Votre message..."
                        className="flex-1 px-4 py-3 border rounded-lg resize-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                        rows={3}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={sending || !newMessage.trim()}
                        className="px-6 bg-[#FF6B35] text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Send className="w-5 h-5" />
                        Envoyer
                      </button>
                    </div>
                  </div>
                )}

                {/* Satisfaction Rating */}
                {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && !selectedTicket.satisfaction && (
                  <div className="border-t p-6 bg-gray-50">
                    <p className="text-sm font-medium text-gray-900 mb-3">Comment évalueriez-vous notre support?</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => rateTicket(rating)}
                          className="p-2 hover:bg-yellow-100 rounded transition"
                        >
                          <Star className="w-6 h-6 text-yellow-400 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTicket.satisfaction && (
                  <div className="border-t p-6 bg-green-50">
                    <p className="text-sm text-green-800 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Merci pour votre évaluation: {selectedTicket.satisfaction.rating}/5 ⭐
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow border p-12 text-center">
                <TicketIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Sélectionnez un ticket pour voir les détails</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Nouveau Ticket Support</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sujet *</label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6B35]"
                  placeholder="Résumez votre problème en quelques mots"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                  <select
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6B35]"
                  >
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6B35]"
                  >
                    <option value="low">Faible</option>
                    <option value="normal">Normale</option>
                    <option value="high">Élevée</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-[#FF6B35]"
                  rows={6}
                  placeholder="Décrivez votre problème en détail..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={createTicket}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#FF6B35] to-orange-600 text-white rounded-lg hover:shadow-lg transition"
                >
                  Créer le Ticket
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
