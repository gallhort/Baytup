'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * This page handles the case when someone navigates to /reset-password without a token.
 * The actual reset password functionality is in /reset-password/[token]/page.tsx
 *
 * If a token is provided as a query param (?token=xxx), redirect to the path-based URL.
 * Otherwise, redirect to forgot-password page.
 */
function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenParam = searchParams.get('token');

    if (tokenParam) {
      // If token is provided as query param, redirect to path-based URL
      router.replace(`/reset-password/${tokenParam}`);
    } else {
      // No token provided, redirect to forgot-password
      router.replace('/forgot-password');
    }
  }, [searchParams, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirection...</p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Redirection...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
