'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, ArrowLeft, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { useApp } from '@/contexts/AppContext';
import { resetPassword } from '@/lib/auth';

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const { setUser, setLoading } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const token = params.token as string;

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordForm>();

  const watchPassword = watch('password');

  useEffect(() => {
    if (!token) {
      toast.error('Invalid reset token');
      router.push('/forgot-password');
    }
  }, [token, router]);

  const onSubmit = async (data: ResetPasswordForm) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setLoading(true);

    try {
      const response = await resetPassword(token, data.password);

      if (response.status === 'success') {
        setResetSuccess(true);
        toast.success('Password reset successful!');

        // Log the user in automatically
        if (response.data?.user) {
          setUser(response.data.user);

          // Redirect to home after a short delay
          setTimeout(() => {
            router.push('/');
          }, 2000);
        } else {
          // If no user data, redirect to login
          setTimeout(() => {
            router.push('/login?reset=success');
          }, 2000);
        }
      }
    } catch (error: any) {
      console.error('Password reset error:', error);

      if (error.message.includes('expired') || error.message.includes('invalid')) {
        toast.error('Reset link has expired. Please request a new one.');
        router.push('/forgot-password');
      } else {
        toast.error(error.message || 'Password reset failed');
      }
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, text: '', color: '' };

    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) {
      return { strength, text: 'Weak', color: 'text-red-600 bg-red-100' };
    } else if (strength <= 4) {
      return { strength, text: 'Medium', color: 'text-yellow-600 bg-yellow-100' };
    } else {
      return { strength, text: 'Strong', color: 'text-green-600 bg-green-100' };
    }
  };

  const passwordStrength = getPasswordStrength(watchPassword || '');

  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <Link href="/" className="inline-block">
              <h1 className="text-3xl font-bold baytup-text-primary">
                Baytup
              </h1>
            </Link>
            <div className="mt-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                Password reset successful!
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Your password has been updated successfully. You're being redirected to your dashboard...
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        </div>
      </div>
    );
  }

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
            <h2 className="text-3xl font-bold text-gray-900">
              Reset your password
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Enter your new password below. Make sure it's strong and secure.
            </p>
          </div>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* New Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className={`appearance-none relative block w-full pl-10 pr-10 py-3 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm`}
                  placeholder="Enter your new password"
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

              {/* Password Strength Indicator */}
              {watchPassword && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            passwordStrength.strength <= 2
                              ? 'bg-red-500'
                              : passwordStrength.strength <= 4
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                          }`}
                          style={{ width: `${(passwordStrength.strength / 6) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${passwordStrength.color}`}>
                      {passwordStrength.text}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm new password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) =>
                      value === watchPassword || 'Passwords do not match',
                  })}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`appearance-none relative block w-full pl-10 pr-10 py-3 border ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm`}
                  placeholder="Confirm your new password"
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

          {/* Password Requirements */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Password requirements:
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center">
                <div className={`h-2 w-2 rounded-full mr-2 ${
                  watchPassword && watchPassword.length >= 6 ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                At least 6 characters
              </li>
              <li className="flex items-center">
                <div className={`h-2 w-2 rounded-full mr-2 ${
                  watchPassword && /[A-Z]/.test(watchPassword) ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                One uppercase letter
              </li>
              <li className="flex items-center">
                <div className={`h-2 w-2 rounded-full mr-2 ${
                  watchPassword && /[0-9]/.test(watchPassword) ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                One number
              </li>
            </ul>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'baytup-gradient-primary hover:baytup-gradient-hover'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Updating password...
                </>
              ) : (
                'Update password'
              )}
            </button>
          </div>
        </form>

        {/* Back to login */}
        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center text-sm font-medium text-orange-600 hover:text-orange-500 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}