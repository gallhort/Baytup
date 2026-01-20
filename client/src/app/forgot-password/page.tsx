'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { forgotPassword } from '@/lib/auth';
import { useTranslation } from '@/hooks/useTranslation';

interface ForgotPasswordForm {
  email: string;
}

export default function ForgotPasswordPage() {
  const t = useTranslation('forgot-password') as any || {};
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordForm>();

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);

    try {
      const response = await forgotPassword(data.email);

      if (response.status === 'success') {
        setEmailSent(true);
        toast.success(t?.success?.emailSent || 'Password reset email sent successfully!');
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      toast.error(error.message || t?.errors?.failedToSend || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    const email = getValues('email');
    if (!email) return;

    setIsLoading(true);

    try {
      await forgotPassword(email);
      toast.success(t?.success?.emailSentAgain || 'Password reset email sent again!');
    } catch (error: any) {
      toast.error(error.message || t?.errors?.failedToResend || 'Failed to resend email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block group">
            <h1 className="text-3xl sm:text-4xl font-bold baytup-text-primary group-hover:scale-105 transition-transform">
              Baytup
            </h1>
          </Link>
          <div className="mt-6">
            {!emailSent ? (
              <>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {t?.title || 'Forgot your password?'}
                </h2>
                <p className="mt-2 text-sm sm:text-base text-gray-600 px-2">
                  {t?.subtitle || "No worries! Enter your email address and we'll send you a link to reset your password."}
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-green-100 mb-4 animate-scale-in">
                  <CheckCircle className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {t?.successTitle || 'Check your email'}
                </h2>
                <p className="mt-2 text-sm sm:text-base text-gray-600 px-2">
                  {t?.successSubtitle || "We've sent a password reset link to"}{' '}
                  <span className="font-medium text-gray-900 break-all">{getValues('email')}</span>
                </p>
              </>
            )}
          </div>
        </div>

        {/* Form or Success Message */}
        {!emailSent ? (
          <form className="mt-6 sm:mt-8 space-y-6 bg-white rounded-2xl shadow-xl p-6 sm:p-8" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {t?.form?.email?.label || 'Email address'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('email', {
                    required: t?.form?.email?.required || 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: t?.form?.email?.invalid || 'Please enter a valid email address',
                    },
                  })}
                  type="email"
                  id="email"
                  autoComplete="email"
                  className={`appearance-none relative block w-full pl-10 pr-3 py-3 sm:py-3.5 border ${
                    errors.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-orange-500 focus:border-orange-500'
                  } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:z-10 text-sm sm:text-base transition-all`}
                  placeholder={t?.form?.email?.placeholder || 'Enter your email address'}
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span>{errors.email.message}</span>
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`group relative w-full flex justify-center items-center py-3 sm:py-3.5 px-4 border border-transparent text-sm sm:text-base font-medium rounded-lg text-white ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'baytup-gradient-primary hover:baytup-gradient-hover hover:shadow-lg'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200 transform hover:scale-[1.02]`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {t?.form?.sendingResetLink || 'Sending reset link...'}
                  </>
                ) : (
                  t?.form?.sendResetLink || 'Send reset link'
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
            {/* Email Instructions */}
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Mail className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      {t?.instructions?.title || 'Check your inbox'}
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        {t?.instructions?.description || 'Click the link in the email to reset your password. The link will expire in 10 minutes for security reasons.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resend Button */}
              <div className="text-center mt-6">
                <p className="text-sm text-gray-600 mb-3">
                  {t?.resend?.question || "Didn't receive the email?"}{' '}
                </p>
                <button
                  onClick={handleResendEmail}
                  disabled={isLoading}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg ${
                    isLoading
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                  } transition-colors`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t?.resend?.sending || 'Sending...'}
                    </>
                  ) : (
                    t?.resend?.link || 'Send again'
                  )}
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 text-gray-600" />
                  {t?.tips?.title || 'Email not showing up?'}
                </h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 mr-2 flex-shrink-0"></span>
                    <span>{t?.tips?.checkSpam || 'Check your spam or junk folder'}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 mr-2 flex-shrink-0"></span>
                    <span>{t?.tips?.checkEmail || 'Make sure you entered the correct email address'}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 mr-2 flex-shrink-0"></span>
                    <span>{t?.tips?.wait || 'Wait a few minutes for the email to arrive'}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Back to login */}
        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center text-sm sm:text-base font-medium text-orange-600 hover:text-orange-500 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            {t?.backToLogin || 'Back to sign in'}
          </Link>
        </div>

        {/* Additional Help Section */}
        <div className="text-center px-4">
          <p className="text-xs sm:text-sm text-gray-500">
            Need more help?{' '}
            <Link href="/contact" className="text-orange-600 hover:text-orange-500 font-medium">
              Contact support
            </Link>
          </p>
        </div>
      </div>

      {/* Custom Animation Styles */}
      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
