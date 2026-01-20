'use client';

import React from 'react';
import {
  X, Calendar, Clock, MapPin, Users, DollarSign, CreditCard,
  Home, Car, Star, CheckCircle, XCircle, AlertCircle,
  User, Mail, Phone, MessageSquare, FileText, Ban
} from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

interface Booking {
  _id: string;
  listing: {
    _id: string;
    title: string;
    category: string;
    subcategory: string;
    images: { url: string; isPrimary?: boolean }[];
    address: {
      street?: string;
      city: string;
      state: string;
      country: string;
    };
    pricing: {
      basePrice: number;
      currency: string;
    };
  };
  guest: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    email?: string;
    phone?: string;
  };
  host: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    email?: string;
    phone?: string;
  };
  startDate: string;
  endDate: string;
  checkInTime: string;
  checkOutTime: string;
  status: string;
  pricing: {
    basePrice?: number;
    nights: number;
    subtotal?: number;
    cleaningFee?: number;
    serviceFee?: number;
    taxes?: number;
    totalAmount: number;
    currency: string;
  };
  guestCount: {
    adults: number;
    children: number;
    infants: number;
  };
  specialRequests?: string;
  hostMessage?: string;
  payment: {
    status: string;
    method: string;
    transactionId?: string;
    paidAt?: string;
  };
  guestReview?: {
    _id: string;
    rating: { overall: number };
    comment: string;
  };
  hostReview?: {
    _id: string;
    rating: { overall: number };
    comment: string;
  };
  createdAt: string;
}

interface BookingDetailsModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onCancel?: (bookingId: string) => void;
  userRole?: string;
}

export default function BookingDetailsModal({
  booking,
  isOpen,
  onClose,
  onCancel,
  userRole = 'guest'
}: BookingDetailsModalProps) {
  const t = useTranslation('bookings');

  if (!isOpen || !booking) return null;

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: (t as any)?.status?.pending || 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      pending_payment: { label: (t as any)?.status?.awaitingPayment || 'Awaiting Payment', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: CreditCard },
      confirmed: { label: (t as any)?.status?.confirmed || 'Confirmed', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
      paid: { label: (t as any)?.status?.paid || 'Paid', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      active: { label: (t as any)?.status?.active || 'Active', color: 'bg-green-100 text-green-800 border-green-200', icon: Home },
      completed: { label: (t as any)?.status?.completed || 'Completed', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: CheckCircle },
      cancelled_by_guest: { label: (t as any)?.status?.cancelledByGuest || 'Cancelled by Guest', color: 'bg-red-100 text-red-800 border-red-200', icon: Ban },
      cancelled_by_host: { label: (t as any)?.status?.cancelledByHost || 'Cancelled by Host', color: 'bg-red-100 text-red-800 border-red-200', icon: Ban },
      expired: { label: (t as any)?.status?.expired || 'Expired', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
    };

    const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-800 border-gray-200', icon: AlertCircle };
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border-2 ${badge.color}`}>
        <Icon className="w-5 h-5 mr-2" />
        {badge.label}
      </span>
    );
  };

  const formatPrice = (amount: number, currency: string) => {
    if (currency === 'DZD') {
      return `${amount.toLocaleString('fr-FR')} دج`;
    }
    return `€${amount.toLocaleString('fr-FR')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPrimaryImage = () => {
    const primaryImage = booking.listing.images?.find(img => img.isPrimary);
    const imageUrl = primaryImage?.url || booking.listing.images?.[0]?.url;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    if (!imageUrl) return `${baseUrl}/uploads/listings/default-listing.jpg`;
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${baseUrl}${imageUrl}`;
  };

  const getAvatarUrl = (avatar: string | undefined) => {
    if (!avatar) return '/uploads/users/default-avatar.png';
    if (avatar.startsWith('http')) return avatar;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${avatar}`;
  };

  const shouldShowContactInfo = (personType: 'guest' | 'host') => {
    if (!booking) return false;
    if (userRole === 'admin') return true;
    if (personType === 'guest' && userRole === 'host') return false;
    if (personType === 'host' && userRole === 'guest') return false;
    return true;
  };

  const handleCancel = () => {
    if (onCancel && confirm((t as any)?.toast?.confirmCancel || 'Are you sure you want to cancel this booking?')) {
      onCancel(booking._id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Image */}
          <div className="relative h-64">
            <img
              src={getPrimaryImage()}
              alt={booking.listing.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
                target.src = `${baseUrl}/uploads/listings/default-listing.jpg`;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="absolute bottom-4 left-6 right-6">
              <h2 className="text-3xl font-bold text-white mb-2">{booking.listing.title}</h2>
              <div className="flex items-center gap-2 text-white/90">
                <MapPin className="w-4 h-4" />
                <span>{booking.listing.address.city}, {booking.listing.address.state}, {booking.listing.address.country}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[calc(90vh-16rem)] overflow-y-auto">
            {/* Status and ID */}
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
              <div>
                {getStatusBadge(booking.status)}
                <p className="text-sm text-gray-500 mt-2">
                  {(t as any)?.modal?.bookingId || 'Booking ID:'} <span className="font-mono font-semibold text-gray-700">{booking._id}</span>
                </p>
                <p className="text-xs text-gray-500">
                  {(t as any)?.modal?.created || 'Created:'} {formatDate(booking.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{(t as any)?.modal?.totalAmount || 'Total Amount'}</p>
                <p className="text-3xl font-bold text-[#FF6B35]">
                  {formatPrice(booking.pricing.totalAmount, booking.pricing.currency)}
                </p>
                <p className="text-sm text-gray-500">
                  {booking.pricing.nights} {booking.pricing.nights > 1 ? ((t as any)?.card?.nights || 'nights') : ((t as any)?.card?.night || 'night')}
                </p>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Left Column - Booking Details */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#FF6B35]" />
                    {(t as any)?.modal?.bookingDetails || 'Booking Details'}
                  </h3>

                  {/* Check-in */}
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-green-700 font-semibold uppercase">{(t as any)?.card?.checkIn || 'Check-in'}</p>
                        <p className="font-bold text-gray-900">{formatDate(booking.startDate)}</p>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {booking.checkInTime}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Check-out */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-blue-700 font-semibold uppercase">{(t as any)?.card?.checkOut || 'Check-out'}</p>
                        <p className="font-bold text-gray-900">{formatDate(booking.endDate)}</p>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {booking.checkOutTime}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Guests */}
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Users className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-purple-700 font-semibold uppercase">{(t as any)?.card?.guests || 'Guests'}</p>
                        <p className="font-bold text-gray-900">
                          {booking.guestCount.adults} {booking.guestCount.adults > 1 ? 'Adults' : 'Adult'}
                          {booking.guestCount.children > 0 && `, ${booking.guestCount.children} ${booking.guestCount.children > 1 ? 'Children' : 'Child'}`}
                          {booking.guestCount.infants > 0 && `, ${booking.guestCount.infants} ${booking.guestCount.infants > 1 ? 'Infants' : 'Infant'}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#FF6B35]" />
                    {(t as any)?.modal?.priceDetails || 'Price details'}
                  </h3>
                  <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                    {booking.pricing.basePrice && booking.pricing.subtotal && (
                      <div className="flex justify-between text-gray-700">
                        <span>{formatPrice(booking.pricing.basePrice, booking.pricing.currency)} × {booking.pricing.nights} {booking.pricing.nights > 1 ? ((t as any)?.modal?.nights || 'nights') : ((t as any)?.modal?.night || 'night')}</span>
                        <span className="font-semibold">{formatPrice(booking.pricing.subtotal, booking.pricing.currency)}</span>
                      </div>
                    )}
                    {booking.pricing.cleaningFee && booking.pricing.cleaningFee > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>{(t as any)?.modal?.cleaningFee || 'Cleaning fee'}</span>
                        <span className="font-semibold">{formatPrice(booking.pricing.cleaningFee, booking.pricing.currency)}</span>
                      </div>
                    )}
                    {booking.pricing.serviceFee && (
                      <div className="flex justify-between text-gray-700">
                        <span>{(t as any)?.modal?.serviceFee || 'Service fee (10%)'}</span>
                        <span className="font-semibold">{formatPrice(booking.pricing.serviceFee, booking.pricing.currency)}</span>
                      </div>
                    )}
                    {booking.pricing.taxes && (
                      <div className="flex justify-between text-gray-700">
                        <span>{(t as any)?.modal?.taxes || 'Taxes (5%)'}</span>
                        <span className="font-semibold">{formatPrice(booking.pricing.taxes, booking.pricing.currency)}</span>
                      </div>
                    )}
                    <div className="pt-3 border-t-2 border-gray-300 flex justify-between text-lg font-bold">
                      <span>{(t as any)?.modal?.total || 'Total'} ({booking.pricing.currency})</span>
                      <span className="text-[#FF6B35]">{formatPrice(booking.pricing.totalAmount, booking.pricing.currency)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="p-4 bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-green-600 mt-1" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">{(t as any)?.modal?.paymentInfo || 'Payment Information'}</p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{(t as any)?.modal?.status || 'Status:'}</span>{' '}
                        <span className={`font-semibold ${booking.payment.status === 'completed' || booking.payment.status === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                          {booking.payment.status}
                        </span>
                      </p>
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{(t as any)?.modal?.method || 'Method:'}</span> {booking.payment.method}
                      </p>
                      {booking.payment.transactionId && (
                        <p className="text-xs text-gray-600 mt-1 font-mono">
                          Transaction: {booking.payment.transactionId}
                        </p>
                      )}
                      {booking.payment.paidAt && (
                        <p className="text-xs text-gray-600">
                          Paid: {formatDate(booking.payment.paidAt)} at {formatTime(booking.payment.paidAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - People Details */}
              <div className="space-y-6">
                {/* Guest Info */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-[#FF6B35]" />
                    {(t as any)?.card?.guest || 'Guest'}
                  </h3>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-4">
                      <img
                        src={getAvatarUrl(booking.guest.avatar)}
                        alt={`${booking.guest.firstName} ${booking.guest.lastName}`}
                        className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/uploads/users/default-avatar.png';
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-bold text-lg text-gray-900">
                          {booking.guest.firstName} {booking.guest.lastName}
                        </p>
                        {shouldShowContactInfo('guest') && booking.guest.email && (
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {booking.guest.email}
                          </p>
                        )}
                        {shouldShowContactInfo('guest') && booking.guest.phone && (
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {booking.guest.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Host Info */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Home className="w-5 h-5 text-[#FF6B35]" />
                    {(t as any)?.card?.host || 'Host'}
                  </h3>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center gap-4">
                      <img
                        src={getAvatarUrl(booking.host.avatar)}
                        alt={`${booking.host.firstName} ${booking.host.lastName}`}
                        className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/uploads/users/default-avatar.png';
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-bold text-lg text-gray-900">
                          {booking.host.firstName} {booking.host.lastName}
                        </p>
                        {shouldShowContactInfo('host') && booking.host.email && (
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {booking.host.email}
                          </p>
                        )}
                        {shouldShowContactInfo('host') && booking.host.phone && (
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {booking.host.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Special Requests */}
                {booking.specialRequests && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-[#FF6B35]" />
                      {(t as any)?.modal?.specialRequests || 'Special Requests'}
                    </h3>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <p className="text-gray-700">{booking.specialRequests}</p>
                    </div>
                  </div>
                )}

                {/* Host Message */}
                {booking.hostMessage && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#FF6B35]" />
                      {(t as any)?.modal?.hostMessage || 'Host Message'}
                    </h3>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                      <p className="text-gray-700">{booking.hostMessage}</p>
                    </div>
                  </div>
                )}

                {/* Reviews */}
                {(booking.guestReview || booking.hostReview) && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Star className="w-5 h-5 text-[#FF6B35]" />
                      {(t as any)?.modal?.reviews || 'Reviews'}
                    </h3>
                    <div className="space-y-3">
                      {booking.guestReview && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-gray-900">{(t as any)?.modal?.guestReview || 'Guest Review'}</p>
                            <div className="flex items-center gap-1">
                              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                              <span className="font-bold text-gray-900">{booking.guestReview.rating.overall}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700">{booking.guestReview.comment}</p>
                        </div>
                      )}
                      {booking.hostReview && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-gray-900">{(t as any)?.modal?.hostReview || 'Host Review'}</p>
                            <div className="flex items-center gap-1">
                              <Star className="w-5 h-5 fill-blue-400 text-blue-400" />
                              <span className="font-bold text-gray-900">{booking.hostReview.rating.overall}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700">{booking.hostReview.comment}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-4 p-6 border-t border-gray-200 bg-gray-50">
            <Link
              href={`/listing/${booking.listing._id}`}
              className="inline-flex items-center px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
            >
              {booking.listing.category === 'stay' ? <Home className="w-5 h-5 mr-2" /> : <Car className="w-5 h-5 mr-2" />}
              {(t as any)?.modal?.viewListing || 'View Listing'}
            </Link>
            <div className="flex items-center gap-3">
              {booking.status !== 'completed' && booking.status !== 'cancelled_by_guest' && booking.status !== 'cancelled_by_host' && onCancel && (
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition"
                >
                  <Ban className="w-5 h-5 mr-2" />
                  {(t as any)?.card?.cancelBooking || 'Cancel Booking'}
                </button>
              )}
              <button
                onClick={onClose}
                className="inline-flex items-center px-6 py-3 bg-[#FF6B35] text-white rounded-xl font-semibold hover:bg-[#E55A24] transition"
              >
                {(t as any)?.modal?.close || 'Close'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}