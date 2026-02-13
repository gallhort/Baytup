'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import moment from 'moment';
import { useSearchParams } from 'next/navigation';
import {
  Search, MessageCircle, Archive, Trash2, Users, Mail,
  ChevronLeft, ChevronRight, X, AlertTriangle, ExternalLink,
  Flag, ArchiveRestore, User as UserIcon, Clock
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getAvatarUrl = (avatar: string | undefined) => {
  if (!avatar) return '/uploads/users/default-avatar.png';
  if (avatar.startsWith('http')) return avatar;
  const cleanPath = avatar.startsWith('/api') ? avatar.substring(4) : avatar;
  const baseUrl = API_URL.replace('/api', '');
  return `${baseUrl}${cleanPath}`;
};

// Types
interface User {
  _id: string;
  firstName: string;
  lastName: string;
  avatar: string;
  email: string;
  role: string;
}

interface Participant {
  user: User;
  lastReadAt: string;
}

interface Listing {
  _id: string;
  title: string;
  images: { url: string }[];
}

interface Message {
  _id: string;
  sender: User;
  content: string;
  createdAt: string;
  flagged?: boolean;
  flagReason?: string;
  moderationFlags?: string[];
}

interface Conversation {
  _id: string;
  participants: Participant[];
  listing?: Listing;
  lastMessage?: {
    content: string;
    sender?: User;
    sentAt?: string;
  };
  status: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  active: number;
  archived: number;
  totalMessages: number;
}

export default function AdminMessagesView() {
  const t = useTranslation('messages');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, archived: 0, totalMessages: 0 });
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | ''>('active');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const pendingConversationId = useRef<string | null>(searchParams.get('c'));

  useEffect(() => {
    fetchData();
  }, [statusFilter, page]);

  // Auto-open conversation from ?c= URL param
  useEffect(() => {
    if (pendingConversationId.current && !loading && !selectedConversation) {
      const convId = pendingConversationId.current;
      pendingConversationId.current = null;
      // Directly fetch the conversation messages — works even if the conversation
      // isn't in the currently filtered/paginated list (e.g. archived)
      fetchMessages(convId);
    }
  }, [loading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await fetchConversations();
      await fetchStats();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const params: any = { page, limit: 20, sort: '-updatedAt' };
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const response = await axios.get(`${API_URL}/messages/admin/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      setConversations(response.data.data.conversations || []);
      setTotalPages(response.data.pagination?.pages || 1);

      if (response.data.stats) {
        setStats({
          total: response.data.stats.total || 0,
          active: response.data.stats.active || 0,
          archived: response.data.stats.archived || 0,
          totalMessages: response.data.stats.totalMessages || 0
        });
      }
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      toast.error(error.response?.data?.message || 'Failed to load conversations');
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/messages/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const summary = response.data.data.summary;
      if (summary) {
        setStats({
          total: summary.totalConversations || 0,
          active: summary.activeConversations || 0,
          archived: summary.archivedConversations || 0,
          totalMessages: summary.totalMessages || 0
        });
      }
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      setMessagesLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/messages/admin/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data.data.messages || []);
      setSelectedConversation(response.data.data.conversation);
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 100);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/messages/admin/conversations/${conversationToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Conversation supprimée');
      setShowDeleteModal(false);
      setConversationToDelete(null);
      setSelectedConversation(null);
      setMessages([]);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Échec de la suppression');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchConversations();
  };

  const formatTime = (date: string) => {
    const d = moment(date);
    const now = moment();
    if (d.isSame(now, 'day')) return d.format('HH:mm');
    if (d.isAfter(now.clone().subtract(7, 'days'))) return d.format('ddd HH:mm');
    return d.format('DD/MM/YY');
  };

  const getHostAndGuest = (conv: Conversation) => {
    const host = conv.participants.find(p => p.user.role === 'host')?.user;
    const guest = conv.participants.find(p => p.user.role === 'guest' || p.user.role !== 'host')?.user;
    return { host, guest };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF6B35] mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="px-1 pb-3">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-gray-900">Gestion des messages</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>Surveillance des conversations</span>
          <span className="text-gray-300">|</span>
          <span><strong className="text-gray-700">{stats.total}</strong> conversations</span>
          <span className="text-gray-300">·</span>
          <span className="text-green-600"><strong>{stats.active}</strong> actives</span>
          <span className="text-gray-300">·</span>
          <span className="text-purple-600"><strong>{stats.archived}</strong> archivées</span>
          <span className="text-gray-300">·</span>
          <span className="text-blue-600"><strong>{stats.totalMessages}</strong> messages</span>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-0">

        {/* Left Panel - Conversations */}
        <div className="w-[360px] flex-shrink-0 border-r border-gray-200 flex flex-col bg-gray-50">
          {/* Search */}
          <div className="p-3 border-b border-gray-200">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher utilisateurs, annonces..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                />
              </div>
            </form>
            {/* Filter pills */}
            <div className="flex gap-1.5 mt-2">
              {[
                { value: 'active' as const, label: 'Actives', count: stats.active },
                { value: 'archived' as const, label: 'Archivées', count: stats.archived },
                { value: '' as const, label: 'Toutes', count: stats.total }
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => { setStatusFilter(f.value); setPage(1); }}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition ${
                    statusFilter === f.value
                      ? 'bg-[#FF6B35] text-white shadow-sm'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-center">
                <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {searchQuery ? 'Aucun résultat' : 'Aucune conversation'}
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const { host, guest } = getHostAndGuest(conv);
                const isSelected = selectedConversation?._id === conv._id;

                return (
                  <div
                    key={conv._id}
                    onClick={() => fetchMessages(conv._id)}
                    className={`px-3 py-3 border-b border-gray-100 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-white border-l-3 border-l-[#FF6B35] shadow-sm'
                        : 'hover:bg-white/70'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Stacked Avatars */}
                      <div className="relative flex-shrink-0 w-10 h-10">
                        <img
                          src={getAvatarUrl(guest?.avatar)}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/uploads/users/default-avatar.png'; }}
                        />
                        {host && (
                          <img
                            src={getAvatarUrl(host.avatar)}
                            alt=""
                            className="absolute -right-1 -bottom-0.5 w-6 h-6 rounded-full object-cover border-2 border-white shadow-sm"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/uploads/users/default-avatar.png'; }}
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {guest ? `${guest.firstName} ${guest.lastName}` : ''}
                            {host && guest ? ' ↔ ' : ''}
                            {host ? `${host.firstName} ${host.lastName}` : ''}
                          </span>
                          <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                            {formatTime(conv.lastMessage?.sentAt || conv.updatedAt)}
                          </span>
                        </div>

                        {conv.listing && (
                          <p className="text-[11px] text-gray-500 truncate mt-0.5">
                            {conv.listing.title}
                          </p>
                        )}

                        {conv.lastMessage && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {conv.lastMessage.content}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-gray-400">{conv.messageCount} msgs</span>
                          {conv.status === 'archived' && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Archivée</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-2 border-t border-gray-200 bg-white flex items-center justify-between">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Right Panel - Messages */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedConversation && !messagesLoading ? (
            <>
              {/* Conversation Header with Admin Toolbar */}
              <div className="px-4 py-3 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Participants Info */}
                    {(() => {
                      const { host, guest } = getHostAndGuest(selectedConversation);
                      return (
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative flex-shrink-0">
                            <img
                              src={getAvatarUrl(guest?.avatar)}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/uploads/users/default-avatar.png'; }}
                            />
                            {host && (
                              <img
                                src={getAvatarUrl(host.avatar)}
                                alt=""
                                className="absolute -right-1 -bottom-0.5 w-5 h-5 rounded-full object-cover border-2 border-white"
                                onError={(e) => { (e.target as HTMLImageElement).src = '/uploads/users/default-avatar.png'; }}
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-gray-900 truncate">
                                {guest && <>{guest.firstName} {guest.lastName}</>}
                                {host && guest && <span className="text-gray-400 mx-1">↔</span>}
                                {host && <>{host.firstName} {host.lastName}</>}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500">
                              {selectedConversation.listing && (
                                <span className="truncate max-w-[200px]">{selectedConversation.listing.title}</span>
                              )}
                              <span>·</span>
                              <span>{selectedConversation.messageCount} messages</span>
                              <span>·</span>
                              <span>{moment(selectedConversation.createdAt).format('DD/MM/YY')}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Admin Actions */}
                  <div className="flex items-center gap-1">
                    {selectedConversation.listing && (
                      <a
                        href={`/listing/${selectedConversation.listing._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Voir l'annonce"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setConversationToDelete(selectedConversation);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Supprimer la conversation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Aucun message</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-w-3xl mx-auto">
                    {messages.map((message, index) => {
                      const showHeader = index === 0 || messages[index - 1].sender._id !== message.sender._id;
                      const isFlagged = message.flagged;

                      return (
                        <div key={message._id} className={`flex items-start gap-2.5 ${isFlagged ? 'relative' : ''}`}>
                          {showHeader ? (
                            <img
                              src={getAvatarUrl(message.sender.avatar)}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/uploads/users/default-avatar.png'; }}
                            />
                          ) : (
                            <div className="w-8 flex-shrink-0" />
                          )}

                          <div className="flex-1 min-w-0">
                            {showHeader && (
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold text-gray-900">
                                  {message.sender.firstName} {message.sender.lastName}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                  message.sender.role === 'host'
                                    ? 'bg-green-100 text-green-700'
                                    : message.sender.role === 'admin'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {message.sender.role === 'host' ? 'Hôte' : message.sender.role === 'admin' ? 'Admin' : 'Invité'}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {moment(message.createdAt).format('DD/MM HH:mm')}
                                </span>
                              </div>
                            )}
                            <div className={`inline-block px-3 py-2 rounded-lg text-sm max-w-xl ${
                              isFlagged
                                ? 'bg-red-50 border border-red-200'
                                : 'bg-white border border-gray-200'
                            }`}>
                              <p className="text-gray-900 break-words whitespace-pre-wrap">{message.content}</p>
                              {isFlagged && (
                                <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-red-200">
                                  <AlertTriangle className="w-3 h-3 text-red-500" />
                                  <span className="text-[10px] text-red-600 font-medium">
                                    Flaggé{message.flagReason ? ` : ${message.flagReason}` : ''}
                                  </span>
                                  {message.moderationFlags?.map((flag, i) => (
                                    <span key={i} className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full">{flag}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Admin Footer */}
              <div className="px-4 py-2 border-t border-gray-200 bg-orange-50/50">
                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-[#FF6B35] rounded-full"></div>
                  <span className="text-[11px] font-medium text-[#FF6B35]">Mode lecture seule — Vue administrateur</span>
                </div>
              </div>
            </>
          ) : messagesLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B35] mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Chargement...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50/30">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">Sélectionnez une conversation</h3>
                <p className="text-sm text-gray-500">Choisissez dans la liste pour voir les échanges</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && conversationToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl">
            <div className="p-5">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-3">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Supprimer la conversation</h3>
              <p className="text-sm text-gray-600 text-center">
                Supprimer définitivement les <strong>{conversationToDelete.messageCount} messages</strong> entre{' '}
                <strong>{conversationToDelete.participants.map(p => `${p.user.firstName} ${p.user.lastName}`).join(' et ')}</strong> ?
              </p>
            </div>
            <div className="bg-gray-50 px-5 py-3 flex items-center justify-end gap-2 rounded-b-xl">
              <button
                onClick={() => { setShowDeleteModal(false); setConversationToDelete(null); }}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConversation}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
