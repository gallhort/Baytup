'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, ArrowLeft, Loader2, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { resetPassword } from '@/lib/auth';
import { useTranslation } from '@/hooks/useTranslation';

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslation('reset-password') as any || {};
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    clearErrors,
  } = useForm<ResetPasswordForm>();

  const watchedPassword = watch('password');

  // Get token from URL
  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setTokenError(t?.errors?.invalidToken || 'Invalid or missing reset token');
    } else {
      setToken(tokenParam);
    }
  }, [searchParams, t]);

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      toast.error(t?.errors?.invalidToken || 'Invalid reset token');
      return;
    }

    setIsLoading(true);

    try {
      const response = await resetPassword(token, data.password);

      if (response.status === 'success') {
        setPasswordReset(true);
        toast.success(t?.success?.passwordReset || 'Password reset successfully!');

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } catch (error: any) {
      console.error('Reset password error:', error);

      if (error.message.includes('expired')) {
        setTokenError(t?.errors?.tokenExpired || 'Reset link has expired');
        toast.error(t?.errors?.tokenExpired || 'Reset link has expired');
      } else if (error.message.includes('invalid')) {
        setTokenError(t?.errors?.invalidToken || 'Invalid reset token');
        toast.error(t?.errors?.invalidToken || 'Invalid reset token');
      } else {
        toast.error(error.message || t?.errors?.resetFailed || 'Failed to reset password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength validation
  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength, label: t?.form?.password?.weak || 'Weak', color: 'text-red-600' };
    if (strength <= 4) return { strength, label: t?.form?.password?.medium || 'Medium', color: 'text-yellow-600' };
    return { strength, label: t?.form?.password?.strong || 'Strong', color: 'text-green-600' };
  };

  const passwordStrength = getPasswordStrength(watchedPassword || '');

  // Show token error if token is invalid or expired
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 sm:space-y-8">
          <div className="text-center">
            <Link href="/" className="inline-block group">
              <h1 className="text-3xl sm:text-4xl font-bold baytup-text-primary group-hover:scale-105 transition-transform">
                Baytup
              </h1>
            </Link>
            <div className="mt-6">
              <div className="mx-auto flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-red-100 mb-4">
                <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8 text-red-600" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {t?.invalidToken?.title || 'Invalid Reset Link'}
              </h2>
              <p className="mt-2 text-sm sm:text-base text-gray-600 px-2">
                {tokenError}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h4 className="text-sm font-medium text-red-900 mb-3">
                {t?.invalidToken?.reasons || 'This could be because:'}
              </h4>
              <ul className="text-sm text-red-800 space-y-2">
                <li className="flex items-start">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 mr-2 flex-shrink-0"></span>
                  <span>{t?.invalidToken?.reasonExpired || 'The reset link has expired (links are valid for 10 minutes)'}</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 mr-2 flex-shrink-0"></span>
                  <span>{t?.invalidToken?.reasonUsed || 'The link has already been used'}</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 mr-2 flex-shrink-0"></span>
                  <span>{t?.invalidToken?.reasonIncomplete || 'The link is incomplete or corrupted'}</span>
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <Link
                href="/forgot-password"
                className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white baytup-gradient-primary hover:baytup-gradient-hover hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
              >
                {t?.invalidToken?.requestNew || 'Request a new reset link'}
              </Link>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-sm sm:text-base font-medium text-orange-600 hover:text-orange-500 transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
              {t?.backToLogin || 'Back to sign in'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            {!passwordReset ? (
              <>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {t?.title || 'Reset your password'}
                </h2>
                <p className="mt-2 text-sm sm:text-base text-gray-600 px-2">
                  {t?.subtitle || 'Enter your new password below'}
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-green-100 mb-4 animate-scale-in">
                  <CheckCircle className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {t?.successTitle || 'Password reset successful!'}
                </h2>
                <p className="mt-2 text-sm sm:text-base text-gray-600 px-2">
                  {t?.successSubtitle || 'You can now sign in with your new password'}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Form or Success Message */}
        {!passwordReset ? (
          <form className="mt-6 sm:mt-8 space-y-6 bg-white rounded-2xl shadow-xl p-6 sm:p-8" onSubmit={handleSubmit(onSubmit)}>
            {/* New Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {t?.form?.password?.label || 'New password'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('password', {
                    required: t?.form?.password?.required || 'Password is required',
                    minLength: {
                      value: 8,
                      message: t?.form?.password?.minLength || 'Password must be at least 8 characters',
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                      message: t?.form?.password?.pattern || 'Password must contain uppercase, lowercase, and number',
                    },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="new-password"
                  className={`appearance-none relative block w-full pl-10 pr-10 py-3 sm:py-3.5 border ${
                    errors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-orange-500 focus:border-orange-500'
                  } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:z-10 text-sm sm:text-base transition-all`}
                  placeholder={t?.form?.password?.placeholder || 'Enter your new password'}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span>{errors.password.message}</span>
                </p>
              )}
              {watchedPassword && !errors.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">{t?.form?.password?.strength || 'Password strength'}:</span>
                    <span className={`text-xs font-medium ${passwordStrength.color}`}>{passwordStrength.label}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        passwordStrength.strength <= 2 ? 'bg-red-600' : passwordStrength.strength <= 4 ? 'bg-yellow-600' : 'bg-green-600'
                      }`}
                      style={{ width: `${(passwordStrength.strength / 6) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                {t?.form?.confirmPassword?.label || 'Confirm new password'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ShieldCheck className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('confirmPassword', {
                    required: t?.form?.confirmPassword?.required || 'Please confirm your password',
                    validate: (value) =>
                      value === watchedPassword || (t?.form?.confirmPassword?.mismatch || 'Passwords do not match'),
                  })}
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  autoComplete="new-password"
                  className={`appearance-none relative block w-full pl-10 pr-10 py-3 sm:py-3.5 border ${
                    errors.confirmPassword ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-orange-500 focus:border-orange-500'
                  } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:z-10 text-sm sm:text-base transition-all`}
                  placeholder={t?.form?.confirmPassword?.placeholder || 'Re-enter your new password'}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span>{errors.confirmPassword.message}</span>
                </p>
              )}
            </div>

            {/* Password Requirements */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
                <Lock className="h-4 w-4 mr-2 text-blue-600" />
                {t?.requirements?.title || 'Password requirements:'}
              </h4>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0"></span>
                  <span>{t?.requirements?.length || 'At least 8 characters long'}</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0"></span>
                  <span>{t?.requirements?.uppercase || 'Contains at least one uppercase letter'}</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0"></span>
                  <span>{t?.requirements?.lowercase || 'Contains at least one lowercase letter'}</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0"></span>
                  <span>{t?.requirements?.number || 'Contains at least one number'}</span>
                </li>
              </ul>
            </div>

            {/* Submit Button */}
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
                    {t?.form?.resetting || 'Resetting password...'}
                  </>
                ) : (
                  t?.form?.resetPassword || 'Reset password'
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
            {/* Success Message */}
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      {t?.success?.title || 'Password updated successfully'}
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>
                        {t?.success?.description || 'Your password has been reset successfully. You will be redirected to the login page in a few seconds.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  href="/login"
                  className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white baytup-gradient-primary hover:baytup-gradient-hover hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                >
                  {t?.success?.signIn || 'Sign in now'}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Back to login */}
        {!passwordReset && (
          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-sm sm:text-base font-medium text-orange-600 hover:text-orange-500 transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
              {t?.backToLogin || 'Back to sign in'}
            </Link>
          </div>
        )}
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
