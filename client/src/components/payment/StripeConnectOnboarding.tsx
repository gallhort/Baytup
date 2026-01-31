'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { loadConnectAndInitialize, StripeConnectInstance } from '@stripe/connect-js';
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
  ConnectPayments,
  ConnectPayouts
} from '@stripe/react-connect-js';
import {
  Loader,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  CreditCard,
  Building2,
  Shield,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
interface StripeConnectStatus {
  hasAccount: boolean;
  accountId?: string;
  onboardingStatus: 'not_started' | 'pending' | 'completed' | 'restricted';
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsPending: string[];
}

interface StripeConnectOnboardingProps {
  onComplete?: () => void;
}

export default function StripeConnectOnboarding({ onComplete }: StripeConnectOnboardingProps) {
  const [status, setStatus] = useState<StripeConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripeConnectInstance, setStripeConnectInstance] = useState<StripeConnectInstance | null>(null);
  const [activeTab, setActiveTab] = useState<'onboarding' | 'payments' | 'payouts'>('onboarding');
  const [creatingAccount, setCreatingAccount] = useState(false);

  // Fetch current Stripe Connect status
  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get fresh token from localStorage
      const currentToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      if (!currentToken) {
        throw new Error('Vous devez être connecté pour accéder à cette page');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stripe-connect/status`, {
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la recuperation du statut');
      }

      setStatus(data.data);

      // If onboarding is completed, call onComplete
      if (data.data.onboardingStatus === 'completed' && onComplete) {
        onComplete();
      }
    } catch (err: any) {
      console.error('[StripeConnect] Error fetching status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onComplete]);

  // Create a new Stripe Connect account
  const createAccount = async () => {
    try {
      setCreatingAccount(true);
      setError(null);

      const currentToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stripe-connect/create-account`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la creation du compte');
      }

      // Refresh status
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingAccount(false);
    }
  };

  // Initialize Stripe Connect embedded components
  const initializeStripeConnect = useCallback(async () => {
    if (!status?.hasAccount) return;

    try {
      const currentToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      // Get account session from backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stripe-connect/account-session`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de l\'initialisation');
      }

      // Initialize Stripe Connect
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        throw new Error('Stripe publishable key not configured');
      }

      const instance = await loadConnectAndInitialize({
        publishableKey,
        fetchClientSecret: async () => data.data.clientSecret,
        appearance: {
          overlays: 'dialog',
          variables: {
            colorPrimary: '#FF6B35',
            colorBackground: '#ffffff',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            borderRadius: '8px'
          }
        }
      });

      setStripeConnectInstance(instance);
    } catch (err: any) {
      console.error('Error initializing Stripe Connect:', err);
      setError(err.message);
    }
  }, [status?.hasAccount]);

  // Open Stripe Dashboard
  const openDashboard = async () => {
    try {
      const currentToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stripe-connect/dashboard-link`, {
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur');
      }

      window.open(data.data.url, '_blank');
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Initialize Stripe Connect when status is available
  useEffect(() => {
    if (status?.hasAccount && status.onboardingStatus !== 'not_started') {
      initializeStripeConnect();
    }
  }, [status, initializeStripeConnect]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-[#FF6B35]" />
        <p className="mt-4 text-gray-600">Chargement...</p>
      </div>
    );
  }

  // Error state
  if (error && !status) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-800">Erreur</h3>
            <p className="text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchStatus}
              className="mt-4 flex items-center gap-2 text-red-700 hover:text-red-800 font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Reessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not started - show setup button
  if (!status?.hasAccount || status.onboardingStatus === 'not_started') {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-[#FF6B35]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-[#FF6B35]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Configurez vos paiements
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Pour recevoir vos paiements automatiquement, vous devez configurer votre compte Stripe Connect.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="p-4 bg-gray-50 rounded-xl">
            <CreditCard className="w-6 h-6 text-[#FF6B35] mb-2" />
            <h3 className="font-semibold text-gray-900">Paiements automatiques</h3>
            <p className="text-sm text-gray-600 mt-1">
              Recevez vos gains directement sur votre compte bancaire
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <Shield className="w-6 h-6 text-[#FF6B35] mb-2" />
            <h3 className="font-semibold text-gray-900">100% securise</h3>
            <p className="text-sm text-gray-600 mt-1">
              Stripe est leader mondial des paiements en ligne
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <CheckCircle className="w-6 h-6 text-[#FF6B35] mb-2" />
            <h3 className="font-semibold text-gray-900">Gratuit</h3>
            <p className="text-sm text-gray-600 mt-1">
              Pas de frais supplementaires pour les hosts
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={createAccount}
          disabled={creatingAccount}
          className="w-full py-4 bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {creatingAccount ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>Creation en cours...</span>
            </>
          ) : (
            <>
              <span>Configurer mes paiements</span>
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    );
  }

  // Onboarding completed
  if (status.onboardingStatus === 'completed' && status.payoutsEnabled) {
    return (
      <div className="space-y-6">
        {/* Success status */}
        <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-800 text-lg">
                Compte Stripe actif
              </h3>
              <p className="text-green-700 mt-1">
                Vos paiements sont configures. Vous recevrez automatiquement vos gains 24h apres chaque checkout.
              </p>
            </div>
          </div>
        </div>

        {/* Status cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-4 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">Paiements</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${status.chargesEnabled ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="font-semibold text-gray-900">
                {status.chargesEnabled ? 'Actifs' : 'En attente'}
              </span>
            </div>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">Virements</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${status.payoutsEnabled ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="font-semibold text-gray-900">
                {status.payoutsEnabled ? 'Actifs' : 'En attente'}
              </span>
            </div>
          </div>
        </div>

        {/* Dashboard access */}
        <button
          onClick={openDashboard}
          className="w-full py-3 px-4 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <span>Acceder au tableau de bord Stripe</span>
          <ExternalLink className="w-4 h-4" />
        </button>

        {/* Embedded components for completed accounts */}
        {stripeConnectInstance && (
          <div className="space-y-4">
            <div className="border-b border-gray-200">
              <nav className="flex gap-4">
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'payments'
                      ? 'border-[#FF6B35] text-[#FF6B35]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Paiements recus
                </button>
                <button
                  onClick={() => setActiveTab('payouts')}
                  className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'payouts'
                      ? 'border-[#FF6B35] text-[#FF6B35]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Virements
                </button>
              </nav>
            </div>

            <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
              {activeTab === 'payments' && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <ConnectPayments />
                </div>
              )}
              {activeTab === 'payouts' && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <ConnectPayouts />
                </div>
              )}
            </ConnectComponentsProvider>
          </div>
        )}
      </div>
    );
  }

  // Pending or restricted - show embedded onboarding
  return (
    <div className="space-y-6">
      {/* Status banner */}
      {status.onboardingStatus === 'restricted' && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800">Action requise</h3>
              <p className="text-yellow-700 text-sm mt-1">
                Des informations supplementaires sont necessaires pour activer vos paiements.
              </p>
            </div>
          </div>
        </div>
      )}

      {status.onboardingStatus === 'pending' && !status.detailsSubmitted && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <Loader className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
            <div>
              <h3 className="font-semibold text-blue-800">Configuration en cours</h3>
              <p className="text-blue-700 text-sm mt-1">
                Completez le formulaire ci-dessous pour activer vos paiements.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Embedded onboarding component */}
      {stripeConnectInstance ? (
        <div className="space-y-4">
          {/* Reassurance banner before Stripe form */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-orange-500 p-5 rounded-lg shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div className="w-full">
                <h4 className="font-bold text-orange-900 text-base mb-3 flex items-center gap-2">
                  📋 Instructions importantes - À lire avant de remplir
                </h4>
                <div className="bg-white/60 rounded-lg p-3 space-y-3 text-sm">
                  <div className="flex items-start gap-2 bg-orange-50 -mx-3 -my-1 px-3 py-2 rounded">
                    <span className="font-bold text-orange-600 text-lg">1.</span>
                    <div>
                      <p className="font-semibold text-gray-900">Secteur d'activité ⚠️ IMPORTANT</p>
                      <div className="mt-1 space-y-2">
                        <p className="text-gray-700">
                          <strong className="text-orange-700">Tapez "héber" dans le champ de recherche</strong>
                        </p>
                        <p className="text-gray-700">
                          Puis sélectionnez :<br/>
                          <span className="inline-block bg-orange-100 px-2 py-1 rounded mt-1 font-semibold text-orange-900">
                            Voyage et hébergement → Locations de biens immobiliers
                          </span>
                        </p>
                        <p className="text-xs text-gray-600 italic">
                          💡 C'est la catégorie parfaite pour les locations de logements de courte durée
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-bold text-orange-600 text-lg">2.</span>
                    <div>
                      <p className="font-semibold text-gray-900">Site web / Description</p>
                      <p className="text-gray-700 mt-0.5">
                        À la place du site web, entrez une description courte de votre activité, par exemple :
                        <span className="inline-block bg-gray-100 px-2 py-1 rounded mt-1 text-gray-800 italic">
                          "Location de logements de courte durée"
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-bold text-orange-600 text-lg">3.</span>
                    <div>
                      <p className="font-semibold text-gray-900">Documents requis</p>
                      <p className="text-gray-700 mt-0.5">Pièce d'identité (CNI/Passeport) + Coordonnées bancaires (IBAN européen)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <ConnectAccountOnboarding
                onExit={() => {
                  // Refresh status when user exits onboarding
                  fetchStatus();
                }}
              />
            </div>
          </ConnectComponentsProvider>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-[#FF6B35]" />
          <p className="mt-4 text-gray-600">Chargement du formulaire...</p>
        </div>
      )}

      {/* Pending requirements */}
      {status.requirementsPending && status.requirementsPending.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-xl">
          <h4 className="font-medium text-gray-900 mb-2">Elements requis :</h4>
          <ul className="space-y-1">
            {status.requirementsPending.slice(0, 5).map((req, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                {req.replace(/_/g, ' ')}
              </li>
            ))}
            {status.requirementsPending.length > 5 && (
              <li className="text-sm text-gray-500">
                + {status.requirementsPending.length - 5} autres
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Manual refresh */}
      <button
        onClick={fetchStatus}
        className="w-full py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Actualiser le statut</span>
      </button>
    </div>
  );
}
