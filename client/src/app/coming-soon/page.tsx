'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Construction } from 'lucide-react';

export default function ComingSoonPage() {
  const searchParams = useSearchParams();
  const page = searchParams.get('page') || 'this page';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-[#FF6B35]/10 rounded-full flex items-center justify-center">
            <Construction className="w-12 h-12 text-[#FF6B35]" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Coming Soon
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-2 capitalize">
          {page.replace(/-/g, ' ')}
        </p>
        <p className="text-gray-500 mb-8">
          We're working hard to bring you this feature. Check back soon!
        </p>

        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 bg-[#FF6B35] text-white font-medium rounded-lg hover:bg-[#E55A2B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        {/* Additional Links */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-4">
            Need help right now?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard/messages"
              className="text-sm text-[#FF6B35] hover:text-[#E55A2B] font-medium"
            >
              Contact Support
            </Link>
            <span className="hidden sm:inline text-gray-300">•</span>
            <Link
              href="/"
              className="text-sm text-[#FF6B35] hover:text-[#E55A2B] font-medium"
            >
              Browse Listings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
