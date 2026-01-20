'use client';

import { useState, useEffect } from 'react';
import {
  FaHistory, FaMapMarkerAlt, FaStar, FaCalendarAlt, FaBed, FaCar,
  FaFilter, FaGlobe, FaMoon, FaMoneyBillWave, FaChartLine,
  FaEye, FaDownload, FaCheckCircle, FaHotel, FaChevronDown
} from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import moment from 'moment';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';

interface TravelHistory {
  _id: string;
  listing: {
    _id: string;
    title: string;
    category: string;
    subcategory: string;
    images: { url: string; isPrimary: boolean }[];
    address: {
      city: string;
      state: string;
      country: string;
    };
    pricing: {
      basePrice: number;
      currency: string;
    };
  };
  host: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar: string;
  };
  startDate: string;
  endDate: string;
  status: string;
  pricing: {
    totalAmount: number;
    currency: string;
    nights: number;
  };
  guestCount: {
    adults: number;
    children: number;
    infants: number;
  };
  review?: {
    rating: {
      overall: number;
      cleanliness?: number;
      communication?: number;
      checkIn?: number;
      accuracy?: number;
      location?: number;
      value?: number;
    };
    comment: string;
    reviewedAt: string;
  };
}

interface Statistics {
  summary: {
    totalTrips: number;
    totalSpent: number;
    totalNights: number;
    uniqueDestinations: number;
    countriesVisited: number;
    averageSpentPerTrip: number;
  };
  byCategory: {
    [key: string]: number;
  };
  byYear: {
    [key: string]: {
      trips: number;
      spent: number;
      nights: number;
    };
  };
  mostVisitedCity: {
    name: string;
    visits: number;
  } | null;
}

export default function TravelHistoryPage() {
  const { state } = useApp();
  const user = state.user;
  const t = useTranslation('history') as any;
  const { language } = useLanguage();
  const [travelHistory, setTravelHistory] = useState<TravelHistory[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('-endDate');
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    // ✅ FIX BQ-54: Wait for user to be loaded before fetching data
    if (!user) return;

    fetchTravelHistory();
    fetchStatistics();
  }, [user, yearFilter, categoryFilter, sortBy]);

  const fetchTravelHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params: any = {
        sort: sortBy
      };

      if (yearFilter !== 'all') {
        params.year = yearFilter;
      }

      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/travel-history`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params
        }
      );

      setTravelHistory(response.data.data.bookings);
    } catch (error: any) {
      console.error('Error fetching travel history:', error);
      toast.error(error?.response?.data?.message || t.toast.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/travel-history/stats`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setStatistics(response.data.data);
    } catch (error: any) {
      console.error('Error fetching statistics:', error);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'DZD') {
      return `${price.toLocaleString()} DZD`;
    }
    return `€${price.toLocaleString()}`;
  };

  // ✅ FIX BQ-15: Robust date formatting with validation
  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return 'N/A';

    try {
      const momentDate = moment(date);
      if (!momentDate.isValid()) {
        return 'Invalid Date';
      }
      return momentDate.format('MMM D, YYYY');
    } catch (error) {
      console.error('Date formatting error:', error, date);
      return 'Invalid Date';
    }
  };

  const getTotalGuests = (guestCount: any) => {
    return (guestCount.adults || 0) + (guestCount.children || 0) + (guestCount.infants || 0);
  };

  const getAvailableYears = () => {
    if (!statistics?.byYear) return [];
    return Object.keys(statistics.byYear).sort((a, b) => parseInt(b) - parseInt(a));
  };

  const exportToCSV = () => {
    const headers = ['Trip Date', 'Destination', 'Property', 'Nights', 'Amount', 'Status'];
    const rows = travelHistory.map(trip => [
      `${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`,
      `${trip.listing.address.city}, ${trip.listing.address.country}`,
      trip.listing.title,
      trip.pricing.nights,
      formatPrice(trip.pricing.totalAmount, trip.pricing.currency),
      trip.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `travel-history-${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
    toast.success(t.toast.exportSuccess);
  };

  if (loading && !travelHistory.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#FF6B35] mx-auto mb-4"></div>
          <p className="text-gray-600">{t.header.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-gradient-to-r from-[#FF6B35] to-[#FF8C42] rounded-2xl p-8 text-white shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FaHistory className="text-4xl" />
                <h1 className="text-3xl font-bold">{t.header.title}</h1>
              </div>
              <p className="text-white/90">{t.header.subtitle}</p>
            </div>
            {statistics && (
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">{statistics.summary.totalTrips}</div>
                  <div className="text-sm text-white/80">{t.stats.totalTrips}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{statistics.summary.uniqueDestinations}</div>
                  <div className="text-sm text-white/80">{t.stats.destinations}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">{statistics.summary.totalNights}</div>
                  <div className="text-sm text-white/80">{t.stats.nights}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {showStats && statistics && (
        <div className="max-w-7xl mx-auto mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Spent */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <FaMoneyBillWave className="text-green-600 text-xl" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">{t.stats.totalSpent}</h3>
              <p className="text-2xl font-bold text-gray-900">
                {formatPrice(statistics.summary.totalSpent, 'DZD')}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {t.stats.avgPerTrip}: {formatPrice(statistics.summary.averageSpentPerTrip, 'DZD')}/{t.stats.trip}
              </p>
            </div>

            {/* Countries Visited */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <FaGlobe className="text-blue-600 text-xl" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">{t.stats.countriesVisited}</h3>
              <p className="text-2xl font-bold text-gray-900">{statistics.summary.countriesVisited}</p>
              {statistics.mostVisitedCity && (
                <p className="text-sm text-gray-500 mt-1">
                  {t.stats.favorite}: {statistics.mostVisitedCity.name} ({statistics.mostVisitedCity.visits}x)
                </p>
              )}
            </div>

            {/* Total Nights */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <FaMoon className="text-purple-600 text-xl" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">{t.stats.totalNights}</h3>
              <p className="text-2xl font-bold text-gray-900">{statistics.summary.totalNights}</p>
              <p className="text-sm text-gray-500 mt-1">
                {t.stats.avgNights}: {Math.round(statistics.summary.totalNights / statistics.summary.totalTrips)} {t.stats.nightsPerTrip}
              </p>
            </div>

            {/* By Category */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <FaChartLine className="text-[#FF6B35] text-xl" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">{t.stats.byCategory}</h3>
              <div className="space-y-1 mt-2">
                {Object.entries(statistics.byCategory).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 capitalize">{category}:</span>
                    <span className="font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Left side - Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <FaFilter />
                {t.filters.filters}
                <FaChevronDown className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              {/* Year Filter */}
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
              >
                <option value="all">{t.filters.allYears}</option>
                {getAvailableYears().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
              >
                <option value="all">{t.filters.allCategories}</option>
                <option value="stay">{t.filters.stays}</option>
                <option value="car">{t.filters.carRentals}</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent"
              >
                <option value="-endDate">{t.filters.mostRecent}</option>
                <option value="endDate">{t.filters.oldestFirst}</option>
                <option value="-pricing.totalAmount">{t.filters.highestSpent}</option>
                <option value="pricing.totalAmount">{t.filters.lowestSpent}</option>
              </select>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowStats(!showStats)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <FaChartLine />
                {showStats ? t.stats.hideStats : t.stats.showStats}
              </button>

              {travelHistory.length > 0 && (
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#FF5722] transition-colors"
                >
                  <FaDownload />
                  {t.filters.export}
                </button>
              )}
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                {t.filters.showing} {travelHistory.length} {t.filters.of} {statistics?.summary.totalTrips || 0} {t.filters.completedTrips}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Travel History List */}
      <div className="max-w-7xl mx-auto">
        {travelHistory.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaHistory className="text-4xl text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">{t.emptyState.title}</h3>
            <p className="text-gray-600 mb-6">
              {t.emptyState.message}
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF6B35] text-white rounded-lg hover:bg-[#FF5722] transition-colors"
            >
              <FaHotel />
              {t.emptyState.exploreListings}
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {travelHistory.map((trip) => (
              <div
                key={trip._id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Image */}
                  <div className="relative w-full md:w-80 h-64 md:h-auto flex-shrink-0">
                    <Image
                      src={trip.listing.images.find(img => img.isPrimary)?.url || trip.listing.images[0]?.url || '/uploads/listings/default.jpg'}
                      alt={trip.listing.title}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/uploads/listings/default.jpg';
                      }}
                    />

                    {/* Status Badge */}
                    <div className={`absolute top-3 ${language === 'ar' ? 'right-3' : 'left-3'}`}>
                      <span className="px-3 py-1 bg-green-500 text-white text-sm font-medium rounded-full flex items-center gap-1">
                        <FaCheckCircle />
                        {t.card.completed}
                      </span>
                    </div>

                    {/* Category Badge */}
                    <div className={`absolute top-3 ${language === 'ar' ? 'left-3' : 'right-3'}`}>
                      <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium flex items-center gap-1">
                        {trip.listing.category === 'stay' ? <FaBed /> : <FaCar />}
                        {trip.listing.category === 'stay' ? t.categories.stay : t.categories.car}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <Link href={`/listing/${trip.listing._id}`}>
                          <h3 className="text-2xl font-semibold text-gray-900 mb-2 hover:text-[#FF6B35] transition-colors">
                            {trip.listing.title}
                          </h3>
                        </Link>

                        <div className="flex items-center gap-2 text-gray-600 mb-3">
                          <FaMapMarkerAlt className="text-[#FF6B35]" />
                          <span>{trip.listing.address.city}, {trip.listing.address.country}</span>
                        </div>

                        {/* Trip Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-500">{t.card.checkIn}</p>
                            <p className="font-medium">{formatDate(trip.startDate)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">{t.card.checkOut}</p>
                            <p className="font-medium">{formatDate(trip.endDate)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">{t.card.nights}</p>
                            <p className="font-medium">{trip.pricing.nights}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">{t.card.guests}</p>
                            <p className="font-medium">{getTotalGuests(trip.guestCount)}</p>
                          </div>
                        </div>

                        {/* Host Info */}
                        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
                          <Image
                            src={trip.host.avatar}
                            alt={trip.host.firstName}
                            width={40}
                            height={40}
                            className="rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/uploads/users/default-avatar.png';
                            }}
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {t.card.hostedBy} {trip.host.firstName} {trip.host.lastName}
                            </p>
                          </div>
                        </div>

                        {/* Review Status */}
                        {trip.review ? (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <FaStar className="text-yellow-400" />
                              <span className="font-medium">{t.card.yourReview} {trip.review.rating?.overall || 5}/5</span>
                            </div>
                            {trip.review.comment && (
                              <p className="text-sm text-gray-600 line-clamp-2">{trip.review.comment}</p>
                            )}
                          </div>
                        ) : (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-800">
                              {t.card.shareExperience}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Price and Actions */}
                      <div className={`text-${language === 'ar' ? 'left' : 'right'} ${language === 'ar' ? 'mr-6' : 'ml-6'}`}>
                        <div className="mb-4">
                          <p className="text-sm text-gray-500 mb-1">{t.card.totalPaid}</p>
                          <div className="text-3xl font-bold text-gray-900">
                            {formatPrice(trip.pricing.totalAmount, trip.pricing.currency)}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Link
                            href={`/listing/${trip.listing._id}`}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#FF6B35] text-white rounded-lg hover:bg-[#FF5722] transition-colors"
                          >
                            <FaEye />
                            {t.card.viewListing}
                          </Link>

                          {!trip.review && (
                            <Link
                              href={`/dashboard/reviews/create?booking=${trip._id}`}
                              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              <FaStar />
                              {t.card.writeReview}
                            </Link>
                          )}

                          <Link
                            href={`/dashboard/bookings`}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <FaCalendarAlt />
                            {t.card.bookAgain}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Year Summary Section */}
      {statistics && Object.keys(statistics.byYear).length > 0 && (
        <div className="max-w-7xl mx-auto mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.yearSummary.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(statistics.byYear)
              .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
              .map(([year, data]) => (
                <div key={year} className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{year}</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">{t.yearSummary.trips}</span>
                      <span className="font-semibold text-gray-900">{data.trips}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">{t.yearSummary.nights}</span>
                      <span className="font-semibold text-gray-900">{data.nights}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">{t.yearSummary.spent}</span>
                      <span className="font-semibold text-gray-900">
                        {formatPrice(data.spent, 'DZD')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
