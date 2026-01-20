'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';

import { useApp } from '@/contexts/AppContext';
import { login, googleLogin } from '@/lib/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { LoginForm } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, setUser, setLoading } = useApp();
  const t = useTranslation('login') as any;
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<LoginForm>();

  // Redirect if already authenticated
  useEffect(() => {
    if (state.isAuthenticated) {
      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
    }
  }, [state.isAuthenticated, router, searchParams]);

  // Check for verification success message
  useEffect(() => {
    const verified = searchParams.get('verified');
    if (verified === 'true') {
      toast.success(t.success.emailVerified);
    }
  }, [searchParams, t]);

  const onSubmit = async (data: LoginForm) => {
    // Prevent any page reload
    if (isLoading) return;

    setIsLoading(true);
    setLoading(true);
    clearErrors();
    setVerificationError(null);

    try {
      const response = await login(data);

      if (response.status === 'success' && response.data?.user) {
        setUser(response.data.user);
        toast.success(t.success.loginSuccess);

        // ✅ FIX BQ-53: Wait for state to update before redirecting
        await new Promise(resolve => setTimeout(resolve, 150));

        // Redirect to intended page or home
        const redirect = searchParams.get('redirect') || '/';
        router.push(redirect);
      }
    } catch (error: any) {
      console.error('Login error:', error);

      if (error.message.includes('credentials')) {
        setError('email', { message: t.errors.invalidCredentials });
        setError('password', { message: t.errors.invalidCredentials });
      } else if (error.message.includes('verify') || error.needsVerification) {
        // Set persistent error message
        setVerificationError(error.message || t.errors.emailNotVerified);

        // Show email verification error with link to resend
        toast.error(
          <div>
            <p className="font-semibold mb-1">{error.message || t.errors.emailNotVerified}</p>
            <button
              onClick={() => router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)}
              className="mt-2 px-3 py-1 bg-white text-orange-600 border border-orange-600 rounded hover:bg-orange-50 text-sm font-medium transition-colors"
            >
              {t.form.resendVerification}
            </button>
          </div>,
          {
            duration: 15000, // Show for 15 seconds
            style: {
              maxWidth: '500px',
              padding: '16px',
              fontSize: '14px'
            }
          }
        );
        // Also set form error for visual feedback
        setError('email', { message: t.form.emailVerificationRequired });
      } else {
        toast.error(error.message || t.errors.loginFailed, {
          duration: 10000 // Show for 10 seconds
        });
      }
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      toast.error(t.errors.googleLoginFailed);
      return;
    }

    setIsLoading(true);
    setLoading(true);

    try {
      const response = await googleLogin(credentialResponse.credential);

      if (response.status === 'success' && response.data?.user) {
        setUser(response.data.user);
        toast.success(t.success.googleLoginSuccess);

        // ✅ FIX BQ-53: Wait for state to update before redirecting
        await new Promise(resolve => setTimeout(resolve, 150));

        // Redirect to intended page or home
        const redirect = searchParams.get('redirect') || '/';
        router.push(redirect);
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      toast.error(error.message || t.errors.googleLoginFailed);
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error(t.errors.googleLoginFailed);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <Link href="/" className="inline-block">
              <h1 className="text-3xl font-bold baytup-text-primary">
                Baytup
              </h1>
            </Link>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              {t.title}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {t.subtitle}
            </p>
          </div>

          {/* Persistent Email Verification Error */}
          {verificationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-pulse">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-red-800 text-sm font-medium">
                    {verificationError}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const email = (document.getElementById('email') as HTMLInputElement)?.value;
                      if (email) {
                        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
                      }
                    }}
                    className="mt-2 inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  >
                    {t.form.resendVerification}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setVerificationError(null)}
                  className="ml-3 inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500 transition-colors"
                >
                  <span className="sr-only">{t.form.dismiss}</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form
            className="mt-8 space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(onSubmit)(e);
            }}
            noValidate>
            <div className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  {t.form.email.label}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('email', {
                      required: t.form.email.required,
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: t.form.email.invalid,
                      },
                    })}
                    type="email"
                    className={`appearance-none relative block w-full pl-10 pr-3 py-3 border ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm`}
                    placeholder={t.form.email.placeholder}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  {t.form.password.label}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('password', {
                      required: t.form.password.required,
                    })}
                    type={showPassword ? 'text' : 'password'}
                    className={`appearance-none relative block w-full pl-10 pr-10 py-3 border ${
                      errors.password ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm`}
                    placeholder={t.form.password.placeholder}
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
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>

            {/* Remember me and Forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  disabled={isLoading}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  {t.form.rememberMe}
                </label>
              </div>

              <div className="text-sm">
                <Link
                  href="/forgot-password"
                  className="font-medium text-orange-600 hover:text-orange-500 transition-colors"
                >
                  {t.form.forgotPassword}
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                onClick={(e) => {
                  if (isLoading) {
                    e.preventDefault();
                    return false;
                  }
                }}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'baytup-gradient-primary hover:baytup-gradient-hover'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {t.form.signingIn}
                  </>
                ) : (
                  t.form.signIn
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">{t.form.orContinueWith}</span>
              </div>
            </div>

            {/* Google Login */}
            {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
              <div className="flex justify-center">
                <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="outline"
                    size="large"
                    width="384"
                    text="signin_with"
                    auto_select={false}
                    itp_support={false}
                  />
                </GoogleOAuthProvider>
              </div>
            )}
          </form>

          {/* Sign up link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {t.signUp.text}{' '}
              <Link
                href="/register"
                className="font-medium text-orange-600 hover:text-orange-500 transition-colors"
              >
                {t.signUp.link}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Hero Image */}
      <div className="hidden lg:block relative flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600">
          <div className="absolute inset-0 bg-black bg-opacity-20" />
          <div
            className="h-full bg-cover bg-center"
            style={{
              backgroundImage: "url('/images/hero-background.jpg')",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-white text-center p-8">
            <div className="max-w-md">
              <h3 className="text-3xl font-bold mb-4">
                {t.hero.title}
              </h3>
              <p className="text-lg opacity-90">
                {t.hero.description}
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white bg-opacity-10 rounded-lg p-3">
                  <div className="font-semibold">1000+</div>
                  <div className="opacity-75">{t.hero.stats.properties}</div>
                </div>
                <div className="bg-white bg-opacity-10 rounded-lg p-3">
                  <div className="font-semibold">500+</div>
                  <div className="opacity-75">{t.hero.stats.vehicles}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
