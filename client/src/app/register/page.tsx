'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User, Users, Loader2, AlertCircle, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';

import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { register as registerUser, googleLogin } from '@/lib/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { RegisterForm } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, setUser, setLoading } = useApp();
  const { language, currency } = useLanguage();
  const t = useTranslation('register');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setError,
    clearErrors,
    watch,
  } = useForm<RegisterForm>({ mode: 'onChange' });

  const watchedEmail = watch('email');
  const watchedPassword = watch('password');

  // Track password requirements
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
    noSpaces: true,
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (state.isAuthenticated) {
      const redirect = searchParams.get('redirect') || '/';
      router.push(redirect);
    }
  }, [state.isAuthenticated, router, searchParams]);

  // Update password requirements
  useEffect(() => {
    if (watchedPassword) {
      setPasswordRequirements({
        minLength: watchedPassword.length >= 8,
        hasUppercase: /[A-Z]/.test(watchedPassword),
        hasLowercase: /[a-z]/.test(watchedPassword),
        hasNumber: /[0-9]/.test(watchedPassword),
        hasSpecialChar: /[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(watchedPassword),
        noSpaces: !/\s/.test(watchedPassword),
      });
    } else {
      setPasswordRequirements({
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecialChar: false,
        noSpaces: true,
      });
    }
  }, [watchedPassword]);

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    setLoading(true);
    clearErrors();

    try {
      // Remove confirmPassword before sending to backend
      const { confirmPassword, ...registrationData } = data;
      
      const formData = {
        ...registrationData,
        role: 'guest' as const, // All users register as guests
        language: language,
        currency: currency,
      };

      const response = await registerUser(formData);

      if (response.status === 'success') {
        toast.success(response.message || (t as any)?.success?.registrationSuccess || 'Registration successful!');

        // If user is not automatically logged in due to email verification requirement
        if (!response.data?.user?.isEmailVerified) {
          router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
        } else {
          // If email is verified or not required, log them in
          if (response.data?.user) {
            setUser(response.data.user);
          }
          const redirect = searchParams.get('redirect') || '/';
          router.push(redirect);
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);

      if (error.message.includes('already exists')) {
        setError('email', { message: (t as any)?.errors?.emailExists || 'Email already exists' });
      } else if (error.message.includes('validation')) {
        toast.error((t as any)?.errors?.validation || 'Validation error');
      } else {
        toast.error(error.message || (t as any)?.errors?.registrationFailed || 'Registration failed');
      }
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      toast.error((t as any)?.errors?.googleRegistrationFailed || 'Google registration failed');
      return;
    }

    setIsLoading(true);
    setLoading(true);

    try {
      const response = await googleLogin(credentialResponse.credential);

      if (response.status === 'success' && response.data?.user) {
        setUser(response.data.user);
        toast.success((t as any)?.success?.googleRegistrationSuccess || 'Successfully registered with Google!');

        // Redirect to intended page or home
        const redirect = searchParams.get('redirect') || '/';
        router.push(redirect);
      }
    } catch (error: any) {
      console.error('Google registration error:', error);
      toast.error(error.message || (t as any)?.errors?.googleRegistrationFailed || 'Google registration failed');
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error((t as any)?.errors?.googleRegistrationFailed || 'Google registration failed');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Registration Form */}
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
              {(t as any)?.title || 'Create Your Account'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {(t as any)?.subtitle || 'Join Baytup to start your journey'}
            </p>
          </div>

          {/* Info Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">{(t as any)?.infoMessage?.title || 'Guest Registration'}</p>
                <p>
                  {(t as any)?.infoMessage?.description || 'All users register as guests. You can request host status later to list properties.'}
                </p>
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    {(t as any)?.form?.firstName?.label || 'First Name'}
                  </label>
                  <div className="mt-1">
                    <input
                      {...register('firstName', {
                        required: (t as any)?.form?.firstName?.required || 'First name is required',
                        minLength: {
                          value: 2,
                          message: (t as any)?.form?.firstName?.minLength || 'First name must be at least 2 characters',
                        },
                        maxLength: {
                          value: 50,
                          message: 'First name cannot exceed 50 characters',
                        },
                        pattern: {
                          value: /^[a-zA-ZÀ-ÿ\s'-]+$/,
                          message: 'First name can only contain letters, spaces, hyphens and apostrophes',
                        },
                      })}
                      type="text"
                      maxLength={50}
                      className={`appearance-none relative block w-full px-3 py-3 border ${
                        errors.firstName ? 'border-red-300' : 'border-gray-300'
                      } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm`}
                      placeholder={(t as any)?.form?.firstName?.placeholder || 'Enter your first name'}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.firstName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    {(t as any)?.form?.lastName?.label || 'Last Name'}
                  </label>
                  <div className="mt-1">
                    <input
                      {...register('lastName', {
                        required: (t as any)?.form?.lastName?.required || 'Last name is required',
                        minLength: {
                          value: 2,
                          message: (t as any)?.form?.lastName?.minLength || 'Last name must be at least 2 characters',
                        },
                        maxLength: {
                          value: 50,
                          message: 'Last name cannot exceed 50 characters',
                        },
                        pattern: {
                          value: /^[a-zA-ZÀ-ÿ\s'-]+$/,
                          message: 'Last name can only contain letters, spaces, hyphens and apostrophes',
                        },
                      })}
                      type="text"
                      maxLength={50}
                      className={`appearance-none relative block w-full px-3 py-3 border ${
                        errors.lastName ? 'border-red-300' : 'border-gray-300'
                      } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm`}
                      placeholder={(t as any)?.form?.lastName?.placeholder || 'Enter your last name'}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  {(t as any)?.form?.email?.label || 'Email Address'}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('email', {
                      required: (t as any)?.form?.email?.required || 'Email is required',
                      maxLength: {
                        value: 100,
                        message: 'Email cannot exceed 100 characters',
                      },
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: (t as any)?.form?.email?.invalid || 'Invalid email address',
                      },
                      validate: {
                        noSpaces: (value) => !/\s/.test(value) || 'Email cannot contain spaces',
                      },
                    })}
                    type="email"
                    maxLength={100}
                    className={`appearance-none relative block w-full pl-10 pr-3 py-3 border ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm`}
                    placeholder={(t as any)?.form?.email?.placeholder || 'Enter your email'}
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
                  {(t as any)?.form?.password?.label || 'Password'}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('password', {
                      required: (t as any)?.form?.password?.required || 'Password is required',
                      validate: {
                        allChecks: (value) => {
                          const checks = {
                            minLength: value.length >= 8,
                            hasUppercase: /[A-Z]/.test(value),
                            hasLowercase: /[a-z]/.test(value),
                            hasNumber: /[0-9]/.test(value),
                            hasSpecialChar: /[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value),
                            noSpaces: !/\s/.test(value),
                          };
                          return Object.values(checks).every(v => v) || 'Please meet all requirements';
                        },
                      },
                    })}
                    type={showPassword ? 'text' : 'password'}
                    maxLength={100}
                    className={`appearance-none relative block w-full pl-10 pr-10 py-3 border ${
                      errors.password ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm`}
                    placeholder={(t as any)?.form?.password?.placeholder || 'Enter your password'}
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
                
                {/* Password Requirements */}
                <div className="mt-2 space-y-1 text-xs">
                  <div className={`flex items-center ${passwordRequirements.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                    <span className="mr-2">{passwordRequirements.minLength ? '✅' : '⭕'}</span>
                    At least 8 characters
                  </div>
                  <div className={`flex items-center ${passwordRequirements.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
                    <span className="mr-2">{passwordRequirements.hasUppercase ? '✅' : '⭕'}</span>
                    One uppercase letter (A-Z)
                  </div>
                  <div className={`flex items-center ${passwordRequirements.hasLowercase ? 'text-green-600' : 'text-gray-500'}`}>
                    <span className="mr-2">{passwordRequirements.hasLowercase ? '✅' : '⭕'}</span>
                    One lowercase letter (a-z)
                  </div>
                  <div className={`flex items-center ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                    <span className="mr-2">{passwordRequirements.hasNumber ? '✅' : '⭕'}</span>
                    One number (0-9)
                  </div>
                  <div className={`flex items-center ${passwordRequirements.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                    <span className="mr-2">{passwordRequirements.hasSpecialChar ? '✅' : '⭕'}</span>
                    One special character (@#$%...)
                  </div>
                  <div className={`flex items-center ${passwordRequirements.noSpaces ? 'text-green-600' : 'text-gray-500'}`}>
                    <span className="mr-2">{passwordRequirements.noSpaces ? '✅' : '⭕'}</span>
                    No spaces allowed
                  </div>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: (value) => value === watchedPassword || 'Passwords do not match',
                    })}
                    type={showConfirmPassword ? 'text' : 'password'}
                    maxLength={100}
                    className={`appearance-none relative block w-full pl-10 pr-10 py-3 border ${
                      errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm`}
                    placeholder="Confirm your password"
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
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                {(t as any)?.form?.terms?.text || 'I agree to the'}{' '}
                <Link href="/terms" className="text-orange-600 hover:text-orange-500">
                  {(t as any)?.form?.terms?.termsOfService || 'Terms of Service'}
                </Link>{' '}
                {(t as any)?.form?.terms?.and || 'and'}{' '}
                <Link href="/privacy" className="text-orange-600 hover:text-orange-500">
                  {(t as any)?.form?.terms?.privacyPolicy || 'Privacy Policy'}
                </Link>
              </label>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading || !isValid}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${
                  isLoading || !isValid
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'baytup-gradient-primary hover:baytup-gradient-hover'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {(t as any)?.form?.creatingAccount || 'Creating account...'}
                  </>
                ) : (
                  ((t as any)?.form?.createAccount || 'Create {role} Account').replace('{role}', 'guest')
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">{(t as any)?.form?.orContinueWith || 'Or continue with'}</span>
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
                    text="signup_with"
                    auto_select={false}
                    itp_support={false}
                  />
                </GoogleOAuthProvider>
              </div>
            )}
          </form>

          {/* Sign in link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {(t as any)?.signIn?.text || 'Already have an account?'}{' '}
              <Link
                href="/login"
                className="font-medium text-orange-600 hover:text-orange-500 transition-colors"
              >
                {(t as any)?.signIn?.link || 'Sign in'}
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
                {(t as any)?.hero?.title || 'Join Our Community'}
              </h3>
              <p className="text-lg opacity-90">
                {(t as any)?.hero?.description || 'Discover unique places to stay and connect with hosts around the world'}
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white bg-opacity-10 rounded-lg p-3">
                  <div className="font-semibold">24/7</div>
                  <div className="opacity-75">{(t as any)?.hero?.stats?.support || 'Support'}</div>
                </div>
                <div className="bg-white bg-opacity-10 rounded-lg p-3">
                  <div className="font-semibold">{(t as any)?.hero?.stats?.securePayments || 'Secure'}</div>
                  <div className="opacity-75">{(t as any)?.hero?.stats?.payments || 'Payments'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}