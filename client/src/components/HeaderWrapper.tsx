'use client';

import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSocket } from '@/contexts/SocketContext';
import Header from './Header';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function HeaderWrapper() {
  const { state, setLanguage, setCurrency, logout } = useApp();
  const { language, setLanguage: setLanguageContext, currency, setCurrency: setCurrencyContext } = useLanguage();
  const { unreadCount, notifications: socketNotifications } = useSocket();
  const router = useRouter();

  const handleSearch = (searchData: any) => {
    // Build search query with enhanced parameters
    const params = new URLSearchParams();

    // Core search parameters
    if (searchData.location) params.set('location', searchData.location);
    if (searchData.checkIn) params.set('checkIn', searchData.checkIn);
    if (searchData.checkOut) params.set('checkOut', searchData.checkOut);
    if (searchData.category && searchData.category !== 'all') {
      params.set('category', searchData.category);
    }

    // Category-specific parameters
    if (searchData.category === 'stays') {
      if (searchData.adults > 1 || searchData.children > 0) {
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

    // Navigate to search page
    router.push(`/search?${params.toString()}`);
  };

  const handleLanguageChange = (lang: 'en' | 'fr' | 'ar') => {
    setLanguageContext(lang);
    setLanguage(lang);
    toast.success(
      lang === 'ar' ? 'تم تغيير اللغة بنجاح' :
      lang === 'fr' ? 'Langue modifiée avec succès' :
      'Language changed successfully',
      {
        duration: 3000,
        style: {
          backgroundColor: lang === 'ar' ? '#f0f9ff' : '#f0fdf4',
          color: '#1f2937',
          fontWeight: '500',
        },
      }
    );
  };

  const handleCurrencyChange = (curr: 'DZD' | 'EUR') => {
    setCurrencyContext(curr);
    setCurrency(curr);
    const message = language === 'ar'
      ? `تم تغيير العملة إلى ${curr}`
      : language === 'fr'
      ? `Devise changée en ${curr}`
      : `Currency changed to ${curr}`;

    toast.success(message, {
      duration: 3000,
      style: {
        backgroundColor: '#fefce8',
        color: '#1f2937',
        fontWeight: '500',
      },
    });
  };

  const handleCategoryChange = (category: 'stays' | 'vehicles') => {
    // Optional: Show a subtle notification for category change
    const message = language === 'ar'
      ? `تم التبديل إلى ${category === 'stays' ? 'الإقامات' : 'المركبات'}`
      : language === 'fr'
      ? `Basculé vers ${category === 'stays' ? 'Séjours' : 'Véhicules'}`
      : `Switched to ${category === 'stays' ? 'Stays' : 'Vehicles'}`;

    toast(message, {
      duration: 2000,
      icon: category === 'stays' ? '🏠' : '🚗',
      style: {
        backgroundColor: '#f3f4f6',
        color: '#1f2937',
        fontSize: '14px',
      },
    });
  };

  const handleLogout = async () => {
    try {
      // Show confirmation toast based on language
      const confirmMessage = language === 'ar'
        ? 'جارٍ تسجيل الخروج...'
        : language === 'fr'
        ? 'Déconnexion en cours...'
        : 'Logging out...';

      toast.loading(confirmMessage, { id: 'logout-loading' });

      // Call logout function from AppContext
      await logout();

      // Dismiss loading toast
      toast.dismiss('logout-loading');

      // Show success message based on language and user role
      const userRole = state.user?.role || 'guest';
      const successMessage = language === 'ar'
        ? `تم تسجيل الخروج بنجاح${userRole === 'admin' ? ' (مسؤول)' : userRole === 'host' ? ' (مضيف)' : ''}`
        : language === 'fr'
        ? `Déconnexion réussie${userRole === 'admin' ? ' (Admin)' : userRole === 'host' ? ' (Hôte)' : ''}`
        : `Logged out successfully${userRole === 'admin' ? ' (Admin)' : userRole === 'host' ? ' (Host)' : ''}`;

      toast.success(successMessage, {
        duration: 3000,
        style: {
          backgroundColor: '#f0fdf4',
          color: '#1f2937',
          fontWeight: '500',
        },
      });

      // Navigate to home page after logout
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);

      // Show error message based on language
      const errorMessage = language === 'ar'
        ? 'فشل تسجيل الخروج. حاول مرة أخرى.'
        : language === 'fr'
        ? 'Échec de la déconnexion. Veuillez réessayer.'
        : 'Logout failed. Please try again.';

      toast.error(errorMessage, {
        duration: 4000,
      });
    }
  };

  return (
    <Header
      language={language}
      currency={currency}
      user={state.user}
      notifications={unreadCount}
      notificationsList={socketNotifications}
      onLanguageChange={handleLanguageChange}
      onCurrencyChange={handleCurrencyChange}
      onSearch={handleSearch}
      onCategoryChange={handleCategoryChange}
      onLogout={handleLogout}
    />
  );
}