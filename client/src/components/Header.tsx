'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Menu,
  X,
  Globe,
  User,
  Heart,
  Settings,
  LogOut,
  Home,
  Car,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Filter,
  Bell,
  Star,
  CalendarRange,
  Plus,
  Minus,
  UserCheck,
  Shield,
  HelpCircle,
  LayoutDashboard
} from 'lucide-react';
import { useClickAway } from '@/hooks/useClickAway';
import { useTranslation } from '@/hooks/useTranslation';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useDebounce, useThrottledCallback } from '@/hooks/useDebounce';
import { Autocomplete } from '@react-google-maps/api';
import { useGoogleMaps } from '@/contexts/GoogleMapsContext';
import { useSocket } from '@/contexts/SocketContext';
import { useFeature } from '@/contexts/FeatureFlagsContext'; // ✅ Feature flags
import moment from 'moment';
import clsx from 'clsx';

// Modern Calendar Component
interface CalendarProps {
  checkIn: string;
  checkOut: string;
  onDateSelect: (dates: { checkIn: string; checkOut: string }) => void;
  onClose: () => void;
  vehicleMode: boolean;
  activeField?: 'checkin' | 'checkout'; // ✅ FIX: Nouveau prop pour savoir quel champ est actif
}

const CalendarComponent: React.FC<CalendarProps> = ({ checkIn, checkOut, onDateSelect, onClose, vehicleMode, activeField }) => {
  const t = useTranslation('header') as any;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCheckIn, setSelectedCheckIn] = useState<Date | null>(checkIn ? new Date(checkIn) : null);
  const [selectedCheckOut, setSelectedCheckOut] = useState<Date | null>(checkOut ? new Date(checkOut) : null);

  // ✅ FIX BUG DATE: Initialiser correctement selon le champ actif
  // Si on clique sur "Départ" et qu'il y a déjà une checkIn, on est en mode sélection de checkOut
  const [isSelectingCheckOut, setIsSelectingCheckOut] = useState(
    activeField === 'checkout' && checkIn ? true : false
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const months = [
    t.january, t.february, t.march, t.april, t.may, t.june,
    t.july, t.august, t.september, t.october, t.november, t.december
  ];

  const daysOfWeek = [t.sunday, t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isDateInRange = (date: Date) => {
    if (!selectedCheckIn || !selectedCheckOut) return false;
    return date >= selectedCheckIn && date <= selectedCheckOut;
  };

  const isDateSelected = (date: Date) => {
    if (selectedCheckIn && date.getTime() === selectedCheckIn.getTime()) return 'checkin';
    if (selectedCheckOut && date.getTime() === selectedCheckOut.getTime()) return 'checkout';
    return false;
  };

  const handleDateClick = (date: Date) => {
    if (date < today) return;

    if (!selectedCheckIn || (selectedCheckIn && selectedCheckOut)) {
      // First selection or reset
      setSelectedCheckIn(date);
      setSelectedCheckOut(null);
      setIsSelectingCheckOut(true);
    } else if (isSelectingCheckOut) {
      if (date >= selectedCheckIn) {
        setSelectedCheckOut(date);
        setIsSelectingCheckOut(false);

        // Update parent component
        onDateSelect({
          checkIn: selectedCheckIn.toISOString().split('T')[0],
          checkOut: date.toISOString().split('T')[0]
        });
      } else {
        // If selected date is before check-in, make it the new check-in
        setSelectedCheckIn(date);
        setSelectedCheckOut(null);
      }
    }
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const renderMonth = (monthDate: Date) => {
    const days = getDaysInMonth(monthDate);

    return (
      <div className="flex-1">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {months[monthDate.getMonth()]} {monthDate.getFullYear()}
          </h3>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {daysOfWeek.map(day => (
            <div key={day} className="p-3 text-center text-xs font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            if (!date) {
              return <div key={index} className="p-3"></div>;
            }

            const isPast = date < today;
            const selected = isDateSelected(date);
            const inRange = isDateInRange(date);

            return (
              <button
                key={date.getTime()}
                onClick={() => handleDateClick(date)}
                disabled={isPast}
                className={`
                  p-3 text-sm font-medium rounded-full transition-all duration-200 relative
                  ${isPast
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-900 hover:bg-gray-100 cursor-pointer'
                  }
                  ${selected === 'checkin' || selected === 'checkout'
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : ''
                  }
                  ${inRange && !selected
                    ? 'bg-gray-100'
                    : ''
                  }
                  ${date.getTime() === today.getTime()
                    ? 'ring-1 ring-gray-900'
                    : ''
                  }
                `}
              >
                {date.getDate()}
                {selected === 'checkin' && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-white">
                    {vehicleMode ? t.pickup : t.checkin}
                  </div>
                )}
                {selected === 'checkout' && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-white">
                    {vehicleMode ? t.return : t.checkout}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const currentMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth());
  const nextMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);

  return (
    <div className="w-full">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          disabled={currentMonth <= today}
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>

        <div className="flex items-center space-x-8">
          {/* Current selections display */}
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900">
              {vehicleMode ? t.pickup : t.checkin}
            </div>
            <div className="text-xs text-gray-500">
              {selectedCheckIn ? selectedCheckIn.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              }) : t.addDate}
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm font-medium text-gray-900">
              {vehicleMode ? t.return : t.checkout}
            </div>
            <div className="text-xs text-gray-500">
              {selectedCheckOut ? selectedCheckOut.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              }) : t.addDate}
            </div>
          </div>
        </div>

        <button
          onClick={nextMonth}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Calendar Grid - Two months side by side */}
      <div className="flex space-x-12">
        {renderMonth(currentMonthDate)}
        {renderMonth(nextMonthDate)}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
        <button
          onClick={() => {
            setSelectedCheckIn(null);
            setSelectedCheckOut(null);
            onDateSelect({ checkIn: '', checkOut: '' });
          }}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 underline"
        >
          {t.clearDates}
        </button>

        <button
          onClick={onClose}
          className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          {t.close}
        </button>
      </div>
    </div>
  );
};

interface HeaderProps {
  language?: 'en' | 'fr' | 'ar';
  currency?: 'DZD' | 'EUR';
  onLanguageChange?: (lang: 'en' | 'fr' | 'ar') => void;
  onCurrencyChange?: (curr: 'DZD' | 'EUR') => void;
  onSearch?: (searchData: any) => void;
  onCategoryChange?: (category: 'stays' | 'vehicles') => void;
  onLogout?: () => void;
  user?: any;
  currentCategory?: 'stays' | 'vehicles';
  notifications?: number;
  notificationsList?: Array<{
    _id: string;
    recipient: string;
    sender?: {
      _id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    type: string;
    title: string;
    message: string;
    data?: any;
    link?: string;
    isRead: boolean;
    readAt?: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    createdAt: string;
    updatedAt: string;
  }>;
}

// Enhanced header state interface
interface HeaderState {
  mode: 'default' | 'scrolled' | 'expanded';
  isSticky: boolean;
  showCategories: boolean;
  searchExpanded: boolean;
  isAnimating: boolean;
}

const Header = React.memo(function Header({
  language = 'en',
  currency = 'DZD',
  onLanguageChange,
  onCurrencyChange,
  onSearch,
  onCategoryChange,
  onLogout,
  user,
  currentCategory = 'stays',
  notifications = 0,
  notificationsList = []
}: HeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { scrollY, scrollDirection, isAtTop, hasScrolled } = useScrollDirection();
  const { markAsRead, markAllAsRead } = useSocket();
  const vehiclesEnabled = useFeature('vehiclesEnabled'); // ✅ Feature flag

  // Enhanced state management with performance optimizations
  const [headerState, setHeaderState] = useState<HeaderState>({
    mode: 'default',
    isSticky: false,
    showCategories: true,
    searchExpanded: false,
    isAnimating: false
  });

  // Other UI state
  const [activeSearchField, setActiveSearchField] = useState<string | null>(null);
  const [currentActiveCategory, setCurrentActiveCategory] = useState(currentCategory || 'stays');
  const [activeSearchTab, setActiveSearchTab] = useState('stays');
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [googleSuggestions, setGoogleSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Initialize search data from URL params with enhanced vehicle support
  const [searchData, setSearchData] = useState({
    location: searchParams?.get('location') || '',
    checkIn: searchParams?.get('checkIn') || '',
    checkOut: searchParams?.get('checkOut') || '',
    adults: parseInt(searchParams?.get('adults') || '1'),
    children: parseInt(searchParams?.get('children') || '0'),
    infants: parseInt(searchParams?.get('infants') || '0'),
    pets: parseInt(searchParams?.get('pets') || '0'),
    category: (searchParams?.get('category') || currentCategory || 'stays') as 'stays' | 'vehicles',
    // Vehicle-specific fields
    pickupTime: searchParams?.get('pickupTime') || '10:00',
    returnTime: searchParams?.get('returnTime') || '18:00',
    driverAge: searchParams?.get('driverAge') || '25+',
    vehicleType: searchParams?.get('vehicleType') || 'any',
    // Enhanced Google Maps integration fields
    placeId: searchParams?.get('placeId') || '',
    coordinates: null as { lat: number; lng: number } | null,
    city: searchParams?.get('city') || '',
    region: searchParams?.get('region') || '',
    placeTypes: [] as string[]
  });

  // Refs
  const headerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);

  // ✅ FEATURE FLAG: Forcer 'stays' si vehicles désactivé
  useEffect(() => {
    if (!vehiclesEnabled && (currentActiveCategory === 'vehicles' || searchData.category === 'vehicles')) {
      setCurrentActiveCategory('stays');
      setActiveSearchTab('stays');
      setSearchData(prev => ({ ...prev, category: 'stays' }));
    }
  }, [vehiclesEnabled]);

  // Update search data when URL params change
  useEffect(() => {
    if (searchParams) {
      let category = (searchParams.get('category') || 'stays') as 'stays' | 'vehicles';

      // ✅ FEATURE FLAG: Forcer 'stays' si vehicles désactivé
      if (!vehiclesEnabled && category === 'vehicles') {
        category = 'stays';
      }

      setSearchData(prev => ({
        ...prev,
        location: searchParams.get('location') || prev.location,
        checkIn: searchParams.get('checkIn') || prev.checkIn,
        checkOut: searchParams.get('checkOut') || prev.checkOut,
        adults: parseInt(searchParams.get('adults') || String(prev.adults)),
        children: parseInt(searchParams.get('children') || String(prev.children)),
        category,
        vehicleType: searchParams.get('vehicleType') || prev.vehicleType,
        driverAge: searchParams.get('driverAge') || prev.driverAge,
      }));

      setCurrentActiveCategory(category);
      setActiveSearchTab(category);
    }
  }, [searchParams, vehiclesEnabled]);

  // Enhanced search bar handlers with smooth animations
  const handleSearchClick = useCallback(() => {
    if (headerState.isAnimating) return;

    setHeaderState(prev => ({
      ...prev,
      mode: 'expanded',
      searchExpanded: true,
      showCategories: true,
      isAnimating: true
    }));

    // Lock body scroll when search is expanded
    document.body.style.overflow = 'hidden';

    // Focus first input after animation completes
    setTimeout(() => {
      const firstInput = searchRef.current?.querySelector('input');
      firstInput?.focus();
      setHeaderState(prev => ({ ...prev, isAnimating: false }));
    }, 300);
  }, [headerState.isAnimating]);

  const handleClickOutside = useCallback(() => {
    if (headerState.searchExpanded && !headerState.isAnimating) {
      setHeaderState(prev => ({
        ...prev,
        mode: scrollY > 80 ? 'scrolled' : 'default',
        searchExpanded: false,
        showCategories: isAtTop,
        isAnimating: true
      }));

      // Unlock body scroll
      document.body.style.overflow = '';
      setActiveSearchField(null);

      // Reset animation flag after transition
      setTimeout(() => {
        setHeaderState(prev => ({ ...prev, isAnimating: false }));
      }, 300);
    }
  }, [headerState.searchExpanded, headerState.isAnimating, scrollY, isAtTop]);

  // Click away handlers
  useClickAway(searchRef, handleClickOutside);
  useClickAway(languageMenuRef, () => setIsLanguageMenuOpen(false));
  useClickAway(userMenuRef, () => setIsUserMenuOpen(false));
  useClickAway(notificationMenuRef, () => setIsNotificationMenuOpen(false));

  // Enhanced scroll behavior with smooth state transitions - throttled with useRef
  const lastUpdateTime = useRef(0);

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdateTime.current < 16) return; // Throttle to ~60fps
    lastUpdateTime.current = now;

    if (headerState.searchExpanded || headerState.isAnimating) return;

    if (isAtTop) {
      setHeaderState(prev => ({
        ...prev,
        mode: 'default',
        showCategories: true,
        isSticky: false
      }));
    } else if (scrollY > 80 && scrollDirection === 'down') {
      setHeaderState(prev => ({
        ...prev,
        mode: 'scrolled',
        showCategories: false,
        isSticky: true
      }));
    } else if (scrollDirection === 'up' && scrollY > 10 && scrollY < 80) {
      setHeaderState(prev => ({
        ...prev,
        mode: 'default',
        showCategories: true,
        isSticky: true
      }));
    }
  }, [scrollY, scrollDirection, isAtTop, headerState.searchExpanded, headerState.isAnimating]);

  // Use the Google Maps context for API status
  const { isLoaded, loadError, initializeAutocomplete } = useGoogleMaps();

  // Translation system
  const t = useTranslation('header') as any;
  const isRTL = language === 'ar';

  // Autocomplete refs
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Enhanced data arrays
  const languages = [
    { code: 'en', name: t.english, flag: '🇺🇸', nativeName: t.english },
    { code: 'fr', name: t.french, flag: '🇫🇷', nativeName: t.french },
    { code: 'ar', name: t.arabic, flag: '🇩🇿', nativeName: t.arabic }
  ];

  const currencies = [
    { code: 'DZD', symbol: 'دج', name: t.algerianDinar, nameAr: t.algerianDinar },
    { code: 'EUR', symbol: '€', name: t.euro, nameAr: t.euro }
  ];

  // ✅ FEATURE FLAG: Filtrer tabs véhicules si désactivé
  const searchTabs = useMemo(() => {
    const tabs = [{ key: 'stays', icon: Home, label: t.stays }];
    if (vehiclesEnabled) {
      tabs.push({ key: 'vehicles', icon: Car, label: t.vehicles });
    }
    return tabs;
  }, [vehiclesEnabled, t.stays, t.vehicles]);

  const vehicleTypes = [
    { value: 'any', label: t.anyVehicle },
    { value: 'car', label: t.car },
    { value: 'motorcycle', label: t.motorcycle },
    { value: 'bicycle', label: t.bicycle },
    { value: 'truck', label: t.truck },
    { value: 'van', label: t.van }
  ];

  const popularCities = [
    { name: t.algiers, country: t.algeria, image: '🏙️', nameAr: t.algiers, nameFr: t.algiers, coordinates: { lat: 36.7538, lng: 3.0588 } },
    { name: t.oran, country: t.algeria, image: '🌊', nameAr: t.oran, nameFr: t.oran, coordinates: { lat: 35.6969, lng: -0.6331 } },
    { name: t.constantine, country: t.algeria, image: '🏛️', nameAr: t.constantine, nameFr: t.constantine, coordinates: { lat: 36.3650, lng: 6.6147 } },
    { name: t.annaba, country: t.algeria, image: '🌅', nameAr: t.annaba, nameFr: t.annaba, coordinates: { lat: 36.9000, lng: 7.7667 } },
    { name: t.tlemcen, country: t.algeria, image: '🕌', nameAr: t.tlemcen, nameFr: t.tlemcen, coordinates: { lat: 34.8833, lng: -1.3167 } },
    { name: t.ghardaia, country: t.algeria, image: '🏜️', nameAr: t.ghardaia, nameFr: t.ghardaia, coordinates: { lat: 32.4911, lng: 3.6739 } },
    { name: t.setif, country: t.algeria, image: '⛰️', nameAr: t.setif, nameFr: t.setif, coordinates: { lat: 36.1833, lng: 5.4167 } },
    { name: t.batna, country: t.algeria, image: '🏔️', nameAr: t.batna, nameFr: t.batna, coordinates: { lat: 35.5667, lng: 6.1667 } },
    { name: t.blida, country: t.algeria, image: '🌹', nameAr: t.blida, nameFr: t.blida, coordinates: { lat: 36.4667, lng: 2.8333 } },
    { name: t.bejaia, country: t.algeria, image: '🏖️', nameAr: t.bejaia, nameFr: t.bejaia, coordinates: { lat: 36.7525, lng: 5.0694 } }
  ];

  // Get localized city name
  const getCityName = (city: any) => {
    if (language === 'ar') return city.nameAr;
    if (language === 'fr') return city.nameFr;
    return city.name;
  };

  // Get currency display name
  const getCurrencyName = (curr: any) => {
    if (language === 'ar') return curr.nameAr;
    return curr.name;
  };

  // Google Maps Autocomplete handlers - using context for lazy loading
  const onAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();

      if (!place || !place.geometry) {
        console.warn('Invalid place selected');
        return;
      }

      const locationName = place.formatted_address ||
                          place.name ||
                          place.vicinity ||
                          '';

      const coordinates = {
        lat: place.geometry.location?.lat() || 0,
        lng: place.geometry.location?.lng() || 0
      };

      let city = '';
      let region = '';
      if (place.address_components) {
        place.address_components.forEach(component => {
          if (component.types.includes('locality')) {
            city = component.long_name;
          }
          if (component.types.includes('administrative_area_level_1')) {
            region = component.long_name;
          }
        });
      }

      if (locationName) {
        setSearchData(prev => ({
          ...prev,
          location: locationName,
          placeId: place.place_id || '',
          coordinates,
          city: city || '',
          region: region || '',
          placeTypes: place.types || []
        }));

        setActiveSearchField(null);
      }
    }
  };

  // Enhanced autocomplete options for Algeria with custom dropdown disabled
  const autocompleteOptions = useMemo(() => ({
    componentRestrictions: { country: 'dz' },
    types: ['geocode', 'establishment'],
    fields: [
      'formatted_address',
      'geometry',
      'name',
      'place_id',
      'vicinity',
      'types',
      'address_components',
      'plus_code'
    ],
    language: language,
    strictBounds: false
  }), [language]);

  // Fetch Google Maps autocomplete suggestions
  const fetchGoogleSuggestions = useCallback(async (input: string) => {
    if (!input.trim() || !isLoaded || !window.google?.maps?.places?.AutocompleteService) {
      setGoogleSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      const service = new window.google.maps.places.AutocompleteService();

      const request = {
        input: input.trim(),
        componentRestrictions: { country: 'dz' },
        types: ['geocode', 'establishment'],
        language: language
      };

      service.getPlacePredictions(request, (predictions, status) => {
        setIsLoadingSuggestions(false);

        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          // Combine Google suggestions with popular cities
          const googleResults = predictions.map(prediction => ({
            place_id: prediction.place_id,
            description: prediction.description,
            main_text: prediction.structured_formatting?.main_text || prediction.description,
            secondary_text: prediction.structured_formatting?.secondary_text || '',
            types: prediction.types,
            isGoogle: true
          }));

          setGoogleSuggestions(googleResults);
        } else {
          setGoogleSuggestions([]);
        }
      });
    } catch (error) {
      console.error('Error fetching Google suggestions:', error);
      setIsLoadingSuggestions(false);
      setGoogleSuggestions([]);
    }
  }, [isLoaded, language]);

  // Debounce the Google suggestions fetch
  const debouncedFetchSuggestions = useCallback(
    useDebounce(fetchGoogleSuggestions, 300),
    [fetchGoogleSuggestions]
  );

  // Hide Google's autocomplete dropdown when our custom dropdown is active
  useEffect(() => {
    if (activeSearchField === 'where') {
      // Add CSS to hide Google's pac-container when our dropdown is active
      const style = document.createElement('style');
      style.innerHTML = `
        .pac-container {
          display: none !important;
        }
      `;
      style.id = 'hide-google-autocomplete';
      document.head.appendChild(style);

      return () => {
        // Clean up: remove the style when component unmounts or field changes
        const existingStyle = document.getElementById('hide-google-autocomplete');
        if (existingStyle) {
          existingStyle.remove();
        }
      };
    }
  }, [activeSearchField]);

  const adjustGuestCount = (type: 'adults' | 'children' | 'infants' | 'pets', action: 'increase' | 'decrease') => {
    setSearchData(prev => {
      if (type === 'adults') {
        const newValue = action === 'increase' ? prev[type] + 1 : Math.max(1, prev[type] - 1);
        return { ...prev, [type]: newValue };
      }
      if (type === 'pets') {
        return { ...prev, [type]: action === 'increase' ? prev[type] + 1 : Math.max(0, prev[type] - 1) };
      }
      const newValue = action === 'increase' ? prev[type] + 1 : Math.max(0, prev[type] - 1);
      return { ...prev, [type]: newValue };
    });
  };

  const getTotalGuests = () => {
    return searchData.adults + searchData.children;
  };

  const getGuestText = () => {
    if (currentActiveCategory === 'vehicles') {
      const selectedType = vehicleTypes.find(v => v.value === searchData.vehicleType);
      return selectedType?.label || t.anyVehicle;
    }

    const total = getTotalGuests();
    const infants = searchData.infants;
    const pets = searchData.pets;

    if (total === 0 && infants === 0 && pets === 0) return t.addGuests;

    let parts = [];
    if (total > 0) {
      parts.push(total === 1 ? t.oneGuest : t.guestsCount.replace('{count}', total.toString()));
    }
    if (infants > 0) {
      parts.push(infants === 1 ? `1 ${t.infant}` : t.infantsCount.replace('{count}', infants.toString()));
    }
    if (pets > 0) {
      parts.push(pets === 1 ? `1 ${t.pet}` : t.petsCount.replace('{count}', pets.toString()));
    }

    return parts.join(', ');
  };

  // Enhanced search handler with complete data collection
  const handleSearch = useCallback(() => {
    const params = new URLSearchParams();

    // Common parameters
    if (searchData.location) params.set('location', searchData.location);

    // ✅ FIX: Send GPS coordinates for radius-based search
    if (searchData.coordinates && searchData.coordinates.lat && searchData.coordinates.lng) {
      params.set('lat', searchData.coordinates.lat.toString());
      params.set('lng', searchData.coordinates.lng.toString());
      params.set('radius', '50'); // 50km default radius
    }

    if (searchData.checkIn) params.set('checkIn', searchData.checkIn);
    if (searchData.checkOut) params.set('checkOut', searchData.checkOut);
    if (searchData.category) params.set('category', searchData.category);

    // Category-specific parameters
    if (searchData.category === 'stays') {
      if (searchData.adults > 0 || searchData.children > 0) {
        params.set('adults', searchData.adults.toString());
        params.set('children', searchData.children.toString());
        params.set('guests', (searchData.adults + searchData.children).toString());
      }
      if (searchData.infants > 0) params.set('infants', searchData.infants.toString());
      if (searchData.pets > 0) params.set('pets', searchData.pets.toString());
    } else if (searchData.category === 'vehicles') {
      if (searchData.pickupTime) params.set('pickupTime', searchData.pickupTime);
      if (searchData.returnTime) params.set('returnTime', searchData.returnTime);
      if (searchData.driverAge) params.set('driverAge', searchData.driverAge);
      if (searchData.vehicleType && searchData.vehicleType !== 'any') {
        params.set('vehicleType', searchData.vehicleType);
      }
    }

    // Enhanced location data
    if (searchData.placeId) params.set('placeId', searchData.placeId);
    if (searchData.coordinates) {
      params.set('lat', searchData.coordinates.lat.toString());
      params.set('lng', searchData.coordinates.lng.toString());
    }
    if (searchData.city) params.set('city', searchData.city);
    if (searchData.region) params.set('region', searchData.region);

    router.push(`/search?${params.toString()}`);

    if (onSearch) {
      onSearch(searchData);
    }

    // Smooth collapse animation
    setHeaderState(prev => ({
      ...prev,
      mode: 'default',
      searchExpanded: false,
      isAnimating: true
    }));

    document.body.style.overflow = '';

    setTimeout(() => {
      setHeaderState(prev => ({ ...prev, isAnimating: false }));
    }, 300);
  }, [searchData, router, onSearch]);

  // Touch interactions for mobile optimization
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;

    const touchEnd = e.touches[0].clientY;
    const diff = touchStart - touchEnd;

    if (diff > 50 && !headerState.searchExpanded) {
      handleSearchClick();
    }
    else if (diff < -50 && headerState.searchExpanded) {
      handleClickOutside();
    }
  }, [touchStart, headerState.searchExpanded, handleSearchClick, handleClickOutside]);

  // Memoized classes for better performance
  const headerClasses = useMemo(() => {
    return clsx(
      'fixed top-0 left-0 right-0 transition-all duration-300',
      'bg-white/95 backdrop-blur-lg mobile-optimized',
      {
        'py-1.5 sm:py-2': headerState.mode === 'scrolled',
        'py-3 sm:py-3.5 md:py-4': headerState.mode === 'default',
        'header-shadow-light': headerState.mode === 'default',
        'header-shadow-medium': headerState.mode === 'scrolled',
        'header-shadow-orange': headerState.searchExpanded,
        'z-50': !headerState.searchExpanded,
        'z-[60]': headerState.searchExpanded,
      }
    );
  }, [headerState.mode, headerState.searchExpanded]);

  const searchContainerClasses = useMemo(() => {
    return clsx(
      'w-full transition-all duration-300 search-container relative',
      headerState.mode === 'scrolled'
        ? 'max-w-[280px] md:max-w-[320px] lg:max-w-[350px]'
        : 'max-w-[350px] md:max-w-[500px] lg:max-w-[850px]',
      {
        'expanded': headerState.searchExpanded,
        'collapsed': !headerState.searchExpanded,
        'z-[70]': headerState.searchExpanded,
        'z-10': !headerState.searchExpanded,
      }
    );
  }, [headerState.mode, headerState.searchExpanded]);

  const categoryTabsClasses = useMemo(() => {
    return clsx(
      'hidden md:flex items-center justify-center gap-6 md:gap-8 category-tabs',
      'transition-all duration-300 transform',
      {
        'opacity-100 translate-y-0 h-12 mb-2':
          (headerState.showCategories && headerState.mode === 'default') ||
          headerState.searchExpanded,
        'opacity-0 -translate-y-4 h-0 overflow-hidden mb-0':
          (!headerState.showCategories && !headerState.searchExpanded) ||
          (headerState.mode === 'scrolled' && !headerState.searchExpanded),
      }
    );
  }, [headerState.showCategories, headerState.mode, headerState.searchExpanded]);

  return (
    <>
      <header
        className={headerClasses}
        ref={headerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        role="banner"
        aria-label={t.mainNavigation}
      >
        {/* Main Header Content */}
        <div className="container mx-auto px-3 sm:px-4 md:px-6">
          <div className="transition-all duration-300">

            {/* Top Row: Logo | Category Tabs | Search Bar | Right Navigation */}
            <div className="flex items-center justify-between gap-2 sm:gap-4 md:gap-6 lg:gap-8">

              {/* Left Section: Logo */}
              <div className="flex-shrink-0">
                <Link
                  href="/"
                  className="flex items-center transition-all duration-200 hover:opacity-80"
                  aria-label={t.baytupHomepage}
                >
                  <Image
                    src="/Logo.png"
                    alt={t.baytupLogo}
                    width={150}
                    height={80}
                    className="h-7 w-auto sm:h-8 md:h-9 lg:h-10 max-w-[110px] sm:max-w-[130px] md:max-w-[145px] lg:max-w-[150px]"
                    style={{ objectFit: "contain" }}
                    priority={true}
                    fetchPriority="high"
                  />
                </Link>
              </div>

              {/* Center Section: Category Tabs + Search Bar */}
              <div className="hidden md:flex flex-1 flex-col items-center max-w-4xl mx-auto">

                {/* Category Tabs Row - Enhanced with better animations - Tablet and Desktop */}
                <div className={categoryTabsClasses}>
                  <button
                    onClick={() => {
                      setCurrentActiveCategory('stays');
                      setSearchData(prev => ({ ...prev, category: 'stays' }));
                      onCategoryChange?.('stays');
                    }}
                    className={`flex items-center gap-2 pb-3 border-b-2 transition-all duration-200 hover:scale-105 ${
                      currentActiveCategory === 'stays'
                        ? 'border-[#FF6B35] text-[#FF6B35] transform scale-105'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                    role="tab"
                    aria-selected={currentActiveCategory === 'stays'}
                    aria-label={t.searchForStays}
                    tabIndex={0}
                  >
                    <Home className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="font-medium text-sm md:text-base">{t.stays}</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentActiveCategory('vehicles');
                      setSearchData(prev => ({ ...prev, category: 'vehicles' }));
                      onCategoryChange?.('vehicles');
                    }}
                    className={`flex items-center gap-2 pb-3 border-b-2 transition-all duration-200 hover:scale-105 ${
                      currentActiveCategory === 'vehicles'
                        ? 'border-[#FF6B35] text-[#FF6B35] transform scale-105'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                    role="tab"
                    aria-selected={currentActiveCategory === 'vehicles'}
                    aria-label={t.searchForVehicles}
                    tabIndex={0}
                  >
                    <Car className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="font-medium text-sm md:text-base">{t.vehicles}</span>
                  </button>
                </div>

                {/* Search Bar - Tablet and Desktop */}
                <div
                  ref={searchRef}
                  className={searchContainerClasses}
                  style={{
                    maxWidth: headerState.searchExpanded ? '850px' : undefined,
                    position: headerState.searchExpanded ? 'relative' : 'relative',
                  }}
                >

                  {!headerState.searchExpanded ? (
                    // COLLAPSED STATE - Enhanced Airbnb Style
                    <button
                      onClick={handleSearchClick}
                      className={`w-full mx-auto flex items-center justify-between
                        bg-white border border-gray-200 rounded-full shadow-sm
                        hover:shadow-md transition-all duration-300 hover:scale-[1.02]
                        ${headerState.mode === 'scrolled'
                          ? 'py-2 px-4 max-w-[280px] md:max-w-[300px]'
                          : 'py-2.5 px-4 md:py-3 md:px-5 max-w-[350px] md:max-w-[400px]'}
                      `}
                      style={{
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      aria-label={t.openSearchModal}
                      aria-expanded={headerState.searchExpanded}
                      role="button"
                      tabIndex={0}
                    >
                      {headerState.mode === 'scrolled' ? (
                        // Mini version when scrolled
                        <>
                          <div className="flex items-center gap-2 md:gap-3 flex-1">
                            <Search className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-600" />
                            <span className="text-xs md:text-sm font-medium truncate">
                              {searchData.location || `${t.search} ${currentActiveCategory === 'stays' ? t.stays : t.vehicles}`}
                            </span>
                          </div>
                        </>
                      ) : (
                        // Full collapsed version at top
                        <>
                          <div className="text-left min-w-0">
                            <div className="text-xs md:text-sm font-medium truncate">
                              {searchData.location || t.anywhere}
                            </div>
                          </div>
                          <div className="h-5 md:h-6 w-px bg-gray-200 flex-shrink-0" />
                          <div className="text-left min-w-0">
                            <div className="text-xs md:text-sm font-medium truncate">
                              {searchData.checkIn && searchData.checkOut ? t.selectedDates : t.anytime}
                            </div>
                          </div>
                          <div className="h-5 md:h-6 w-px bg-gray-200 flex-shrink-0" />
                          <div className="text-left min-w-0">
                            <div className="text-xs md:text-sm text-gray-500 truncate">
                              {getGuestText()}
                            </div>
                          </div>
                        </>
                      )}
                      <div className="bg-[#FF6B35] rounded-full p-1.5 md:p-2 ml-1.5 md:ml-2 hover:bg-[#F7931E] transition-colors flex-shrink-0">
                        <Search className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                      </div>
                    </button>
                  ) : (
                    // EXACT AIRBNB STYLE SEARCH BAR
                    <div
                      className="w-full max-w-[850px] mx-auto bg-white rounded-full border border-gray-300 shadow-lg relative"
                      style={{
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        zIndex: 100
                      }}
                      role="search"
                      aria-label={t.searchForm}
                    >
                      <div className="flex items-stretch">

                        {/* Where Field - Exact Airbnb Style */}
                        <div
                          className={`flex-1 cursor-pointer transition-all duration-200 relative ${
                            activeSearchField === 'where'
                              ? 'bg-white rounded-full shadow-lg z-10'
                              : 'hover:bg-gray-50'
                          }`}
                          style={{
                            padding: '14px 32px',
                            borderRadius: activeSearchField === 'where' ? '32px' : '0'
                          }}
                          onClick={() => setActiveSearchField(activeSearchField === 'where' ? null : 'where')}
                        >
                          <div className="text-xs font-semibold text-gray-900 mb-1">
                            {t.where}
                          </div>
                          <input
                            type="text"
                            placeholder={t.searchDestinations}
                            value={searchData.location}
                            onChange={(e) => {
                              const value = e.target.value;
                              setSearchData({...searchData, location: value});
                              setActiveSearchField('where');
                              // Fetch Google suggestions when user types
                              if (value.length > 0) {
                                debouncedFetchSuggestions(value);
                              } else {
                                setGoogleSuggestions([]);
                              }
                            }}
                            className="w-full text-sm bg-transparent border-none outline-none text-gray-600 placeholder-gray-400"
                            style={{ fontSize: '14px' }}
                            onFocus={() => setActiveSearchField('where')}
                            autoComplete="off"
                            spellCheck={false}
                          />

                          {/* Airbnb Location Dropdown with Google API */}
                          {activeSearchField === 'where' && (
                            <div className="absolute top-full left-0 mt-3 bg-white rounded-3xl shadow-2xl z-[9999] border border-gray-200 overflow-hidden"
                                 style={{
                                   width: '400px',
                                   boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
                                 }}>
                              <div className="p-0">
                                {/* Enhanced location suggestions with Google API */}
                                <div className="py-2">
                                  {/* Loading state */}
                                  {isLoadingSuggestions && (
                                    <div className="px-6 py-4 flex items-center space-x-3">
                                      <div className="animate-spin h-4 w-4 border border-gray-300 border-t-[#FF6B35] rounded-full"></div>
                                      <span className="text-sm text-gray-500">{t.searching}</span>
                                    </div>
                                  )}

                                  {/* Show Google suggestions if user is typing */}
                                  {searchData.location && googleSuggestions.length > 0 && (
                                    <>
                                      <div className="px-6 py-2 border-b border-gray-100 bg-gray-50">
                                        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                          {t.searchResults}
                                        </div>
                                      </div>
                                      {googleSuggestions.slice(0, 8).map((suggestion, index) => (
                                        <button
                                          key={suggestion.place_id}
                                          onClick={async () => {
                                            // Use Google Places service to get place details
                                            if (window.google?.maps?.places?.PlacesService) {
                                              setSearchData({
                                                ...searchData,
                                                location: suggestion.description,
                                                placeId: suggestion.place_id
                                              });
                                            } else {
                                              setSearchData({
                                                ...searchData,
                                                location: suggestion.description
                                              });
                                            }
                                            setActiveSearchField(null);
                                            setGoogleSuggestions([]);
                                          }}
                                          className="w-full flex items-center space-x-4 px-6 py-3 hover:bg-gray-50 transition-colors text-left"
                                        >
                                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                            <MapPin className="w-5 h-5 text-blue-600" />
                                          </div>
                                          <div className="flex-1">
                                            <div className="text-sm font-medium text-gray-900">
                                              {suggestion.main_text}
                                            </div>
                                            {suggestion.secondary_text && (
                                              <div className="text-xs text-gray-500">
                                                {suggestion.secondary_text}
                                              </div>
                                            )}
                                          </div>
                                        </button>
                                      ))}
                                    </>
                                  )}

                                  {/* Show popular cities when no input or as fallback */}
                                  {(!searchData.location || (searchData.location && googleSuggestions.length === 0 && !isLoadingSuggestions)) && (
                                    <>
                                      <div className="px-6 py-2 border-b border-gray-100 bg-gray-50">
                                        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                          {t.popularDestinations}
                                        </div>
                                      </div>
                                      {popularCities
                                        .filter(city => {
                                          if (!searchData.location) return true;
                                          const cityName = getCityName(city).toLowerCase();
                                          return cityName.includes(searchData.location.toLowerCase());
                                        })
                                        .slice(0, 6)
                                        .map((city, index) => (
                                          <button
                                            key={city.name}
                                            onClick={() => {
                                              const cityName = getCityName(city);
                                              setSearchData({
                                                ...searchData,
                                                location: `${cityName}${t.commaAlgeria}`,
                                                coordinates: city.coordinates,
                                                city: cityName,
                                                region: t.algeria
                                              });
                                              setActiveSearchField(null);
                                              setGoogleSuggestions([]);
                                            }}
                                            className="w-full flex items-center space-x-4 px-6 py-3 hover:bg-gray-50 transition-colors text-left"
                                          >
                                            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                                              <span className="text-lg">{city.image}</span>
                                            </div>
                                            <div>
                                              <div className="text-sm font-medium text-gray-900">
                                                {getCityName(city)}{t.commaAlgeria}
                                              </div>
                                              <div className="text-xs text-gray-500">{t.popularDestination}</div>
                                            </div>
                                          </button>
                                        ))}
                                    </>
                                  )}

                                  {/* No results state */}
                                  {searchData.location && googleSuggestions.length === 0 && !isLoadingSuggestions && (
                                    popularCities.filter(city => {
                                      const cityName = getCityName(city).toLowerCase();
                                      return cityName.includes(searchData.location.toLowerCase());
                                    }).length === 0
                                  ) && (
                                    <div className="px-6 py-8 text-center">
                                      <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                      <div className="text-sm font-medium text-gray-900 mb-1">{t.noResults}</div>
                                      <div className="text-xs text-gray-500">{t.tryDifferentSearch}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Separator */}
                        <div className="w-px bg-gray-300 my-4"></div>

                        {/* ✅ FIX BUG: UN SEUL champ pour les dates */}
                        <div
                          className={`flex-1 cursor-pointer transition-all duration-200 relative ${
                            activeSearchField === 'dates'
                              ? 'bg-white rounded-full shadow-lg z-10'
                              : 'hover:bg-gray-50'
                          }`}
                          style={{
                            padding: '14px 32px',
                            borderRadius: activeSearchField === 'dates' ? '32px' : '0'
                          }}
                          onClick={() => setActiveSearchField(activeSearchField === 'dates' ? null : 'dates')}
                        >
                          <div className="text-xs font-semibold text-gray-900 mb-1">
                            {currentActiveCategory === 'vehicles' ? t.rentalPeriod || 'Période de location' : t.travelDates || 'Dates de séjour'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {searchData.checkIn && searchData.checkOut ? (
                              <>
                                {new Date(searchData.checkIn).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short'
                                })}
                                {' → '}
                                {new Date(searchData.checkOut).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </>
                            ) : (
                              t.addDates || 'Ajouter dates'
                            )}
                          </div>

                          {/* Calendrier visuel style Airbnb */}
                          {activeSearchField === 'dates' && (
                            <div
                              className="absolute top-full left-0 mt-3 bg-white rounded-3xl shadow-2xl z-[9999] border border-gray-200 overflow-hidden"
                              style={{
                                width: '850px',
                                boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <CalendarComponent
                                checkIn={searchData.checkIn}
                                checkOut={searchData.checkOut}
                                onDateSelect={(dates) => {
                                  setSearchData({
                                    ...searchData,
                                    checkIn: dates.checkIn,
                                    checkOut: dates.checkOut
                                  });
                                }}
                                onClose={() => setActiveSearchField(null)}
                                vehicleMode={currentActiveCategory === 'vehicles'}
                                activeField="checkin"
                              />
                            </div>
                          )}
                        </div>

                        {/* Separator */}
                        <div className="w-px bg-gray-300 my-4"></div>

                        {/* Who - Exact Airbnb Style */}
                        <div
                          className={`flex-1 cursor-pointer transition-all duration-200 relative ${
                            activeSearchField === 'who'
                              ? 'bg-white rounded-full shadow-lg z-10'
                              : 'hover:bg-gray-50'
                          }`}
                          style={{
                            padding: '14px 32px',
                            borderRadius: activeSearchField === 'who' ? '32px' : '0'
                          }}
                          onClick={() => setActiveSearchField(activeSearchField === 'who' ? null : 'who')}
                        >
                          <div className="text-xs font-semibold text-gray-900 mb-1">
                            {t.who}
                          </div>
                          <div className="text-sm text-gray-600">
                            {currentActiveCategory === 'vehicles' ?
                              (searchData.vehicleType && searchData.vehicleType !== 'any' ?
                                vehicleTypes.find(v => v.value === searchData.vehicleType)?.label :
                                t.addVehicleType
                              ) :
                              (getTotalGuests() > 0 ?
                                `${getTotalGuests()} ${getTotalGuests() !== 1 ? t.guests : t.guest}` :
                                t.addGuests
                              )
                            }
                          </div>

                          {/* Enhanced Guest/Vehicle Dropdown */}
                          {activeSearchField === 'who' && (
                            <div className="absolute top-full right-0 mt-3 bg-white rounded-2xl shadow-2xl z-[9999] border border-gray-200 overflow-hidden"
                                 style={{
                                   width: '420px',
                                   boxShadow: '0 8px 28px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.04)'
                                 }}>

                              {currentActiveCategory === 'vehicles' ? (
                                /* Enhanced Vehicle Selection */
                                <div className="p-6">
                                  <div className="mb-6">
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{t.vehicleType}</h3>
                                    <p className="text-sm text-gray-600">{t.chooseVehicle}</p>
                                  </div>

                                  <div className="space-y-3">
                                    {vehicleTypes.slice(0, 4).map((type) => (
                                      <button
                                        key={type.value}
                                        onClick={() => setSearchData(prev => ({ ...prev, vehicleType: type.value }))}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] ${
                                          searchData.vehicleType === type.value
                                            ? 'border-[#FF6B35] bg-orange-50 shadow-md'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                      >
                                        <div className={`font-semibold text-base ${
                                          searchData.vehicleType === type.value
                                            ? 'text-[#FF6B35]'
                                            : 'text-gray-900'
                                        }`}>
                                          {type.label}
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">
                                          {type.value === 'car' ? t.perfectForCityTrips :
                                           type.value === 'suv' ? t.greatForFamilies :
                                           type.value === 'van' ? t.idealForGroups :
                                           t.quickAndEfficient}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                /* Enhanced Guest Selection */
                                <div className="p-6">
                                  <div className="mb-6">
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{t.guests}</h3>
                                    <p className="text-sm text-gray-600">{t.howManyPeople}</p>
                                  </div>

                                  <div className="space-y-5">
                                    {/* Adults */}
                                    <div className="flex items-center justify-between py-3">
                                      <div>
                                        <div className="font-semibold text-gray-900 text-base">{t.adults}</div>
                                        <div className="text-sm text-gray-600">{t.ages13Above}</div>
                                      </div>
                                      <div className="flex items-center space-x-3">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            adjustGuestCount('adults', 'decrease');
                                          }}
                                          disabled={searchData.adults <= 1}
                                          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                            searchData.adults <= 1
                                              ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                                              : 'border-gray-300 text-gray-700 hover:border-gray-900 hover:text-gray-900 hover:scale-110 bg-white'
                                          }`}
                                        >
                                          <Minus className="h-4 w-4" />
                                        </button>
                                        <span className="w-8 text-center font-bold text-lg text-gray-900">{searchData.adults}</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            adjustGuestCount('adults', 'increase');
                                          }}
                                          className="w-10 h-10 rounded-full border-2 border-gray-300 text-gray-700 hover:border-gray-900 hover:text-gray-900 flex items-center justify-center transition-all duration-200 hover:scale-110 bg-white"
                                        >
                                          <Plus className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Children */}
                                    <div className="flex items-center justify-between py-3 border-t border-gray-100">
                                      <div>
                                        <div className="font-semibold text-gray-900 text-base">{t.children}</div>
                                        <div className="text-sm text-gray-600">{t.ages2to12}</div>
                                      </div>
                                      <div className="flex items-center space-x-3">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            adjustGuestCount('children', 'decrease');
                                          }}
                                          disabled={searchData.children <= 0}
                                          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                            searchData.children <= 0
                                              ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                                              : 'border-gray-300 text-gray-700 hover:border-gray-900 hover:text-gray-900 hover:scale-110 bg-white'
                                          }`}
                                        >
                                          <Minus className="h-4 w-4" />
                                        </button>
                                        <span className="w-8 text-center font-bold text-lg text-gray-900">{searchData.children}</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            adjustGuestCount('children', 'increase');
                                          }}
                                          className="w-10 h-10 rounded-full border-2 border-gray-300 text-gray-700 hover:border-gray-900 hover:text-gray-900 flex items-center justify-center transition-all duration-200 hover:scale-110 bg-white"
                                        >
                                          <Plus className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Infants */}
                                    <div className="flex items-center justify-between py-3 border-t border-gray-100">
                                      <div>
                                        <div className="font-semibold text-gray-900 text-base">{t.infants}</div>
                                        <div className="text-sm text-gray-600">{t.under2}</div>
                                      </div>
                                      <div className="flex items-center space-x-3">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            adjustGuestCount('infants', 'decrease');
                                          }}
                                          disabled={searchData.infants <= 0}
                                          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                            searchData.infants <= 0
                                              ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                                              : 'border-gray-300 text-gray-700 hover:border-gray-900 hover:text-gray-900 hover:scale-110 bg-white'
                                          }`}
                                        >
                                          <Minus className="h-4 w-4" />
                                        </button>
                                        <span className="w-8 text-center font-bold text-lg text-gray-900">{searchData.infants}</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            adjustGuestCount('infants', 'increase');
                                          }}
                                          className="w-10 h-10 rounded-full border-2 border-gray-300 text-gray-700 hover:border-gray-900 hover:text-gray-900 flex items-center justify-center transition-all duration-200 hover:scale-110 bg-white"
                                        >
                                          <Plus className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Pets */}
                                    <div className="flex items-center justify-between py-3 border-t border-gray-200">
                                      <div>
                                        <div className="font-semibold text-gray-900 text-base">{t.pets}</div>
                                        <div className="text-sm text-[#FF6B35] underline cursor-pointer hover:text-[#E55A2B]">
                                          {t.serviceAnimal}
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-3">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            adjustGuestCount('pets', 'decrease');
                                          }}
                                          disabled={searchData.pets <= 0}
                                          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                            searchData.pets <= 0
                                              ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                                              : 'border-gray-300 text-gray-700 hover:border-gray-900 hover:text-gray-900 hover:scale-110 bg-white'
                                          }`}
                                        >
                                          <Minus className="h-4 w-4" />
                                        </button>
                                        <span className="w-8 text-center font-bold text-lg text-gray-900">{searchData.pets}</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            adjustGuestCount('pets', 'increase');
                                          }}
                                          className="w-10 h-10 rounded-full border-2 border-gray-300 text-gray-700 hover:border-gray-900 hover:text-gray-900 flex items-center justify-center transition-all duration-200 hover:scale-110 bg-white"
                                        >
                                          <Plus className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Baytup Search Button - Orange Theme */}
                        <div className="flex items-center pl-4">
                          <button
                            onClick={handleSearch}
                            className="bg-gradient-to-r from-[#FF6B35] to-[#E55A2B] hover:from-[#E55A2B] hover:to-[#D4491F] text-white rounded-full transition-all duration-200 flex items-center space-x-2 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
                            style={{
                              padding: '16px 24px'
                            }}
                          >
                            <Search className="h-4 w-4" />
                            <span>{t.search}</span>
                          </button>
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Search Button (Center) - Only Mobile */}
              <div className="md:hidden flex-1 flex justify-center">
                <button
                  onClick={handleSearchClick}
                  className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-white border border-[#DDDDDD] rounded-full transition-all duration-300 hover:shadow-md hover:scale-105 active:scale-95 touch-optimized"
                  style={{
                    boxShadow: '0 1px 2px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)'
                  }}
                  aria-label={t.openSearch}
                  role="button"
                >
                  <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 header-input" />
                  <div className="text-left">
                    <div className="text-xs sm:text-sm font-medium header-label">{t.anywhere}</div>
                    <div className="text-[10px] sm:text-xs header-input">{t.anytime} • {t.addGuests}</div>
                  </div>
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#FF6B35] rounded-full flex items-center justify-center ml-1 sm:ml-2 shadow-md flex-shrink-0">
                    <Search className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
                  </div>
                </button>
              </div>

              {/* Right Section: Enhanced Navigation */}
              <div className="flex-shrink-0 flex items-center space-x-1 sm:space-x-2">
                {/* Switch to hosting - Show on Tablet and Desktop - Only show for guests */}
                {(!user || (user && user.role === 'guest')) && (
                  <Link
                    href="/become-host"
                    className="hidden md:block text-xs lg:text-sm font-medium text-[#FF6B35] hover:text-[#F7931E] py-2 lg:py-3 px-2 lg:px-3 rounded-full hover:bg-orange-50 transition-all duration-200 border border-transparent hover:border-[#FF6B35] hover:scale-105 active:scale-95 whitespace-nowrap"
                  >
                    {t.switchToHosting}
                  </Link>
                )}

                {/* Notifications - New Feature - Hidden on Mobile */}
                {user && (
                  <div className="hidden sm:block relative" ref={notificationMenuRef}>
                    <button
                      onClick={() => setIsNotificationMenuOpen(!isNotificationMenuOpen)}
                      className="p-2 sm:p-2.5 lg:p-3 rounded-full hover:bg-gray-50 transition-all duration-200 hover:scale-110 relative"
                      aria-label={t.notifications}
                    >
                      <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-700" />
                      {notifications > 0 && (
                        <span className="absolute -top-0.5 sm:-top-1 -right-0.5 sm:-right-1 h-4 w-4 sm:h-5 sm:w-5 bg-red-500 text-white text-[10px] sm:text-xs rounded-full flex items-center justify-center animate-pulse">
                          {notifications > 9 ? '9+' : notifications}
                        </span>
                      )}
                    </button>

                    {isNotificationMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                          <div className="text-sm font-semibold text-gray-900">{t.notifications}</div>
                          {notificationsList && notificationsList.length > 0 && (
                            <button
                              onClick={async () => {
                                await markAllAsRead();
                              }}
                              className="text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors"
                            >
                              Mark all as read
                            </button>
                          )}
                        </div>
                        <div className="py-2 max-h-96 overflow-y-auto">
                          {notificationsList && notificationsList.length > 0 ? (
                            <>
                              {notificationsList.map((notification) => (
                                <button
                                  key={notification._id}
                                  onClick={async () => {
                                    if (!notification.isRead) {
                                      await markAsRead(notification._id);
                                    }
                                    if (notification.link) {
                                      router.push(notification.link);
                                    }
                                    setIsNotificationMenuOpen(false);
                                  }}
                                  className="w-full px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 text-left border-b border-gray-50 last:border-b-0"
                                >
                                  {/* Avatar or Icon */}
                                  <div className="flex-shrink-0 mt-1">
                                    {notification.sender?.avatar ? (
                                      <Image
                                        src={notification.sender.avatar}
                                        alt={`${notification.sender.firstName} ${notification.sender.lastName}`}
                                        width={40}
                                        height={40}
                                        className="rounded-full"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                                        <Bell className="h-5 w-5 text-orange-500" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                                          {notification.title}
                                        </p>
                                        <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
                                          {notification.message}
                                        </p>
                                      </div>
                                      {!notification.isRead && (
                                        <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {moment(notification.createdAt).fromNow()}
                                    </p>
                                  </div>
                                </button>
                              ))}

                              {/* View All Link */}
                              <div className="px-4 py-3 border-t border-gray-100">
                                <Link
                                  href="/dashboard/notifications"
                                  onClick={() => setIsNotificationMenuOpen(false)}
                                  className="text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors block text-center"
                                >
                                  View all notifications
                                </Link>
                              </div>
                            </>
                          ) : (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">
                              {t.noNotifications}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Language/Globe Selector - Enhanced - Hidden on Mobile */}
                <div className="hidden sm:block relative" ref={languageMenuRef}>
                  <button
                    onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                    className="p-2 sm:p-2.5 lg:p-3 rounded-full hover:bg-gray-50 transition-all duration-200 hover:scale-110"
                    aria-label={t.languageAndRegion}
                  >
                    <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-700" />
                  </button>

                  {isLanguageMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-2xl py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="text-sm font-semibold text-gray-900">{t.languageAndRegion}</div>
                      </div>
                      <div className="py-2">
                        {languages.map((lang, index) => (
                          <button
                            key={lang.code}
                            onClick={() => {
                              onLanguageChange?.(lang.code as 'en' | 'fr' | 'ar');
                              setIsLanguageMenuOpen(false);
                            }}
                            className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-all duration-200 hover:scale-105 ${
                              language === lang.code ? 'bg-orange-50 border-l-2 border-[#FF6B35]' : ''
                            }`}
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <span className="text-lg">{lang.flag}</span>
                            <div className="flex-1 text-left">
                              <span className="text-sm text-gray-700 font-medium">{lang.name}</span>
                              <div className="text-xs text-gray-500">{lang.nativeName}</div>
                            </div>
                            {language === lang.code && (
                              <div className="w-2 h-2 bg-[#FF6B35] rounded-full animate-pulse" />
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="px-4 py-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500 mb-2">{t.currency}</div>
                        <div className="space-y-1">
                          {currencies.map((curr) => (
                            <button
                              key={curr.code}
                              onClick={() => {
                                onCurrencyChange?.(curr.code as 'DZD' | 'EUR');
                                setIsLanguageMenuOpen(false);
                              }}
                              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:scale-105 ${
                                currency === curr.code ? 'bg-orange-50 border border-[#FF6B35]' : ''
                              }`}
                            >
                              <span className="text-sm font-medium">{curr.code}</span>
                              <span className="text-sm text-gray-600">{curr.symbol}</span>
                              <div className="flex-1 text-left">
                                <span className="text-xs text-gray-500">{getCurrencyName(curr)}</span>
                              </div>
                              {currency === curr.code && (
                                <div className="w-2 h-2 bg-[#FF6B35] rounded-full" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced User Menu - Optimized for all screens */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 sm:space-x-3 p-0.5 sm:p-1 pl-2 sm:pl-3 pr-0.5 sm:pr-1 rounded-full border border-gray-300 hover:shadow-md transition-all duration-200 hover:scale-105"
                    aria-label={t.userMenu}
                  >
                    <Menu className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-700" />
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-[#FF6B35] to-[#F7931E] rounded-full flex items-center justify-center shadow-sm">
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={t.userAvatar}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                      )}
                    </div>
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-2xl py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                      {!user ? (
                        <>
                          <Link
                            href="/login"
                            className="block px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors hover:scale-105 flex items-center space-x-2"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <UserCheck className="h-4 w-4" />
                            <span>{t.login}</span>
                          </Link>
                          <Link
                            href="/register"
                            className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors hover:scale-105 flex items-center space-x-2"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <User className="h-4 w-4" />
                            <span>{t.signup}</span>
                          </Link>
                          <div className="border-t border-gray-100 my-2" />
                          {/* Only show Become a Host for non-logged-in users or guest users */}
                          {(!user || (user && user.role === 'guest')) && (
                            <Link
                              href="/become-host"
                              className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors hover:scale-105 flex items-center space-x-2"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <Home className="h-4 w-4" />
                              <span>{t.becomeHost}</span>
                            </Link>
                          )}
                          <Link
                            href="/help"
                            className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors hover:scale-105 flex items-center space-x-2"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <HelpCircle className="h-4 w-4" />
                            <span>{t.help}</span>
                          </Link>
                        </>
                      ) : (
                        <>
                          <div className="px-4 py-3 border-b border-gray-100">
                            <div className="text-sm font-semibold text-gray-900">
                              {t.helloUser.replace('{name}', user.firstName || t.user)}
                            </div>
                            <div className="text-xs text-gray-500">{t.welcomeBack}</div>
                          </div>
                          <Link
                            href="/dashboard"
                            className="block px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors hover:scale-105 flex items-center space-x-2"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <LayoutDashboard className="h-4 w-4" />
                            <span>{t.dashboard}</span>
                          </Link>
                          <div className="border-t border-gray-100 my-2" />
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              if (onLogout) {
                                onLogout();
                              }
                            }}
                            className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors hover:scale-105 flex items-center space-x-2"
                          >
                            <LogOut className="h-4 w-4" />
                            <span>{t.logout}</span>
                          </button>
                        </>
                      )}

                      {/* Mobile-only: Categories & Language/Currency Selector */}
                      <div className="sm:hidden">
                        <div className="border-t border-gray-100 my-2" />

                        {/* Search Categories */}
                        {searchTabs.map((tab) => (
                          <Link
                            key={tab.key}
                            href={`/search?category=${tab.key}`}
                            className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            <tab.icon className="h-4 w-4" />
                            <span>{tab.label}</span>
                          </Link>
                        ))}

                        <div className="border-t border-gray-100 my-2" />

                        {/* Language Selector */}
                        <div className="px-4 py-2">
                          <div className="text-xs font-semibold text-gray-500 mb-2">{t.languageAndRegion}</div>
                          {languages.map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => {
                                onLanguageChange?.(lang.code as 'en' | 'fr' | 'ar');
                                setIsUserMenuOpen(false);
                              }}
                              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors ${
                                language === lang.code ? 'bg-orange-50 border border-[#FF6B35]' : ''
                              }`}
                            >
                              <span className="text-lg">{lang.flag}</span>
                              <span className="text-sm text-gray-700">{lang.name}</span>
                              {language === lang.code && (
                                <div className="ml-auto w-2 h-2 bg-[#FF6B35] rounded-full" />
                              )}
                            </button>
                          ))}
                        </div>

                        <div className="border-t border-gray-100 my-2" />

                        {/* Currency Selector */}
                        <div className="px-4 py-2">
                          <div className="text-xs font-semibold text-gray-500 mb-2">{t.currency}</div>
                          {currencies.map((curr) => (
                            <button
                              key={curr.code}
                              onClick={() => {
                                onCurrencyChange?.(curr.code as 'DZD' | 'EUR');
                                setIsUserMenuOpen(false);
                              }}
                              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors ${
                                currency === curr.code ? 'bg-orange-50 border border-[#FF6B35]' : ''
                              }`}
                            >
                              <span className="text-sm font-medium">{curr.code}</span>
                              <span className="text-sm text-gray-600">{curr.symbol}</span>
                              {currency === curr.code && (
                                <div className="ml-auto w-2 h-2 bg-[#FF6B35] rounded-full" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Backdrop for expanded search */}
      {headerState.searchExpanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[55] animate-in fade-in duration-300"
          onClick={handleClickOutside}
        />
      )}


      {/* Enhanced Mobile Search Modal */}
      {headerState.searchExpanded && (
        <div className="lg:hidden fixed inset-0 bg-white z-[60] animate-in slide-in-from-bottom duration-300">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <button
                onClick={handleClickOutside}
                className="p-2 rounded-full hover:bg-gray-50 transition-all duration-200 hover:scale-110"
              >
                <X className="h-6 w-6 text-gray-700" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900">{t.search}</h2>
              <div className="w-10" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Mobile Search Tabs - Enhanced */}
              <div className="flex space-x-2">
                {searchTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveSearchTab(tab.key);
                      setCurrentActiveCategory(tab.key as 'stays' | 'vehicles');
                      setSearchData(prev => ({ ...prev, category: tab.key as 'stays' | 'vehicles' }));
                    }}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 ${
                      activeSearchTab === tab.key
                        ? 'bg-gradient-to-r from-[#FF6B35] to-[#F7931E] text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Mobile Search Fields - Enhanced */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">{t.where}</label>
                  {isLoaded && !loadError ? (
                    <Autocomplete
                      onLoad={onAutocompleteLoad}
                      onPlaceChanged={onPlaceChanged}
                      options={autocompleteOptions}
                    >
                      <input
                        type="text"
                        placeholder={t.searchDestinationsAlgeria}
                        value={searchData.location}
                        onChange={(e) => setSearchData({...searchData, location: e.target.value})}
                        className="w-full px-4 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-lg header-input transition-all duration-200"
                        autoComplete="off"
                        spellCheck={false}
                        aria-label={t.searchForLocations}
                      />
                    </Autocomplete>
                  ) : loadError ? (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={t.searchLocationsMapsUnavailable}
                        value={searchData.location}
                        onChange={(e) => setSearchData({...searchData, location: e.target.value})}
                        className="w-full px-4 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-lg header-input transition-all duration-200"
                        aria-label={t.searchLocations}
                      />
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-red-400 text-lg">⚠</div>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={t.loadingMaps}
                        value={searchData.location}
                        onChange={(e) => setSearchData({...searchData, location: e.target.value})}
                        className="w-full px-4 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent text-lg header-input transition-all duration-200"
                        disabled
                        aria-label={t.searchLocationsLoading}
                      />
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 animate-spin h-4 w-4 border border-gray-300 border-t-[#FF6B35] rounded-full"></div>
                    </div>
                  )}
                </div>

                {/* Enhanced Date and Time Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 header-label">
                      {activeSearchTab === 'vehicles' ? t.pickup : t.checkin}
                    </label>
                    <input
                      type="date"
                      value={searchData.checkIn}
                      onChange={(e) => setSearchData({...searchData, checkIn: e.target.value})}
                      className="w-full px-4 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent header-input transition-all duration-200"
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {activeSearchTab === 'vehicles' && (
                      <input
                        type="time"
                        value={searchData.pickupTime}
                        onChange={(e) => setSearchData({...searchData, pickupTime: e.target.value})}
                        className="w-full px-4 py-3 mt-2 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all duration-200"
                        placeholder={t.pickupTime}
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 header-label">
                      {activeSearchTab === 'vehicles' ? t.return : t.checkout}
                    </label>
                    <input
                      type="date"
                      value={searchData.checkOut}
                      onChange={(e) => setSearchData({...searchData, checkOut: e.target.value})}
                      className="w-full px-4 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent header-input transition-all duration-200"
                      min={searchData.checkIn || new Date().toISOString().split('T')[0]}
                    />
                    {activeSearchTab === 'vehicles' && (
                      <input
                        type="time"
                        value={searchData.returnTime}
                        onChange={(e) => setSearchData({...searchData, returnTime: e.target.value})}
                        className="w-full px-4 py-3 mt-2 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all duration-200"
                        placeholder={t.returnTime}
                      />
                    )}
                  </div>
                </div>

                {/* Enhanced Mobile Guests/Vehicle Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-4">
                    {activeSearchTab === 'vehicles' ? t.vehicleAndDriver : t.who}
                  </label>
                  {activeSearchTab === 'vehicles' ? (
                    <div className="space-y-4">
                      {/* Vehicle Type Selection */}
                      <div className="bg-gray-50 p-4 rounded-2xl">
                        <div className="font-medium text-gray-900 mb-3">{t.vehicleType}</div>
                        <div className="grid grid-cols-2 gap-3">
                          {vehicleTypes.slice(0, 6).map((type) => (
                            <button
                              key={type.value}
                              onClick={() => setSearchData(prev => ({ ...prev, vehicleType: type.value }))}
                              className={`p-4 text-center rounded-xl border transition-all duration-200 hover:scale-105 ${
                                searchData.vehicleType === type.value
                                  ? 'border-[#FF6B35] bg-orange-50 text-[#FF6B35] shadow-md scale-105'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              <div className="text-sm font-medium">{type.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Driver Age Selection */}
                      <div className="bg-gray-50 p-4 rounded-2xl">
                        <div className="font-medium text-gray-900 mb-3">{t.driverAge}</div>
                        <div className="grid grid-cols-2 gap-3">
                          {[t.driverAge18to24, t.driverAge25to29, t.driverAge30to64, t.driverAge65plus].map((age) => (
                            <button
                              key={age}
                              onClick={() => setSearchData(prev => ({ ...prev, driverAge: age }))}
                              className={`p-4 text-center rounded-xl border transition-all duration-200 hover:scale-105 ${
                                searchData.driverAge === age
                                  ? 'border-[#FF6B35] bg-orange-50 text-[#FF6B35] shadow-md scale-105'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              <div className="text-sm font-medium">{age}</div>
                            </button>
                          ))}
                        </div>
                        <div className="mt-3 text-xs text-gray-500">
                          {t.additionalFeesYoungDriver}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Enhanced Stays Guest Counter */
                    <div className="space-y-4 bg-gray-50 p-4 rounded-2xl">
                      {/* Adults */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{t.adults}</div>
                          <div className="text-sm text-gray-500">{t.ages13Above}</div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              adjustGuestCount('adults', 'decrease');
                            }}
                            disabled={searchData.adults <= 1}
                            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 hover:scale-110 ${
                              searchData.adults <= 1
                                ? 'border-gray-200 text-gray-300'
                                : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:shadow-md'
                            }`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-medium text-lg">{searchData.adults}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              adjustGuestCount('adults', 'increase');
                            }}
                            className="w-10 h-10 rounded-full border border-gray-300 text-gray-600 hover:border-gray-400 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-md"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Children */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{t.children}</div>
                          <div className="text-sm text-gray-500">{t.ages2to12Alt}</div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              adjustGuestCount('children', 'decrease');
                            }}
                            disabled={searchData.children <= 0}
                            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 hover:scale-110 ${
                              searchData.children <= 0
                                ? 'border-gray-200 text-gray-300'
                                : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:shadow-md'
                            }`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-medium text-lg">{searchData.children}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              adjustGuestCount('children', 'increase');
                            }}
                            className="w-10 h-10 rounded-full border border-gray-300 text-gray-600 hover:border-gray-400 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-md"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Infants */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{t.infants}</div>
                          <div className="text-sm text-gray-500">{t.under2}</div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              adjustGuestCount('infants', 'decrease');
                            }}
                            disabled={searchData.infants <= 0}
                            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 hover:scale-110 ${
                              searchData.infants <= 0
                                ? 'border-gray-200 text-gray-300'
                                : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:shadow-md'
                            }`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-medium text-lg">{searchData.infants}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              adjustGuestCount('infants', 'increase');
                            }}
                            className="w-10 h-10 rounded-full border border-gray-300 text-gray-600 hover:border-gray-400 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-md"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Pets */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div>
                          <div className="font-medium text-gray-900">{t.pets}</div>
                          <div className="text-sm text-gray-500">{t.bringingPets}</div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              adjustGuestCount('pets', 'decrease');
                            }}
                            disabled={searchData.pets <= 0}
                            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 hover:scale-110 ${
                              searchData.pets <= 0
                                ? 'border-gray-200 text-gray-300'
                                : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:shadow-md'
                            }`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-medium text-lg">{searchData.pets}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              adjustGuestCount('pets', 'increase');
                            }}
                            className="w-10 h-10 rounded-full border border-gray-300 text-gray-600 hover:border-gray-400 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-md"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Mobile Search Button */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={handleSearch}
                className="w-full bg-gradient-to-r from-[#FF6B35] to-[#F7931E] hover:from-[#F7931E] hover:to-[#FF6B35] text-white font-semibold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl active:scale-95 group relative overflow-hidden"
              >
                <Search className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                <span>{t.search}</span>
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default Header;
