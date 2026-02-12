'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader, AlertCircle, Home, FileText, ArrowRight } from 'lucide-react';
import axios from 'axios';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

interface PaymentStatus {
  status: 'verifying' | 'success' | 'failed' | 'error';
  message: string;
  bookingId?: string;
  paymentDetails?: any;
}

export default function BookingConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params?.id as string;
  const t = useTranslation('booking-confirmation');

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    status: 'verifying',
    message: (t as any)?.verifying?.message || 'Verifying your payment...'
  });

  useEffect(() => {
    if (bookingId) {
      verifyPayment();
    }
  }, [bookingId]);

  const verifyPayment = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        setPaymentStatus({
          status: 'error',
          message: (t as any)?.error?.pleaseLogin || 'Please log in to view your booking'
        });
        return;
      }

      // Call verify payment endpoint with timeout
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/verify-payment`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          timeout: 30000 // 30 second timeout
        }
      );

      if (response.data.status === 'success') {
        const booking = response.data.data.booking;

        if (booking.payment.status === 'paid') {
          setPaymentStatus({
            status: 'success',
            message: (t as any)?.success?.message || 'Payment successful! Your booking is confirmed.',
            bookingId: booking._id,
            paymentDetails: booking.payment
          });
        } else if (booking.payment.status === 'pending') {
          setPaymentStatus({
            status: 'failed',
            message: (t as any)?.failed?.messagePending || 'Payment is still pending. Please complete the payment or try again.',
            bookingId: booking._id
          });
        } else {
          setPaymentStatus({
            status: 'failed',
            message: (t as any)?.failed?.messageNotCompleted || 'Payment was not completed. Please try again.',
            bookingId: booking._id
          });
        }
      }
    } catch (error: any) {
      console.error('Payment verification error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        headers: error.config?.headers
      });

      // More specific error messages
      let errorMessage = (t as any)?.error?.messageFailed || 'Failed to verify payment. Please check your bookings page.';

      if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again to view your booking.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Booking not found. Please check the booking ID.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view this booking.';
      } else if (error.code === 'ERR_NETWORK' || !error.response) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }

      setPaymentStatus({
        status: 'error',
        message: error.response?.data?.message || errorMessage
      });
    }
  };

  const renderVerifying = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <Loader className="w-16 h-16 text-[#FF6B35] mx-auto animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {(t as any)?.verifying?.title || 'Verifying Payment'}
        </h1>
        <p className="text-gray-600">
          {(t as any)?.verifying?.message || 'Please wait while we confirm your payment...'}
        </p>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {(t as any)?.success?.title || 'Payment Successful!'}
        </h1>
        <p className="text-gray-600 mb-6">{paymentStatus.message}</p>

        {paymentStatus.paymentDetails && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-2">
              {(t as any)?.success?.paymentDetails?.title || 'Payment Details'}
            </h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                <strong>{(t as any)?.success?.paymentDetails?.transactionId || 'Transaction ID'}:</strong>{' '}
                {paymentStatus.paymentDetails.transactionId || (t as any)?.success?.paymentDetails?.na || 'N/A'}
              </p>
              <p>
                <strong>{(t as any)?.success?.paymentDetails?.paymentMethod || 'Payment Method'}:</strong>{' '}
                {paymentStatus.paymentDetails.method || 'SlickPay'}
              </p>
              <p>
                <strong>{(t as any)?.success?.paymentDetails?.status || 'Status'}:</strong>{' '}
                <span className="text-green-600 font-semibold">
                  {(t as any)?.success?.paymentDetails?.paid || 'Paid'}
                </span>
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href={`/dashboard/bookings/${paymentStatus.bookingId}`}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-[#FF6B35] text-white rounded-lg hover:bg-[#E55A24] transition font-medium"
          >
            <FileText className="w-5 h-5" />
            {(t as any)?.success?.buttons?.viewBookingDetails || 'View Booking Details'}
            <ArrowRight className="w-5 h-5" />
          </Link>

          <Link
            href="/dashboard/bookings"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
          >
            <FileText className="w-5 h-5" />
            {(t as any)?.success?.buttons?.viewAllBookings || 'View All Bookings'}
          </Link>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            <Home className="w-5 h-5" />
            {(t as any)?.success?.buttons?.backToHome || 'Back to Home'}
          </Link>
        </div>
      </div>
    </div>
  );

  const renderFailed = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {(t as any)?.failed?.title || 'Payment Incomplete'}
        </h1>
        <p className="text-gray-600 mb-6">{paymentStatus.message}</p>

        <div className="space-y-3">
          {paymentStatus.bookingId && (
            <Link
              href={`/dashboard/bookings/${paymentStatus.bookingId}`}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-[#FF6B35] text-white rounded-lg hover:bg-[#E55A24] transition font-medium"
            >
              <FileText className="w-5 h-5" />
              {(t as any)?.failed?.buttons?.viewBookingAndRetry || 'View Booking & Retry Payment'}
            </Link>
          )}

          <Link
            href="/dashboard/bookings"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
          >
            <FileText className="w-5 h-5" />
            {(t as any)?.failed?.buttons?.viewAllBookings || 'View All Bookings'}
          </Link>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            <Home className="w-5 h-5" />
            {(t as any)?.failed?.buttons?.backToHome || 'Back to Home'}
          </Link>
        </div>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10 text-yellow-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {(t as any)?.error?.title || 'Verification Error'}
        </h1>
        <p className="text-gray-600 mb-6">{paymentStatus.message}</p>

        <div className="space-y-3">
          <button
            onClick={verifyPayment}
            className="w-full px-6 py-3 bg-[#FF6B35] text-white rounded-lg hover:bg-[#E55A24] transition font-medium"
          >
            {(t as any)?.error?.buttons?.tryAgain || 'Try Again'}
          </button>

          <Link
            href="/dashboard/bookings"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
          >
            <FileText className="w-5 h-5" />
            {(t as any)?.error?.buttons?.viewMyBookings || 'View My Bookings'}
          </Link>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            <Home className="w-5 h-5" />
            {(t as any)?.error?.buttons?.backToHome || 'Back to Home'}
          </Link>
        </div>
      </div>
    </div>
  );

  switch (paymentStatus.status) {
    case 'verifying':
      return renderVerifying();
    case 'success':
      return renderSuccess();
    case 'failed':
      return renderFailed();
    case 'error':
      return renderError();
    default:
      return renderVerifying();
  }
}
