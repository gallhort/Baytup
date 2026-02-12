'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CheckCircle, XCircle, Loader, Calendar, MapPin, Users, Home, Mail,
  Phone, Clock, AlertCircle, ArrowLeft, DollarSign, CreditCard,
  FileText, MessageSquare, Download, Share2, Star, Ban, Edit, Eye, Info,
  LogIn, LogOut, CheckCheck, Camera, X, ImagePlus
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useApp } from '@/contexts/AppContext';
import { useSocket } from '@/contexts/SocketContext';
import { getPrimaryListingImage, getAvatarUrl } from '@/utils/imageUtils';
import { useTranslation } from '@/hooks/useTranslation';
import { formatPrice } from '@/utils/priceUtils';
import dynamic from 'next/dynamic';

const StripePaymentForm = dynamic(() => import('@/components/payment/StripePaymentForm'), {
  ssr: false,
  loading: () => <div className="flex justify-center py-8"><Loader className="w-8 h-8 animate-spin text-[#FF6B35]" /></div>
});
interface Booking {
  _id: string;
  listing: {
    _id: string;
    title: string;
    category: string;
    subcategory: string;
    images: Array<{ url: string; isPrimary?: boolean }>;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode?: string;
      country: string;
    };
    pricing: {
      basePrice: number;
      currency: string;
    };
    cancellationPolicy?: string;
  };
  guest: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatar: string;
  };
  host: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatar: string;
  };
  startDate: string;
  endDate: string;
  checkInTime: string;
  checkOutTime: string;
  guestCount: {
    adults: number;
    children: number;
    infants: number;
  };
  pricing: {
    basePrice: number;
    nights: number;
    subtotal: number;
    cleaningFee: number;
    serviceFee: number;
    guestServiceFee?: number;
    taxes: number;
    totalAmount: number;
    currency: string;
    securityDeposit?: number;
  };
  status: string;
  payment: {
    status: string;
    method: string;
    transactionId?: string;
    paidAt?: string;
    paidAmount?: number;
  };
  specialRequests?: string;
  hostMessage?: string;
  checkIn?: {
    actualTime?: string;
    confirmedBy?: string;
    notes?: string;
  };
  checkOut?: {
    actualTime?: string;
    confirmedBy?: string;
    notes?: string;
    damageReport?: string;
  };
  completion?: {
    hostConfirmed?: boolean;
    hostConfirmedAt?: string;
    guestConfirmed?: boolean;
    guestConfirmedAt?: string;
    completedAt?: string;
  };
  cancellation?: {
    cancelledBy: string;
    cancelledAt: string;
    reason: string;
    refundAmount: number;
    cancellationFee: number;
  };
  guestReview?: {
    _id: string;
    rating: {
      overall: number;
      cleanliness?: number;
      communication?: number;
      checkIn?: number;
      accuracy?: number;
      location?: number;
      value?: number;
    };
    comment: string;
    status: string;
  };
  hostReview?: {
    _id: string;
    rating: {
      overall: number;
    };
    comment: string;
    status: string;
  };
  createdAt: string;
}

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { state } = useApp();
  const { refreshNotifications } = useSocket();
  const user = state.user;
  const t = useTranslation('bookings');

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [stripePaymentData, setStripePaymentData] = useState<{
    clientSecret: string;
    publishableKey: string;
  } | null>(null);

  // Check-in/Check-out states
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [damageReport, setDamageReport] = useState('');
  const [processingCheckIn, setProcessingCheckIn] = useState(false);
  const [processingCheckOut, setProcessingCheckOut] = useState(false);
  const [confirmingCompletion, setConfirmingCompletion] = useState(false);

  // Review modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewPhotos, setReviewPhotos] = useState<Array<{ url: string; caption: string; preview?: string }>>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: '',
    cleanliness: 5,
    communication: 5,
    checkIn: 5,
    accuracy: 5,
    location: 5,
    value: 5
  });

  useEffect(() => {
    if (params?.id) {
      fetchBookingDetails(params.id as string);
    }
  }, [params?.id]);

  const fetchBookingDetails = async (bookingId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.status === 'success') {
        setBooking(response.data.data.booking);
      }
    } catch (err: any) {
      console.error('Error fetching booking:', err);
      setError(err.response?.data?.message || (t as any).details.errorMessages.loadingFailed);
      toast.error(err.response?.data?.message || (t as any).details.errorMessages.loadingFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!booking) return;

    try {
      setProcessingCheckIn(true);
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${booking._id}/check-in`,
        { notes: checkInNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.status === 'success') {
        toast.success('Guest checked in successfully!');
        setShowCheckInModal(false);
        setCheckInNotes('');
        fetchBookingDetails(booking._id);
      }
    } catch (err: any) {
      console.error('Error checking in:', err);
      toast.error(err.response?.data?.message || 'Failed to check in guest');
    } finally {
      setProcessingCheckIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!booking) return;

    try {
      setProcessingCheckOut(true);
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${booking._id}/check-out`,
        { notes: checkOutNotes, damageReport },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.status === 'success') {
        toast.success('Guest checked out successfully!');
        setShowCheckOutModal(false);
        setCheckOutNotes('');
        setDamageReport('');
        fetchBookingDetails(booking._id);
      }
    } catch (err: any) {
      console.error('Error checking out:', err);
      toast.error(err.response?.data?.message || 'Failed to check out guest');
    } finally {
      setProcessingCheckOut(false);
    }
  };

  const handleConfirmCompletion = async () => {
    if (!booking) return;

    try {
      setConfirmingCompletion(true);
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${booking._id}/confirm-completion`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.status === 'success') {
        toast.success(response.data.message);
        fetchBookingDetails(booking._id);
      }
    } catch (err: any) {
      console.error('Error confirming completion:', err);
      toast.error(err.response?.data?.message || 'Failed to confirm completion');
    } finally {
      setConfirmingCompletion(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking || !cancelReason) {
      toast.error('Please provide a cancellation reason');
      return;
    }

    try {
      setCancelling(true);
      const token = localStorage.getItem('token');

      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${booking._id}/cancel`,
        { reason: cancelReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.status === 'success') {
        const refundInfo = response.data.data.refundInfo;

        if (refundInfo.refundAmount > 0) {
          const isGracePeriod = refundInfo.isGracePeriod;
          const policyLabel = refundInfo.cancellationPolicy || '';
          const refundPct = refundInfo.refundBreakdown?.subtotalPercent ?? '';
          let details = `Refund: ${formatPrice(refundInfo.refundAmount, booking.pricing.currency)}`;
          if (isGracePeriod) {
            details += ' (grace period - full refund including service fees)';
          } else if (refundPct !== '') {
            details += ` (${refundPct}% of stay, policy: ${policyLabel})`;
          }
          toast.success(
            `Booking cancelled. ${details}. Refund will be processed.`,
            { duration: 6000 }
          );
        } else {
          toast.success('Booking cancelled. No refund applicable per cancellation policy.');
        }

        setShowCancelModal(false);
        setCancelReason('');
        fetchBookingDetails(booking._id);
        // Refresh notifications to show cancellation in the top bar bell icon
        refreshNotifications();
      }
    } catch (err: any) {
      console.error('Error cancelling booking:', err);
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const handleRetryPayment = async () => {
    if (!booking) return;

    try {
      setRetryingPayment(true);
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${booking._id}/retry-payment`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.status === 'success') {
        const payment = response.data.data.payment;

        if (payment.provider === 'stripe') {
          // Stripe: show inline payment form
          setStripePaymentData({
            clientSecret: payment.clientSecret,
            publishableKey: payment.publishableKey
          });
          setRetryingPayment(false);
        } else {
          // SlickPay: redirect to external payment page
          toast.success('Redirection vers la page de paiement...', { duration: 3000 });
          setTimeout(() => {
            window.location.href = payment.paymentUrl;
          }, 1000);
        }
      }
    } catch (err: any) {
      console.error('Error retrying payment:', err);
      toast.error(err.response?.data?.message || 'Failed to create payment invoice');
      setRetryingPayment(false);
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = 5 - reviewPhotos.length;
    if (remaining <= 0) {
      toast.error('Maximum 5 photos par avis');
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remaining);
    const formData = new FormData();
    filesToUpload.forEach(file => formData.append('photos', file));

    try {
      setUploadingPhotos(true);
      const token = localStorage.getItem('token');

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/reviews/upload-photos`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.status === 'success') {
        const uploaded = response.data.data.photos.map((p: any, i: number) => ({
          url: p.url,
          caption: '',
          preview: URL.createObjectURL(filesToUpload[i])
        }));
        setReviewPhotos(prev => [...prev, ...uploaded]);
        toast.success(`${filesToUpload.length} photo(s) ajoutée(s)`);
      }
    } catch (err: any) {
      console.error('Error uploading photos:', err);
      toast.error('Erreur lors de l\'upload des photos');
    } finally {
      setUploadingPhotos(false);
      // Reset input
      e.target.value = '';
    }
  };

  const removeReviewPhoto = (index: number) => {
    setReviewPhotos(prev => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmitReview = async () => {
    if (!booking) return;

    if (!reviewData.comment.trim()) {
      toast.error('Please write a review comment');
      return;
    }

    try {
      setSubmittingReview(true);
      const token = localStorage.getItem('token');

      const endpoint = isGuest
        ? `/bookings/${booking._id}/review-host`
        : `/bookings/${booking._id}/review-guest`;

      const payload = {
        ...reviewData,
        photos: reviewPhotos.map(p => ({ url: p.url, caption: p.caption }))
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.status === 'success') {
        toast.success('Review submitted successfully!');
        setShowReviewModal(false);
        setReviewData({
          rating: 5,
          comment: '',
          cleanliness: 5,
          communication: 5,
          checkIn: 5,
          accuracy: 5,
          location: 5,
          value: 5
        });
        // Clean up photo previews
        reviewPhotos.forEach(p => { if (p.preview) URL.revokeObjectURL(p.preview); });
        setReviewPhotos([]);
        fetchBookingDetails(booking._id);
      }
    } catch (err: any) {
      console.error('Error submitting review:', err);
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string; icon: any }> = {
      pending_payment: { label: (t as any).details.statusBadges.awaitingPayment, color: 'bg-orange-100 text-orange-800', icon: CreditCard },
      confirmed: { label: (t as any).details.statusBadges.confirmed, color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      paid: { label: (t as any).details.statusBadges.paid, color: 'bg-green-100 text-green-800', icon: CheckCircle },
      active: { label: (t as any).details.statusBadges.active, color: 'bg-green-100 text-green-800', icon: Home },
      completed: { label: (t as any).details.statusBadges.completed, color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
      cancelled_by_guest: { label: (t as any).details.statusBadges.cancelledByGuest, color: 'bg-red-100 text-red-800', icon: Ban },
      cancelled_by_host: { label: (t as any).details.statusBadges.cancelledByHost, color: 'bg-red-100 text-red-800', icon: Ban },
      cancelled_by_admin: { label: (t as any).details.statusBadges.cancelledByAdmin, color: 'bg-red-100 text-red-800', icon: Ban },
      expired: { label: (t as any).details.statusBadges.expired, color: 'bg-red-100 text-red-800', icon: XCircle },
    };

    const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4 mr-2" />
        {badge.label}
      </span>
    );
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const shouldShowContactInfo = (personType: 'guest' | 'host') => {
    if (!booking || !user) return false;

    // Admin can see all contact info
    if (user.role === 'admin') return true;

    // Only show contact info after booking is paid/confirmed
    const canShowContacts = ['paid', 'confirmed', 'active', 'completed'].includes(booking.status);
    if (!canShowContacts) return false;

    // Guests can see host contact info
    if (personType === 'host' && isGuest) return true;

    // Hosts can see guest contact info
    if (personType === 'guest' && isHost) return true;

    return false;
  };

  const isGuest = booking && user && booking.guest._id === user.id;
  const isHost = booking && user && booking.host._id === user.id;
  const canCancel = booking && (booking.status === 'pending_payment' || booking.status === 'paid' || booking.status === 'confirmed');

  // Check if user can leave review
  const canLeaveReview = () => {
    if (!booking) return false;
    if (booking.status !== 'completed') return false;

    const endDate = new Date(booking.endDate);
    const now = new Date();
    const daysSinceCheckout = (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceCheckout > 14) return false;

    if (isGuest && booking.guestReview) return false;
    if (isHost && booking.hostReview) return false;

    return true;
  };

  // Calculate refund preview - matches server-side refundCalculator logic
  // Grace period (48h after booking, check-in >14 days): FULL refund including service fees
  // Otherwise: service fee (8%) is NOT refunded, refund based on subtotal + cleaningFee
  const refundPreview = useMemo(() => {
    if (!booking) return null;

    const startDate = new Date(booking.startDate);
    const now = new Date();
    const daysUntilCheckIn = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const subtotal = booking.pricing.subtotal || 0;
    const cleaningFee = booking.pricing.cleaningFee || 0;
    const guestServiceFee = booking.pricing.guestServiceFee || booking.pricing.serviceFee || 0;

    // Check grace period: within 48h of booking AND check-in > 14 days away
    let isInGracePeriod = false;
    if (booking.createdAt) {
      const bookingCreatedAt = new Date(booking.createdAt);
      const hoursSinceBooking = (now.getTime() - bookingCreatedAt.getTime()) / (1000 * 60 * 60);
      isInGracePeriod = hoursSinceBooking <= 48 && daysUntilCheckIn >= 14;
    }

    let subtotalRefundPercent = 0;

    if (isHost) {
      // Host cancels = 100% refund to guest
      subtotalRefundPercent = 100;
    } else {
      // Guest cancellation - use listing's cancellation policy
      const policy = booking.listing?.cancellationPolicy || 'moderate';
      const hoursUntilCheckIn = daysUntilCheckIn * 24;

      switch (policy) {
        case 'flexible':
          subtotalRefundPercent = hoursUntilCheckIn >= 24 ? 100 : 0;
          break;
        case 'moderate':
          subtotalRefundPercent = daysUntilCheckIn >= 5 ? 100 : 50;
          break;
        case 'strict':
          if (daysUntilCheckIn >= 14) subtotalRefundPercent = 100;
          else if (daysUntilCheckIn >= 7) subtotalRefundPercent = 50;
          else subtotalRefundPercent = 0;
          break;
        case 'strict_long_term':
          // For 28+ night stays: special rules
          if (booking.pricing.nights >= 28) {
            // Check 48h booking grace for long stays (28+ days before check-in)
            let longStayGrace = false;
            if (booking.createdAt) {
              const hoursSinceBooking = (now.getTime() - new Date(booking.createdAt).getTime()) / (1000 * 60 * 60);
              longStayGrace = hoursSinceBooking <= 48 && daysUntilCheckIn >= 28;
            }
            if (longStayGrace) subtotalRefundPercent = 100;
            else if (daysUntilCheckIn >= 30) subtotalRefundPercent = 50;
            else subtotalRefundPercent = 0;
          } else {
            // Short stay with strict_long_term → treated as strict
            if (daysUntilCheckIn >= 14) subtotalRefundPercent = 100;
            else if (daysUntilCheckIn >= 7) subtotalRefundPercent = 50;
            else subtotalRefundPercent = 0;
          }
          break;
        case 'super_strict':
          if (daysUntilCheckIn >= 30) subtotalRefundPercent = 100;
          else if (daysUntilCheckIn >= 14) subtotalRefundPercent = 50;
          else subtotalRefundPercent = 0;
          break;
        case 'non_refundable':
          subtotalRefundPercent = 0;
          break;
        default:
          subtotalRefundPercent = daysUntilCheckIn >= 5 ? 100 : 50;
      }
    }

    const subtotalRefund = Math.round(subtotal * (subtotalRefundPercent / 100));
    const cleaningFeeRefund = daysUntilCheckIn > 0 ? cleaningFee : 0;
    // Grace period: service fee IS refunded. Otherwise: NOT refunded.
    const serviceFeeRefund = (isHost || isInGracePeriod) ? guestServiceFee : 0;
    const refundAmount = subtotalRefund + cleaningFeeRefund + serviceFeeRefund;
    const cancellationFee = booking.pricing.totalAmount - refundAmount;

    return {
      daysUntilCheckIn,
      refundAmount,
      cancellationFee,
      refundPercentage: booking.pricing.totalAmount > 0 ? (refundAmount / booking.pricing.totalAmount) * 100 : 0,
      isInGracePeriod
    };
  }, [booking, isHost]);

  const getCancellationReasons = () => {
    if (isHost) {
      return [
        { value: 'host_unavailable', label: (t as any).details.cancelModal.hostReasons.unavailable },
        { value: 'emergency', label: (t as any).details.cancelModal.hostReasons.emergency },
        { value: 'property_issue', label: (t as any).details.cancelModal.hostReasons.propertyIssue },
        { value: 'other', label: (t as any).details.cancelModal.hostReasons.other },
      ];
    } else {
      return [
        { value: 'guest_request', label: (t as any).details.cancelModal.guestReasons.changePlans },
        { value: 'emergency', label: (t as any).details.cancelModal.guestReasons.emergency },
        { value: 'property_issue', label: (t as any).details.cancelModal.guestReasons.propertyNotSuitable },
        { value: 'found_alternative', label: (t as any).details.cancelModal.guestReasons.foundAlternative },
        { value: 'other', label: (t as any).details.cancelModal.guestReasons.other },
      ];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B35]"></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{(t as any).details.errorMessages.loadingFailed}</h2>
          <p className="text-gray-600 mb-4">{error || (t as any).details.errorMessages.bookingNotFound}</p>
          <Link
            href="/dashboard/bookings"
            className="inline-flex items-center px-6 py-3 bg-[#FF6B35] text-white rounded-lg hover:bg-[#E55A24] transition"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {(t as any).details.backToBookings}
          </Link>
        </div>
      </div>
    );
  }

  const otherPerson = isGuest ? booking.host : booking.guest;
  const canCheckIn = isHost && booking.status === 'paid' && !booking.checkIn?.actualTime;
  const canCheckOut = isHost && booking.status === 'active' && booking.checkIn?.actualTime && !booking.checkOut?.actualTime;
  const canConfirmCompletion = booking.checkOut?.actualTime && booking.status !== 'completed';
  const hasUserConfirmed = (isHost && booking.completion?.hostConfirmed) || (isGuest && booking.completion?.guestConfirmed);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back Button */}
      <div className="p-6 pb-0">
        <Link
          href="/dashboard/bookings"
          className="inline-flex items-center text-gray-600 hover:text-[#FF6B35] transition mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {(t as any).details.backToBookings}
        </Link>
      </div>

      {/* Hero Image Section */}
      <div className="relative h-80 mb-6">
        <img
          src={getPrimaryListingImage(booking.listing)}
          alt={booking.listing.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/uploads/listings/listing.jpeg';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-white mb-3">{booking.listing.title}</h1>
                <div className="flex items-center gap-2 text-white/90 mb-2">
                  <MapPin className="w-5 h-5" />
                  <span className="text-lg">{booking.listing.address.city}, {booking.listing.address.state}, {booking.listing.address.country}</span>
                </div>
                <p className="text-white/80 text-sm">
                  {(t as any).details.bookingID}: <span className="font-mono">{booking._id}</span>
                </p>
              </div>
              <div className="bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg">
                {getStatusBadge(booking.status)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 pt-0">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Listing Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{(t as any).details.listingInformation}</h2>
              <div className="flex gap-4">
                <img
                  src={getPrimaryListingImage(booking.listing)}
                  alt={booking.listing.title}
                  className="w-32 h-32 object-cover rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/uploads/listings/listing.jpeg';
                  }}
                />
                <div className="flex-1">
                  <Link
                    href={`/listing/${booking.listing._id}`}
                    className="text-xl font-semibold text-gray-900 hover:text-[#FF6B35] transition"
                  >
                    {booking.listing.title}
                  </Link>
                  <div className="flex items-center gap-2 text-gray-600 mt-2">
                    <MapPin className="w-4 h-4" />
                    <span>{booking.listing.address.city}, {booking.listing.address.state}, {booking.listing.address.country}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 mt-1">
                    <Home className="w-4 h-4" />
                    <span className="capitalize">{booking.listing.category} - {booking.listing.subcategory}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trip Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{(t as any).details.tripDetails}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-[#FF6B35]" />
                  <h3 className="font-semibold text-gray-900">{(t as any).details.checkIn}</h3>
                </div>
                <p className="text-gray-700 font-medium">{formatDate(booking.startDate)}</p>
                <p className="text-sm text-gray-600">After {booking.checkInTime}</p>
                {booking.checkIn?.actualTime && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ {(t as any).details.checkedIn}: {formatDateTime(booking.checkIn.actualTime)}
                  </p>
                )}
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-[#FF6B35]" />
                  <h3 className="font-semibold text-gray-900">{(t as any).card.checkOut}</h3>
                </div>
                <p className="text-gray-700 font-medium">{formatDate(booking.endDate)}</p>
                <p className="text-sm text-gray-600">Before {booking.checkOutTime}</p>
                {booking.checkOut?.actualTime && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ {(t as any).details.checkedOut}: {formatDateTime(booking.checkOut.actualTime)}
                  </p>
                )}
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-[#FF6B35]" />
                  <h3 className="font-semibold text-gray-900">Guests</h3>
                </div>
                <p className="text-gray-700">
                  {/* ✅ FIXED BQ-32: Removed template placeholders */}
                  {booking.guestCount.adults} Adult{booking.guestCount.adults > 1 ? 's' : ''}
                  {booking.guestCount.children > 0 && `, ${booking.guestCount.children} Child${booking.guestCount.children > 1 ? 'ren' : ''}`}
                  {booking.guestCount.infants > 0 && `, ${booking.guestCount.infants} Infant${booking.guestCount.infants > 1 ? 's' : ''}`}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-[#FF6B35]" />
                  <h3 className="font-semibold text-gray-900">{(t as any).details.duration}</h3>
                </div>
                <p className="text-gray-700">
                  {booking.pricing.nights} {booking.pricing.nights > 1 ? (t as any).details.nights : (t as any).details.night}
                </p>
              </div>
            </div>
          </div>

          {/* Check-in/Check-out Status */}
          {(booking.checkIn?.actualTime || booking.checkOut?.actualTime) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{(t as any).details.checkInCheckOut}</h2>

              {booking.checkIn?.actualTime && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <LogIn className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-gray-900">{(t as any).details.checkedIn}</h3>
                  </div>
                  <p className="text-sm text-gray-700">
                    <strong>{(t as any).details.time}:</strong> {formatDateTime(booking.checkIn.actualTime)}
                  </p>
                  {booking.checkIn.notes && (
                    <p className="text-sm text-gray-700 mt-2">
                      <strong>{(t as any).details.notes}:</strong> {booking.checkIn.notes}
                    </p>
                  )}
                </div>
              )}

              {booking.checkOut?.actualTime && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <LogOut className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">{(t as any).details.checkedOut}</h3>
                  </div>
                  <p className="text-sm text-gray-700">
                    <strong>{(t as any).details.time}:</strong> {formatDateTime(booking.checkOut.actualTime)}
                  </p>
                  {booking.checkOut.notes && (
                    <p className="text-sm text-gray-700 mt-2">
                      <strong>{(t as any).details.notes}:</strong> {booking.checkOut.notes}
                    </p>
                  )}
                  {booking.checkOut.damageReport && (
                    <p className="text-sm text-gray-700 mt-2">
                      <strong>{(t as any).details.damageReport}:</strong> {booking.checkOut.damageReport}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Completion Verification Status */}
          {canConfirmCompletion && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{(t as any).details.completionVerification}</h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">{(t as any).details.hostConfirmation}</span>
                  {booking.completion?.hostConfirmed ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">{(t as any).details.confirmed}</span>
                    </div>
                  ) : (
                    <span className="text-orange-600 font-medium">{(t as any).details.pending}</span>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">{(t as any).details.guestConfirmation}</span>
                  {booking.completion?.guestConfirmed ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">{(t as any).details.confirmed}</span>
                    </div>
                  ) : (
                    <span className="text-orange-600 font-medium">{(t as any).details.pending}</span>
                  )}
                </div>
              </div>

              {!hasUserConfirmed && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-gray-700">
                    {(t as any).details.bothConfirmRequired}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Special Requests */}
          {booking.specialRequests && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{(t as any).details.specialRequests}</h2>
              <p className="text-gray-700">{booking.specialRequests}</p>
            </div>
          )}

          {/* Host Message */}
          {booking.hostMessage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{(t as any).details.messageFromHost}</h2>
              <p className="text-gray-700">{booking.hostMessage}</p>
            </div>
          )}

          {/* Cancellation Details */}
          {booking.cancellation && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{(t as any).details.cancellationDetails}</h2>
              <div className="space-y-2 text-gray-700">
                <p><strong>{(t as any).details.cancelled}:</strong> {formatDateTime(booking.cancellation.cancelledAt)}</p>
                <p><strong>{(t as any).details.reason}:</strong> {booking.cancellation.reason}</p>
                {booking.cancellation.refundAmount > 0 && (
                  <p><strong>{(t as any).details.refundAmount}:</strong> {formatPrice(booking.cancellation.refundAmount, booking.pricing.currency)}</p>
                )}
                {booking.cancellation.cancellationFee > 0 && (
                  <p><strong>{(t as any).details.cancellationFee}:</strong> {formatPrice(booking.cancellation.cancellationFee, booking.pricing.currency)}</p>
                )}
              </div>
            </div>
          )}

          {/* Important Information */}
          {booking.status === 'pending_payment' && isGuest ? (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">{(t as any).details.paymentRequired}</h3>
                  <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                    <li>{(t as any).details.paymentInstructions.title}</li>
                    <li>{(t as any).details.paymentInstructions.clickButton}</li>
                    <li>{(t as any).details.paymentInstructions.redirect}</li>
                    <li>{(t as any).details.paymentInstructions.confirmation}</li>
                    <li>{(t as any).details.paymentInstructions.methods}</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : booking.status === 'paid' || booking.status === 'active' ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">{(t as any).details.importantInformation}</h3>
                  <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                    <li>{(t as any).details.bookingConfirmed.confirmationSent}</li>
                    <li>{(t as any).details.bookingConfirmed.reviewRules}</li>
                    <li>{(t as any).details.bookingConfirmed.contactOther}</li>
                    {isGuest && <li>{(t as any).details.bookingConfirmed.addressShared}</li>}
                  </ul>
                </div>
              </div>
            </div>
          ) : booking.status === 'completed' && canLeaveReview() ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">{(t as any).details.leaveReview.title}</h3>
                  <p className="text-sm text-gray-700 mb-3">
                    {(t as any).details.leaveReview.stayComplete}
                    {' '}{(t as any).details.leaveReview.trustBuild}
                  </p>
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    {(t as any).details.leaveReview.writeReview}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {/* ✅ FIXED BQ-32: Replaced {{role}} placeholder with actual role */}
              {isGuest ? 'Host' : 'Guest'} Information
            </h2>
            <div className="flex items-center gap-4 mb-4">
              <img
                src={getAvatarUrl(otherPerson.avatar)}
                alt={`${otherPerson.firstName} ${otherPerson.lastName}`}
                className="w-16 h-16 rounded-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/uploads/users/default-avatar.png';
                }}
              />
              <div>
                <p className="font-semibold text-gray-900">
                  {otherPerson.firstName} {otherPerson.lastName}
                </p>
                <p className="text-sm text-gray-600">{isGuest ? 'Host' : 'Guest'}</p>
              </div>
            </div>
            <div className="space-y-3">
              {shouldShowContactInfo(isGuest ? 'host' : 'guest') && otherPerson.email && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <a href={`mailto:${otherPerson.email}`} className="hover:text-[#FF6B35] transition">
                    {otherPerson.email}
                  </a>
                </div>
              )}
              {shouldShowContactInfo(isGuest ? 'host' : 'guest') && otherPerson.phone && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <a href={`tel:${otherPerson.phone}`} className="hover:text-[#FF6B35] transition">
                    {otherPerson.phone}
                  </a>
                </div>
              )}
              {!shouldShowContactInfo(isGuest ? 'host' : 'guest') && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    {(t as any).details.contactInfoAvailableAfterConfirmation || 'Contact information will be available once booking is confirmed and paid.'}
                  </p>
                </div>
              )}
            </div>
            <Link
              href={`/dashboard/messages?user=${otherPerson._id}`}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#FF6B35] text-white rounded-lg hover:bg-[#E55A24] transition"
            >
              <MessageSquare className="w-4 h-4" />
              {(t as any).details.sendMessage}
            </Link>
          </div>

          {/* Payment Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{(t as any).details.priceDetails || 'Price details'}</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-700">
                <span>{formatPrice(booking.pricing.basePrice, booking.pricing.currency)} × {booking.pricing.nights} {booking.pricing.nights > 1 ? ((t as any).details.nights || 'nights') : ((t as any).details.night || 'night')}</span>
                <span>{formatPrice(booking.pricing.subtotal, booking.pricing.currency)}</span>
              </div>
              {booking.pricing.cleaningFee > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>{(t as any).details.cleaningFee || 'Cleaning fee'}</span>
                  <span>{formatPrice(booking.pricing.cleaningFee, booking.pricing.currency)}</span>
                </div>
              )}
              {booking.pricing.serviceFee > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>{(t as any).details.serviceFee || 'Frais de service (8%)'}</span>
                  <span>{formatPrice(booking.pricing.serviceFee, booking.pricing.currency)}</span>
                </div>
              )}
              {booking.pricing.taxes > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>{(t as any).details.taxes || 'Taxes'}</span>
                  <span>{formatPrice(booking.pricing.taxes, booking.pricing.currency)}</span>
                </div>
              )}
              <div className="border-t-2 border-gray-300 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">{(t as any).details.total || 'Total'} ({booking.pricing.currency})</span>
                  <span className="text-xl font-bold text-[#FF6B35]">
                    {formatPrice(booking.pricing.totalAmount, booking.pricing.currency)}
                  </span>
                </div>
              </div>
              {booking.payment.paidAt && (
                <div className="text-sm text-gray-600 pt-2 border-t border-gray-200">
                  <p><strong>{(t as any).details.paymentMethod}:</strong> {booking.payment.method}</p>
                  <p><strong>{(t as any).details.paidOn}:</strong> {formatDateTime(booking.payment.paidAt)}</p>
                  {booking.payment.transactionId && (
                    <p><strong>{(t as any).details.transactionID}:</strong> {booking.payment.transactionId}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Booking Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{(t as any).details.bookingInformation}</h2>
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <p className="text-gray-500">{(t as any).details.bookingDate}</p>
                <p className="font-medium">{formatDateTime(booking.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">{(t as any).details.paymentStatus}</p>
                <p className="font-medium capitalize">{booking.payment.status}</p>
              </div>
              <div>
                <p className="text-gray-500">{(t as any).details.bookingStatus}</p>
                <p className="font-medium">{getStatusBadge(booking.status)}</p>
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          {(booking.guestReview || booking.hostReview) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{(t as any).details.reviews}</h2>
              <div className="space-y-4">
                {/* Guest's Review (review of host/listing) */}
                {booking.guestReview && (
                  <div className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {(t as any).details.reviewOf}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {(t as any).details.by} {booking.guest.firstName} {booking.guest.lastName}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold text-gray-900">
                          {booking.guestReview.rating.overall}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700 mt-2">{booking.guestReview.comment}</p>
                    {booking.guestReview.rating.cleanliness && (
                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <span>{(t as any).details.cleanliness}:</span>
                          <div className="flex items-center">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="ml-1">{booking.guestReview.rating.cleanliness}</span>
                          </div>
                        </div>
                        {booking.guestReview.rating.communication && (
                          <div className="flex items-center gap-2">
                            <span>{(t as any).details.communication}:</span>
                            <div className="flex items-center">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="ml-1">{booking.guestReview.rating.communication}</span>
                            </div>
                          </div>
                        )}
                        {booking.guestReview.rating.accuracy && (
                          <div className="flex items-center gap-2">
                            <span>{(t as any).details.accuracy}:</span>
                            <div className="flex items-center">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="ml-1">{booking.guestReview.rating.accuracy}</span>
                            </div>
                          </div>
                        )}
                        {booking.guestReview.rating.location && (
                          <div className="flex items-center gap-2">
                            <span>{(t as any).details.location}:</span>
                            <div className="flex items-center">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="ml-1">{booking.guestReview.rating.location}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Host's Review (review of guest) */}
                {booking.hostReview && (
                  <div className="pb-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {(t as any).details.reviewOf}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {(t as any).details.by} {booking.host.firstName} {booking.host.lastName}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold text-gray-900">
                          {booking.hostReview.rating.overall}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700 mt-2">{booking.hostReview.comment}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {booking.status === 'pending_payment' && isGuest && stripePaymentData && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#FF6B35]" />
                Paiement par carte
              </h3>
              <StripePaymentForm
                clientSecret={stripePaymentData.clientSecret}
                publishableKey={stripePaymentData.publishableKey}
                bookingId={booking._id}
                amount={booking.pricing.totalAmount}
                currency={booking.pricing.currency || 'EUR'}
                onSuccess={() => {
                  toast.success('Paiement confirmé!');
                  setStripePaymentData(null);
                  fetchBookingDetails(booking._id);
                  refreshNotifications();
                }}
                onError={(error) => {
                  toast.error(error || 'Erreur de paiement');
                }}
                onCancel={() => {
                  setStripePaymentData(null);
                }}
              />
            </div>
          )}
          {booking.status === 'pending_payment' && isGuest && !stripePaymentData && (
            <button
              onClick={handleRetryPayment}
              disabled={retryingPayment}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {retryingPayment ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  {(t as any).details.processing}
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  {(t as any).details.completePayment}
                </>
              )}
            </button>
          )}

          {canCheckIn && (
            <button
              onClick={() => setShowCheckInModal(true)}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <LogIn className="w-5 h-5" />
              {(t as any).details.checkInGuest}
            </button>
          )}

          {canCheckOut && (
            <button
              onClick={() => setShowCheckOutModal(true)}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
            >
              <LogOut className="w-5 h-5" />
              {(t as any).details.checkOutGuest}
            </button>
          )}

          {canConfirmCompletion && !hasUserConfirmed && (
            <button
              onClick={handleConfirmCompletion}
              disabled={confirmingCompletion}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
            >
              {confirmingCompletion ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  {(t as any).details.processing}
                </>
              ) : (
                <>
                  <CheckCheck className="w-5 h-5" />
                  {(t as any).details.confirmCompletion}
                </>
              )}
            </button>
          )}

          {canCancel && (isGuest || isHost) && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
            >
              <Ban className="w-5 h-5" />
              {(t as any).details.cancelBooking}
            </button>
          )}

          {booking.status === 'completed' && canLeaveReview() && (
            <button
              onClick={() => setShowReviewModal(true)}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-medium"
            >
              <Star className="w-5 h-5" />
              {(t as any).details.leaveReviewButton}
            </button>
          )}
        </div>
      </div>

      {/* Check-In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{(t as any).details.checkInModal.title}</h2>
                <button
                  onClick={() => setShowCheckInModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any).details.checkInModal.guestName}
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {booking.guest.firstName} {booking.guest.lastName}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any).details.checkInModal.checkInTime}
                  </label>
                  <p className="text-gray-700">
                    {new Date().toLocaleString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any).details.checkInModal.notesOptional}
                  </label>
                  <textarea
                    value={checkInNotes}
                    onChange={(e) => setCheckInNotes(e.target.value)}
                    placeholder={(t as any).details.checkInModal.notesPlaceholder}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleCheckIn}
                    disabled={processingCheckIn}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                  >
                    {processingCheckIn ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader className="w-4 h-4 animate-spin" />
                        {(t as any).details.processing}
                      </span>
                    ) : (
                      (t as any).details.checkInModal.confirmCheckIn
                    )}
                  </button>
                  <button
                    onClick={() => setShowCheckInModal(false)}
                    disabled={processingCheckIn}
                    className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
                  >
                    {(t as any).details.checkInModal.cancel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check-Out Modal */}
      {showCheckOutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{(t as any).details.checkOutModal.title}</h2>
                <button
                  onClick={() => setShowCheckOutModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any).details.checkOutModal.guestName}
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {booking.guest.firstName} {booking.guest.lastName}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any).details.checkOutModal.checkOutTime}
                  </label>
                  <p className="text-gray-700">
                    {new Date().toLocaleString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any).details.checkOutModal.notesOptional}
                  </label>
                  <textarea
                    value={checkOutNotes}
                    onChange={(e) => setCheckOutNotes(e.target.value)}
                    placeholder={(t as any).details.checkOutModal.notesPlaceholder}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any).details.checkOutModal.damageReportOptional}
                  </label>
                  <textarea
                    value={damageReport}
                    onChange={(e) => setDamageReport(e.target.value)}
                    placeholder={(t as any).details.checkOutModal.damageReportPlaceholder}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleCheckOut}
                    disabled={processingCheckOut}
                    className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50"
                  >
                    {processingCheckOut ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader className="w-4 h-4 animate-spin" />
                        {(t as any).details.processing}
                      </span>
                    ) : (
                      (t as any).details.checkOutModal.confirmCheckOut
                    )}
                  </button>
                  <button
                    onClick={() => setShowCheckOutModal(false)}
                    disabled={processingCheckOut}
                    className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
                  >
                    {(t as any).details.checkOutModal.cancel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Cancel Modal */}
      {showCancelModal && refundPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{(t as any).details.cancelModal.title}</h2>
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Listing Info */}
              <div className="flex gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <img
                  src={getPrimaryListingImage(booking.listing)}
                  alt={booking.listing.title}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{booking.listing.title}</h3>
                  <p className="text-sm text-gray-600">{formatDate(booking.startDate)} - {formatDate(booking.endDate)}</p>
                  <p className="text-sm font-medium text-[#FF6B35]">
                    {formatPrice(booking.pricing.totalAmount, booking.pricing.currency)}
                  </p>
                </div>
              </div>

              {/* Cancellation Policy */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">{(t as any).details.cancelModal.cancellationPolicy}</h3>
                    {isHost ? (
                      <p className="text-sm text-gray-700">
                        {(t as any).details.cancelModal.hostCancellation}
                      </p>
                    ) : (
                      <div className="text-sm text-gray-700 space-y-1">
                        <p><strong>{refundPreview?.daysUntilCheckIn} jours avant l&apos;arrivée</strong></p>
                        {refundPreview?.isInGracePeriod && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-green-700 font-semibold">Période de grâce active (48h après réservation)</p>
                            <p className="text-green-600 text-xs mt-1">Remboursement intégral incluant les frais de service</p>
                          </div>
                        )}
                        {(() => {
                          const policy = booking.listing?.cancellationPolicy || 'moderate';
                          switch (policy) {
                            case 'flexible':
                              return (
                                <ul className="list-disc list-inside space-y-1 mt-2">
                                  <li>24h+ avant : remboursement à 100%</li>
                                  <li>Moins de 24h : aucun remboursement</li>
                                </ul>
                              );
                            case 'strict':
                              return (
                                <ul className="list-disc list-inside space-y-1 mt-2">
                                  <li>14+ jours avant : remboursement à 100%</li>
                                  <li>7-13 jours avant : remboursement à 50%</li>
                                  <li>Moins de 7 jours : aucun remboursement</li>
                                </ul>
                              );
                            case 'strict_long_term':
                              return (
                                <ul className="list-disc list-inside space-y-1 mt-2">
                                  {booking.pricing.nights >= 28 ? (
                                    <>
                                      <li>48h après réservation + 28j avant : remboursement à 100%</li>
                                      <li>30+ jours avant : remboursement à 50%</li>
                                      <li>Moins de 30 jours : aucun remboursement</li>
                                    </>
                                  ) : (
                                    <>
                                      <li>14+ jours avant : remboursement à 100%</li>
                                      <li>7-13 jours avant : remboursement à 50%</li>
                                      <li>Moins de 7 jours : aucun remboursement</li>
                                    </>
                                  )}
                                </ul>
                              );
                            case 'super_strict':
                              return (
                                <ul className="list-disc list-inside space-y-1 mt-2">
                                  <li>30+ jours avant : remboursement à 100%</li>
                                  <li>14-29 jours avant : remboursement à 50%</li>
                                  <li>Moins de 14 jours : aucun remboursement</li>
                                </ul>
                              );
                            case 'non_refundable':
                              return (
                                <p className="mt-2 text-red-600 font-medium">Non remboursable</p>
                              );
                            default: // moderate
                              return (
                                <ul className="list-disc list-inside space-y-1 mt-2">
                                  <li>5+ jours avant : remboursement à 100%</li>
                                  <li>Moins de 5 jours : remboursement à 50%</li>
                                </ul>
                              );
                          }
                        })()}
                        {!refundPreview?.isInGracePeriod && (
                          <p className="text-xs text-gray-500 mt-2">Les frais de service (8%) ne sont pas remboursés hors période de grâce.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Refund Preview */}
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-3">{(t as any).details.cancelModal.refundPreview}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-700">
                    <span>{(t as any).details.cancelModal.totalPaid}</span>
                    <span>{formatPrice(booking.pricing.totalAmount, booking.pricing.currency)}</span>
                  </div>
                  {refundPreview.cancellationFee > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>{(t as any).details.cancelModal.cancellationFeeAmount}</span>
                      <span>-{formatPrice(refundPreview.cancellationFee, booking.pricing.currency)}</span>
                    </div>
                  )}
                  <div className="border-t border-yellow-300 pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <span className="text-green-600">{(t as any).details.cancelModal.refundAmountLabel}</span>
                      <span className="text-green-600">
                        {formatPrice(refundPreview.refundAmount, booking.pricing.currency)}
                        <span className="text-xs ml-1">({Math.round(refundPreview.refundPercentage)}%)</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cancellation Reason */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {(t as any).details.cancelModal.cancellationReason} <span className="text-red-500">*</span>
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                >
                  <option value="">{(t as any).details.cancelModal.selectReason}</option>
                  {getCancellationReasons().map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Warning */}
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">
                    {(t as any).details.cancelModal.warning}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancelBooking}
                  disabled={cancelling || !cancelReason}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelling ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      {(t as any).details.cancelModal.cancelling}
                    </span>
                  ) : (
                    (t as any).details.cancelModal.confirmCancellation
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                  }}
                  disabled={cancelling}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium disabled:opacity-50"
                >
                  {(t as any).details.cancelModal.keepBooking}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {(t as any).details.reviewModal.title}
                </h2>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Listing/Person Info */}
              <div className="flex gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <img
                  src={isGuest ? getPrimaryListingImage(booking.listing) : getAvatarUrl(otherPerson.avatar)}
                  alt={isGuest ? booking.listing.title : `${otherPerson.firstName} ${otherPerson.lastName}`}
                  className="w-20 h-20 object-cover rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = isGuest ? '/uploads/listings/listing.jpeg' : '/uploads/users/default-avatar.png';
                  }}
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {isGuest ? booking.listing.title : `${otherPerson.firstName} ${otherPerson.lastName}`}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Overall Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any).details.reviewModal.overallRating} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewData({ ...reviewData, rating: star })}
                        className="focus:outline-none transition transform hover:scale-110"
                      >
                        <Star
                          className={`w-10 h-10 ${
                            star <= reviewData.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {reviewData.rating === 5 && (t as any).details.reviewModal.ratingLabels['5']}
                    {reviewData.rating === 4 && (t as any).details.reviewModal.ratingLabels['4']}
                    {reviewData.rating === 3 && (t as any).details.reviewModal.ratingLabels['3']}
                    {reviewData.rating === 2 && (t as any).details.reviewModal.ratingLabels['2']}
                    {reviewData.rating === 1 && (t as any).details.reviewModal.ratingLabels['1']}
                  </p>
                </div>

                {/* Category Ratings (for guests only) */}
                {isGuest && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        {(t as any).details.reviewModal.categoryRatings}
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {(t as any).details.reviewModal.cleanliness}
                        </label>
                        <select
                          value={reviewData.cleanliness}
                          onChange={(e) => setReviewData({ ...reviewData, cleanliness: Number(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                        >
                          {[5, 4, 3, 2, 1].map(val => (
                            <option key={val} value={val}>{val} Star{val > 1 ? 's' : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {(t as any).details.reviewModal.communication}
                        </label>
                        <select
                          value={reviewData.communication}
                          onChange={(e) => setReviewData({ ...reviewData, communication: Number(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                        >
                          {[5, 4, 3, 2, 1].map(val => (
                            <option key={val} value={val}>{val} Star{val > 1 ? 's' : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {(t as any).details.reviewModal.checkInExperience}
                        </label>
                        <select
                          value={reviewData.checkIn}
                          onChange={(e) => setReviewData({ ...reviewData, checkIn: Number(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                        >
                          {[5, 4, 3, 2, 1].map(val => (
                            <option key={val} value={val}>{val} Star{val > 1 ? 's' : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {(t as any).details.reviewModal.accuracy}
                        </label>
                        <select
                          value={reviewData.accuracy}
                          onChange={(e) => setReviewData({ ...reviewData, accuracy: Number(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                        >
                          {[5, 4, 3, 2, 1].map(val => (
                            <option key={val} value={val}>{val} Star{val > 1 ? 's' : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {(t as any).details.reviewModal.location}
                        </label>
                        <select
                          value={reviewData.location}
                          onChange={(e) => setReviewData({ ...reviewData, location: Number(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                        >
                          {[5, 4, 3, 2, 1].map(val => (
                            <option key={val} value={val}>{val} Star{val > 1 ? 's' : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {(t as any).details.reviewModal.value}
                        </label>
                        <select
                          value={reviewData.value}
                          onChange={(e) => setReviewData({ ...reviewData, value: Number(e.target.value) })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                        >
                          {[5, 4, 3, 2, 1].map(val => (
                            <option key={val} value={val}>{val} Star{val > 1 ? 's' : ''}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* Comment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {(t as any).details.reviewModal.yourReview} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reviewData.comment}
                    onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                    placeholder={isGuest ? (t as any).details.reviewModal.guestPlaceholder : (t as any).details.reviewModal.hostPlaceholder}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {(t as any).details.reviewModal.characterCount}
                  </p>
                </div>

                {/* Photo Upload Section */}
                {isGuest && (
                  <div>
                    {/* CTA Prompt */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Camera className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-blue-900">Ajoutez des photos de votre séjour</p>
                          <p className="text-sm text-blue-700 mt-0.5">
                            Vos photos aident les futurs voyageurs à se projeter. Partagez les meilleurs moments !
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Photo Thumbnails Preview */}
                    {reviewPhotos.length > 0 && (
                      <div className="grid grid-cols-5 gap-2 mb-3">
                        {reviewPhotos.map((photo, idx) => (
                          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group">
                            <img
                              src={photo.preview || `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${photo.url}`}
                              alt={`Photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeReviewPhoto(idx)}
                              className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload Button */}
                    {reviewPhotos.length < 5 && (
                      <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#FF6B35] hover:bg-orange-50 transition text-gray-500 hover:text-[#FF6B35]">
                        {uploadingPhotos ? (
                          <>
                            <Loader className="w-5 h-5 animate-spin" />
                            <span className="text-sm font-medium">Upload en cours...</span>
                          </>
                        ) : (
                          <>
                            <ImagePlus className="w-5 h-5" />
                            <span className="text-sm font-medium">Ajouter des photos ({reviewPhotos.length}/5)</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={handlePhotoSelect}
                          disabled={uploadingPhotos}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSubmitReview}
                    disabled={submittingReview || !reviewData.comment.trim()}
                    className="flex-1 px-6 py-3 bg-[#FF6B35] text-white rounded-lg hover:bg-[#E55A24] transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingReview ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader className="w-4 h-4 animate-spin" />
                        {(t as any).details.reviewModal.submitting}
                      </span>
                    ) : (
                      (t as any).details.reviewModal.submitReview
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowReviewModal(false);
                      setReviewData({
                        rating: 5,
                        comment: '',
                        cleanliness: 5,
                        communication: 5,
                        checkIn: 5,
                        accuracy: 5,
                        location: 5,
                        value: 5
                      });
                      reviewPhotos.forEach(p => { if (p.preview) URL.revokeObjectURL(p.preview); });
                      setReviewPhotos([]);
                    }}
                    disabled={submittingReview}
                    className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium disabled:opacity-50"
                  >
                    {(t as any).details.reviewModal.cancel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}