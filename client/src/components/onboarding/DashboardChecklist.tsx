'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  CheckCircle, Circle, User, Mail, Search, CalendarCheck,
  ChevronDown, ChevronUp, X, Sparkles, Camera, ArrowRight
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const CHECKLIST_DISMISSED_KEY = 'baytup_checklist_dismissed';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  href?: string;
  action?: string;
}

interface DashboardChecklistProps {
  user: any; // User object from AppContext
}

export default function DashboardChecklist({ user }: DashboardChecklistProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(CHECKLIST_DISMISSED_KEY);
      if (dismissed) setIsDismissed(true);
    } catch {}
  }, []);

  const content = language === 'fr' ? {
    title: 'Bienvenue sur Baytup !',
    subtitle: 'Complétez votre profil pour une meilleure expérience',
    dismiss: 'Masquer',
    progress: 'complété',
    allDone: 'Profil complet ! Vous êtes prêt à réserver.',
    items: {
      profile: { label: 'Complétez votre profil', desc: 'Ajoutez votre photo et numéro de téléphone' },
      email: { label: 'Vérifiez votre email', desc: 'Confirmez votre adresse email' },
      search: { label: 'Faites votre première recherche', desc: 'Explorez les logements disponibles' },
      booking: { label: 'Réservez votre premier séjour', desc: 'Trouvez et réservez le logement idéal' },
    },
  } : language === 'ar' ? {
    title: 'مرحباً بك في Baytup!',
    subtitle: 'أكمل ملفك الشخصي لتجربة أفضل',
    dismiss: 'إخفاء',
    progress: 'مكتمل',
    allDone: 'الملف الشخصي مكتمل! أنت جاهز للحجز.',
    items: {
      profile: { label: 'أكمل ملفك الشخصي', desc: 'أضف صورتك ورقم هاتفك' },
      email: { label: 'تحقق من بريدك الإلكتروني', desc: 'أكد عنوان بريدك الإلكتروني' },
      search: { label: 'قم بأول بحث لك', desc: 'استكشف المساكن المتاحة' },
      booking: { label: 'احجز إقامتك الأولى', desc: 'ابحث واحجز السكن المثالي' },
    },
  } : {
    title: 'Welcome to Baytup!',
    subtitle: 'Complete your profile for a better experience',
    dismiss: 'Dismiss',
    progress: 'completed',
    allDone: 'Profile complete! You\'re ready to book.',
    items: {
      profile: { label: 'Complete your profile', desc: 'Add your photo and phone number' },
      email: { label: 'Verify your email', desc: 'Confirm your email address' },
      search: { label: 'Make your first search', desc: 'Explore available properties' },
      booking: { label: 'Book your first stay', desc: 'Find and book the perfect property' },
    },
  };

  const items: ChecklistItem[] = useMemo(() => {
    if (!user) return [];

    const hasProfile = !!(user.phone && user.avatar);
    const hasVerifiedEmail = !!user.isEmailVerified;
    // Check if user has made a search (we track via localStorage)
    let hasSearched = false;
    try { hasSearched = !!localStorage.getItem('baytup_has_searched'); } catch {}
    const hasBooking = !!(user.totalBookings && user.totalBookings > 0);

    return [
      {
        id: 'profile',
        label: content.items.profile.label,
        description: content.items.profile.desc,
        icon: <User className="w-4 h-4" />,
        completed: hasProfile,
        href: '/dashboard/settings',
      },
      {
        id: 'email',
        label: content.items.email.label,
        description: content.items.email.desc,
        icon: <Mail className="w-4 h-4" />,
        completed: hasVerifiedEmail,
        href: '/dashboard/settings',
      },
      {
        id: 'search',
        label: content.items.search.label,
        description: content.items.search.desc,
        icon: <Search className="w-4 h-4" />,
        completed: hasSearched,
        href: '/search',
      },
      {
        id: 'booking',
        label: content.items.booking.label,
        description: content.items.booking.desc,
        icon: <CalendarCheck className="w-4 h-4" />,
        completed: hasBooking,
        href: '/search',
      },
    ];
  }, [user, content]);

  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allDone = completedCount === totalCount;

  const handleDismiss = () => {
    try {
      localStorage.setItem(CHECKLIST_DISMISSED_KEY, 'true');
    } catch {}
    setIsDismissed(true);
  };

  // Don't show if dismissed or if no user
  if (isDismissed || !user) return null;

  // Don't show if all items are complete and user has been around
  if (allDone) {
    return (
      <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-900">{content.allDone}</p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-green-400 hover:text-green-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11">
            {/* Circular progress */}
            <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="18" fill="none" stroke="#E5E7EB" strokeWidth="3" />
              <circle
                cx="22" cy="22" r="18"
                fill="none"
                stroke="#FF6B35"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 18}`}
                strokeDashoffset={`${2 * Math.PI * 18 * (1 - progressPercent / 100)}`}
                className="transition-all duration-700"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
              {progressPercent}%
            </span>
          </div>
          <div className="text-start">
            <h3 className="font-semibold text-gray-900 text-sm">{content.title}</h3>
            <p className="text-xs text-gray-500">
              {completedCount}/{totalCount} {content.progress}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            {content.dismiss}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Progress bar */}
      <div className="px-5">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FF6B35] to-orange-400 rounded-full transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Items */}
      {isExpanded && (
        <div className="px-5 pb-4 pt-3 space-y-1">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href || '#'}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                item.completed
                  ? 'bg-green-50/50'
                  : 'hover:bg-orange-50/50'
              }`}
            >
              {/* Status icon */}
              {item.completed ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
              )}

              {/* Content */}
              <div className="flex-grow min-w-0">
                <p className={`text-sm font-medium ${item.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {item.label}
                </p>
                {!item.completed && (
                  <p className="text-xs text-gray-500 truncate">{item.description}</p>
                )}
              </div>

              {/* Icon */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                item.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
              }`}>
                {item.icon}
              </div>

              {/* Arrow for incomplete */}
              {!item.completed && (
                <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
