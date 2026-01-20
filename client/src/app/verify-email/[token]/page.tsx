'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

import { useApp } from '@/contexts/AppContext';
import { verifyEmail } from '@/lib/auth';

export default function VerifyEmailTokenPage() {
  const router = useRouter();
  const params = useParams();
  const { setUser, setLoading } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const token = params.token as string;

  useEffect(() => {
    // Prevent running multiple times
    let isMounted = true;
    let hasRun = false;

    const handleVerification = async () => {
      if (hasRun || !isMounted) return;
      hasRun = true;

      if (!token) {
        setVerificationStatus('error');
        setErrorMessage('Invalid verification token');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        if (setLoading) setLoading(true);

        const response = await verifyEmail(token);

        if (isMounted) {
          if (response.status === 'success' || response.status === 'already_verified') {
            setVerificationStatus('success');

            if (response.status === 'already_verified') {
              toast.success('Your email is already verified! You can sign in now.');
              setErrorMessage(''); // Clear any error message
            } else {
              toast.success('Email verified successfully!');
            }

            // Log the user in automatically if they received a token
            if (response.data?.user) {
              setUser?.(response.data.user);
            }

            // Redirect to login with success message after a delay
            setTimeout(() => {
              if (isMounted) {
                router.push('/login?verified=true');
              }
            }, 3000);
          }
        }
      } catch (error: any) {
        if (isMounted) {
          console.error('Email verification error:', error);
          setVerificationStatus('error');

          if (error.message.includes('expired')) {
            setErrorMessage('Verification link has expired. Please request a new one.');
          } else if (error.message.includes('invalid')) {
            setErrorMessage('Invalid verification link. Please check the URL and try again.');
          } else {
            setErrorMessage(error.message || 'Email verification failed');
          }

          toast.error(error.message || 'Email verification failed');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          if (setLoading) setLoading(false);
        }
      }
    };

    handleVerification();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [token]); // Remove unstable dependencies

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
        </div>

        {/* Verification Status */}
        <div className="text-center">
          {verificationStatus === 'loading' && (
            <div className="space-y-4">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100">
                <Loader2 className="h-8 w-8 text-orange-600 animate-spin" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Verifying your email...
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Please wait while we verify your email address.
                </p>
              </div>
            </div>
          )}

          {verificationStatus === 'success' && (
            <div className="space-y-4">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Email Verified!
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Your email is verified and your account is active.
                  You'll be redirected to sign in shortly.
                </p>
              </div>

              {/* Success Benefits */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
                <h3 className="text-sm font-medium text-green-800 mb-2">
                  🎉 Welcome to Baytup!
                </h3>
                <p className="text-sm text-green-700 mb-3">
                  Your account is now fully activated. You can now:
                </p>
                <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
                  <li>Browse and book properties and vehicles</li>
                  <li>List your own properties or vehicles for rent</li>
                  <li>Connect with hosts and guests</li>
                  <li>Enjoy secure payment processing</li>
                </ul>
              </div>

              {/* Auto redirect countdown */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  Redirecting to sign in page in a few seconds...
                </p>
              </div>

              {/* Manual redirect button */}
              <div className="pt-4">
                <Link
                  href="/login?verified=true"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white baytup-gradient-primary hover:baytup-gradient-hover transition-all duration-200"
                >
                  Continue to sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {verificationStatus === 'error' && (
            <div className="space-y-4">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Verification failed
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {errorMessage}
                </p>
              </div>

              {/* Error Actions */}
              <div className="space-y-4 pt-4">
                {errorMessage.includes('expired') && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-yellow-800 mb-2">
                      Link expired?
                    </h3>
                    <p className="text-sm text-yellow-700 mb-3">
                      Verification links expire after 24 hours for security reasons.
                      You can request a new verification email.
                    </p>
                    <Link
                      href="/verify-email"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-yellow-700 bg-yellow-100 hover:bg-yellow-200 transition-colors"
                    >
                      Request new verification email
                    </Link>
                  </div>
                )}

                <div className="flex flex-col space-y-3">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    Back to sign in
                  </Link>

                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white baytup-gradient-primary hover:baytup-gradient-hover transition-all duration-200"
                  >
                    Create new account
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Need help?{' '}
            <Link href="/contact" className="text-orange-600 hover:text-orange-500">
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}