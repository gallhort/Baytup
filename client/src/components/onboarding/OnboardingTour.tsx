'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Search, SlidersHorizontal, MapPin, MousePointer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const TOUR_STORAGE_KEY = 'baytup_search_tour_seen';

interface TourStep {
  targetSelector: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position: 'bottom' | 'top' | 'left' | 'right';
}

interface OnboardingTourProps {
  isActive: boolean;
  onComplete: () => void;
}

export default function OnboardingTour({ isActive, onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const steps: TourStep[] = language === 'fr' ? [
    {
      targetSelector: '[data-tour="search-bar"]',
      title: 'Recherchez votre destination',
      description: 'Tapez le nom d\'une ville algérienne ou choisissez dans la liste. Ajoutez vos dates et le nombre de voyageurs.',
      icon: <Search className="w-5 h-5" />,
      position: 'bottom',
    },
    {
      targetSelector: '[data-tour="filters"]',
      title: 'Affinez vos résultats',
      description: 'Utilisez les filtres pour trouver exactement ce que vous cherchez : prix, type de logement, équipements...',
      icon: <SlidersHorizontal className="w-5 h-5" />,
      position: 'bottom',
    },
    {
      targetSelector: '[data-tour="listing-card"]',
      title: 'Explorez les annonces',
      description: 'Cliquez sur une annonce pour voir les photos, la description et les avis. Ajoutez-la en favori avec le cœur.',
      icon: <MousePointer className="w-5 h-5" />,
      position: 'top',
    },
  ] : language === 'ar' ? [
    {
      targetSelector: '[data-tour="search-bar"]',
      title: 'ابحث عن وجهتك',
      description: 'اكتب اسم مدينة جزائرية أو اختر من القائمة. أضف تواريخك وعدد المسافرين.',
      icon: <Search className="w-5 h-5" />,
      position: 'bottom',
    },
    {
      targetSelector: '[data-tour="filters"]',
      title: 'حسّن نتائجك',
      description: 'استخدم الفلاتر للعثور على ما تبحث عنه بالضبط: السعر، نوع السكن، التجهيزات...',
      icon: <SlidersHorizontal className="w-5 h-5" />,
      position: 'bottom',
    },
    {
      targetSelector: '[data-tour="listing-card"]',
      title: 'استكشف الإعلانات',
      description: 'انقر على إعلان لمشاهدة الصور والوصف والتقييمات. أضفه للمفضلة بالقلب.',
      icon: <MousePointer className="w-5 h-5" />,
      position: 'top',
    },
  ] : [
    {
      targetSelector: '[data-tour="search-bar"]',
      title: 'Search your destination',
      description: 'Type an Algerian city name or pick from the list. Add your dates and number of guests.',
      icon: <Search className="w-5 h-5" />,
      position: 'bottom',
    },
    {
      targetSelector: '[data-tour="filters"]',
      title: 'Refine your results',
      description: 'Use filters to find exactly what you\'re looking for: price, property type, amenities...',
      icon: <SlidersHorizontal className="w-5 h-5" />,
      position: 'bottom',
    },
    {
      targetSelector: '[data-tour="listing-card"]',
      title: 'Explore listings',
      description: 'Click a listing to see photos, description and reviews. Add it to favorites with the heart icon.',
      icon: <MousePointer className="w-5 h-5" />,
      position: 'top',
    },
  ];

  const navText = language === 'fr'
    ? { next: 'Suivant', done: 'Compris !', skip: 'Passer', step: 'sur' }
    : language === 'ar'
    ? { next: 'التالي', done: 'فهمت!', skip: 'تخطي', step: 'من' }
    : { next: 'Next', done: 'Got it!', skip: 'Skip', step: 'of' };

  const updatePosition = useCallback(() => {
    const step = steps[currentStep];
    if (!step) return;

    const target = document.querySelector(step.targetSelector);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetRect(rect);
      setIsVisible(true);
    } else {
      // If target not found, skip to next step or complete
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleComplete();
      }
    }
  }, [currentStep, steps.length]);

  useEffect(() => {
    if (!isActive) {
      setIsVisible(false);
      return;
    }

    // Delay to let the page render
    const timer = setTimeout(updatePosition, 500);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isActive, updatePosition]);

  const handleComplete = useCallback(() => {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    } catch {}
    setIsVisible(false);
    onComplete();
  }, [onComplete]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 150);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
      }, 150);
    }
  };

  if (!isActive || !isVisible || !targetRect) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    const padding = 12;
    const tooltipWidth = 320;

    let top = 0;
    let left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;

    // Keep within viewport
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));

    switch (step.position) {
      case 'bottom':
        top = targetRect.bottom + padding;
        break;
      case 'top':
        top = targetRect.top - padding - 200;
        break;
      default:
        top = targetRect.bottom + padding;
    }

    // Make sure it doesn't go off screen vertically
    top = Math.max(16, Math.min(top, window.innerHeight - 250));

    return {
      position: 'fixed' as const,
      top,
      left,
      width: tooltipWidth,
      zIndex: 10001,
    };
  };

  return (
    <>
      {/* Overlay with spotlight cutout */}
      <div className="fixed inset-0 z-[10000]" onClick={handleComplete}>
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.5)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      </div>

      {/* Highlight ring */}
      <div
        className="fixed z-[10000] pointer-events-none rounded-xl ring-4 ring-[#FF6B35] ring-opacity-60 transition-all duration-300"
        style={{
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
        }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={getTooltipStyle()}
        className={`bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transition-all duration-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        dir={isRTL ? 'rtl' : 'ltr'}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#FF6B35] to-orange-500 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            {step.icon}
            <span className="text-sm font-medium">
              {currentStep + 1} {navText.step} {steps.length}
            </span>
          </div>
          <button onClick={handleComplete} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <h3 className="font-bold text-gray-900 text-lg mb-1.5">{step.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 flex items-center justify-between">
          <button
            onClick={handleComplete}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            {navText.skip}
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"
              >
                {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-2 rounded-full bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#e55a2a] transition-colors flex items-center gap-1"
            >
              {isLast ? navText.done : navText.next}
              {!isLast && (isRTL ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Hook
export function useSearchTour() {
  const [isTourActive, setIsTourActive] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(TOUR_STORAGE_KEY);
      if (!seen) {
        const timer = setTimeout(() => setIsTourActive(true), 2000);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const startTour = useCallback(() => {
    setIsTourActive(true);
  }, []);

  const completeTour = useCallback(() => {
    setIsTourActive(false);
  }, []);

  return { isTourActive, startTour, completeTour };
}
