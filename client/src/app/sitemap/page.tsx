'use client';

import Link from 'next/link';
import { ArrowLeft, Home, Search, User, Building, MessageSquare, Settings } from 'lucide-react';

export default function SitemapPage() {
  const siteLinks = [
    {
      category: 'Main',
      icon: Home,
      links: [
        { label: 'Home', href: '/' },
        { label: 'Search', href: '/search' },
      ]
    },
    {
      category: 'Account',
      icon: User,
      links: [
        { label: 'Login', href: '/login' },
        { label: 'Sign Up', href: '/register' },
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Profile Settings', href: '/dashboard/settings' },
      ]
    },
    {
      category: 'Hosting',
      icon: Building,
      links: [
        { label: 'Become a Host', href: '/become-host' },
        { label: 'My Listings', href: '/dashboard/my-listings' },
        { label: 'Host Bookings', href: '/dashboard/host-bookings' },
      ]
    },
    {
      category: 'Guest',
      icon: Search,
      links: [
        { label: 'Browse Listings', href: '/search' },
        { label: 'My Bookings', href: '/dashboard/bookings' },
        { label: 'Travel History', href: '/dashboard/history' },
        { label: 'Favorites', href: '/dashboard/saved' },
      ]
    },
    {
      category: 'Communication',
      icon: MessageSquare,
      links: [
        { label: 'Messages', href: '/dashboard/messages' },
        { label: 'Notifications', href: '/dashboard/notifications' },
      ]
    },
    {
      category: 'Legal',
      icon: Settings,
      links: [
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Privacy Policy', href: '/privacy' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Sitemap</h1>
          <p className="mt-2 text-gray-600">Quick navigation to all pages on Baytup</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {siteLinks.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.category}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#FF6B35]/10 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#FF6B35]" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">{section.category}</h2>
                </div>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-gray-600 hover:text-[#FF6B35] transition-colors text-sm"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
