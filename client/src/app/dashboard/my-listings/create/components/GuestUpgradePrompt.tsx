'use client';

import Link from 'next/link';
import { Home, ArrowRight } from 'lucide-react';

interface GuestUpgradePromptProps {
  t: any;
}

export default function GuestUpgradePrompt({ t }: GuestUpgradePromptProps) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Home className="w-10 h-10 text-[#FF6B35]" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          {t.guestUpgrade?.title || 'Become a host'}
        </h1>

        <p className="text-lg text-gray-500 mb-8 leading-relaxed">
          {t.guestUpgrade?.description || 'To create listings, you need to apply to become a host. It only takes a few minutes.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/become-host"
            className="inline-flex items-center justify-center gap-2 bg-[#FF6B35] text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-[#e55a2b] transition-colors shadow-lg"
          >
            {t.guestUpgrade?.cta || 'Apply to host'}
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 text-gray-600 px-6 py-4 rounded-full text-base font-medium hover:bg-gray-100 transition-colors"
          >
            {t.guestUpgrade?.back || 'Back to dashboard'}
          </Link>
        </div>
      </div>
    </div>
  );
}
