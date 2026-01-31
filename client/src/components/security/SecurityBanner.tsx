'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SecurityBannerProps {
  className?: string;
}

interface SecurityStatus {
  twoFactorEnabled: boolean;
  shouldEnable: boolean;
  reason: string;
}

export default function SecurityBanner({ className = '' }: SecurityBannerProps) {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await fetch('/api/auth/2fa/status', { credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
          setStatus(data);
        }
      } catch (error) {
        console.error('Error loading 2FA status:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStatus();

    // Check if user dismissed banner (stored in sessionStorage)
    const dismissedState = sessionStorage.getItem('security-banner-dismissed');
    if (dismissedState === 'true') {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('security-banner-dismissed', 'true');
  };

  // Don't show if loading, dismissed, 2FA enabled, or not recommended
  if (loading || dismissed || status?.twoFactorEnabled || !status?.shouldEnable) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 rounded-lg shadow-md ${className}`}>
      <div className="p-4 sm:p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
              🔒 Sécurisez votre compte hôte
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              {status.reason}
            </p>

            {/* Benefits list */}
            <ul className="space-y-1 text-xs sm:text-sm text-gray-600 mb-4">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Protégez vos revenus et payouts</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Empêchez l'accès non autorisé</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Configuration en 5 minutes</span>
              </li>
            </ul>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/security"
                className="inline-flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-yellow-600 text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Activer la 2FA
              </Link>
              <button
                onClick={handleDismiss}
                className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
              >
                Plus tard
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Dismiss button (desktop) */}
          <button
            onClick={handleDismiss}
            className="hidden sm:block flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
