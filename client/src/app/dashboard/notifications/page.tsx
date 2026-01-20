'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import moment from 'moment';
import Image from 'next/image';
import {
  Bell, Check, Trash2, CheckCheck, Filter, Calendar, User,
  AlertCircle, Star, Home, MessageSquare, CreditCard, FileText, X,
  LogIn, UserPlus, Lock, KeyRound, Mail, PartyPopper, ClipboardCheck,
  CheckCircle, XCircle, RefreshCw, Shield, UserCog, Ban, PlayCircle,
  PauseCircle, Trash as TrashIcon, ShieldAlert, Wallet, Heart,
  DoorOpen, DoorClosed, PartyPopper as Confetti, MessageCircle,
  Plus, Edit, Eye, DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Notification {
  _id: string;
  recipient: string;
  sender?: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  type: string;
  title: string;
  message: string;
  data?: any;
  link?: string;
  isRead: boolean;
  readAt?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
}

export default function NotificationsPage() {
  const t = useTranslation('notifications') as any;
  const router = useRouter();
  const { notifications, unreadCount, refreshNotifications, markAsRead, markAllAsRead, deleteNotification } = useSocket();

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);

  // Fetch all notifications on mount
  useEffect(() => {
    fetchAllNotifications();
  }, []);

  const fetchAllNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/notifications?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAllNotifications(data.data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching all notifications:', error);
      toast.error(t.errors?.fetchFailed || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Filter notifications
  const filteredNotifications = allNotifications.filter((notification) => {
    if (filter === 'unread' && notification.isRead) return false;
    if (filter === 'read' && !notification.isRead) return false;
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;
    return true;
  });

  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'booking_created':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'booking_confirmed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'booking_cancelled_by_guest':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'booking_cancelled_by_host':
        return <XCircle className="h-5 w-5 text-orange-500" />;
      case 'booking_payment_successful':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'booking_payment_failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'booking_check_in':
        return <DoorOpen className="h-5 w-5 text-green-600" />;
      case 'booking_check_out':
        return <DoorClosed className="h-5 w-5 text-blue-600" />;
      case 'booking_completed':
        return <Confetti className="h-5 w-5 text-purple-600" />;
      case 'review':
        return <Star className="h-5 w-5 text-yellow-500" />;
      case 'review_created':
        return <Star className="h-5 w-5 text-yellow-600" />;
      case 'review_received':
        return <Star className="h-5 w-5 text-yellow-600" />;
      case 'review_response':
        return <MessageCircle className="h-5 w-5 text-blue-600" />;
      case 'message':
        return <MessageSquare className="h-5 w-5 text-green-500" />;
      case 'message_received':
        return <MessageCircle className="h-5 w-5 text-green-600" />;
      case 'conversation_created':
        return <MessageSquare className="h-5 w-5 text-blue-600" />;
      case 'wishlist_listing_added':
        return <Heart className="h-5 w-5 text-red-500" />;
      case 'payout_request':
      case 'payout_approved':
      case 'payout_processing':
      case 'payout_completed':
      case 'payout_rejected':
      case 'payout_cancelled':
        return <CreditCard className="h-5 w-5 text-purple-500" />;
      case 'host_application':
        return <User className="h-5 w-5 text-indigo-500" />;
      case 'host_application_submitted':
        return <ClipboardCheck className="h-5 w-5 text-blue-600" />;
      case 'host_application_approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'host_application_rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'host_application_resubmission':
        return <RefreshCw className="h-5 w-5 text-yellow-600" />;
      case 'listing_update':
        return <Home className="h-5 w-5 text-orange-500" />;
      case 'listing_created':
        return <Plus className="h-5 w-5 text-green-600" />;
      case 'listing_published':
        return <Eye className="h-5 w-5 text-blue-600" />;
      case 'listing_updated':
        return <Edit className="h-5 w-5 text-blue-500" />;
      case 'listing_approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'listing_rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'listing_featured':
        return <Star className="h-5 w-5 text-yellow-600" />;
      case 'listing_deleted':
        return <TrashIcon className="h-5 w-5 text-red-600" />;
      case 'listing_deactivated':
        return <PauseCircle className="h-5 w-5 text-gray-600" />;
      case 'new_booking_request':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'earning_received':
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'booking_status_changed':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'booking_cancelled_by_admin':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'booking_payment_updated':
        return <Wallet className="h-5 w-5 text-purple-600" />;
      case 'user_role_changed':
        return <UserCog className="h-5 w-5 text-indigo-600" />;
      case 'user_blocked':
        return <Ban className="h-5 w-5 text-red-600" />;
      case 'user_unblocked':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'user_activated':
        return <PlayCircle className="h-5 w-5 text-green-600" />;
      case 'user_deactivated':
        return <PauseCircle className="h-5 w-5 text-yellow-600" />;
      case 'user_deleted':
        return <TrashIcon className="h-5 w-5 text-red-600" />;
      case 'account_password_reset':
        return <ShieldAlert className="h-5 w-5 text-orange-600" />;
      case 'auth_login':
        return <LogIn className="h-5 w-5 text-green-600" />;
      case 'auth_register':
        return <UserPlus className="h-5 w-5 text-blue-600" />;
      case 'auth_forgot_password':
        return <Lock className="h-5 w-5 text-yellow-600" />;
      case 'auth_reset_password':
        return <KeyRound className="h-5 w-5 text-green-600" />;
      case 'auth_verify_email':
        return <Mail className="h-5 w-5 text-blue-600" />;
      case 'auth_welcome':
        return <PartyPopper className="h-5 w-5 text-pink-500" />;
      case 'system':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  // Get unique notification types for filter
  const notificationTypes = ['all', ...Array.from(new Set(allNotifications.map(n => n.type)))];

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
    // Update local state
    setAllNotifications(prev =>
      prev.map(n => n._id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
    );
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    // Update local state
    setAllNotifications(prev =>
      prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
    );
    toast.success(t.success?.allMarkedRead || 'All notifications marked as read');
  };

  const handleDelete = async (notificationId: string) => {
    await deleteNotification(notificationId);
    // Update local state
    setAllNotifications(prev => prev.filter(n => n._id !== notificationId));
    toast.success(t.success?.deleted || 'Notification deleted');
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Bell className="h-8 w-8 text-orange-500" />
                {t.title || 'Notifications'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {unreadCount > 0
                  ? `${unreadCount} ${unreadCount === 1 ? (t.unreadNotification || 'unread notification') : (t.unreadNotifications || 'unread notifications')}`
                  : t.noUnread || 'No unread notifications'}
              </p>
            </div>
            {allNotifications.length > 0 && unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <CheckCheck className="h-5 w-5" />
                {t.markAllRead || 'Mark all as read'}
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Read/Unread Filter */}
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {t.filterByStatus || 'Filter by status'}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t.all || 'All'} ({allNotifications.length})
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'unread'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t.unread || 'Unread'} ({allNotifications.filter(n => !n.isRead).length})
                </button>
                <button
                  onClick={() => setFilter('read')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'read'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t.read || 'Read'} ({allNotifications.filter(n => n.isRead).length})
                </button>
              </div>
            </div>

            {/* Type Filter */}
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {t.filterByType || 'Filter by type'}
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {notificationTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === 'all' ? t.allTypes || 'All types' : type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
              <p className="text-gray-500 mt-4">{t.loading || 'Loading notifications...'}</p>
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <div
                key={notification._id}
                className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow ${
                  !notification.isRead ? 'border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    {/* Icon/Avatar */}
                    <div className="flex-shrink-0">
                      {notification.sender?.avatar ? (
                        <Image
                          src={notification.sender.avatar}
                          alt={`${notification.sender.firstName} ${notification.sender.lastName}`}
                          width={48}
                          height={48}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-gray-900">
                              {notification.title}
                            </h3>
                            {!notification.isRead && (
                              <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {moment(notification.createdAt).format('MMM D, YYYY h:mm A')}
                            </span>
                            <span>({moment(notification.createdAt).fromNow()})</span>
                            {notification.priority === 'urgent' && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                                {t.urgent || 'Urgent'}
                              </span>
                            )}
                            {notification.priority === 'high' && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
                                {t.high || 'High'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-4">
                        {notification.link && (
                          <button
                            onClick={() => handleNotificationClick(notification)}
                            className="px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors"
                          >
                            {t.viewDetails || 'View Details'}
                          </button>
                        )}
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification._id)}
                            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                          >
                            <Check className="h-4 w-4" />
                            {t.markRead || 'Mark as read'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification._id)}
                          className="px-4 py-2 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          {t.delete || 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t.noNotificationsTitle || 'No notifications'}
              </h3>
              <p className="text-gray-500">
                {filter === 'unread'
                  ? t.noUnreadNotifications || 'You have no unread notifications'
                  : filter === 'read'
                  ? t.noReadNotifications || 'You have no read notifications'
                  : t.noNotificationsMessage || 'You have no notifications at this time'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
