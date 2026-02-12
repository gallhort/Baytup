'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, MessageSquare, Briefcase, Menu, LayoutDashboard, Heart
} from 'lucide-react';

interface NavItem {
  href: string;
  icon: any;
  label: string;
  activeMatch?: string[];
  isMenuButton?: boolean;
}

interface MobileBottomNavProps {
  onMenuClick?: () => void;
  userRole?: 'guest' | 'host' | 'admin';
}

export default function MobileBottomNav({ onMenuClick, userRole = 'guest' }: MobileBottomNavProps) {
  const pathname = usePathname();

  // Navigation adaptée selon le rôle
  // Host = peut être voyageur ET hôte, donc on montre les deux
  // Guest = voyageur uniquement
  const getNavItems = (): NavItem[] => {
    const commonStart: NavItem[] = [
      {
        href: '/dashboard',
        icon: Home,
        label: 'Accueil',
        activeMatch: ['/dashboard']
      },
    ];

    const commonEnd: NavItem[] = [
      {
        href: '/dashboard/messages',
        icon: MessageSquare,
        label: 'Messages',
        activeMatch: ['/dashboard/messages']
      },
      {
        href: '#',
        icon: Menu,
        label: 'Plus',
        activeMatch: ['/dashboard/settings', '/dashboard/reviews', '/dashboard/disputes', '/dashboard/history', '/dashboard/earnings', '/dashboard/saved', '/dashboard/host-reviews', '/dashboard/host-disputes', '/dashboard/host-bookings', '/dashboard/notifications'],
        isMenuButton: true
      },
    ];

    if (userRole === 'host' || userRole === 'admin') {
      // Pour les hôtes (qui sont aussi voyageurs) : Voyages, Annonces
      // Les réservations reçues sont accessibles via "Plus" (sidebar)
      return [
        ...commonStart,
        {
          href: '/dashboard/bookings',
          icon: Briefcase,
          label: 'Voyages',
          activeMatch: ['/dashboard/bookings']
        },
        {
          href: '/dashboard/my-listings',
          icon: LayoutDashboard,
          label: 'Annonces',
          activeMatch: ['/dashboard/my-listings', '/dashboard/host-bookings']
        },
        ...commonEnd,
      ];
    }

    // Pour les voyageurs (guests) : Mes Voyages, Favoris
    return [
      ...commonStart,
      {
        href: '/dashboard/bookings',
        icon: Briefcase,
        label: 'Voyages',
        activeMatch: ['/dashboard/bookings']
      },
      {
        href: '/dashboard/saved',
        icon: Heart,
        label: 'Favoris',
        activeMatch: ['/dashboard/saved']
      },
      ...commonEnd,
    ];
  };

  const navItems = getNavItems();

  const isActive = (item: NavItem) => {
    if (item.activeMatch) {
      return item.activeMatch.some(path => {
        if (path === '/dashboard' && pathname === '/dashboard') return true;
        if (path !== '/dashboard' && pathname?.startsWith(path)) return true;
        return false;
      });
    }
    return pathname === item.href;
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const active = isActive(item);

          // If it's a menu button, render button instead of Link
          if (item.isMenuButton) {
            return (
              <button
                key={`menu-${index}`}
                onClick={onMenuClick}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  active
                    ? 'text-[#FF385C]'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
                <span className={`text-[10px] mt-1 ${active ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active
                  ? 'text-[#FF385C]'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
              <span className={`text-[10px] mt-1 ${active ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Safe area padding for iOS */}
      <style jsx>{`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </nav>
  );
}
