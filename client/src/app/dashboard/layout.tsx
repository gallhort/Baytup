'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHeaderHeight } from '@/hooks/useHeaderHeight';
import { useTranslation } from '@/hooks/useTranslation';
import {
  FaTachometerAlt, FaHeart,
  FaListAlt, FaCog, FaSignOutAlt, FaBars, FaTimes,
  FaBed, FaUsers, FaClipboardList,
  FaEnvelope, FaHistory, FaMapMarkerAlt, FaStar,
  FaShoppingCart, FaFileInvoiceDollar, FaMoneyBillWave, FaBell,
  FaExclamationTriangle, FaCreditCard, FaShieldAlt
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { IconType } from 'react-icons';
import MobileBottomNav from '@/components/dashboard/MobileBottomNav';

// Types pour les items du menu
interface MenuSection {
  type: 'section';
  title: string;
  icon: string;
  color: string;
}

interface MenuDivider {
  type: 'divider';
}

interface MenuItem {
  icon: IconType;
  label: string;
  href: string;
  color: string;
  badge?: number;
}

type MenuItemType = MenuSection | MenuDivider | MenuItem;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { state, logout } = useApp();
  const { language } = useLanguage();
  const user = state.user;
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [hasEurListings, setHasEurListings] = useState(false);
  const headerHeight = useHeaderHeight();
  const t = useTranslation('sidebar');

  // Check if current language is RTL
  const isRTL = language === 'ar';

  // Check if we're on a full-screen page (listing editor, messages)
  const isListingEditorPage = pathname?.startsWith('/dashboard/my-listings/edit/')
    || pathname === '/dashboard/my-listings/create';
  const isFullScreenPage = pathname === '/dashboard/messages' || isListingEditorPage;

  // ✅ FIX: Prevent body scroll when on full-screen pages
  useEffect(() => {
    if (isFullScreenPage) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [pathname, isFullScreenPage]);

  // Define menu items with separate Guest and Host sections
  const getMenuItems = (): MenuItemType[] => {
    if (!user) return [];

    const commonItems = [
      {
        icon: FaBell,
        label: (t as any)?.menuItems?.common?.notifications || 'Notifications',
        href: '/dashboard/notifications',
        color: 'text-orange-500'
      },
      {
        icon: FaEnvelope,
        label: (t as any)?.menuItems?.common?.messages || 'Messages',
        href: '/dashboard/messages',
        color: 'text-green-500',
        badge: unreadMessagesCount // ✅ FIX BQ-31: Show unread messages count
      },
      {
        icon: FaCog,
        label: (t as any)?.menuItems?.common?.settings || 'Settings',
        href: '/dashboard/settings',
        color: 'text-gray-500'
      }
    ];

    if (user.role === 'admin') {
      return [
        {
          type: 'section',
          title: 'ADMINISTRATION',
          icon: '⚙️',
          color: 'text-purple-600'
        },
        {
          icon: FaTachometerAlt,
          label: (t as any)?.menuItems?.common?.dashboard || 'Dashboard',
          href: '/dashboard',
          color: 'text-blue-500'
        },
        {
          icon: FaUsers,
          label: (t as any)?.menuItems?.admin?.users || 'Users',
          href: '/dashboard/users',
          color: 'text-purple-500'
        },
        {
          icon: FaClipboardList,
          label: (t as any)?.menuItems?.admin?.hostApplications || 'Host Applications',
          href: '/dashboard/host-applications',
          color: 'text-yellow-500'
        },
        {
          icon: FaListAlt,
          label: (t as any)?.menuItems?.admin?.allListings || 'All Listings',
          href: '/dashboard/listings',
          color: 'text-indigo-500'
        },
        {
          icon: FaShoppingCart,
          label: (t as any)?.menuItems?.admin?.bookings || 'Bookings',
          href: '/dashboard/bookings',
          color: 'text-orange-500'
        },
        {
          icon: FaExclamationTriangle,
          label: (t as any)?.menuItems?.admin?.disputes || 'Litiges',
          href: '/dashboard/admin/disputes',
          color: 'text-orange-600'
        },
        {
          icon: FaMoneyBillWave,
          label: (t as any)?.menuItems?.admin?.payouts || 'Payouts',
          href: '/dashboard/payouts',
          color: 'text-green-600'
        },
        {
          icon: FaShieldAlt,
          label: 'Modération',
          href: '/dashboard/admin/moderation',
          color: 'text-red-500'
        },
        { type: 'divider' },
        ...commonItems
      ];
    }

    // For host or users who can be both guest and host
    const sections: MenuItemType[] = [];

    // Guest section - always show for non-admin users
    sections.push(
      {
        type: 'section',
        title: (t as any)?.sections?.guest?.title || 'EN TANT QUE VOYAGEUR',
        icon: '🧳',
        color: 'text-blue-600'
      },
      {
        icon: FaShoppingCart,
        label: (t as any)?.menuItems?.guest?.myTrips || 'Mes Voyages Réservés',
        href: '/dashboard/bookings',
        color: 'text-orange-500',
        badge: ((user as any).stats?.guestBookingsCount || 0) as number
      },
      {
        icon: FaHeart,
        label: (t as any)?.menuItems?.guest?.favorites || 'Favoris',
        href: '/dashboard/saved',
        color: 'text-red-500'
      },
      {
        icon: FaHistory,
        label: (t as any)?.menuItems?.guest?.travelHistory || 'Historique de Voyage',
        href: '/dashboard/history',
        color: 'text-purple-500'
      },
      {
        icon: FaStar,
        label: (t as any)?.menuItems?.guest?.myReviews || 'Mes Avis Donnés',
        href: '/dashboard/reviews',
        color: 'text-yellow-500'
      },
      // ✅ NOUVEAU : Lien Mes Signalements
      {
        icon: FaExclamationTriangle,
        label: (t as any)?.menuItems?.guest?.myDisputes || 'Mes Signalements',
        href: '/dashboard/disputes',
        color: 'text-orange-600'
      }
    );

    // Host section - show if user is host
    if (user.role === 'host') {
      sections.push(
        { type: 'divider' },
        {
          type: 'section',
          title: (t as any)?.sections?.host?.title || 'EN TANT QU\'HÔTE',
          icon: '🏠',
          color: 'text-orange-600'
        },
        {
          icon: FaTachometerAlt,
          label: (t as any)?.menuItems?.host?.dashboard || 'Dashboard Hôte',
          href: '/dashboard',
          color: 'text-blue-500'
        },
        {
          icon: FaBed,
          label: (t as any)?.menuItems?.host?.myListings || 'Mes Annonces',
          href: '/dashboard/my-listings',
          color: 'text-indigo-500',
          badge: ((user as any).stats?.hostListingsCount || 0) as number
        },
        {
          icon: FaShoppingCart,
          label: (t as any)?.menuItems?.host?.receivedBookings || 'Réservations Reçues',
          href: '/dashboard/host-bookings',
          color: 'text-orange-500',
          badge: ((user as any).stats?.hostBookingsCount || 0) as number
        },
        // ✅ NOUVEAU : Lien Signalements Host
        {
          icon: FaExclamationTriangle,
          label: (t as any)?.menuItems?.host?.disputes || 'Signalements',
          href: '/dashboard/host-disputes',
          color: 'text-orange-600'
        },
        {
          icon: FaStar,
          label: (t as any)?.menuItems?.host?.receivedReviews || 'Avis Reçus',
          href: '/dashboard/host-reviews',
          color: 'text-yellow-500'
        },
        {
          icon: FaFileInvoiceDollar,
          label: (t as any)?.menuItems?.host?.earnings || 'Revenus',
          href: '/dashboard/earnings',
          color: 'text-green-600'
        }
      );

      // Only show Stripe Connect menu if host has EUR listings
      if (hasEurListings) {
        sections.push({
          icon: FaCreditCard,
          label: (t as any)?.menuItems?.host?.stripePayments || 'Paiements EUR (Stripe)',
          href: '/dashboard/host-payments',
          color: 'text-purple-600'
        });
      }
    }

    // Common items at the end
    sections.push(
      { type: 'divider' },
      ...commonItems
    );

    return sections;
  };

  const menuItems = getMenuItems();

  // Redirect if not logged in (only after auth check is complete)
  useEffect(() => {
    if (state.isInitialized && !user) {
      router.push('/login');
    }
  }, [state.isInitialized, user, router]);

  // Check if user has EUR listings (for Stripe Connect menu visibility)
  useEffect(() => {
    if (!user || user.role !== 'host') return;

    const checkEurListings = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/listings/my/listings?limit=100`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          const listings = data.data?.listings || [];

          // Check if at least one listing has EUR currency
          const hasEur = listings.some((listing: any) =>
            listing.pricing?.currency?.toUpperCase() === 'EUR'
          );

          setHasEurListings(hasEur);
        }
      } catch (error) {
        console.error('[DashboardLayout] Error checking EUR listings:', error);
      }
    };

    checkEurListings();
  }, [user?.id, user?.role]);

  // ✅ FIX BQ-31: Fetch unread messages count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/messages/conversations`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          const conversations = data.data?.conversations || [];

          // Calculate total unread messages across all conversations
          const totalUnread = conversations.reduce(
            (sum: number, conv: any) => sum + (conv.unreadCount || 0),
            0
          );

          setUnreadMessagesCount(totalUnread);
        }
      } catch (error) {
        console.error('[DashboardLayout] Error fetching unread messages:', error);
      }
    };

    fetchUnreadCount();

    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    router.push('/');
    toast.success((t as any)?.messages?.loggedOut || 'Logged out successfully');
  };

  if (!user) {
    return null;
  }

  // For full-screen pages like listing editor, render children directly without sidebar
  if (isListingEditorPage) {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-gray-50 transition-all duration-300 ${isFullScreenPage ? 'overflow-hidden' : ''}`}
      style={{
        paddingTop: isFullScreenPage ? '0' : (headerHeight ? `${headerHeight}px` : '96px'),
        ...(isFullScreenPage ? { height: '100vh', maxHeight: '100vh' } : {})
      }}
    >

      {/* Sidebar */}
      <div
        className={`fixed bottom-0 z-40 w-64 bg-white shadow-xl transform transition-all duration-300 ease-in-out ${
          isRTL ? 'right-0' : 'left-0'
        } ${
          sidebarOpen
            ? 'translate-x-0'
            : isRTL ? 'translate-x-full' : '-translate-x-full'
        } lg:translate-x-0`}
        style={{
          top: headerHeight ? `${headerHeight}px` : '96px'
        }}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Close Button */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-100">
            <span className="font-semibold text-gray-900">Menu</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Fermer le menu"
            >
              <FaTimes size={18} className="text-gray-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto pb-20 lg:pb-4">
            {menuItems.map((item, index) => {
              // Render section header
              if ('type' in item && item.type === 'section') {
                const section = item as MenuSection;
                return (
                  <div
                    key={index}
                    className={`flex items-center px-2 py-3 mb-2 mt-4 ${
                      isRTL ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <span className={`text-2xl ${isRTL ? 'ml-2' : 'mr-2'}`}>{section.icon}</span>
                    <span className={`text-xs font-bold tracking-wider uppercase ${section.color}`}>
                      {section.title}
                    </span>
                  </div>
                );
              }

              // Render divider
              if ('type' in item && item.type === 'divider') {
                return (
                  <div key={index} className="my-3 border-t border-gray-200"></div>
                );
              }

              // Render menu item - TypeScript knows it's MenuItem here
              const menuItem = item as MenuItem;
              const isActive = pathname === menuItem.href;
              const IconComponent = menuItem.icon;
              
              return (
                <Link
                  key={index}
                  href={menuItem.href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 mb-1 relative ${
                    isRTL ? 'flex-row-reverse' : 'flex-row'
                  } ${
                    isActive
                      ? `${isRTL ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-primary-50 to-primary-100 text-primary-600 shadow-sm`
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <IconComponent
                    className={`${menuItem.color} ${isActive ? 'text-primary-600' : ''} ${
                      isRTL ? 'ml-3' : 'mr-3'
                    }`}
                    size={18}
                  />
                  <span className="font-medium flex-1">{menuItem.label}</span>
                  {menuItem.badge !== undefined && menuItem.badge > 0 && (
                    <span className={`${isRTL ? 'mr-auto' : 'ml-auto'} bg-primary-500 text-white text-xs font-bold px-2 py-1 rounded-full`}>
                      {menuItem.badge}
                    </span>
                  )}
                  {isActive && (
                    <div
                      className={`w-1 h-6 bg-primary-500 rounded-full ${
                        isRTL ? 'mr-auto' : 'ml-auto'
                      }`}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 ${
                isRTL ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <FaSignOutAlt className={isRTL ? 'ml-3' : 'mr-3'} />
              <span className="font-medium">{(t as any)?.actions?.logout || 'Logout'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="transition-all duration-300">
        <style jsx>{`
          @media (min-width: 1024px) {
            .main-content {
              ${!isRTL ? 'margin-left: 16rem;' : 'margin-right: 16rem;'}
            }
          }
        `}</style>
        <div className="main-content">
          {/* Page content - Added pb-20 on mobile for bottom nav */}
          <div className={isFullScreenPage ? '' : 'p-6 pb-24 lg:pb-6'}>
            {children}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation (Airbnb style) */}
      {!isFullScreenPage && <MobileBottomNav onMenuClick={() => setSidebarOpen(true)} userRole={user.role} />}

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}