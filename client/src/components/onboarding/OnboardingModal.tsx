'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Search, CreditCard, Shield, Home, Star, MapPin, ArrowRight, BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  forceShow?: boolean; // true = user clicked "replay", don't auto-dismiss
}

const STORAGE_KEY = 'baytup_onboarding_seen';

// SVG Illustration: Search & Discover
function IllustrationSearch() {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Background elements */}
      <rect x="20" y="40" width="280" height="160" rx="16" fill="#FFF7ED" />

      {/* Map with pin */}
      <rect x="40" y="60" width="140" height="120" rx="12" fill="white" stroke="#FDBA74" strokeWidth="2" />
      <path d="M80 90 L120 75 L160 85 L160 160 L120 150 L80 165 Z" fill="#FED7AA" opacity="0.5" />
      <path d="M80 100 L100 130 L120 110 L140 140 L160 120" stroke="#FB923C" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Map pin */}
      <g transform="translate(105, 85)">
        <path d="M15 0C8 0 0 6 0 14C0 24 15 36 15 36S30 24 30 14C30 6 22 0 15 0Z" fill="#FF6B35" />
        <circle cx="15" cy="14" r="6" fill="white" />
      </g>

      {/* Search card */}
      <g transform="translate(190, 65)">
        <rect width="100" height="130" rx="12" fill="white" filter="url(#shadow1)" />
        <rect x="12" y="12" width="76" height="50" rx="8" fill="#FFEDD5" />
        <rect x="30" y="25" width="40" height="24" rx="4" fill="#FF6B35" opacity="0.3" />
        <path d="M42 32 L50 32 L50 44 L58 44" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" />
        <rect x="12" y="72" width="50" height="6" rx="3" fill="#D1D5DB" />
        <rect x="12" y="84" width="76" height="6" rx="3" fill="#E5E7EB" />
        <rect x="12" y="96" width="40" height="6" rx="3" fill="#E5E7EB" />
        <g transform="translate(12, 110)">
          <Star className="" />
          <path d="M0 4 L3 3 L5 0 L7 3 L10 4 L7.5 6.5 L8 10 L5 8.5 L2 10 L2.5 6.5 Z" fill="#FBBF24" />
          <text x="14" y="9" fill="#6B7280" fontSize="8" fontFamily="sans-serif">4.8</text>
        </g>
      </g>

      {/* Magnifying glass overlay */}
      <g transform="translate(55, 100)">
        <circle cx="20" cy="20" r="18" fill="none" stroke="#FF6B35" strokeWidth="3" />
        <line x1="33" y1="33" x2="44" y2="44" stroke="#FF6B35" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Decorative dots */}
      <circle cx="35" cy="55" r="3" fill="#FDBA74" />
      <circle cx="300" cy="185" r="4" fill="#FDBA74" />
      <circle cx="285" cy="55" r="3" fill="#FF6B35" opacity="0.5" />

      <defs>
        <filter id="shadow1" x="-4" y="-2" width="108" height="138" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.1" />
        </filter>
      </defs>
    </svg>
  );
}

// SVG Illustration: Secure Payment
function IllustrationPayment() {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Background */}
      <rect x="20" y="40" width="280" height="160" rx="16" fill="#ECFDF5" />

      {/* Phone mockup */}
      <g transform="translate(100, 50)">
        <rect width="120" height="180" rx="16" fill="white" stroke="#D1D5DB" strokeWidth="2" />
        <rect x="40" y="6" width="40" height="4" rx="2" fill="#E5E7EB" />

        {/* Screen content */}
        <rect x="12" y="20" width="96" height="40" rx="8" fill="#F0FDF4" stroke="#86EFAC" strokeWidth="1.5" />

        {/* CIB Card */}
        <g transform="translate(20, 28)">
          <rect width="80" height="24" rx="4" fill="linear-gradient(135deg, #059669, #10B981)" />
          <rect width="80" height="24" rx="4" fill="#059669" />
          <text x="6" y="10" fill="white" fontSize="5" fontFamily="sans-serif" fontWeight="bold">CIB</text>
          <text x="6" y="18" fill="white" fontSize="4" fontFamily="sans-serif" opacity="0.8">**** **** **** 4521</text>
          <rect x="60" y="4" width="14" height="10" rx="2" fill="#34D399" />
        </g>

        {/* Edahabia Card */}
        <rect x="12" y="70" width="96" height="40" rx="8" fill="#FFF7ED" stroke="#FDBA74" strokeWidth="1.5" />
        <g transform="translate(20, 78)">
          <rect width="80" height="24" rx="4" fill="#F97316" />
          <text x="6" y="10" fill="white" fontSize="5" fontFamily="sans-serif" fontWeight="bold">EDAHABIA</text>
          <text x="6" y="18" fill="white" fontSize="4" fontFamily="sans-serif" opacity="0.8">**** **** **** 7890</text>
        </g>

        {/* BaridiMob logo area */}
        <rect x="12" y="120" width="96" height="30" rx="8" fill="#EFF6FF" stroke="#93C5FD" strokeWidth="1" />
        <text x="60" y="139" fill="#3B82F6" fontSize="7" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">BaridiMob</text>

        {/* Confirm button */}
        <rect x="12" y="158" width="96" height="16" rx="8" fill="#FF6B35" />
        <text x="60" y="169" fill="white" fontSize="6" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">Confirmer</text>
      </g>

      {/* Shield */}
      <g transform="translate(40, 80)">
        <path d="M25 0 L50 10 L50 30 C50 45 25 55 25 55 C25 55 0 45 0 30 L0 10 Z" fill="#10B981" opacity="0.2" />
        <path d="M25 5 L45 13 L45 30 C45 42 25 50 25 50 C25 50 5 42 5 30 L5 13 Z" fill="none" stroke="#10B981" strokeWidth="2" />
        <path d="M15 28 L22 35 L37 20" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Lock icon */}
      <g transform="translate(240, 90)">
        <rect x="5" y="18" width="30" height="24" rx="4" fill="#10B981" opacity="0.3" />
        <rect x="5" y="18" width="30" height="24" rx="4" fill="none" stroke="#059669" strokeWidth="2" />
        <path d="M12 18 L12 12 C12 6 16 2 20 2 C24 2 28 6 28 12 L28 18" fill="none" stroke="#059669" strokeWidth="2" />
        <circle cx="20" cy="30" r="3" fill="#059669" />
      </g>

      {/* Decorative */}
      <circle cx="270" cy="70" r="4" fill="#86EFAC" />
      <circle cx="55" cy="55" r="3" fill="#10B981" opacity="0.5" />
    </svg>
  );
}

// SVG Illustration: Enjoy & Support
function IllustrationEnjoy() {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Background */}
      <rect x="20" y="40" width="280" height="160" rx="16" fill="#EFF6FF" />

      {/* House */}
      <g transform="translate(60, 60)">
        <path d="M60 0 L120 50 L0 50 Z" fill="#FF6B35" opacity="0.2" />
        <path d="M60 5 L110 45 L10 45 Z" fill="none" stroke="#FF6B35" strokeWidth="2" />
        <rect x="20" y="45" width="80" height="70" rx="2" fill="white" stroke="#D1D5DB" strokeWidth="1.5" />
        <rect x="45" y="75" width="30" height="40" rx="2" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
        <circle cx="70" cy="95" r="2" fill="#6B7280" />
        <rect x="28" y="55" width="24" height="18" rx="2" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="1" />
        <rect x="68" y="55" width="24" height="18" rx="2" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="1" />
        <line x1="40" y1="55" x2="40" y2="73" stroke="#93C5FD" strokeWidth="1" />
        <line x1="28" y1="64" x2="52" y2="64" stroke="#93C5FD" strokeWidth="1" />
        <line x1="80" y1="55" x2="80" y2="73" stroke="#93C5FD" strokeWidth="1" />
        <line x1="68" y1="64" x2="92" y2="64" stroke="#93C5FD" strokeWidth="1" />
      </g>

      {/* Support badge - 24/7 */}
      <g transform="translate(210, 65)">
        <rect width="80" height="80" rx="40" fill="white" stroke="#3B82F6" strokeWidth="2" />
        <text x="40" y="38" fill="#1E40AF" fontSize="14" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">24/7</text>
        <text x="40" y="52" fill="#6B7280" fontSize="7" fontFamily="sans-serif" textAnchor="middle">Support</text>

        {/* Headset icon */}
        <g transform="translate(25, 55)">
          <path d="M0 10 C0 4 4 0 10 0 L20 0 C26 0 30 4 30 10" fill="none" stroke="#3B82F6" strokeWidth="2" />
          <rect x="-2" y="8" width="8" height="12" rx="3" fill="#3B82F6" opacity="0.3" stroke="#3B82F6" strokeWidth="1" />
          <rect x="24" y="8" width="8" height="12" rx="3" fill="#3B82F6" opacity="0.3" stroke="#3B82F6" strokeWidth="1" />
        </g>
      </g>

      {/* Stars rating */}
      <g transform="translate(215, 160)">
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i} transform={`translate(${i * 16}, 0)`}>
            <path d="M7 0 L9 5 L14 5 L10 8.5 L11.5 14 L7 10.5 L2.5 14 L4 8.5 L0 5 L5 5 Z" fill="#FBBF24" />
          </g>
        ))}
      </g>

      {/* Chat bubbles */}
      <g transform="translate(40, 155)">
        <rect width="70" height="28" rx="14" fill="white" stroke="#E5E7EB" strokeWidth="1.5" />
        <circle cx="18" cy="14" r="3" fill="#D1D5DB" />
        <circle cx="28" cy="14" r="3" fill="#D1D5DB" />
        <circle cx="38" cy="14" r="3" fill="#D1D5DB" />
        <text x="48" y="18" fill="#6B7280" fontSize="8" fontFamily="sans-serif">...</text>
      </g>

      {/* Check mark badge */}
      <g transform="translate(130, 155)">
        <circle cx="15" cy="15" r="15" fill="#10B981" opacity="0.15" />
        <circle cx="15" cy="15" r="11" fill="#10B981" />
        <path d="M9 15 L13 19 L21 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Decorative */}
      <circle cx="295" cy="55" r="3" fill="#93C5FD" />
      <circle cx="35" cy="50" r="3" fill="#3B82F6" opacity="0.4" />
    </svg>
  );
}

export default function OnboardingModal({ isOpen, onClose, forceShow = false }: OnboardingModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const { language } = useLanguage();

  const content = language === 'fr' ? {
    slides: [
      {
        title: 'Trouvez votre logement idéal',
        description: 'Explorez des centaines de logements en Algérie : appartements, villas, maisons traditionnelles. Filtrez par ville, prix et équipements.',
        cta: 'Suivant',
      },
      {
        title: 'Payez en toute sécurité',
        description: 'Payez avec votre carte CIB, Edahabia ou via BaridiMob. Paiement 100% local, vos données restent en Algérie. Garanti par Baytup.',
        cta: 'Suivant',
      },
      {
        title: 'Profitez & soyez accompagné',
        description: 'Check-in facile avec votre hôte, support disponible 7j/7 en cas de besoin. Laissez un avis après votre séjour pour aider la communauté.',
        cta: 'C\'est parti !',
      },
    ],
    skip: 'Passer',
    step: 'Étape',
    of: 'sur',
  } : language === 'ar' ? {
    slides: [
      {
        title: 'اعثر على سكنك المثالي',
        description: 'استكشف مئات المساكن في الجزائر: شقق، فيلات، بيوت تقليدية. فلتر حسب المدينة، السعر والتجهيزات.',
        cta: 'التالي',
      },
      {
        title: 'ادفع بأمان تام',
        description: 'ادفع ببطاقة CIB، Edahabia أو عبر BaridiMob. دفع محلي 100%، بياناتك تبقى في الجزائر. مضمون من Baytup.',
        cta: 'التالي',
      },
      {
        title: 'استمتع وكن مرافقاً',
        description: 'تسجيل وصول سهل مع المضيف، دعم متاح 7 أيام/7 عند الحاجة. اترك تقييمك بعد إقامتك لمساعدة المجتمع.',
        cta: 'هيا بنا!',
      },
    ],
    skip: 'تخطي',
    step: 'خطوة',
    of: 'من',
  } : {
    slides: [
      {
        title: 'Find your perfect stay',
        description: 'Explore hundreds of properties across Algeria: apartments, villas, traditional houses. Filter by city, price and amenities.',
        cta: 'Next',
      },
      {
        title: 'Pay securely',
        description: 'Pay with your CIB card, Edahabia or via BaridiMob. 100% local payment, your data stays in Algeria. Guaranteed by Baytup.',
        cta: 'Next',
      },
      {
        title: 'Enjoy & get support',
        description: 'Easy check-in with your host, support available 7 days a week. Leave a review after your stay to help the community.',
        cta: 'Let\'s go!',
      },
    ],
    skip: 'Skip',
    step: 'Step',
    of: 'of',
  };

  const illustrations = [IllustrationSearch, IllustrationPayment, IllustrationEnjoy];
  const accentColors = ['#FF6B35', '#10B981', '#3B82F6'];

  const handleNext = useCallback(() => {
    if (isAnimating) return;
    if (currentSlide < 2) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentSlide(prev => prev + 1);
        setIsAnimating(false);
      }, 200);
    } else {
      handleClose();
    }
  }, [currentSlide, isAnimating]);

  const handlePrev = useCallback(() => {
    if (isAnimating || currentSlide === 0) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentSlide(prev => prev - 1);
      setIsAnimating(false);
    }, 200);
  }, [currentSlide, isAnimating]);

  const handleClose = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
    onClose();
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, handleNext, handlePrev, handleClose]);

  if (!isOpen) return null;

  const CurrentIllustration = illustrations[currentSlide];
  const slide = content.slides[currentSlide];
  const accentColor = accentColors[currentSlide];
  const isRTL = language === 'ar';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Skip button */}
        <button
          onClick={handleClose}
          className="absolute top-4 end-4 z-10 flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 bg-white/80 backdrop-blur rounded-full transition-colors"
        >
          {content.skip}
          <X className="w-4 h-4" />
        </button>

        {/* Illustration */}
        <div
          className={`relative h-56 sm:h-64 transition-opacity duration-200 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
          style={{ backgroundColor: `${accentColor}08` }}
        >
          <CurrentIllustration />
        </div>

        {/* Content */}
        <div className="px-8 pb-8 pt-6">
          <div className={`transition-all duration-200 ${isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
            {/* Step indicator */}
            <div className="flex items-center gap-1 mb-3">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: accentColor }}
              >
                {content.step} {currentSlide + 1} {content.of} 3
              </span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {slide.title}
            </h2>
            <p className="text-gray-600 leading-relaxed mb-8">
              {slide.description}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            {/* Dots */}
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  onClick={() => !isAnimating && setCurrentSlide(i)}
                  className="transition-all duration-300"
                  style={{
                    width: currentSlide === i ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: currentSlide === i ? accentColor : '#E5E7EB',
                  }}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3">
              {currentSlide > 0 && (
                <button
                  onClick={handlePrev}
                  className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-6 py-2.5 rounded-full text-white font-semibold transition-all hover:shadow-lg hover:scale-105 flex items-center gap-2"
                style={{ backgroundColor: accentColor }}
              >
                {slide.cta}
                {currentSlide < 2 ? (
                  isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to manage onboarding state
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        // Small delay to let the page load first
        const timer = setTimeout(() => setShowOnboarding(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const openOnboarding = useCallback(() => {
    setShowOnboarding(true);
  }, []);

  const closeOnboarding = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  return { showOnboarding, openOnboarding, closeOnboarding };
}
