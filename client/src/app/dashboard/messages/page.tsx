'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import moment from 'moment';
import io, { Socket } from 'socket.io-client';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import AdminMessagesView from '@/components/messages/AdminMessagesView';

interface Participant {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar: string;
  };
  lastReadAt: string;
}

interface Message {
  _id: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar: string;
  };
  content: string;
  type: string;
  attachments?: { url: string; type: string }[];
  readBy: Array<string | { user: string | { _id: string; firstName?: string; lastName?: string }; readAt: string }>;
  isEdited: boolean;
  editedAt?: string;
  originalContent?: string;
  createdAt: string;
  updatedAt: string;
}

interface Conversation {
  _id: string;
  participants: Participant[];
  listing?: {
    _id: string;
    title: string;
    images: { url: string; isPrimary: boolean }[];
    address: {
      city: string;
      country: string;
    };
    host?: string;
  };
  booking?: {
    _id: string;
    startDate: string;
    endDate: string;
    status: string;
    host?: string;
    guest?: string;
    confirmationCode?: string;
    guests?: {
      adults: number;
      children?: number;
      infants?: number;
    };
    pricing?: {
      basePrice: number;
      nights: number;
      totalPrice: number;
      serviceFee: number;
      hostPayout: number;
      hostServiceFee: number;
      currency: string;
    };
    createdAt?: string;
    cancellationPolicy?: string;
    accessCode?: string;
  };
  lastMessage?: {
    content: string;
    sender?: string | {
      _id: string;
      firstName: string;
      lastName: string;
      avatar: string;
    };
    sentAt?: string;
    createdAt?: string;
    type?: string;
  };
  status: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

interface MessageStats {
  summary: {
    totalConversations: number;
    archivedConversations: number;
    totalUnread: number;
    activeConversations: number;
  };
  recentActivity: any[];
}

export default function MessagesPage() {
  const { state } = useApp();
  const user = state.user;
  const t = useTranslation('messages');

  // If user is admin, render admin view
  if (user?.role === 'admin') {
    return <AdminMessagesView />;
  }

  // Otherwise, render regular user view
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'active' | 'archived'>('active');
  const [filterRole, setFilterRole] = useState<'all' | 'host' | 'guest'>('all');
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [conversationToArchive, setConversationToArchive] = useState<Conversation | null>(null);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [conversationInitialized, setConversationInitialized] = useState(false);
  const [calendarNote, setCalendarNote] = useState('');
  const [showMobileConversation, setShowMobileConversation] = useState(false); // For mobile view toggle
  const [showReservationInfo, setShowReservationInfo] = useState(false); // For mobile reservation sidebar

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const isInitializedRef = useRef(false);
  const selectedConversationRef = useRef<Conversation | null>(null);

  // Initialize socket connection once on mount
  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (isInitializedRef.current) {
      return;
    }

    // Get current user ID from token
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.id);
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }

    // Initialize socket only if not already connected
    if (!socketRef.current || !socketRef.current.connected) {
      initializeSocket();
      isInitializedRef.current = true;
    }

    // Cleanup only on true unmount (not on Strict Mode re-render)
    return () => {
      // In Strict Mode, this runs twice. We only want to cleanup on true unmount.
      // We can detect true unmount by checking if the component is really being removed
    };
  }, []); // Empty deps - run only on mount/unmount

  // Separate cleanup effect that runs on true unmount
  useEffect(() => {
    return () => {
      // This cleanup runs when the component is truly unmounting
      // Not during React Strict Mode's double-invocation
      const isUnmounting = !document.querySelector('[data-messages-page]');
      if (isUnmounting && socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, [])

  // Keep ref in sync with state so socket handlers always see latest value
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Fetch data when filter changes
  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  // Handle ?user= and ?listing= query parameters for creating/opening conversation
  useEffect(() => {
    const recipientId = searchParams?.get('user');
    const listingId = searchParams?.get('listing');

    if (recipientId && !conversationInitialized && currentUserId && conversations.length >= 0) {

      // Check if conversation already exists with this user (and optionally this listing)
      const existingConversation = conversations.find(conv => {
        const otherUser = conv.participants.find(
          p => p.user._id !== currentUserId
        );
        // If listingId provided, match both user and listing
        if (listingId) {
          return otherUser?.user._id === recipientId && conv.listing?._id === listingId;
        }
        return otherUser?.user._id === recipientId;
      });

      if (existingConversation) {
        fetchMessages(existingConversation._id);
        setConversationInitialized(true);
        router.replace(`/dashboard/messages?c=${existingConversation._id}`, { scroll: false });
      } else {
        createOrGetConversationWithUser(recipientId, listingId || undefined)
          .then((conv) => {
            setConversationInitialized(true);
            if (conv?._id) {
              router.replace(`/dashboard/messages?c=${conv._id}`, { scroll: false });
            }
          })
          .catch(err => {
            console.error('Failed to create conversation:', err);
          });
      }
    }
  }, [searchParams, conversations, currentUserId, conversationInitialized]);

  // Restore selected conversation from ?c= param on page load/refresh
  useEffect(() => {
    const conversationId = searchParams?.get('c');
    const recipientId = searchParams?.get('user');
    // ?user= takes priority over ?c=
    if (conversationId && !recipientId && !selectedConversation && !loading && conversations.length > 0) {
      const exists = conversations.find(conv => conv._id === conversationId);
      if (exists) {
        fetchMessages(conversationId);
        setShowMobileConversation(true);
      }
    }
  }, [searchParams, conversations, selectedConversation, loading]);

  // ✅ FIX BQ-35: Auto-scroll with delay to ensure DOM is updated
  useEffect(() => {
    // Use requestAnimationFrame to wait for DOM to update
    requestAnimationFrame(() => {
      setTimeout(scrollToBottom, 100);
    });
  }, [messages]);

  const initializeSocket = () => {
    // Prevent duplicate socket creation
    if (socketRef.current && socketRef.current.connected) {
      return;
    }

    // Disconnect existing socket if present but not connected
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('⚠️ No authentication token found, skipping Socket.IO connection');
      return;
    }

    // Use SOCKET_URL (without /api) for Socket.IO connection
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

    socketRef.current = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current.on('connect', () => {
    });

    socketRef.current.on('disconnect', () => {
    });

    socketRef.current.on('error', (error: any) => {
      console.error('Socket error:', error);
      toast.error(error.message || ((t as any)?.toast?.connectionError || 'Connection error'));
    });

    // ✅ FIX: Use ref to avoid stale closure - socket is bound once on mount
    // but selectedConversation changes over time
    socketRef.current.on('new_message', (data: { conversationId: string; message: Message }) => {
      const currentConv = selectedConversationRef.current;
      // Only add message if it's for the currently selected conversation
      if (currentConv && data.conversationId === currentConv._id) {
        setMessages(prev => {
          // Check if this is replacing a temporary message (match by sender, content may differ if masked)
          const senderId = typeof data.message.sender === 'object' ? data.message.sender._id : data.message.sender;
          const tempMsgIndex = prev.findIndex(m =>
            m._id.startsWith('temp-') &&
            (typeof m.sender === 'object' ? m.sender._id : m.sender) === senderId
          );
          if (tempMsgIndex !== -1 && data.message.type !== 'system') {
            // Replace temporary message with real one (may have masked content)
            const updated = [...prev];
            updated[tempMsgIndex] = data.message;
            return updated;
          }

          // Avoid duplicate messages
          const exists = prev.some(m => m._id === data.message._id);
          if (exists) return prev;
          return [...prev, data.message];
        });

        // Scroll to bottom when new message arrives
        setTimeout(scrollToBottom, 200);

        // Auto mark as read since user is viewing this conversation
        if (socketRef.current?.connected) {
          socketRef.current.emit('mark_as_read', data.conversationId);
        }
      }

      // Update conversation list
      fetchConversations();
    });

    // Message notification (for other conversations)
    socketRef.current.on('message_notification', (data: { conversationId: string; message: Message }) => {
      fetchConversations();

      const currentConv = selectedConversationRef.current;
      // Show notification if not viewing this conversation
      if (!currentConv || data.conversationId !== currentConv._id) {
        const name = `${data.message.sender.firstName} ${data.message.sender.lastName}`;
        const message = (t as any)?.toast?.newMessage ? (t as any).toast.newMessage.replace('{name}', name) : `New message from ${name}`;
        toast.success(message);
      }
    });

    // Message updated
    socketRef.current.on('message_updated', (data: { conversationId: string; message: Message }) => {
      const currentConv = selectedConversationRef.current;
      if (currentConv && data.conversationId === currentConv._id) {
        setMessages(prev =>
          prev.map(msg => (msg._id === data.message._id ? data.message : msg))
        );
      }
    });

    // Message deleted
    socketRef.current.on('message_deleted', (data: { conversationId: string; messageId: string }) => {
      const currentConv = selectedConversationRef.current;
      if (currentConv && data.conversationId === currentConv._id) {
        setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
      }
      fetchConversations();
    });

    // Typing indicators
    socketRef.current.on('user_typing', (data: { userId: string; userName: string; conversationId: string }) => {
    });

    socketRef.current.on('user_stop_typing', (data: { userId: string; conversationId: string }) => {
    });

    // Messages read notification - update read status like WhatsApp
    socketRef.current.on('messages_read', (data: { conversationId: string; userId: string; readAt: string }) => {
      const currentConv = selectedConversationRef.current;
      // Update messages to mark them as read by this user
      if (currentConv && data.conversationId === currentConv._id) {
        setMessages(prev =>
          prev.map(msg => {
            // If message is not yet read by this user, add them to readBy array
            if (!hasUserReadMessage(msg, data.userId)) {
              return {
                ...msg,
                readBy: [...msg.readBy, { user: data.userId, readAt: data.readAt }]
              };
            }
            return msg;
          })
        );
      }
    });

    // Conversation joined confirmation
    socketRef.current.on('conversation_joined', (data: { conversationId: string }) => {
    });
  };

  // ✅ FIX: Helper function to check if a user has read a message
  // Handles both formats: string[] or object[] with user field
  const hasUserReadMessage = (message: Message, userId: string): boolean => {
    return message.readBy.some(item => {
      if (typeof item === 'string') {
        return item === userId;
      } else if (typeof item === 'object' && item.user) {
        if (typeof item.user === 'string') {
          return item.user === userId;
        } else if (typeof item.user === 'object') {
          return item.user._id === userId;
        }
      }
      return false;
    });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchConversations(), fetchStats()]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create or get conversation with a specific user (optionally about a listing)
  const createOrGetConversationWithUser = async (recipientId: string, listingId?: string) => {
    try {
      const token = localStorage.getItem('token');
      const payload: { recipientId: string; listingId?: string; type?: string } = { recipientId };

      // If listingId provided, include it and set type to 'inquiry'
      if (listingId) {
        payload.listingId = listingId;
        payload.type = 'inquiry';
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/messages/conversations`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const conversation = response.data.data.conversation;

      // Refresh conversations list
      await fetchConversations();

      // Select and load the conversation
      await fetchMessages(conversation._id);

      return conversation;
    } catch (error: any) {
      console.error('Error creating/getting conversation:', error);
      toast.error(error.response?.data?.message || ((t as any)?.toast?.sendFailed || 'Failed to start conversation'));
      throw error;
    }
  };

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/messages/conversations`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { status: filterStatus }
        }
      );
      setConversations(response.data.data.conversations);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      if (error.response?.status === 401) {
        toast.error((t as any)?.toast?.loginRequired || 'Please login to view messages');
        router.push('/login');
      }
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/messages/stats`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setStats(response.data.data);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      setMessagesLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/messages/conversations/${conversationId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setMessages(response.data.data.messages);
      setSelectedConversation(response.data.data.conversation);

      // Join conversation room via Socket.IO
      if (socketRef.current?.connected) {
        socketRef.current.emit('join_conversation', conversationId);
      }

      // Mark conversation as read
      await markConversationAsRead(conversationId);

      // Also emit socket event for real-time read status
      if (socketRef.current?.connected) {
        socketRef.current.emit('mark_as_read', conversationId);
      }

      fetchConversations(); // Update conversation list with unread counts
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error((t as any)?.toast?.loadFailed || 'Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  };

  const markConversationAsRead = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/messages/conversations/${conversationId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
    } catch (error: any) {
      console.error('Error marking conversation as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    // ✅ FIX: Optimistic update - add message immediately to UI
    const tempMessage: Message = {
      _id: `temp-${Date.now()}`,
      sender: {
        _id: currentUserId,
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        avatar: user?.avatar || ''
      },
      content: messageContent,
      type: 'text',
      readBy: [currentUserId], // Only sender has read it initially
      isEdited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add message to UI immediately
    setMessages(prev => [...prev, tempMessage]);
    setTimeout(scrollToBottom, 100);

    try {
      // Use Socket.IO for real-time messaging if connected
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', {
          conversationId: selectedConversation._id,
          content: messageContent,
          type: 'text'
        });
      } else {
        // Fallback to REST API if socket is not connected
        const token = localStorage.getItem('token');
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/messages`,
          {
            conversationId: selectedConversation._id,
            content: messageContent
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        // Replace temp message with real message from server (may have masked content)
        setMessages(prev => {
          const updated = prev.map(msg =>
            msg._id === tempMessage._id ? response.data.data.message : msg
          );
          // Add system warning message if present
          if (response.data.data.systemMessage) {
            updated.push(response.data.data.systemMessage);
          }
          return updated;
        });
        fetchConversations();
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.response?.data?.message || ((t as any)?.toast?.sendFailed || 'Failed to send message'));
      setNewMessage(messageContent); // Restore message on error
    }
  };


  const handleArchiveConversation = async () => {
    if (!conversationToArchive) return;

    try {
      const token = localStorage.getItem('token');
      const endpoint =
        conversationToArchive.status === 'active'
          ? `/messages/conversations/${conversationToArchive._id}/archive`
          : `/messages/conversations/${conversationToArchive._id}/unarchive`;

      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success(
        conversationToArchive.status === 'active'
          ? ((t as any)?.toast?.archiveSuccess || 'Conversation archived')
          : ((t as any)?.toast?.unarchiveSuccess || 'Conversation unarchived')
      );
      setShowArchiveModal(false);
      setConversationToArchive(null);
      setSelectedConversation(null);
      setMessages([]);
      fetchData();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          (conversationToArchive.status === 'active'
            ? ((t as any)?.toast?.archiveFailed || 'Failed to archive conversation')
            : ((t as any)?.toast?.unarchiveFailed || 'Failed to unarchive conversation'))
      );
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedConversation) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/messages/conversations/${selectedConversation._id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success((t as any)?.toast?.conversationDeleteSuccess || 'Conversation deleted successfully');
      setSelectedConversation(null);
      setMessages([]);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || ((t as any)?.toast?.conversationDeleteFailed || 'Failed to delete conversation'));
    }
  };

  // ✅ FIX: Scroll to bottom like Airbnb - only scroll the messages container, not the whole page
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const formatMessageTime = (date: string) => {
    const messageDate = moment(date);
    const now = moment();

    if (messageDate.isSame(now, 'day')) {
      return messageDate.format('HH:mm');
    } else if (messageDate.isSame(now.clone().subtract(1, 'day'), 'day')) {
      return (t as any)?.time?.yesterday || 'Yesterday';
    } else if (messageDate.isAfter(now.clone().subtract(7, 'days'))) {
      return messageDate.format('ddd');
    } else {
      return messageDate.format('MMM DD');
    }
  };

  const formatFullTime = (date: string) => {
    return moment(date).format('MMM DD, YYYY [at] HH:mm');
  };

  const getImageUrl = (url: string) => {
    if (!url) return '/uploads/users/default-avatar.png';
    if (url.startsWith('http')) return url;

    // Remove /api prefix if present
    const cleanPath = url.startsWith('/api') ? url.substring(4) : url;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${cleanPath}`;
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(
      p => p.user._id !== currentUserId
    )?.user;
  };

  // Determine if current user is host or guest in a conversation
  const getUserRole = (conv: Conversation): 'host' | 'guest' | null => {
    // 1. Check via listing owner
    if (conv.listing?.host) {
      return String(conv.listing.host) === String(currentUserId) ? 'host' : 'guest';
    }
    // 2. Fallback: check via booking host/guest
    if (conv.booking?.host) {
      return String(conv.booking.host) === String(currentUserId) ? 'host' : 'guest';
    }
    if (conv.booking?.guest) {
      return String(conv.booking.guest) === String(currentUserId) ? 'guest' : 'host';
    }
    return null;
  };

  // ✅ FIX BQ-33: Search by full name and partial name + role filter
  const filteredConversations = conversations.filter(conv => {
    // Role filter
    if (filterRole !== 'all') {
      const role = getUserRole(conv);
      if (role !== filterRole) return false;
    }

    if (!searchQuery) return true;
    const otherUser = getOtherParticipant(conv);
    if (!otherUser) return false;

    const searchLower = searchQuery.toLowerCase();
    const fullName = `${otherUser.firstName} ${otherUser.lastName}`.toLowerCase();

    return (
      fullName.includes(searchLower) || // Full name search (e.g., "Karim Benali")
      otherUser.firstName.toLowerCase().includes(searchLower) ||
      otherUser.lastName.toLowerCase().includes(searchLower) ||
      conv.lastMessage?.content?.toLowerCase().includes(searchLower) ||
      conv.listing?.title?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35] mx-auto"></div>
          <p className="mt-4 text-gray-600">{(t as any)?.messagesArea?.loading || 'Loading messages...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white flex flex-col overflow-hidden" data-messages-page style={{ height: 'calc(100vh - 96px)' }}>
      {/* Top Bar with Back Button - Airbnb Style */}
      <div className="flex-none border-b border-gray-200 bg-white z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Dashboard</span>
          </button>

          <div className="flex items-center gap-6">
            {stats && (
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{stats.summary.totalConversations}</span>
                  <span>conversations</span>
                </div>
                {stats.summary.totalUnread > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full">
                      {stats.summary.totalUnread}
                    </span>
                    <span>non lus</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Layout - Full Height */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 flex">
            {/* Conversations List */}
            <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col ${showMobileConversation ? 'hidden md:flex' : 'flex'}`}>
              {/* Conversations Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">{(t as any)?.conversations?.title || 'Conversations'}</h2>
                  <button
                    onClick={() => setShowNewConversationModal(true)}
                    className="p-2 text-[#FF6B35] hover:bg-orange-50 rounded-lg transition-colors"
                    title={(t as any)?.conversations?.newConversation || 'New conversation'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder={(t as any)?.conversations?.searchPlaceholder || 'Search conversations...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  />
                  <svg
                    className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setFilterStatus('active')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                      filterStatus === 'active'
                        ? 'bg-[#FF6B35] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {(t as any)?.conversations?.filters?.active || 'Active'}
                  </button>
                  <button
                    onClick={() => setFilterStatus('archived')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                      filterStatus === 'archived'
                        ? 'bg-[#FF6B35] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {(t as any)?.conversations?.filters?.archived || 'Archived'}
                  </button>
                </div>

                {/* Role Filter Tabs */}
                <div className="flex gap-1.5 mt-2">
                  <button
                    onClick={() => setFilterRole('all')}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-medium text-xs transition-colors ${
                      filterRole === 'all'
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    Toutes
                  </button>
                  <button
                    onClick={() => setFilterRole('host')}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-medium text-xs transition-colors ${
                      filterRole === 'host'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-50 text-gray-500 hover:bg-emerald-50'
                    }`}
                  >
                    En tant qu'hôte
                  </button>
                  <button
                    onClick={() => setFilterRole('guest')}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-medium text-xs transition-colors ${
                      filterRole === 'guest'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-50 text-gray-500 hover:bg-blue-50'
                    }`}
                  >
                    En tant que voyageur
                  </button>
                </div>
              </div>

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                    <h3 className="mt-4 text-sm font-medium text-gray-900">{(t as any)?.conversations?.empty?.noConversations || 'No conversations'}</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {searchQuery
                        ? ((t as any)?.conversations?.empty?.noMatches || 'No conversations match your search')
                        : ((t as any)?.conversations?.empty?.startConversation || 'Start a conversation with a host')}
                    </p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => {
                    const otherUser = getOtherParticipant(conversation);
                    if (!otherUser) return null;

                    return (
                      <div
                        key={conversation._id}
                        onClick={() => {
                          fetchMessages(conversation._id);
                          setShowMobileConversation(true);
                          router.replace(`/dashboard/messages?c=${conversation._id}`, { scroll: false });
                        }}
                        className={`p-4 border-b border-gray-200 cursor-pointer transition-colors ${
                          selectedConversation?._id === conversation._id
                            ? 'bg-orange-50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {/* Avatar */}
                          <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                            <img
                              src={getImageUrl(otherUser.avatar)}
                              alt={`${otherUser.firstName} ${otherUser.lastName}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/uploads/users/default-avatar.png';
                              }}
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <h3 className="text-sm font-semibold text-gray-900 truncate">
                                  {otherUser.firstName} {otherUser.lastName}
                                </h3>
                                {getUserRole(conversation) === 'host' && (
                                  <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded">
                                    Hôte
                                  </span>
                                )}
                                {getUserRole(conversation) === 'guest' && (
                                  <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded">
                                    Voyageur
                                  </span>
                                )}
                              </div>
                              {conversation.lastMessage && (
                                <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                                  {formatMessageTime(conversation.lastMessage.sentAt || conversation.lastMessage.createdAt || conversation.updatedAt)}
                                </span>
                              )}
                            </div>

                            {conversation.listing && (
                              <p className="text-xs text-gray-500 truncate mb-1">
                                {conversation.listing.title}
                              </p>
                            )}

                            {conversation.lastMessage && (
                              <p className="text-sm text-gray-600 truncate">
                                {conversation.lastMessage.sender && typeof conversation.lastMessage.sender === 'object' && conversation.lastMessage.sender._id === currentUserId ? ((t as any)?.conversations?.youPrefix || 'You: ') : ''}
                                {conversation.lastMessage.content}
                              </p>
                            )}

                            {conversation.unreadCount > 0 && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-[#FF6B35] text-white text-xs font-medium rounded-full">
                                {conversation.unreadCount} {(t as any)?.conversations?.unreadBadge || 'new'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className={`flex-1 flex flex-col ${!showMobileConversation ? 'hidden md:flex' : 'flex'}`}>
              {selectedConversation && !messagesLoading ? (
                <>
                  {/* Messages Header */}
                  <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {/* Back button for mobile */}
                        <button
                          onClick={() => setShowMobileConversation(false)}
                          className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <div className="relative w-10 h-10 rounded-full overflow-hidden">
                          <img
                            src={getImageUrl(
                              getOtherParticipant(selectedConversation)?.avatar || ''
                            )}
                            alt="User avatar"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/uploads/users/default-avatar.png';
                            }}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {getOtherParticipant(selectedConversation)?.firstName}{' '}
                              {getOtherParticipant(selectedConversation)?.lastName}
                            </h3>
                            {getUserRole(selectedConversation) === 'host' && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded">
                                Hôte
                              </span>
                            )}
                            {getUserRole(selectedConversation) === 'guest' && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded">
                                Voyageur
                              </span>
                            )}
                          </div>
                          {selectedConversation.listing && (
                            <p className="text-xs text-gray-500">
                              {selectedConversation.listing.title}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {/* Reservation Info Toggle (Mobile) */}
                        {selectedConversation.booking && (
                          <button
                            onClick={() => setShowReservationInfo(true)}
                            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Voir les détails de la réservation"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setConversationToArchive(selectedConversation);
                            setShowArchiveModal(true);
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title={
                            selectedConversation.status === 'active'
                              ? ((t as any)?.messagesArea?.tooltips?.archive || 'Archive conversation')
                              : ((t as any)?.messagesArea?.tooltips?.unarchive || 'Unarchive conversation')
                          }
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                        </button>
                        <button
                          onClick={handleDeleteConversation}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={(t as any)?.messagesArea?.tooltips?.delete || 'Delete conversation'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Messages List */}
                  <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 bg-gray-50">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">{(t as any)?.messagesArea?.empty || 'No messages yet. Start the conversation!'}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message, index) => {
                          const isOwnMessage = message.sender._id === currentUserId;
                          const showAvatar =
                            index === 0 ||
                            messages[index - 1].sender._id !== message.sender._id;

                          // System messages (moderation warnings, etc.)
                          if (message.type === 'system') {
                            return (
                              <div key={message._id} className="flex justify-center my-2">
                                <div className="max-w-[85%] px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                                  <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <p className="text-xs text-amber-800 leading-relaxed">{message.content}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={message._id}
                              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`flex items-end space-x-2 max-w-[70%] ${
                                  isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''
                                }`}
                              >
                                {/* Avatar */}
                                {showAvatar ? (
                                  <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                    <img
                                      src={getImageUrl(message.sender.avatar)}
                                      alt={message.sender.firstName}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = '/uploads/users/default-avatar.png';
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 flex-shrink-0" />
                                )}

                                {/* Message Bubble */}
                                <div>
                                  <div
                                    className={`px-4 py-2 rounded-2xl ${
                                      isOwnMessage
                                        ? 'bg-[#FF6B35] text-white'
                                        : 'bg-white text-gray-900 border border-gray-200'
                                    }`}
                                  >
                                    <p className="text-sm break-words">{message.content}</p>
                                    {message.isEdited && (
                                      <span className="text-xs opacity-70 mt-1 block">
                                        {(t as any)?.messagesArea?.edited || '(edited)'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Message Info */}
                                  <div
                                    className={`flex items-center gap-2 mt-1 ${
                                      isOwnMessage ? 'justify-end' : ''
                                    }`}
                                  >
                                    <span className="text-xs text-gray-500">
                                      {formatFullTime(message.createdAt)}
                                    </span>

                                    {/* WhatsApp-style read indicators (checkmarks) */}
                                    {isOwnMessage && (
                                      <div className="flex items-center">
                                        {(() => {
                                          // Check if other participants have read the message
                                          const otherParticipants = selectedConversation?.participants.filter(
                                            p => p.user._id !== currentUserId
                                          ) || [];
                                          const isRead = otherParticipants.some(p =>
                                            hasUserReadMessage(message, p.user._id)
                                          );

                                          return (
                                            <div className="flex items-center">
                                              {/* Double checkmark icon */}
                                              <svg
                                                className={`w-4 h-4 ${isRead ? 'text-blue-500' : 'text-gray-400'}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                {/* First checkmark */}
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                {/* Second checkmark (offset) */}
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13l4 4L23 7" />
                                              </svg>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Message Input - Airbnb Style (compact) */}
                  <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-white">
                    <div className="flex items-center gap-3">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder={(t as any)?.messagesArea?.input?.placeholder || 'Type your message...'}
                        rows={1}
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent resize-none text-sm"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="p-2.5 bg-[#FF6B35] text-white rounded-full hover:bg-[#ff5722] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              ) : messagesLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35] mx-auto"></div>
                    <p className="mt-4 text-gray-600">{(t as any)?.messagesArea?.loading || 'Loading messages...'}</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <svg
                      className="mx-auto h-16 w-16 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      {(t as any)?.messagesArea?.emptyState?.title || 'Select a conversation'}
                    </h3>
                    <p className="mt-2 text-gray-500">
                      {(t as any)?.messagesArea?.emptyState?.subtitle || 'Choose a conversation from the list to start messaging'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Reservation Info Panel - Airbnb Style (Desktop) */}
            {selectedConversation && (
              <div className="hidden lg:block w-80 border-l border-gray-200 bg-white overflow-y-auto">
                <div className="p-6">
                  {/* Reservation Header */}
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Réservation
                  </h2>

                  {/* Traveler Info */}
                  <div className="mb-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden">
                        <img
                          src={getImageUrl(getOtherParticipant(selectedConversation)?.avatar || '')}
                          alt="Traveler"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/uploads/users/default-avatar.png';
                          }}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {getOtherParticipant(selectedConversation)?.firstName}{' '}
                          {getOtherParticipant(selectedConversation)?.lastName}
                        </h3>
                        {selectedConversation.listing && (
                          <p className="text-sm text-gray-500">
                            {selectedConversation.listing.title}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Booking Dates */}
                    {selectedConversation.booking && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <div className="text-sm">
                          <p className="text-gray-600 mb-1">
                            {new Date(selectedConversation.booking.startDate).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                            {' → '}
                            {new Date(selectedConversation.booking.endDate).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {Math.ceil((new Date(selectedConversation.booking.endDate).getTime() - new Date(selectedConversation.booking.startDate).getTime()) / (1000 * 60 * 60 * 24))} nuits
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Comment Button - Only show if booking is completed (end date has passed) */}
                    {selectedConversation.booking &&
                     new Date(selectedConversation.booking.endDate) < new Date() &&
                     selectedConversation.booking.status === 'confirmed' && (
                      <button
                        onClick={() => {
                          if (selectedConversation.booking) {
                            router.push(`/dashboard/bookings/${selectedConversation.booking._id}/review`);
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-4"
                      >
                        Laisser un commentaire
                      </button>
                    )}
                  </div>

                  {/* About Section */}
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Tout sur {getOtherParticipant(selectedConversation)?.firstName}
                    </h3>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-700">
                        <svg className="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Identité vérifiée</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-700">
                        <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>1 voyage</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-700">
                        <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Membre depuis 2025</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const otherUser = getOtherParticipant(selectedConversation);
                        if (otherUser) {
                          router.push(`/profile/${otherUser._id}`);
                        }
                      }}
                      className="w-full px-4 py-2 text-sm font-medium text-gray-700 underline hover:text-gray-900 transition-colors"
                    >
                      Afficher le profil
                    </button>
                  </div>

                  {/* Reservation Details */}
                  {selectedConversation.booking && (
                    <>
                      {/* Travelers & Code */}
                      <div className="mb-6 pb-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                          Détails de la réservation
                        </h3>

                        <div className="space-y-3">
                          {/* Voyageurs */}
                          {selectedConversation.booking.guests && (
                            <div className="flex justify-between text-sm items-center">
                              <span className="text-gray-600">Voyageurs</span>
                              <button className="text-gray-900 font-medium hover:underline">
                                {selectedConversation.booking.guests.adults} adulte{selectedConversation.booking.guests.adults > 1 ? 's' : ''}
                              </button>
                            </div>
                          )}

                          {/* Code d'accès */}
                          {selectedConversation.booking.accessCode && (
                            <div className="flex justify-between text-sm items-center">
                              <span className="text-gray-600">Code d'accès suggéré</span>
                              <span className="font-medium text-gray-900">{selectedConversation.booking.accessCode}</span>
                            </div>
                          )}

                          {/* Arrivée */}
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Arrivée</span>
                            <span className="font-medium text-gray-900">
                              {new Date(selectedConversation.booking.startDate).toLocaleDateString('fr-FR', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>

                          {/* Départ */}
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Départ</span>
                            <span className="font-medium text-gray-900">
                              {new Date(selectedConversation.booking.endDate).toLocaleDateString('fr-FR', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>

                          {/* Date de réservation */}
                          {selectedConversation.booking.createdAt && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Date de réservation</span>
                              <span className="font-medium text-gray-900">
                                {new Date(selectedConversation.booking.createdAt).toLocaleDateString('fr-FR', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          )}

                          {/* Code de confirmation */}
                          {selectedConversation.booking.confirmationCode && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Code de confirmation</span>
                              <span className="font-medium text-gray-900 font-mono">
                                {selectedConversation.booking.confirmationCode}
                              </span>
                            </div>
                          )}

                          {/* Conditions d'annulation */}
                          {selectedConversation.booking.cancellationPolicy && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Conditions d'annulation</span>
                              <span className="font-medium text-gray-900 capitalize">
                                {selectedConversation.booking.cancellationPolicy}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Payment Details */}
                      {selectedConversation.booking.pricing && (
                        <div className="mb-6 pb-6 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            Détails du paiement du voyageur
                          </h3>

                          <div className="space-y-2 text-sm">
                            {selectedConversation.booking.pricing.basePrice && selectedConversation.booking.pricing.nights && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">
                                  {selectedConversation.booking.pricing.basePrice.toFixed(2)} {selectedConversation.booking.pricing.currency || 'EUR'} x {selectedConversation.booking.pricing.nights} nuits
                                </span>
                                <span className="text-gray-900">
                                  {(selectedConversation.booking.pricing.basePrice * selectedConversation.booking.pricing.nights).toFixed(2)} {selectedConversation.booking.pricing.currency || 'EUR'}
                                </span>
                              </div>
                            )}

                            {selectedConversation.booking.pricing.serviceFee !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Frais de service voyageur</span>
                                <span className="text-gray-900">
                                  {selectedConversation.booking.pricing.serviceFee.toFixed(2)} {selectedConversation.booking.pricing.currency || 'EUR'}
                                </span>
                              </div>
                            )}

                            {selectedConversation.booking.pricing.totalPrice !== undefined && (
                              <div className="flex justify-between pt-2 border-t font-semibold">
                                <span className="text-gray-900">Total ({selectedConversation.booking.pricing.currency || 'EUR'})</span>
                                <span className="text-gray-900">
                                  {selectedConversation.booking.pricing.totalPrice.toFixed(2)} {selectedConversation.booking.pricing.currency || 'EUR'}
                                </span>
                              </div>
                            )}
                          </div>

                          {(selectedConversation.booking.pricing.hostPayout !== undefined || selectedConversation.booking.pricing.hostServiceFee !== undefined) && (
                            <div className="mt-4 pt-4 border-t">
                              <h4 className="font-semibold text-gray-900 mb-2">Versement de l'hôte</h4>
                              <div className="space-y-2 text-sm">
                                {selectedConversation.booking.pricing.basePrice && selectedConversation.booking.pricing.nights && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Frais de chambre pour {selectedConversation.booking.pricing.nights} nuits</span>
                                    <span className="text-gray-900">
                                      {(selectedConversation.booking.pricing.basePrice * selectedConversation.booking.pricing.nights).toFixed(2)} {selectedConversation.booking.pricing.currency || 'EUR'}
                                    </span>
                                  </div>
                                )}

                                {selectedConversation.booking.pricing.hostServiceFee !== undefined && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Frais de service hôte (3.0% + TVA)</span>
                                    <span className="text-gray-900">
                                      -{selectedConversation.booking.pricing.hostServiceFee.toFixed(2)} {selectedConversation.booking.pricing.currency || 'EUR'}
                                    </span>
                                  </div>
                                )}

                                {selectedConversation.booking.pricing.hostPayout !== undefined && (
                                  <div className="flex justify-between pt-2 border-t font-semibold">
                                    <span className="text-gray-900">Total ({selectedConversation.booking.pricing.currency || 'EUR'})</span>
                                    <span className="text-gray-900">
                                      {selectedConversation.booking.pricing.hostPayout.toFixed(2)} {selectedConversation.booking.pricing.currency || 'EUR'}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <button className="w-full mt-3 text-sm text-gray-700 underline hover:text-gray-900">
                                Historique des transactions
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Calendar Note */}
                      <div className="mb-6 pb-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                          Note calendrier
                        </h3>
                        <p className="text-xs text-gray-500 mb-2">
                          Ajoutez un rappel privé pour ces dates, qui ne sera visible que pour vous
                        </p>
                        <textarea
                          value={calendarNote}
                          onChange={(e) => setCalendarNote(e.target.value)}
                          placeholder="Écrivez un message"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent resize-none"
                          rows={3}
                        />
                        <button
                          onClick={() => {
                            // Save calendar note
                            toast.success('Note enregistrée');
                          }}
                          className="mt-2 px-4 py-2 text-sm font-medium text-white bg-[#FF6B35] rounded-lg hover:bg-[#ff5722] transition-colors"
                        >
                          Enregistrer
                        </button>
                      </div>

                      {/* Assistance */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                          Assistance
                        </h3>
                        <div className="space-y-2">
                          <button
                            onClick={() => {
                              router.push(`/help/report-traveler/${getOtherParticipant(selectedConversation)?._id}`);
                            }}
                            className="w-full text-left text-sm text-gray-700 hover:underline"
                          >
                            Signaler ce voyageur
                          </button>
                          <button
                            onClick={() => {
                              router.push('/help');
                            }}
                            className="w-full text-left text-sm text-gray-700 hover:underline"
                          >
                            Consulter le Centre d'aide
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Mobile Reservation Info Modal */}
      {showReservationInfo && selectedConversation && (
        <div className="lg:hidden fixed inset-0 bg-white z-50 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <button
              onClick={() => setShowReservationInfo(false)}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              Détails de la réservation
            </h2>
            <div className="w-9"></div>
          </div>

          {/* Content - Same as desktop sidebar */}
          <div className="p-6">
            {/* Reservation Header */}
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Réservation
            </h2>

            {/* Traveler Info */}
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden">
                  <img
                    src={getImageUrl(getOtherParticipant(selectedConversation)?.avatar || '')}
                    alt="Traveler"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/uploads/users/default-avatar.png';
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {getOtherParticipant(selectedConversation)?.firstName}{' '}
                    {getOtherParticipant(selectedConversation)?.lastName}
                  </h3>
                  {selectedConversation.listing && (
                    <p className="text-sm text-gray-500">
                      {selectedConversation.listing.title}
                    </p>
                  )}
                </div>
              </div>

              {/* Booking Dates */}
              {selectedConversation.booking && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="text-sm">
                    <p className="text-gray-600 mb-1">
                      {new Date(selectedConversation.booking.startDate).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                      {' → '}
                      {new Date(selectedConversation.booking.endDate).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {Math.ceil((new Date(selectedConversation.booking.endDate).getTime() - new Date(selectedConversation.booking.startDate).getTime()) / (1000 * 60 * 60 * 24))} nuits
                    </p>
                  </div>
                </div>
              )}

              {/* Comment Button - Only show if booking is completed */}
              {selectedConversation.booking &&
               new Date(selectedConversation.booking.endDate) < new Date() &&
               selectedConversation.booking.status === 'confirmed' && (
                <button
                  onClick={() => {
                    if (selectedConversation.booking) {
                      router.push(`/dashboard/bookings/${selectedConversation.booking._id}/review`);
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-4"
                >
                  Laisser un commentaire
                </button>
              )}
            </div>

            {/* About Section */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Tout sur {getOtherParticipant(selectedConversation)?.firstName}
              </h3>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-700">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Identité vérifiée</span>
                </div>

                <div className="flex items-center text-sm text-gray-700">
                  <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>1 voyage</span>
                </div>

                <div className="flex items-center text-sm text-gray-700">
                  <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Membre depuis 2025</span>
                </div>
              </div>

              <button
                onClick={() => {
                  const otherUser = getOtherParticipant(selectedConversation);
                  if (otherUser) {
                    router.push(`/profile/${otherUser._id}`);
                  }
                }}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 underline hover:text-gray-900 transition-colors"
              >
                Afficher le profil
              </button>
            </div>

            {/* Reservation Details */}
            {selectedConversation.booking && (
              <>
                {/* Travelers & Code */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Détails de la réservation
                  </h3>

                  <div className="space-y-3">
                    {/* Voyageurs */}
                    {selectedConversation.booking.guests && (
                      <div className="flex justify-between text-sm items-center">
                        <span className="text-gray-600">Voyageurs</span>
                        <button className="text-gray-900 font-medium hover:underline">
                          {selectedConversation.booking.guests.adults} adulte{selectedConversation.booking.guests.adults > 1 ? 's' : ''}
                        </button>
                      </div>
                    )}

                    {/* Code d'accès */}
                    {selectedConversation.booking.accessCode && (
                      <div className="flex justify-between text-sm items-center">
                        <span className="text-gray-600">Code d'accès suggéré</span>
                        <span className="font-medium text-gray-900">{selectedConversation.booking.accessCode}</span>
                      </div>
                    )}

                    {/* Arrivée */}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Arrivée</span>
                      <span className="font-medium text-gray-900">
                        {new Date(selectedConversation.booking.startDate).toLocaleDateString('fr-FR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* Départ */}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Départ</span>
                      <span className="font-medium text-gray-900">
                        {new Date(selectedConversation.booking.endDate).toLocaleDateString('fr-FR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* Date de réservation */}
                    {selectedConversation.booking.createdAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Date de réservation</span>
                        <span className="font-medium text-gray-900">
                          {new Date(selectedConversation.booking.createdAt).toLocaleDateString('fr-FR', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    )}

                    {/* Code de confirmation */}
                    {selectedConversation.booking.confirmationCode && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Code de confirmation</span>
                        <span className="font-medium text-gray-900 font-mono">
                          {selectedConversation.booking.confirmationCode}
                        </span>
                      </div>
                    )}

                    {/* Conditions d'annulation */}
                    {selectedConversation.booking.cancellationPolicy && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Conditions d'annulation</span>
                        <span className="font-medium text-gray-900 capitalize">
                          {selectedConversation.booking.cancellationPolicy}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Details */}
                {selectedConversation.booking.pricing && (
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Détails du paiement du voyageur
                    </h3>

                    <div className="space-y-2 text-sm">
                      {selectedConversation.booking.pricing.basePrice && selectedConversation.booking.pricing.nights && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {selectedConversation.booking.pricing.basePrice.toFixed(2)} {selectedConversation.booking.pricing.currency || 'EUR'} x {selectedConversation.booking.pricing.nights} nuits
                          </span>
                          <span className="text-gray-900">
                            {(selectedConversation.booking.pricing.basePrice * selectedConversation.booking.pricing.nights).toFixed(2)} {selectedConversation.booking.pricing.currency || 'EUR'}
                          </span>
                        </div>
                      )}

                      {selectedConversation.booking.pricing.serviceFee !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Frais de service voyageur</span>
                          <span className="text-gray-900">
                            {selectedConversation.booking.pricing.serviceFee.toFixed(2)} {selectedConversation.booking.pricing.currency || 'EUR'}
                          </span>
                        </div>
                      )}

                      {selectedConversation.booking.pricing.totalPrice !== undefined && (
                        <div className="flex justify-between pt-2 border-t font-semibold">
                          <span className="text-gray-900">Total ({selectedConversation.booking.pricing.currency || 'EUR'})</span>
                          <span className="text-gray-900">
                            {selectedConversation.booking.pricing.totalPrice.toFixed(2)} {selectedConversation.booking.pricing.currency || 'EUR'}
                          </span>
                        </div>
                      )}
                    </div>

                    {(selectedConversation.booking.pricing.hostPayout !== undefined || selectedConversation.booking.pricing.hostServiceFee !== undefined) && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-semibold text-gray-900 mb-2">Versement de l'hôte</h4>
                        <div className="space-y-2 text-sm">
                          {selectedConversation.booking.pricing.basePrice && selectedConversation.booking.pricing.nights && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Frais de chambre pour {selectedConversation.booking.pricing.nights} nuits</span>
                              <span className="text-gray-900">
                                {(selectedConversation.booking.pricing.basePrice * selectedConversation.booking.pricing.nights).toFixed(2)} {selectedConversation.booking.pricing.currency || 'EUR'}
                              </span>
                            </div>
                          )}

                          {selectedConversation.booking.pricing.hostServiceFee !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Frais de service hôte (3.0% + TVA)</span>
                              <span className="text-gray-900">
                                -{selectedConversation.booking.pricing.hostServiceFee.toFixed(2)} {selectedConversation.booking.pricing.currency || 'EUR'}
                              </span>
                            </div>
                          )}

                          {selectedConversation.booking.pricing.hostPayout !== undefined && (
                            <div className="flex justify-between pt-2 border-t font-semibold">
                              <span className="text-gray-900">Total ({selectedConversation.booking.pricing.currency || 'EUR'})</span>
                              <span className="text-gray-900">
                                {selectedConversation.booking.pricing.hostPayout.toFixed(2)} {selectedConversation.booking.pricing.currency || 'EUR'}
                              </span>
                            </div>
                          )}
                        </div>

                        <button className="w-full mt-3 text-sm text-gray-700 underline hover:text-gray-900">
                          Historique des transactions
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Calendar Note */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Note calendrier
                  </h3>
                  <p className="text-xs text-gray-500 mb-2">
                    Ajoutez un rappel privé pour ces dates, qui ne sera visible que pour vous
                  </p>
                  <textarea
                    value={calendarNote}
                    onChange={(e) => setCalendarNote(e.target.value)}
                    placeholder="Écrivez un message"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent resize-none"
                    rows={3}
                  />
                  <button
                    onClick={() => {
                      toast.success('Note enregistrée');
                      setShowReservationInfo(false);
                    }}
                    className="mt-2 px-4 py-2 text-sm font-medium text-white bg-[#FF6B35] rounded-lg hover:bg-[#ff5722] transition-colors"
                  >
                    Enregistrer
                  </button>
                </div>

                {/* Assistance */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Assistance
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        router.push(`/help/report-traveler/${getOtherParticipant(selectedConversation)?._id}`);
                      }}
                      className="w-full text-left text-sm text-gray-700 hover:underline"
                    >
                      Signaler ce voyageur
                    </button>
                    <button
                      onClick={() => {
                        router.push('/help');
                      }}
                      className="w-full text-left text-sm text-gray-700 hover:underline"
                    >
                      Consulter le Centre d'aide
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Archive/Unarchive Conversation Modal */}
      {showArchiveModal && conversationToArchive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div
                className={`flex items-center justify-center w-12 h-12 mx-auto rounded-full ${
                  conversationToArchive.status === 'active'
                    ? 'bg-purple-100'
                    : 'bg-green-100'
                }`}
              >
                <svg
                  className={`w-6 h-6 ${
                    conversationToArchive.status === 'active'
                      ? 'text-purple-600'
                      : 'text-green-600'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 text-center">
                {conversationToArchive.status === 'active'
                  ? ((t as any)?.archiveModal?.archiveTitle || 'Archive Conversation')
                  : ((t as any)?.archiveModal?.unarchiveTitle || 'Unarchive Conversation')}
              </h3>
              <p className="mt-2 text-sm text-gray-500 text-center">
                {conversationToArchive.status === 'active'
                  ? ((t as any)?.archiveModal?.archiveMessage || 'This conversation will be moved to archived. You can restore it later.')
                  : ((t as any)?.archiveModal?.unarchiveMessage || 'This conversation will be moved back to active conversations.')}
              </p>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-4 rounded-b-xl">
              <button
                onClick={() => {
                  setShowArchiveModal(false);
                  setConversationToArchive(null);
                }}
                className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                {(t as any)?.archiveModal?.cancel || 'Cancel'}
              </button>
              <button
                onClick={handleArchiveConversation}
                className={`px-6 py-3 text-white rounded-lg font-medium transition-colors ${
                  conversationToArchive.status === 'active'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {conversationToArchive.status === 'active' ? ((t as any)?.archiveModal?.confirmArchive || 'Archive') : ((t as any)?.archiveModal?.confirmUnarchive || 'Unarchive')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Conversation Modal */}
      {showNewConversationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 text-center">
                {(t as any)?.newConversationModal?.title || 'Start New Conversation'}
              </h3>
              <p className="mt-2 text-sm text-gray-500 text-center">
                {(t as any)?.newConversationModal?.message || 'To start a new conversation, please browse listings and contact the host from the listing page.'}
              </p>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-4 rounded-b-xl">
              <button
                onClick={() => setShowNewConversationModal(false)}
                className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                {(t as any)?.newConversationModal?.close || 'Close'}
              </button>
              <button
                onClick={() => router.push('/search')}
                className="px-6 py-3 bg-[#FF6B35] text-white rounded-lg font-medium hover:bg-[#ff5722] transition-colors"
              >
                {(t as any)?.newConversationModal?.browseListings || 'Browse Listings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
