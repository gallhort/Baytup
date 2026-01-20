'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

import { resendVerification } from '@/lib/auth';
import { useTranslation } from '@/hooks/useTranslation';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslation('verify-email') as any || {};
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  const handleResendEmail = async () => {
    if (!email) {
      toast.error(t?.errors?.emailRequired || 'Email address is required');
      return;
    }

    setIsLoading(true);

    try {
      const response = await resendVerification(email);

      if (response.status === 'success') {
        toast.success(t?.success?.emailSent || 'Verification email sent successfully!');
      }
    } catch (error: any) {
      console.error('Resend verification error:', error);
      toast.error(error.message || t?.errors?.resendFailed || 'Failed to resend verification email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold baytup-text-primary">
              Baytup
            </h1>
          </Link>
          <div className="mt-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 mb-4">
              <Mail className="h-8 w-8 text-orange-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              {t?.title || 'Verify your email'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {t?.subtitle || "We've sent a verification link to"}{' '}
              {email && (
                <span className="font-medium text-gray-900">{email}</span>
              )}
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  {t?.instructions?.title || 'Check your inbox'}
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    {t?.instructions?.description || 'Click the verification link in the email to activate your account. The link will expire in 24 hours.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Resend Email */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              {t?.resend?.question || "Didn't receive the email?"}
            </p>
            <button
              onClick={handleResendEmail}
              disabled={isLoading || !email}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg ${
                isLoading || !email
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              } transition-colors`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t?.resend?.sending || 'Sending...'}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t?.resend?.button || 'Resend verification email'}
                </>
              )}
            </button>
          </div>

          {/* Email Input for Resend */}
          {!email && (
            <div className="space-y-4">
              <div className="border-t border-gray-200 pt-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  {t?.emailInput?.label || 'Enter your email address'}
                </label>
                <div className="flex space-x-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                    placeholder={t?.emailInput?.placeholder || 'your@email.com'}
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleResendEmail}
                    disabled={isLoading || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
                    className={`px-4 py-2 border border-transparent text-sm font-medium rounded-lg ${
                      isLoading || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'baytup-gradient-primary text-white hover:baytup-gradient-hover'
                    } transition-colors`}
                  >
                    {t?.emailInput?.send || 'Send'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              {t?.tips?.title || 'Email not showing up?'}
            </h4>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>{t?.tips?.checkSpam || 'Check your spam or junk folder'}</li>
              <li>{t?.tips?.checkEmail || 'Make sure you entered the correct email address'}</li>
              <li>{t?.tips?.wait || 'Wait a few minutes for the email to arrive'}</li>
              <li>{t?.tips?.addContact || 'Add contact@baytup.fr to your email contacts'}</li>
            </ul>
          </div>

          {/* Account Benefits */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-orange-900 mb-2">
              {t?.benefits?.title || 'Why verify your email?'}
            </h4>
            <ul className="text-sm text-orange-800 space-y-1 list-disc list-inside">
              <li>{t?.benefits?.security || 'Secure your account and enable password recovery'}</li>
              <li>{t?.benefits?.notifications || 'Receive important booking and hosting notifications'}</li>
              <li>{t?.benefits?.updates || 'Get updates on new features and special offers'}</li>
              <li>{t?.benefits?.trust || 'Build trust with other users on the platform'}</li>
            </ul>
          </div>
        </div>

        {/* Back to login */}
        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center text-sm font-medium text-orange-600 hover:text-orange-500 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t?.backToLogin || 'Back to sign in'}
          </Link>
        </div>
      </div>
    </div>
  );
}