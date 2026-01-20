'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import moment from 'moment';
import {
  Search, MessageCircle, Archive, Trash2, Users, Mail,
  ChevronLeft, ChevronRight, X, TrendingUp
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

// Helper function for avatar URLs with proper fallback
const getAvatarUrl = (avatar: string | undefined) => {
  if (!avatar) return '/uploads/users/default-avatar.png';
  if (avatar.startsWith('http')) return avatar;

  // Remove /api prefix if present
  const cleanPath = avatar.startsWith('/api') ? avatar.substring(4) : avatar;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
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

interface StatsResponse {
  totalConversations: number;
  activeConversations: number;
  archivedConversations: number;
  totalMessages: number;
}

export default function AdminMessagesView() {
  const t = useTranslation('messages');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    archived: 0,
    totalMessages: 0
  });
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | ''>('active');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [statusFilter, page]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch conversations first (includes stats), then fetch detailed stats
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
      const params: any = {
        page,
        limit: 20,
        sort: '-updatedAt'
      };
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/messages/admin/conversations`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params
        }
      );

      setConversations(response.data.data.conversations || []);
      setTotalPages(response.data.pagination?.pages || 1);

      // Update stats from conversations response if available
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
      toast.error(error.response?.data?.message || (t as any)?.toast?.loadFailed || 'Failed to load conversations');
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/messages/admin/stats`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Map the server response to match our Stats interface
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
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/messages/admin/conversations/${conversationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages(response.data.data.messages || []);
      setSelectedConversation(response.data.data.conversation);
      scrollToBottom();
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error((t as any)?.toast?.loadFailed || 'Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/messages/admin/conversations/${conversationToDelete._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success((t as any)?.toast?.conversationDeleteSuccess || 'Conversation deleted successfully');
      setShowDeleteModal(false);
      setConversationToDelete(null);
      setSelectedConversation(null);
      setMessages([]);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || (t as any)?.toast?.conversationDeleteFailed || 'Failed to delete conversation');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchConversations();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date: string) => {
    const messageDate = moment(date);
    const now = moment();

    if (messageDate.isSame(now, 'day')) {
      return messageDate.format('HH:mm');
    } else if (messageDate.isAfter(now.clone().subtract(7, 'days'))) {
      return messageDate.format('ddd HH:mm');
    } else {
      return messageDate.format('MMM DD');
    }
  };

  const formatFullTime = (date: string) => {
    return moment(date).format('MMM DD, YYYY [at] HH:mm');
  };

  const getParticipantNames = (conv: Conversation) => {
    return conv.participants
      .map(p => `${p.user.firstName} ${p.user.lastName}`)
      .join(' & ');
  };

  const getHostAndGuest = (conv: Conversation) => {
    const host = conv.participants.find(p => p.user.role === 'host')?.user;
    const guest = conv.participants.find(p => p.user.role === 'guest')?.user;
    return { host, guest };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35] mx-auto mb-4"></div>
          <p className="text-gray-600">{(t as any)?.admin?.loading || 'Loading messages management...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{(t as any)?.admin?.header?.title || 'Messages Management'}</h1>
        <p className="text-gray-600">{(t as any)?.admin?.header?.subtitle || 'View and manage all conversations across the platform'}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl shadow-sm border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 mb-1">{(t as any)?.admin?.stats?.totalConversations || 'Total Conversations'}</p>
                <p className="text-3xl font-bold text-orange-900">{stats.total.toLocaleString()}</p>
                <p className="text-xs text-orange-600 mt-1">{(t as any)?.admin?.stats?.allTime || 'All time'}</p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                <MessageCircle className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-sm border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-1">{(t as any)?.admin?.stats?.activeConversations || 'Active Conversations'}</p>
                <p className="text-3xl font-bold text-green-900">{stats.active.toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {(t as any)?.admin?.stats?.currentlyOngoing || 'Currently ongoing'}
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow-sm border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-1">{(t as any)?.admin?.stats?.archived || 'Archived'}</p>
                <p className="text-3xl font-bold text-purple-900">{stats.archived.toLocaleString()}</p>
                <p className="text-xs text-purple-600 mt-1">{(t as any)?.admin?.stats?.inactiveThreads || 'Inactive threads'}</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <Archive className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-sm border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">{(t as any)?.admin?.stats?.totalMessages || 'Total Messages'}</p>
                <p className="text-3xl font-bold text-blue-900">{stats.totalMessages.toLocaleString()}</p>
                <p className="text-xs text-blue-600 mt-1">{(t as any)?.admin?.stats?.platformWide || 'Platform-wide'}</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden" style={{ height: '650px' }}>
        <div className="flex h-full">
          {/* Conversations List */}
          <div className="w-full md:w-1/3 border-r border-gray-200 flex flex-col">
            {/* Search and Filter */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder={(t as any)?.admin?.searchPlaceholder || 'Search users, listings...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition"
                  />
                </div>
              </form>

              {/* Status Filter */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setStatusFilter('active');
                    setPage(1);
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition ${
                    statusFilter === 'active'
                      ? 'bg-[#FF6B35] text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {(t as any)?.conversations?.filters?.active || 'Active'}
                </button>
                <button
                  onClick={() => {
                    setStatusFilter('archived');
                    setPage(1);
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition ${
                    statusFilter === 'archived'
                      ? 'bg-[#FF6B35] text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {(t as any)?.conversations?.filters?.archived || 'Archived'}
                </button>
                <button
                  onClick={() => {
                    setStatusFilter('');
                    setPage(1);
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition ${
                    statusFilter === ''
                      ? 'bg-[#FF6B35] text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {(t as any)?.admin?.filters?.all || 'All'}
                </button>
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-sm font-medium text-gray-900 mb-2">{(t as any)?.admin?.empty?.noConversations || 'No conversations found'}</h3>
                  <p className="text-sm text-gray-500">
                    {searchQuery ? ((t as any)?.admin?.empty?.tryAdjusting || 'Try adjusting your search') : ((t as any)?.admin?.empty?.noInCategory || 'No conversations in this category')}
                  </p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const { host, guest } = getHostAndGuest(conv);

                  return (
                    <div
                      key={conv._id}
                      onClick={() => fetchMessages(conv._id)}
                      className={`p-4 border-b border-gray-200 cursor-pointer transition ${
                        selectedConversation?._id === conv._id
                          ? 'bg-orange-50 border-l-4 border-l-[#FF6B35]'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar Group - Show both host and guest */}
                        <div className="relative flex-shrink-0">
                          {/* Guest Avatar (Front) */}
                          {guest && (
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
                              <img
                                src={getAvatarUrl(guest.avatar)}
                                alt={`${guest.firstName} ${guest.lastName}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/uploads/users/default-avatar.png';
                                }}
                              />
                            </div>
                          )}
                          {/* Host Avatar (Overlapped) */}
                          {host && (
                            <div className="absolute -right-2 -bottom-1 w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm bg-white">
                              <img
                                src={getAvatarUrl(host.avatar)}
                                alt={`${host.firstName} ${host.lastName}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/uploads/users/default-avatar.png';
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex-1">
                              <h3 className="text-sm font-semibold text-gray-900 truncate">
                                {guest && `${guest.firstName} ${guest.lastName}`}
                                {host && guest && ' & '}
                                {host && `${host.firstName} ${host.lastName}`}
                              </h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                {guest && (
                                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                    {(t as any)?.admin?.roles?.guest || 'Guest'}
                                  </span>
                                )}
                                {host && (
                                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                    {(t as any)?.admin?.roles?.host || 'Host'}
                                  </span>
                                )}
                              </div>
                            </div>
                            {conv.lastMessage && (
                              <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                                {formatTime(conv.lastMessage.sentAt || conv.updatedAt)}
                              </span>
                            )}
                          </div>

                          {conv.listing && (
                            <p className="text-xs text-gray-600 truncate mb-1 flex items-center gap-1">
                              <span className="text-gray-400">📍</span>
                              {conv.listing.title}
                            </p>
                          )}

                          {conv.lastMessage && (
                            <p className="text-sm text-gray-600 truncate">
                              {conv.lastMessage.content}
                            </p>
                          )}

                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500 font-medium">
                              {conv.messageCount} {conv.messageCount === 1 ? ((t as any)?.admin?.labels?.message || 'message') : ((t as any)?.admin?.labels?.messages || 'messages')}
                            </span>
                            {conv.status === 'archived' && (
                              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                                {(t as any)?.conversations?.filters?.archived || 'Archived'}
                              </span>
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
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  {(t as any)?.admin?.pagination?.page || 'Page'} {page} {(t as any)?.admin?.pagination?.of || 'of'} {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            )}
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation && !messagesLoading ? (
              <>
                {/* Messages Header */}
                <div className="p-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Show both avatars in header too */}
                      <div className="relative flex-shrink-0">
                        {(() => {
                          const { host, guest } = getHostAndGuest(selectedConversation);
                          return (
                            <>
                              {guest && (
                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
                                  <img
                                    src={getAvatarUrl(guest.avatar)}
                                    alt={`${guest.firstName}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = '/uploads/users/default-avatar.png';
                                    }}
                                  />
                                </div>
                              )}
                              {host && (
                                <div className="absolute -right-1 -bottom-1 w-7 h-7 rounded-full overflow-hidden border-2 border-white shadow-sm bg-white">
                                  <img
                                    src={getAvatarUrl(host.avatar)}
                                    alt={`${host.firstName}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = '/uploads/users/default-avatar.png';
                                    }}
                                  />
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">
                          {getParticipantNames(selectedConversation)}
                        </h3>
                        {selectedConversation.listing && (
                          <p className="text-xs text-gray-500">
                            {selectedConversation.listing.title}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setConversationToDelete(selectedConversation);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title={(t as any)?.messagesArea?.tooltips?.delete || 'Delete conversation'}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">{(t as any)?.admin?.messages?.noMessages || 'No messages in this conversation'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message, index) => {
                        const showAvatar = index === 0 || messages[index - 1].sender._id !== message.sender._id;

                        return (
                          <div key={message._id} className="flex items-start gap-3">
                            {/* Avatar */}
                            {showAvatar ? (
                              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 shadow-sm border-2 border-white">
                                <img
                                  src={getAvatarUrl(message.sender.avatar)}
                                  alt={message.sender.firstName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/uploads/users/default-avatar.png';
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 flex-shrink-0" />
                            )}

                            {/* Message Content */}
                            <div className="flex-1">
                              {showAvatar && (
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-semibold text-gray-900">
                                    {message.sender.firstName} {message.sender.lastName}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    message.sender.role === 'host'
                                      ? 'bg-green-100 text-green-700'
                                      : message.sender.role === 'guest'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {message.sender.role}
                                  </span>
                                </div>
                              )}
                              <div className="bg-white px-4 py-3 rounded-lg border border-gray-200 shadow-sm inline-block max-w-xl">
                                <p className="text-sm text-gray-900 break-words whitespace-pre-wrap">{message.content}</p>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatFullTime(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Info Footer */}
                <div className="p-4 border-t border-gray-200 bg-orange-50">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-[#FF6B35] rounded-full animate-pulse"></div>
                    <p className="text-sm font-medium text-[#FF6B35]">
                      {(t as any)?.admin?.footer?.readOnly || 'Admin View - Read-only mode'}
                    </p>
                  </div>
                </div>
              </>
            ) : messagesLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35] mx-auto mb-4"></div>
                  <p className="text-gray-600">{(t as any)?.messagesArea?.loading || 'Loading messages...'}</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <MessageCircle className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{(t as any)?.messagesArea?.emptyState?.title || 'Select a conversation'}</h3>
                  <p className="text-gray-500">{(t as any)?.messagesArea?.emptyState?.subtitle || 'Choose a conversation from the list to view messages'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Conversation Modal */}
      {showDeleteModal && conversationToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-center w-14 h-14 mx-auto bg-red-100 rounded-full mb-4">
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                {(t as any)?.admin?.deleteModal?.title || 'Delete Conversation'}
              </h3>
              <p className="text-sm text-gray-600 text-center">
                {(t as any)?.admin?.deleteModal?.message || 'Are you sure you want to permanently delete this conversation? This will delete all'}{' '}
                <span className="font-semibold text-gray-900">{conversationToDelete.messageCount} {conversationToDelete.messageCount === 1 ? ((t as any)?.admin?.labels?.message || 'message') : ((t as any)?.admin?.labels?.messages || 'messages')}</span> {(t as any)?.admin?.deleteModal?.between || 'between'}{' '}
                <span className="font-semibold text-gray-900">{getParticipantNames(conversationToDelete)}</span>.
                {(t as any)?.admin?.deleteModal?.cannotUndo || 'This action cannot be undone.'}
              </p>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setConversationToDelete(null);
                }}
                className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition shadow-sm"
              >
                {(t as any)?.deleteModal?.cancel || 'Cancel'}
              </button>
              <button
                onClick={handleDeleteConversation}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition shadow-sm"
              >
                {(t as any)?.admin?.deleteModal?.confirmButton || 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
