'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  X, Calendar, Users, DollarSign, Shield, AlertCircle,
  Check, Loader, Clock, Home, CreditCard, Info, Banknote
} from 'lucide-react';
import { Listing } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import { convertCurrency } from '@/utils/priceUtils';
import PaymentMethodSelector from '@/components/payment/PaymentMethodSelector';

// Dynamic import for Stripe to avoid SSR issues
const StripePaymentForm = dynamic(
  () => import('@/components/payment/StripePaymentForm'),
  { ssr: false, loading: () => <div className="flex justify-center py-8"><Loader className="w-8 h-8 animate-spin text-[#FF6B35]" /></div> }
);

// Dynamic import for CashVoucherDisplay
const CashVoucherDisplay = dynamic(
  () => import('@/components/payment/CashVoucherDisplay'),
  { ssr: false }
);

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing;
  checkIn: string;
  checkOut: string;
  guests: {
    adults: number;
    children: number;
    infants: number;
  };
  onGuestsChange?: (guests: { adults: number; children: number; infants: number }) => void;
}

interface PricingBreakdown {
  basePrice: number;
  nights: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  taxes: number;
  total: number;
}

// Stripe payment data from API response
interface StripePaymentData {
  clientSecret: string;
  publishableKey: string;
  paymentIntentId: string;
  bookingId: string;
  amount: number;
  currency: string;
}

// Cash voucher data from API response
interface CashVoucherData {
  voucherNumber: string;
  amount: number;
  currency: string;
  expiresAt: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  qrCode?: string;
  guestInfo: {
    fullName: string;
    phone: string;
  };
}

type PaymentMethod = 'card' | 'cash';

export default function BookingModal({
  isOpen,
  onClose,
  listing,
  checkIn,
  checkOut,
  guests,
  onGuestsChange
}: BookingModalProps) {
  const t = useTranslation('booking');
  const { currency: userCurrency } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specialRequests, setSpecialRequests] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);

  // Payment method selection (card or cash - cash only for DZD)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  // Stripe payment state
  const [stripePayment, setStripePayment] = useState<StripePaymentData | null>(null);
  const [showStripeForm, setShowStripeForm] = useState(false);

  // Cash voucher state (Nord Express)
  const [cashVoucher, setCashVoucher] = useState<CashVoucherData | null>(null);
  const [showCashVoucher, setShowCashVoucher] = useState(false);
  const [cashBookingId, setCashBookingId] = useState<string | null>(null);

  // ✅ FIX UX: Ref for scrollable content to auto-scroll on error
  const contentRef = useRef<HTMLDivElement>(null);

  // ESC key to close modal (P1 #30)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // ✅ FIX UX: Auto-scroll to top when error occurs
  useEffect(() => {
    if (error && contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [error]);

  // ✅ FIX: Get actual payment currency FIRST (before pricing calculation)
  const listingCurrency = listing.pricing?.currency || 'DZD';
  const listingAltCurrency = (listing.pricing as any)?.altCurrency;

  // Check if listing accepts user's selected currency
  const listingAcceptsCurrency = listingCurrency === userCurrency || listingAltCurrency === userCurrency;

  // ✅ FIX: Determine the ACTUAL payment currency based on user's selection
  // If listing accepts user's currency, use it; otherwise use listing's primary currency
  const actualPaymentCurrency = listingAcceptsCurrency ? userCurrency : listingCurrency;

  // ✅ FIX: Determine if we should use alternative pricing
  const useAltPricing = actualPaymentCurrency === listingAltCurrency;

  // Calculate pricing breakdown using correct prices for selected currency
  useEffect(() => {
    if (checkIn && checkOut && listing) {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      if (nights > 0) {
        // ✅ FIX: Use altBasePrice/altCleaningFee when paying in alternative currency
        const pricingData = listing.pricing as any;
        const basePrice = useAltPricing && pricingData?.altBasePrice
          ? pricingData.altBasePrice
          : listing.pricing?.basePrice || 0;
        const cleaningFee = useAltPricing && pricingData?.altCleaningFee !== undefined
          ? pricingData.altCleaningFee
          : listing.pricing?.cleaningFee || 0;

        const subtotal = basePrice * nights;
        // Baytup fee structure: 8% guest service fee (no taxes - hosts handle their own)
        const baseAmount = subtotal + cleaningFee;
        const serviceFee = Math.round(baseAmount * 0.08); // 8% service fee on (subtotal + cleaning)
        const taxes = 0; // No taxes - hosts are responsible for their own tax declarations
        const total = subtotal + cleaningFee + serviceFee;

        setPricing({
          basePrice,
          nights,
          subtotal,
          cleaningFee,
          serviceFee,
          taxes,
          total
        });
      }
    }
  }, [checkIn, checkOut, listing, useAltPricing]);

  // ✅ FIX: Display prices in the ACTUAL payment currency
  const formatPrice = (price: number) => {
    if (actualPaymentCurrency === 'EUR') {
      return `€${price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${price.toLocaleString('fr-FR')} DZD`;
  };

  // Format converted price for reference (when user currency differs)
  const formatConvertedPrice = (price: number) => {
    if (listingCurrency === userCurrency) return null;
    const converted = convertCurrency(price, listingCurrency as 'DZD' | 'EUR', userCurrency as 'DZD' | 'EUR');
    if (userCurrency === 'EUR') {
      return `≈ €${converted.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `≈ ${converted.toLocaleString('fr-FR')} DZD`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getGuestLabel = (count: number, singular: string, plural: string) => {
    return count === 1 ? ((t as any)?.guests?.[singular] || singular) : ((t as any)?.guests?.[plural] || plural);
  };

  const getNightLabel = (count: number) => {
    return count === 1 ? ((t as any)?.time?.night || 'night') : ((t as any)?.time?.nights || 'nights');
  };

  const handleBooking = async () => {
    if (!acceptedTerms) {
      setError((t as any)?.errors?.acceptTerms || 'Please accept the terms and conditions');
      return;
    }

    if (!checkIn || !checkOut) {
      setError((t as any)?.errors?.selectDates || 'Please select check-in and check-out dates');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token');

      if (!token) {
        setError((t as any)?.errors?.loginRequired || 'Please log in to continue');
        setLoading(false);
        return;
      }

      // Determine which endpoint to use based on payment method
      const isCashPayment = paymentMethod === 'cash';
      const endpoint = isCashPayment
        ? `${process.env.NEXT_PUBLIC_API_URL}/bookings/create-with-cash`
        : `${process.env.NEXT_PUBLIC_API_URL}/bookings/create-with-payment`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          listing: listing._id || listing.id,
          startDate: checkIn,
          endDate: checkOut,
          guestCount: guests,
          specialRequests,
          // ✅ FIX: Pass user's selected currency for dual-currency listings
          paymentCurrency: listingAcceptsCurrency ? userCurrency : listingCurrency
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || ((t as any)?.errors?.bookingFailed || 'Booking failed'));
      }

      // Handle CASH payment (Nord Express)
      // ✅ FIX: Backend returns voucher data inside data.payment for cash payments
      if (isCashPayment && data.status === 'success' && data.data?.payment?.provider === 'nord_express') {
        const payment = data.data.payment;
        setCashVoucher({
          voucherNumber: payment.voucherNumber,
          amount: payment.amount,
          currency: payment.currency,
          expiresAt: payment.expiresAt,
          status: 'pending',
          qrCode: payment.qrCode,
          guestInfo: { fullName: '', phone: '' } // Guest info not returned, not needed for display
        });
        setCashBookingId(data.data.booking._id);
        setShowCashVoucher(true);
        setLoading(false);
        return;
      }

      // ✅ Handle NON-INSTANT BOOKING (request only, no payment yet)
      if (data.status === 'success' && data.data?.requiresHostApproval) {
        setLoading(false);
        // Close modal and redirect to bookings page with success message
        window.location.href = `/dashboard/bookings?requestSent=true&bookingId=${data.data.booking._id}`;
        return;
      }

      // Handle CARD payment (Stripe/SlickPay) - for instant bookings
      if (data.status === 'success' && data.data?.payment) {
        const payment = data.data.payment;

        // STRIPE: Show embedded payment form (for EUR)
        if (payment.provider === 'stripe' && payment.clientSecret) {
          setStripePayment({
            clientSecret: payment.clientSecret,
            publishableKey: payment.publishableKey,
            paymentIntentId: payment.paymentIntentId,
            bookingId: data.data.booking._id,
            amount: data.data.booking.pricing.totalAmount,
            currency: data.data.booking.pricing.currency
          });
          setShowStripeForm(true);
          setLoading(false);
        }
        // CHARGILY: Redirect to payment page (for DZD - CIB/Edahabia)
        else if (payment.provider === 'chargily' && payment.paymentUrl) {
          window.location.href = payment.paymentUrl;
        }
        // SLICKPAY (legacy): Redirect to payment page (for DZD)
        else if (payment.provider === 'slickpay' && payment.paymentUrl) {
          window.location.href = payment.paymentUrl;
        }
        else {
          throw new Error((t as any)?.payment?.paymentUrlError || 'Payment method not available');
        }
      } else if (!data.data?.requiresHostApproval) {
        throw new Error((t as any)?.payment?.paymentUrlError || 'Payment initialization failed');
      }
    } catch (err: any) {
      console.error('Booking error:', err);
      setError(err.message || ((t as any)?.errors?.bookingFailedRetry || 'Booking failed. Please try again.'));
      setLoading(false);
    }
  };

  // ✅ NEW: Handle Stripe payment success
  const handleStripeSuccess = () => {
    setShowStripeForm(false);
    // Redirect happens in StripePaymentForm
  };

  // ✅ NEW: Handle Stripe payment error
  const handleStripeError = (errorMsg: string) => {
    setError(errorMsg);
  };

  // ✅ NEW: Handle Stripe payment cancel
  const handleStripeCancel = () => {
    setShowStripeForm(false);
    setStripePayment(null);
  };

  if (!isOpen) return null;

  const totalGuests = guests.adults + guests.children + guests.infants;

  return (
    // ✅ FIX: Increased z-index to z-[10000] to ensure modal is above Leaflet maps (which use high z-index)
    <div className="fixed inset-0 z-[10000] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 id="booking-modal-title" className="text-2xl font-bold text-gray-900">{(t as any)?.modal?.title || 'Confirm and Pay'}</h2>
              <p className="text-sm text-gray-600 mt-1">{listing.title}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              disabled={loading}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content - ✅ FIX UX: Added ref for auto-scroll on error */}
          <div ref={contentRef} className="p-6 max-h-[70vh] overflow-y-auto">
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 font-medium">{(t as any)?.errors?.title || 'Error'}</p>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* CASH VOUCHER DISPLAY (for Nord Express) */}
            {showCashVoucher && cashVoucher && (
              <CashVoucherDisplay
                voucher={cashVoucher}
                booking={{
                  id: cashBookingId || '',
                  listing: { title: listing.title },
                  startDate: checkIn,
                  endDate: checkOut
                }}
                onDownloadPDF={() => {
                  // Open voucher PDF in new tab
                  if (cashVoucher?.voucherNumber) {
                    window.open(
                      `${process.env.NEXT_PUBLIC_API_URL}/bookings/voucher/${cashVoucher.voucherNumber}/pdf`,
                      '_blank'
                    );
                  }
                }}
              />
            )}

            {/* STRIPE PAYMENT FORM (for EUR listings) */}
            {showStripeForm && stripePayment && !showCashVoucher && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900">{(t as any)?.payment?.securePayment || 'Secure Payment'}</h3>
                <StripePaymentForm
                  clientSecret={stripePayment.clientSecret}
                  publishableKey={stripePayment.publishableKey}
                  bookingId={stripePayment.bookingId}
                  amount={stripePayment.amount}
                  currency={stripePayment.currency}
                  onSuccess={handleStripeSuccess}
                  onError={handleStripeError}
                  onCancel={handleStripeCancel}
                />
              </div>
            )}

            {/* NORMAL BOOKING FORM (hidden when Stripe form or Cash voucher is shown) */}
            {!showStripeForm && !showCashVoucher && (
              <>
            {/* Trip Details */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-bold text-gray-900">{(t as any)?.sections?.yourTrip || 'Your Trip'}</h3>

              {/* Dates */}
              <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-[#FF6B35] mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">{(t as any)?.labels?.dates || 'Dates'}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDate(checkIn)} → {formatDate(checkOut)}
                    </p>
                    {pricing && (
                      <p className="text-xs text-gray-500 mt-1">
                        {pricing.nights} {getNightLabel(pricing.nights)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Guests */}
              <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-[#FF6B35] mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">{(t as any)?.labels?.guests || 'Guests'}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {guests.adults} {getGuestLabel(guests.adults, 'adult', 'adults')}
                      {guests.children > 0 && `, ${guests.children} ${getGuestLabel(guests.children, 'child', 'children')}`}
                      {guests.infants > 0 && `, ${guests.infants} ${getGuestLabel(guests.infants, 'infant', 'infants')}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Check-in/Check-out times */}
              {listing.availability && (
                <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-[#FF6B35] mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">{(t as any)?.labels?.checkInCheckOut || 'Check-in / Check-out'}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {(t as any)?.labels?.checkIn || 'Check-in'}: {listing.availability.checkInFrom} - {listing.availability.checkInTo}
                      </p>
                      <p className="text-sm text-gray-600">
                        {(t as any)?.labels?.checkOut || 'Check-out'}: {(t as any)?.labels?.before || 'Before'} {listing.availability.checkOutBefore}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Special Requests */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                {(t as any)?.form?.specialRequestsLabel || 'Special Requests'}
              </label>
              <textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder={(t as any)?.form?.specialRequestsPlaceholder || 'Any special requests? (optional)'}
                rows={3}
                maxLength={500}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent resize-none"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                {specialRequests.length}/500 characters
              </p>
            </div>

            {/* Currency Warning - when listing doesn't accept user's currency */}
            {!listingAcceptsCurrency && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-orange-800 font-semibold">
                      {(t as any)?.payment?.currencyNotice || `Cette annonce accepte uniquement les paiements en ${listingCurrency}`}
                    </p>
                    <p className="text-orange-700 mt-1">
                      {(t as any)?.payment?.currencyNoticeDesc || `Le montant affiché est en ${listingCurrency}. Tous les prix et le paiement seront effectués dans cette devise.`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Price Breakdown */}
            {pricing && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{(t as any)?.sections?.priceDetails || 'Price Details'}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-700">
                    <span>
                      {formatPrice(pricing.basePrice)} × {pricing.nights} {getNightLabel(pricing.nights)}
                    </span>
                    <span>{formatPrice(pricing.subtotal)}</span>
                  </div>
                  {pricing.cleaningFee > 0 && (
                    <div className="flex justify-between text-gray-700">
                      <span>{(t as any)?.labels?.cleaningFee || 'Cleaning fee'}</span>
                      <span>{formatPrice(pricing.cleaningFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-700">
                    <span>{(t as any)?.labels?.serviceFee || 'Frais de service'} (8%)</span>
                    <span>{formatPrice(pricing.serviceFee)}</span>
                  </div>
                  <div className="pt-3 border-t border-gray-300 flex justify-between font-bold text-lg">
                    <span>{(t as any)?.labels?.total || 'Total'} ({actualPaymentCurrency})</span>
                    <span>{formatPrice(pricing.total)}</span>
                  </div>
                  {/* Show converted amount for reference when currencies differ */}
                  {!listingAcceptsCurrency && formatConvertedPrice(pricing.total) && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{(t as any)?.labels?.approximateValue || 'Valeur indicative'}</span>
                      <span>{formatConvertedPrice(pricing.total)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Method Selection (only for DZD - cash option available) */}
            {/* ✅ FIX: Use actualPaymentCurrency to determine if cash option is available */}
            {actualPaymentCurrency === 'DZD' && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{(t as any)?.payment?.method || 'Payment Method'}</h3>
                <PaymentMethodSelector
                  selectedMethod={paymentMethod}
                  onSelect={setPaymentMethod}
                  currency={actualPaymentCurrency}
                  disabled={loading}
                />
              </div>
            )}

            {/* Terms and Conditions */}
            <div className="mb-6">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
                  disabled={loading}
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  {(t as any)?.form?.termsAgreement || 'I agree to the'}{' '}
                  <a href="/terms" className="text-[#FF6B35] hover:underline" target="_blank">
                    {(t as any)?.form?.termsOfService || 'Terms of Service'}
                  </a>
                  {' '}{(t as any)?.form?.and || 'and'}{' '}
                  <a href="/cancellation-policy" className="text-[#FF6B35] hover:underline" target="_blank">
                    {(t as any)?.form?.cancellationPolicy || 'Cancellation Policy'}
                  </a>
                </span>
              </label>
            </div>

            {/* Important Information */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">{(t as any)?.payment?.securePaymentTitle || 'Paiement sécurisé'}</p>
                  <p className="text-blue-700">
                    {/* ✅ FIX: Use actualPaymentCurrency to show correct payment provider */}
                    {actualPaymentCurrency === 'EUR'
                      ? (t as any)?.payment?.stripeDescription || 'Votre paiement sera traité de manière sécurisée via Stripe.'
                      : paymentMethod === 'cash'
                        ? (t as any)?.payment?.cashDescription || 'Vous recevrez un bon de paiement à présenter dans une agence Nord Express.'
                        : (t as any)?.payment?.slickpayDescription || 'Votre paiement sera traité de manière sécurisée via SlickPay (carte CIB/Edahabia).'
                    }
                  </p>
                </div>
              </div>
            </div>
              </>
            )}
          </div>

          {/* Footer - Hide when Stripe form or Cash voucher is shown */}
          {!showStripeForm && !showCashVoucher && (
          <div className="flex items-center justify-between gap-4 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
              disabled={loading}
            >
              {(t as any)?.buttons?.cancel || 'Cancel'}
            </button>

            {/* ✅ FIX: Hide pay button if listing doesn't accept user's currency */}
            {!listingAcceptsCurrency ? (
              <div className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-500 rounded-xl">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">
                  {(t as any)?.buttons?.changeCurrency || `Changez votre devise en ${listingCurrency} pour réserver`}
                </span>
              </div>
            ) : (
            <button
              onClick={handleBooking}
              disabled={loading || !acceptedTerms || !pricing}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white rounded-xl font-bold hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  {(t as any)?.buttons?.processing || 'Processing...'}
                </>
              ) : (
                <>
                  {/* ✅ FIX: Show appropriate button based on instant booking and payment method */}
                  {listing.availability?.instantBook ? (
                    <>
                      {paymentMethod === 'cash' ? (
                        <Banknote className="w-5 h-5" />
                      ) : (
                        <CreditCard className="w-5 h-5" />
                      )}
                      {paymentMethod === 'cash'
                        ? ((t as any)?.buttons?.generateVoucher || 'Generate payment voucher')
                        : ((t as any)?.buttons?.confirmAndPay || 'Confirm and Pay')
                      }
                      {pricing && ` ${formatPrice(pricing.total)}`}
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      {(t as any)?.buttons?.submitRequest || 'Submit Request'}
                    </>
                  )}
                </>
              )}
            </button>
            )}
          </div>
          )}

          {/* Footer for Cash Voucher - Close button only */}
          {showCashVoucher && (
          <div className="flex items-center justify-center gap-4 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold transition-colors"
            >
              {(t as any)?.buttons?.close || 'Close'}
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
