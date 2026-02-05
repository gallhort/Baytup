'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Loader, CreditCard, Shield, AlertCircle, CheckCircle } from 'lucide-react';

// Initialize Stripe outside component to avoid recreating on each render
let stripePromise: Promise<Stripe | null> | null = null;

const getStripe = (publishableKey: string) => {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

interface StripePaymentFormProps {
  clientSecret: string;
  publishableKey: string;
  bookingId: string;
  amount: number;
  currency: string;
  onSuccess: () => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

// Inner component that uses Stripe hooks
function CheckoutForm({
  bookingId,
  amount,
  currency,
  onSuccess,
  onError,
  onCancel
}: Omit<StripePaymentFormProps, 'clientSecret' | 'publishableKey'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking/${bookingId}/confirmation`,
        },
        redirect: 'if_required'
      });

      if (error) {
        if (error.type === 'card_error' || error.type === 'validation_error') {
          setMessage(error.message || 'Une erreur est survenue');
        } else {
          setMessage('Une erreur inattendue est survenue.');
        }
        onError(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess();
        // Redirect to confirmation page
        window.location.href = `${window.location.origin}/booking/${bookingId}/confirmation`;
      }
    } catch (err: any) {
      setMessage(err.message || 'Une erreur est survenue');
      onError(err.message || 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number, curr: string) => {
    if (curr === 'EUR' || curr === 'eur') {
      return `€${price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${price.toLocaleString('fr-FR')} ${curr}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Amount display */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Montant à payer</span>
          <span className="text-xl font-bold text-gray-900">
            {formatPrice(amount, currency)}
          </span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {/* Error message */}
      {message && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{message}</p>
        </div>
      )}

      {/* Security notice */}
      <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
        <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-green-800 font-medium text-sm">Secure Payment</p>
          <p className="text-green-700 text-xs mt-1">
            Your payment information is protected by Stripe SSL encryption.
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isLoading || !stripe || !elements}
          className="flex-1 py-3 px-4 bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>Traitement...</span>
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              <span>Payer {formatPrice(amount, currency)}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// Main component that wraps everything in Elements provider
export default function StripePaymentForm({
  clientSecret,
  publishableKey,
  bookingId,
  amount,
  currency,
  onSuccess,
  onError,
  onCancel
}: StripePaymentFormProps) {
  const [stripeReady, setStripeReady] = useState(false);

  useEffect(() => {
    if (publishableKey) {
      getStripe(publishableKey).then(() => setStripeReady(true));
    }
  }, [publishableKey]);

  if (!stripeReady || !clientSecret) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-[#FF6B35]" />
        <p className="mt-4 text-gray-600">Chargement du formulaire de paiement...</p>
      </div>
    );
  }

  const stripeInstance = getStripe(publishableKey);

  return (
    <Elements
      stripe={stripeInstance}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#FF6B35',
            colorBackground: '#ffffff',
            colorText: '#1f2937',
            colorDanger: '#ef4444',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            borderRadius: '8px',
            spacingUnit: '4px'
          }
        },
        locale: 'fr'
      }}
    >
      <CheckoutForm
        bookingId={bookingId}
        amount={amount}
        currency={currency}
        onSuccess={onSuccess}
        onError={onError}
        onCancel={onCancel}
      />
    </Elements>
  );
}
