'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, MapPin, Star,
  ChevronLeft, ChevronRight, Map,
  Home as HomeIcon, Car, Building, X,
  Shield, CreditCard, Headphones, UserCheck,
  SearchCheck, CalendarCheck, Sparkles,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFeature } from '@/contexts/FeatureFlagsContext';
import { SearchFilters } from '@/types';
import dynamic from 'next/dynamic';
import WishlistButton from '@/components/WishlistButton';
import { formatPrice as formatPriceUtil } from '@/utils/priceUtils';

const LeafletMapView = dynamic(() => import('@/components/search/LeafletMapView'), {
  ssr: false,
  loading: () => {
    const t = useTranslation('home') as any;
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">{t.loading?.map || 'Loading map...'}</p>
        </div>
      </div>
    );
  }
});
import { getListingImageUrl } from '@/utils/imageUtils';

// Types
interface Property {
  _id: string;
  title: string;
  description: string;
  category: 'stay' | 'vehicle';
  subcategory: string;
  images: string[];
  pricing: {
    basePrice: number;
    currency: string;
    cleaningFee?: number;
    serviceFee?: number;
  };
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    coordinates: [number, number];
  };
  host: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    stats?: {
      averageRating: number;
    };
    hostInfo?: {
      superhost: boolean;
    };
  };
  stats: {
    averageRating: number;
    totalReviews: number;
    views: number;
    favorites: number;
  };
  featured: boolean;
  featuredUntil?: Date;
  stayDetails?: {
    bedrooms: number;
    bathrooms: number;
    guests: number;
    amenities: string[];
  };
  vehicleDetails?: {
    make: string;
    model: string;
    year: number;
    transmission: string;
    fuelType: string;
    features: string[];
  };
  isFavorite?: boolean;
}

interface Category {
  key: string;
  icon: any;
  label: string;
}

export default function HomePage() {
  const { language, currency } = useLanguage();
  const t = useTranslation('home') as any;
  const isRTL = language === 'ar';
  const vehiclesEnabled = useFeature('vehiclesEnabled'); // ✅ Feature flag

  // State
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState<{[key: string]: number}>({});
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);

  // Map bounds filtering state - PERSISTENT across map open/close
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds | null>(null);
  const [displayProperties, setDisplayProperties] = useState<Property[]>([]);
  const [isMapFiltering, setIsMapFiltering] = useState(false);

  // Filter properties based on selected category for consistent display
  const filteredProperties = useMemo(() => {
    let filtered = properties;

    // ✅ FEATURE FLAG: Exclure véhicules si désactivé
    if (!vehiclesEnabled) {
      filtered = filtered.filter(property => property.category !== 'vehicle');
    }

    if (!selectedCategory) return filtered;

    return filtered.filter(property => {
      if (selectedCategory === 'stay' || selectedCategory === 'vehicle') {
        return property.category === selectedCategory;
      }
      return property.subcategory === selectedCategory;
    });
  }, [selectedCategory, properties, vehiclesEnabled]);


  // Categories data - ✅ FEATURE FLAG: Cacher véhicules si désactivé
  const categories: Category[] = useMemo(() => {
    const baseCategories: Category[] = [
      { key: '', icon: HomeIcon, label: (t as any).categories?.all || 'All' },
      { key: 'stay', icon: Building, label: (t as any).categories?.stays || 'Stays' }
    ];

    // Ajouter véhicules uniquement si activé
    if (vehiclesEnabled) {
      baseCategories.push({ key: 'vehicle', icon: Car, label: (t as any).categories?.vehicles || 'Vehicles' });
    }

    return baseCategories;
  }, [vehiclesEnabled, t]);

  // Fetch listings from API
  useEffect(() => {
    fetchListings();
  }, [selectedCategory, currency]); // ✅ Re-fetch when currency changes

  const fetchListings = async () => {
    try {
      setLoading(true);

      const filters: SearchFilters & { limit: number; sort: string; currency?: string } = {
        limit: 8,
        sort: '-featured,-createdAt',
        currency: currency
      };

      // Handle category filtering
      if (selectedCategory) {
        if (selectedCategory === 'stay' || selectedCategory === 'vehicle') {
          filters.category = selectedCategory;
        } else {
          filters.subcategory = selectedCategory;
        }
      }

      // Use REST API directly (more reliable than Socket.IO for initial data fetch)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const params = new URLSearchParams();
      params.set('limit', String(filters.limit));
      params.set('sort', filters.sort);
      if (filters.currency) params.set('currency', filters.currency);
      if (filters.category) params.set('category', filters.category);
      if (filters.subcategory) params.set('subcategory', filters.subcategory);

      const res = await fetch(`${API_URL}/listings?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const response = await res.json();

      if (response.status === 'success') {
        const rawListings = response.data?.listings || [];

        // Transform API data to match homepage Property interface
        const transformedListings = rawListings.map((listing: any) => {

          // Use the proper image utility function to get correct URLs
          const transformedImages = (listing.images || []).map((img: any, index: number) => {
            const result = getListingImageUrl(listing, index);
            return result;
          }).filter(Boolean);


          return {
            _id: listing._id || listing.id,
            title: listing.title,
            description: listing.description,
            category: listing.category,
            subcategory: listing.subcategory,
            // Transform images from objects to string array
            images: transformedImages,
          pricing: {
            basePrice: listing.pricing?.basePrice || 0,
            currency: listing.pricing?.currency || 'DZD',
            cleaningFee: listing.pricing?.cleaningFee || 0,
            serviceFee: listing.pricing?.serviceFee || 0
          },
          // Fix address structure with correct coordinate conversion
          address: {
            street: listing.address?.street || '',
            city: listing.address?.city || '',
            state: listing.address?.state || '',
            country: listing.address?.country || '',
            zipCode: listing.address?.zipCode || '',
            // Convert GeoJSON [lng, lat] to Google Maps [lat, lng] format for map component
            coordinates: listing.location?.coordinates ?
              [listing.location.coordinates[1], listing.location.coordinates[0]] :
              [36.7538, 3.0588]
          },
          host: {
            _id: listing.host?._id || listing.host?.id,
            firstName: listing.host?.firstName || 'Host',
            lastName: listing.host?.lastName || '',
            avatar: listing.host?.avatar,
            stats: {
              averageRating: listing.host?.stats?.averageRating || 0
            },
            hostInfo: {
              superhost: listing.host?.hostInfo?.superhost || false
            }
          },
          // Fix stats field names
          stats: {
            averageRating: listing.stats?.averageRating || 0,
            totalReviews: listing.stats?.reviewCount || 0, // Map reviewCount to totalReviews
            views: listing.stats?.views || 0,
            favorites: listing.stats?.favorites || 0
          },
          featured: listing.featured || false,
          featuredUntil: listing.featuredUntil ? new Date(listing.featuredUntil) : undefined,
          // Category-specific details - provide both formats for component compatibility
          ...(listing.category === 'stay' && {
            // For SearchResults component compatibility
            propertyDetails: {
              propertyType: listing.stayDetails?.stayType || 'apartment',
              bedrooms: listing.stayDetails?.bedrooms || 0,
              bathrooms: listing.stayDetails?.bathrooms || 0,
              area: listing.stayDetails?.area || 0,
              furnished: listing.stayDetails?.furnished || 'furnished',
              amenities: listing.stayDetails?.amenities || []
            },
            // For MapView component compatibility
            stayDetails: {
              stayType: listing.stayDetails?.stayType || 'apartment',
              bedrooms: listing.stayDetails?.bedrooms || 0,
              bathrooms: listing.stayDetails?.bathrooms || 0,
              area: listing.stayDetails?.area || 0,
              furnished: listing.stayDetails?.furnished || 'furnished',
              amenities: listing.stayDetails?.amenities || []
            }
          }),
          ...(listing.category === 'vehicle' && {
            vehicleDetails: {
              vehicleType: listing.vehicleDetails?.vehicleType || 'car',
              make: listing.vehicleDetails?.make || '',
              model: listing.vehicleDetails?.model || '',
              year: listing.vehicleDetails?.year || new Date().getFullYear(),
              transmission: listing.vehicleDetails?.transmission || 'manual',
              fuelType: listing.vehicleDetails?.fuelType || 'gasoline',
              seats: listing.vehicleDetails?.seats || 4,
              features: listing.vehicleDetails?.features || []
            }
          }),
          isFavorite: false
        };
      });

        setProperties(transformedListings);
      } else {
        throw new Error(response.error || 'Failed to fetch listings');
      }
    } catch (error) {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if property is within map bounds
 const isPropertyInBounds = useCallback((
  property: Property, 
  bounds: google.maps.LatLngBounds
): boolean => {
  if (!property.address?.coordinates || property.address.coordinates.length !== 2) {
    return false;
  }

  const [lat, lng] = property.address.coordinates;
  if (isNaN(lat) || isNaN(lng)) {
    return false;
  }

  return bounds.contains({ lat, lng });
}, []);

  // Update display properties when map bounds change or filtered properties change
  useEffect(() => {
    if (mapBounds && filteredProperties.length > 0) {
      // Filter properties by map bounds when bounds exist
      const boundsFiltered = filteredProperties.filter(property =>
        isPropertyInBounds(property, mapBounds)
      );
      setDisplayProperties(boundsFiltered);
      setIsMapFiltering(true);
    } else {
      // Show all filtered properties when no bounds
      setDisplayProperties(filteredProperties);
      setIsMapFiltering(false);
    }
}, [mapBounds, filteredProperties, isPropertyInBounds]);  // Ajouter isPropertyInBounds

  // Handle map bounds change - ALWAYS update bounds, even when map is closed
  const handleMapBoundsChange = (bounds: google.maps.LatLngBounds | null) => {
    setMapBounds(bounds);
  };

  // Helper functions
  const getPropertyLocation = (property: Property) => {
    return `${property.address?.city || t.location?.defaultCity || 'City'}, ${property.address?.state || t.location?.defaultState || 'State'}`;
  };

  const getPropertyBadges = (property: Property) => {
    const badges = [];
    if (property.featured) badges.push(t.badges?.featured || 'Featured');
    if (property.host?.hostInfo?.superhost) badges.push(t.badges?.superhost || 'Superhost');
    if ((property.stats?.averageRating || 0) >= 4.7 && (property.stats?.totalReviews || 0) >= 3) badges.push('Coup de coeur');
    return badges;
  };

  // Navigation handlers
  const nextImage = (propertyId: string, imagesLength: number) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [propertyId]: ((prev[propertyId] || 0) + 1) % imagesLength
    }));
  };

  const prevImage = (propertyId: string, imagesLength: number) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [propertyId]: ((prev[propertyId] || 0) - 1 + imagesLength) % imagesLength
    }));
  };


  // Price formatting
  const formatPrice = (property: Property, displayCurrency: string) => {
    const price = property.pricing.basePrice;
    const currencyToUse = displayCurrency === 'DZD' || property.pricing.currency === 'DZD' ? 'DZD' : 'EUR';
    return formatPriceUtil(price, currencyToUse);
  };


  // Popular destinations for Algeria with real listing counts
  const [destinationCounts, setDestinationCounts] = useState<{[key: string]: number}>({});
  const [loadingCounts, setLoadingCounts] = useState(true);

  const destinations = [
    { name: 'algiers', displayName: 'Algiers', wilaya: 'Alger,Algiers', image: getListingImageUrl(undefined, 0) },
    { name: 'oran', displayName: 'Oran', wilaya: 'Oran', image: getListingImageUrl(undefined, 0) },
    { name: 'constantine', displayName: 'Constantine', wilaya: 'Constantine', image: getListingImageUrl(undefined, 0) },
    { name: 'annaba', displayName: 'Annaba', wilaya: 'Annaba', image: getListingImageUrl(undefined, 0) },
    { name: 'tlemcen', displayName: 'Tlemcen', wilaya: 'Tlemcen', image: getListingImageUrl(undefined, 0) },
    { name: 'ghardaia', displayName: 'Ghardaïa', wilaya: 'Gharda', image: getListingImageUrl(undefined, 0) }
  ];

  // Fetch listing counts per destination using wilaya filter (searches city+state, not country)
  useEffect(() => {
    const fetchDestinationCounts = async () => {
      try {
        setLoadingCounts(true);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const counts: {[key: string]: number} = {};

        await Promise.all(destinations.map(async (destination) => {
          try {
            const params = new URLSearchParams({
              wilaya: destination.wilaya,
              limit: '1',
              page: '1'
            });

            const response = await fetch(`${API_URL}/listings?${params}`);

            if (response.ok) {
              const data = await response.json();
              counts[destination.name] = data.pagination?.total || 0;
            } else {
              counts[destination.name] = 0;
            }
          } catch {
            counts[destination.name] = 0;
          }
        }));

        setDestinationCounts(counts);
      } catch {
        const defaultCounts: {[key: string]: number} = {};
        destinations.forEach(dest => { defaultCounts[dest.name] = 0; });
        setDestinationCounts(defaultCounts);
      } finally {
        setLoadingCounts(false);
      }
    };

    if (!loading) {
      fetchDestinationCounts();
    }
  }, [loading]);

  // Format property count for display
  const formatPropertyCount = (count: number) => {
    if (count === 0) return t.propertyCount?.zero || '0 properties';
    if (count === 1) return t.propertyCount?.one || '1 property';
    if (count < 1000) return (t.propertyCount?.other || '{count} properties').replace('{count}', count.toString());
    return (t.propertyCount?.thousand || '{count}k+ properties').replace('{count}', (Math.floor(count / 100) / 10).toString());
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-sand-50 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <main className="bg-transparent">
        {/* Enhanced Hero Section with Modern Design */}
        <section className="relative min-h-[85vh] flex items-center overflow-hidden">
          {/* Background with Multiple Layers */}
          <div className="absolute inset-0">
            <div
              className="absolute inset-0 bg-cover bg-center transform scale-105"
              style={{
                backgroundImage: `url('/assets/hero-image.jpeg')`,
                filter: 'brightness(0.7) contrast(1.1)'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary-900/60 via-primary-800/40 to-blue-900/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-20 right-10 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

          <div className="relative container mx-auto px-6 z-10">
            <div className="max-w-6xl mx-auto">
              {/* Enhanced Hero Content */}
              <div className="text-center mb-16">
                {/* Subtitle Badge */}
                <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 mb-8 animate-fade-in">
                  <span className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
                  <span className="text-white/90 text-sm font-medium tracking-wide">
                    {(t as any).hero?.badge || '🇩🇿 Authentic Algerian Experience'}
                  </span>
                </div>

                {/* Main Title with Enhanced Typography */}
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 leading-[0.9] text-white">
                  {(() => {
                    const title = (t as any).hero?.title || 'Find your perfect stay';
                    const words = title.split(' ');
                    const firstLine = words.slice(0, Math.ceil(words.length / 2)).join(' ');
                    const secondLine = words.slice(Math.ceil(words.length / 2)).join(' ');
                    
                    return (
                      <>
                        <span className="block bg-gradient-to-r from-white via-white to-primary-200 bg-clip-text text-transparent animate-fade-in-up">
                          {firstLine}
                        </span>
                        {secondLine && (
                          <span className="block bg-gradient-to-r from-primary-200 via-sand-200 to-white bg-clip-text text-transparent animate-fade-in-up delay-200">
                            {secondLine}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </h1>

                {/* Enhanced Subtitle */}
                <p className="text-xl md:text-2xl lg:text-3xl text-white/90 mb-12 max-w-4xl mx-auto leading-relaxed font-light animate-fade-in-up delay-400">
                  {(t as any).hero?.subtitle || 'Discover authentic Algerian hospitality from the Sahara to the Mediterranean'}
                </p>

                {/* CTA Buttons removed - use search bar instead to avoid radius issues */}
              </div>

              {/* Stats Section */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 animate-fade-in-up delay-800">
                {[
                  { number: (t as any).hero?.stats?.values?.properties || '1000+', label: (t as any).hero?.stats?.properties || 'Properties' },
                  { number: (t as any).hero?.stats?.values?.cities || '50+', label: (t as any).hero?.stats?.cities || 'Cities' },
                  { number: (t as any).hero?.stats?.values?.rating || '4.8★', label: (t as any).hero?.stats?.rating || 'Rating' },
                  { number: (t as any).hero?.stats?.values?.support || '24/7', label: (t as any).hero?.stats?.support || 'Support' }
                ].map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-3xl md:text-4xl font-black text-white mb-2">
                      {stat.number}
                    </div>
                    <div className="text-white/80 text-sm font-medium tracking-wide uppercase">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse" />
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {(t as any).howItWorks?.title || 'Comment ça marche'}
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                {(t as any).howItWorks?.subtitle || 'Réservez votre logement en Algérie en 3 étapes simples'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
              {[
                {
                  icon: SearchCheck,
                  step: '1',
                  title: (t as any).howItWorks?.step1Title || 'Recherchez',
                  desc: (t as any).howItWorks?.step1Desc || 'Parcourez des centaines de logements à travers toute l\'Algérie. Filtrez par ville, type, prix et équipements.'
                },
                {
                  icon: CalendarCheck,
                  step: '2',
                  title: (t as any).howItWorks?.step2Title || 'Réservez',
                  desc: (t as any).howItWorks?.step2Desc || 'Sélectionnez vos dates et réservez en ligne. Paiement sécurisé et confirmation instantanée.'
                },
                {
                  icon: Sparkles,
                  step: '3',
                  title: (t as any).howItWorks?.step3Title || 'Profitez',
                  desc: (t as any).howItWorks?.step3Desc || 'Arrivez et profitez de votre séjour. Votre hôte vous accueille avec tout le confort nécessaire.'
                }
              ].map((item, index) => (
                <div key={index} className="text-center group">
                  <div className="relative mb-6 inline-flex">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center group-hover:from-primary-100 group-hover:to-primary-200 transition-all duration-300 group-hover:scale-110">
                      <item.icon className="w-9 h-9 text-primary-600" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-7 h-7 bg-primary-500 text-white text-sm font-bold rounded-full flex items-center justify-center shadow-lg">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Enhanced Categories Section - ✅ FIXED BQ-36: Improved contrast and layout */}
        {/* ✅ FEATURE FLAG: Cacher section si véhicules désactivés (seulement 2 options restantes) */}
        {vehiclesEnabled && (
          <section className="relative mt-8 z-30 mb-24 bg-white">
            <div className="container mx-auto px-6">
              <div className="max-w-5xl mx-auto">
                {/* Section Header - ✅ Enhanced contrast and visibility */}
                <div className="text-center mb-12 py-8">
                  <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 drop-shadow-sm">
                    {(t as any).sections?.categoryTitle || 'What are you looking for?'}
                  </h2>
                  <p className="text-gray-700 text-xl max-w-3xl mx-auto leading-relaxed font-medium">
                    {(t as any).sections?.categorySubtitle || 'Choose from our curated selection of stays and vehicles across Algeria'}
                  </p>
                </div>

                {/* Enhanced Category Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                  {categories.map((category, index) => {
                    const IconComponent = category.icon;
                    const isActive = selectedCategory === category.key;
                    const delay = index * 100;

                    return (
                      <button
                        key={category.key}
                        onClick={() => setSelectedCategory(selectedCategory === category.key ? '' : category.key)}
                        className={`group relative flex flex-col items-center justify-center p-8 lg:p-10 rounded-3xl transition-all duration-500 transform hover:scale-[1.02] hover:-translate-y-2 animate-fade-in-up`}
                        style={{ animationDelay: `${delay}ms` }}
                      >
                        {/* Background with Gradient and Glass Effect */}
                        <div className={`absolute inset-0 rounded-3xl transition-all duration-500 ${
                          isActive
                            ? 'bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 shadow-2xl shadow-primary-500/25'
                            : 'bg-white/80 backdrop-blur-xl border border-gray-200/50 hover:border-primary-200/50 shadow-xl hover:shadow-2xl'
                        }`} />

                        {/* Decorative Elements */}
                        {isActive && (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl" />
                            <div className="absolute -top-2 -right-2 w-20 h-20 bg-primary-400/20 rounded-full blur-xl" />
                            <div className="absolute -bottom-2 -left-2 w-16 h-16 bg-sand-400/20 rounded-full blur-xl" />
                          </>
                        )}

                        {/* Content */}
                        <div className="relative z-10 flex flex-col items-center">
                          {/* Icon Container */}
                          <div className={`mb-6 p-4 lg:p-5 rounded-2xl transition-all duration-500 transform group-hover:scale-110 ${
                            isActive
                              ? 'bg-white/20 backdrop-blur-sm'
                              : 'bg-gradient-to-br from-primary-50 to-primary-100 group-hover:from-primary-100 group-hover:to-primary-200'
                          }`}>
                            <IconComponent className={`w-8 h-8 lg:w-10 lg:h-10 transition-all duration-500 ${
                              isActive
                                ? 'text-white'
                                : 'text-primary-600 group-hover:text-primary-700'
                            }`} />
                          </div>

                          {/* Label */}
                          <h3 className={`text-xl lg:text-2xl font-bold mb-2 transition-all duration-500 ${
                            isActive
                              ? 'text-white'
                              : 'text-gray-900 group-hover:text-primary-900'
                          }`}>
                            {category.label}
                          </h3>

                          {/* Description */}
                          <p className={`text-sm lg:text-base text-center max-w-xs transition-all duration-500 ${
                            isActive
                              ? 'text-white/90'
                              : 'text-gray-600 group-hover:text-gray-700'
                          }`}>
                            {category.key === '' && ((t as any).categories?.descriptions?.all || 'Browse all available properties')}
                            {category.key === 'stay' && ((t as any).categories?.descriptions?.stays || 'Comfortable accommodations across Algeria')}
                            {category.key === 'vehicle' && ((t as any).categories?.descriptions?.vehicles || 'Cars, bikes & more for your journey')}
                          </p>

                          {/* Active Indicator */}
                          {isActive && (
                            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                              <div className="w-12 h-1 bg-white rounded-full shadow-lg" />
                            </div>
                          )}
                        </div>

                        {/* Hover Effect Ring */}
                        <div className={`absolute inset-0 rounded-3xl border-2 transition-all duration-500 ${
                          isActive
                            ? 'border-white/30'
                            : 'border-transparent group-hover:border-primary-200'
                        }`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Enhanced Featured Properties Section */}
        <section className="py-16 bg-gradient-to-b from-white via-gray-50/30 to-white">
          <div className="container mx-auto px-6">
            {/* Section Header */}
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
                {selectedCategory
                  ? `${categories.find(c => c.key === selectedCategory)?.label || selectedCategory} ${(t as any).filters?.inAlgeria || 'in Algeria'}`
                  : ((t as any).sections?.featuredTitle || 'Discover Amazing Properties')
                }
              </h2>
              <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto mb-8">
                {selectedCategory
                  ? `${(t as any).filters?.exploreCollection || 'Explore our curated collection of'} ${categories.find(c => c.key === selectedCategory)?.label?.toLowerCase() || selectedCategory} ${(t as any).filters?.across || 'across Algeria'}`
                  : ((t as any).sections?.featuredSubtitle || 'From traditional riads to modern apartments, luxury vehicles to adventure bikes - find your perfect match')
                }
              </p>
              {selectedCategory && (
                <div className="inline-flex items-center space-x-2 bg-primary-50 border border-primary-200 text-primary-700 px-4 py-2 rounded-full text-sm font-medium">
                  <span className="w-2 h-2 bg-primary-500 rounded-full" />
                  <span>{(t as any).filters?.showing || 'Showing'} {filteredProperties.length} {filteredProperties.length === 1 ? ((t as any).filters?.result || 'result') : ((t as any).filters?.results || 'results')}</span>
                </div>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-square bg-gray-300 rounded-xl mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : displayProperties.length === 0 && !isMapFiltering ? (
              <div className="text-center py-16">
                <div className="text-gray-400 mb-4">
                  <HomeIcon size={64} className="mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {(t as any).emptyStates?.noPropertiesFound || 'No properties found'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {(t as any).emptyStates?.noPropertiesMessage || 'Try selecting a different category or check back later for new listings.'}
                </p>
                <button
                  onClick={() => setSelectedCategory('')}
                  className="px-6 py-3 bg-[#FF6B35] text-white rounded-lg font-semibold hover:bg-[#E55A2B] transition-colors"
                >
                  {(t as any).actions?.showAllProperties || 'Show All Properties'}
                </button>
              </div>
            ) : displayProperties.length === 0 && isMapFiltering ? (
              <div className="text-center py-16">
                <div className="text-blue-400 mb-4">
                  <MapPin size={64} className="mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {(t as any).emptyStates?.noPropertiesInMapArea || 'No properties in this map area'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {(t as any).emptyStates?.noPropertiesInMapAreaMessage || 'Try zooming out or panning the map to see more properties'}
                </p>
                <button
                  onClick={() => {
                    setShowMap(false);
                    setMapBounds(null);
                    setIsMapFiltering(false);
                  }}
                  className="px-6 py-3 bg-[#FF6B35] text-white rounded-lg font-semibold hover:bg-[#E55A2B] transition-colors"
                >
                  {(t as any).actions?.closeMapShowAll || 'Close Map & Show All'}
                </button>
              </div>
            ) : (
              <>
                {/* Map Filter Banner */}
                {isMapFiltering && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <div>
                          <p className="text-sm font-bold text-blue-900">
                            {((t as any).map?.showingInMapArea || 'Showing {count} of {total} properties in map area')
                              .replace('{count}', displayProperties.length.toString())
                              .replace('{total}', filteredProperties.length.toString())}
                          </p>
                          <p className="text-xs text-blue-700 mt-0.5">
                            {showMap ? ((t as any).map?.moveMapToExplore || 'Move the map to explore more properties') : ((t as any).map?.mapBoundsActive || 'Map bounds are active - close map to reset')}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setMapBounds(null);
                          setIsMapFiltering(false);
                        }}
                        className="px-4 py-2 bg-white text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors border border-blue-200"
                      >
                        {(t as any).actions?.resetFilter || 'Reset Filter'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {displayProperties.map((property, index) => {
                  const currentIndex = currentImageIndex[property._id] || 0;
                  const animationDelay = (index % 8) * 100;

                  // Subcategory label
                  const subcategoryLabels: Record<string, string> = {
                    apartment: 'Appartement', villa: 'Villa', studio: 'Studio', house: 'Maison',
                    room: 'Chambre', chalet: 'Chalet', riad: 'Riad', cottage: 'Cottage',
                    car: 'Voiture', suv: 'SUV', van: 'Van', motorcycle: 'Moto',
                  };
                  const categoryLabel = subcategoryLabels[property.subcategory] || property.subcategory || (property.category === 'vehicle' ? 'Véhicule' : 'Logement');

                  return (
                    <Link
                      href={`/listing/${property._id}`}
                      key={property._id}
                      className="group cursor-pointer animate-fade-in-up"
                      style={{ animationDelay: `${animationDelay}ms` }}
                    >
                      <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
                        {/* Image Container */}
                        <div className="relative overflow-hidden">
                          <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200">
                            <Image
                              src={getListingImageUrl(property, currentIndex)}
                              alt={property.title}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              unoptimized
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                if (!img.dataset.fallback) {
                                  img.dataset.fallback = 'true';
                                  img.src = getListingImageUrl(undefined, 0);
                                }
                              }}
                            />
                          </div>

                          {/* Image Navigation */}
                          {property.images.length > 1 && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  prevImage(property._id, property.images.length);
                                }}
                                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md z-10"
                              >
                                <ChevronLeft className="w-4 h-4 text-gray-700" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  nextImage(property._id, property.images.length);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md z-10"
                              >
                                <ChevronRight className="w-4 h-4 text-gray-700" />
                              </button>

                              {/* Dots */}
                              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1.5">
                                {property.images.slice(0, 5).map((_, idx) => (
                                  <button
                                    key={idx}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setCurrentImageIndex(prev => ({ ...prev, [property._id]: idx }));
                                    }}
                                    className={`rounded-full transition-all duration-300 ${
                                      idx === currentIndex
                                        ? 'w-2 h-2 bg-white shadow'
                                        : 'w-1.5 h-1.5 bg-white/60'
                                    }`}
                                  />
                                ))}
                              </div>
                            </>
                          )}

                          {/* Wishlist Button */}
                          <div className="absolute top-3 right-3 z-10">
                            <WishlistButton
                              listingId={property._id}
                              size="md"
                              className="shadow-md"
                            />
                          </div>
                        </div>

                        {/* Property Details */}
                        <div className="p-4 flex flex-col flex-grow">
                          {/* Category label */}
                          <p className="text-xs text-gray-500 font-medium mb-1">{categoryLabel}</p>

                          {/* Location as main title */}
                          <h3 className="font-bold text-gray-900 text-[15px] leading-snug mb-1 line-clamp-1">
                            {property.address?.city || property.title}{property.address?.state ? `, ${property.address.state}` : ''}
                          </h3>

                          {/* Stay Details: guests · bedrooms · bathrooms */}
                          {property.category === 'stay' && property.stayDetails ? (
                            <p className="text-sm text-gray-500 mb-2 line-clamp-1">
                              {[
                                property.stayDetails.guests > 0 && `${property.stayDetails.guests} ${property.stayDetails.guests > 1 ? (t.cards?.guestsPlural || 'personnes') : (t.cards?.guests || 'personne')}`,
                                property.stayDetails.bedrooms > 0 && `${property.stayDetails.bedrooms} ${property.stayDetails.bedrooms > 1 ? (t.cards?.bedroomsPlural || 'chambres') : (t.cards?.bedrooms || 'chambre')}`,
                                property.stayDetails.bathrooms > 0 && `${property.stayDetails.bathrooms} ${property.stayDetails.bathrooms > 1 ? (t.cards?.bathroomsPlural || 'salles de bain') : (t.cards?.bathrooms || 'salle de bain')}`,
                              ].filter(Boolean).join(' \u00B7 ')}
                            </p>
                          ) : property.category === 'vehicle' && property.vehicleDetails ? (
                            <p className="text-sm text-gray-500 mb-2 line-clamp-1">
                              {property.vehicleDetails.year} {property.vehicleDetails.make} {property.vehicleDetails.model}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500 mb-2">&nbsp;</p>
                          )}

                          {/* Spacer */}
                          <div className="flex-grow" />

                          {/* Bottom row: Rating + Price */}
                          <div className="flex items-end justify-between pt-2">
                            {/* Rating pill */}
                            <div className="flex items-center gap-2">
                              {property.stats?.averageRating > 0 ? (
                                <>
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-700 text-white min-w-[2.2rem]">
                                    {property.stats.averageRating.toFixed(1)}
                                  </span>
                                  {property.stats?.totalReviews > 0 && (
                                    <span className="text-xs text-gray-500">{property.stats.totalReviews} {t.cards?.reviews || 'avis'}</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-gray-400 italic">{t.cards?.firstReview || 'Soyez le premier à laisser un avis'}</span>
                              )}
                            </div>

                            {/* Price */}
                            <div className="text-right">
                              <span className="font-bold text-lg text-gray-900">
                                {formatPrice(property, currency)}
                              </span>
                              <p className="text-[11px] text-gray-400 leading-tight">
                                {property.category === 'vehicle' ? (t.cards?.avgPricePerDay || 'prix moy. par jour') : (t.cards?.avgPricePerNight || 'prix moy. par nuit')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* CTA Voir toutes les annonces */}
              <div className="flex justify-center mt-10">
                <Link
                  href="/search"
                  className="px-8 py-3.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors duration-200 text-sm"
                >
                  {t.cards?.viewAll || 'Voir toutes les annonces'}
                </Link>
              </div>
            </>
            )}
          </div>
        </section>

        {/* Browse by Property Type */}
        <section className="py-20 bg-gradient-to-b from-white to-gray-50">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {(t as any).propertyTypes?.title || 'Explorez par type de logement'}
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                {(t as any).propertyTypes?.subtitle || 'Du studio moderne à la villa avec piscine, trouvez le logement qui vous correspond'}
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {[
                {
                  icon: Building,
                  label: (t as any).propertyTypes?.apartment || 'Appartements',
                  desc: (t as any).propertyTypes?.apartmentDesc || 'En centre-ville',
                  subcategory: 'apartment',
                  color: 'from-blue-500 to-blue-600'
                },
                {
                  icon: HomeIcon,
                  label: (t as any).propertyTypes?.villa || 'Villas',
                  desc: (t as any).propertyTypes?.villaDesc || 'Espace et confort',
                  subcategory: 'villa',
                  color: 'from-emerald-500 to-emerald-600'
                },
                {
                  icon: Building,
                  label: (t as any).propertyTypes?.studio || 'Studios',
                  desc: (t as any).propertyTypes?.studioDesc || 'Pratiques et abordables',
                  subcategory: 'studio',
                  color: 'from-violet-500 to-violet-600'
                },
                {
                  icon: HomeIcon,
                  label: (t as any).propertyTypes?.house || 'Maisons',
                  desc: (t as any).propertyTypes?.houseDesc || 'Comme chez soi',
                  subcategory: 'house',
                  color: 'from-amber-500 to-amber-600'
                }
              ].map((type, index) => (
                <Link
                  key={index}
                  href={`/search?subcategory=${type.subcategory}`}
                  className="group"
                >
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center h-full flex flex-col items-center justify-center">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <type.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{type.label}</h3>
                    <p className="text-sm text-gray-500">{type.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Enhanced Popular Destinations */}
        <section className="py-20 bg-gradient-to-br from-gray-50 to-sand-50 relative overflow-hidden">
          {/* Background Decorations */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />

          <div className="container mx-auto px-6 relative z-10">
            {/* Section Header */}
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                {(t as any).sections?.destinationsTitle || (t as any).popularDestinations || 'Explore Algeria'}
              </h2>
              <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto">
                {(t as any).sections?.destinationsSubtitle || 'From the Mediterranean coast to the Sahara desert, discover the diverse beauty of Algeria'}
              </p>
            </div>

            {/* Enhanced Destinations Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {destinations.map((destination, index) => {
                const count = destinationCounts[destination.name] || 0;
                const isLoading = loadingCounts;
                const animationDelay = index * 100;

                return (
                  <Link
                    href={`/search?location=${encodeURIComponent(destination.displayName)}&wilaya=${encodeURIComponent(destination.wilaya)}`}
                    key={destination.name}
                    className="group cursor-pointer animate-fade-in-up"
                    style={{ animationDelay: `${animationDelay}ms` }}
                  >
                    <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border border-gray-100/50">
                      {/* Image Container */}
                      <div className="relative overflow-hidden">
                        <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200">
                          <Image
                            src={destination.image}
                            alt={destination.displayName}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = getListingImageUrl(undefined, 0);
                            }}
                          />
                        </div>

                        {/* Enhanced Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

                        {/* City Name Overlay */}
                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="font-bold text-white text-lg mb-1 drop-shadow-lg">
                            {destination.displayName}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-primary-400 rounded-full" />
                            <span className="text-white/90 text-sm font-medium">
                              {isLoading ? (
                                <span className="inline-flex items-center">
                                  <span className="animate-pulse bg-white/30 h-3 w-16 rounded" />
                                </span>
                              ) : (
                                formatPropertyCount(count)
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Hover Arrow */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                          <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                            <ChevronRight className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Call to Action */}
            <div className="text-center mt-16">
              <Link
                href="/search"
                className="inline-flex items-center space-x-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-primary-500/25"
              >
                <Search className="w-6 h-6" />
                <span>{(t as any).sections?.exploreAllDestinations || 'Explore All Destinations'}</span>
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Become a Host CTA */}
        <section className="py-20 bg-gradient-to-r from-primary-600 via-primary-700 to-primary-800 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-white rounded-full blur-3xl" />
          </div>
          <div className="container mx-auto px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                {(t as any).becomeHost?.title || 'Vous avez un logement ?'}
              </h2>
              <p className="text-white/90 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
                {(t as any).becomeHost?.subtitle || 'Rejoignez des milliers d\'hôtes en Algérie. Publiez votre annonce gratuitement et commencez à gagner de l\'argent dès aujourd\'hui.'}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/dashboard/listings/new"
                  className="inline-flex items-center space-x-3 bg-white text-primary-700 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-xl"
                >
                  <HomeIcon className="w-6 h-6" />
                  <span>{(t as any).becomeHost?.cta || 'Publier mon annonce'}</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
              <div className="flex items-center justify-center gap-8 mt-10 text-white/80 text-sm">
                <span className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  {(t as any).becomeHost?.free || 'Publication gratuite'}
                </span>
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {(t as any).becomeHost?.insured || 'Assurance incluse'}
                </span>
                <span className="flex items-center gap-2">
                  <Headphones className="w-4 h-4" />
                  {(t as any).becomeHost?.support || 'Support dédié'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Trust & Security Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {(t as any).trust?.title || 'Réservez en toute confiance'}
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                {(t as any).trust?.subtitle || 'Baytup vous garantit une expérience sécurisée à chaque étape'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
              {[
                {
                  icon: UserCheck,
                  title: (t as any).trust?.verifiedTitle || 'Hôtes vérifiés',
                  desc: (t as any).trust?.verifiedDesc || 'Chaque hôte est vérifié avec une pièce d\'identité avant de pouvoir publier.'
                },
                {
                  icon: CreditCard,
                  title: (t as any).trust?.paymentTitle || 'Paiement sécurisé',
                  desc: (t as any).trust?.paymentDesc || 'Vos paiements sont protégés. L\'hôte reçoit l\'argent après votre arrivée.'
                },
                {
                  icon: Shield,
                  title: (t as any).trust?.guaranteeTitle || 'Garantie réservation',
                  desc: (t as any).trust?.guaranteeDesc || 'En cas de problème, nous vous aidons à trouver une solution ou un remboursement.'
                },
                {
                  icon: Headphones,
                  title: (t as any).trust?.supportTitle || 'Support 7j/7',
                  desc: (t as any).trust?.supportDesc || 'Notre équipe est disponible pour vous aider avant, pendant et après votre séjour.'
                }
              ].map((item, index) => (
                <div key={index} className="text-center group">
                  <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-primary-50 group-hover:border-primary-100 transition-all duration-300">
                    <item.icon className="w-8 h-8 text-gray-600 group-hover:text-primary-600 transition-colors duration-300" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Show Map Button - ALWAYS show if we have properties */}
        {filteredProperties.length > 0 && !showMap && (
          <button
            onClick={() => setShowMap(true)}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-full transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl z-50"
          >
            <Map className="w-4 h-4" />
            <span className="text-sm font-medium">
              {selectedCategory
                ? ((t as any).actions?.showMapWithCategory || 'Show {category} on map').replace('{category}', categories.find(c => c.key === selectedCategory)?.label?.toLowerCase() || 'properties')
                : ((t as any).actions?.showMap || 'Show map')
              }
            </span>
          </button>
        )}

        {/* Enhanced Map Overlay - FULLY INTERACTIVE */}
        {showMap && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-3xl w-full max-w-7xl h-full max-h-[95vh] sm:max-h-[90vh] relative overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Enhanced Map Header with Responsive Design */}
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-white via-white to-gray-50 border-b border-gray-100 p-3 sm:p-6 z-10 backdrop-blur-md pointer-events-none">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                      <Map className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                        {(t as any).map?.title || 'Explore Properties'}
                      </h3>
                      <p className="text-sm text-gray-500 font-medium">
                        {selectedCategory ? `${categories.find(c => c.key === selectedCategory)?.label || selectedCategory}` : 'Algeria'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setShowMap(false);
                        // DON'T clear mapBounds - keep it for filtering
                      }}
                      className="p-3 hover:bg-gray-100 rounded-2xl transition-all duration-200 group pointer-events-auto"
                    >
                      <X className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Enhanced Map Container - FULLY INTERACTIVE */}
              <div className="pt-20 sm:pt-24 h-full">
                <LeafletMapView
                  listings={filteredProperties}
                  center={[28.0, 2.0]} // Center of Algeria [lat, lng]
                  zoom={5.5} // Show all Algeria
                  selectedListing={null}
                  onListingSelect={(listingId) => {
                    // Add haptic feedback for mobile
                    if ('vibrate' in navigator) {
                      navigator.vibrate(50);
                    }
                    // Navigate to listing detail page
                    window.location.href = `/listing/${listingId}`;
                  }}
                  onListingHover={(listingId) => {
                    // Optional: Add hover effects or preview
                  }}
                  onMapBoundsChange={handleMapBoundsChange}
                  interactive={true}
                  fitBounds={false}
                  className="w-full h-full rounded-b-3xl"
                  currency={currency}
                />
              </div>

              {/* Mobile-friendly floating action button */}
              <div className="absolute bottom-4 right-4 sm:hidden">
                <button
                  onClick={() => {
                    setShowMap(false);
                  }}
                  className="p-4 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-105"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}