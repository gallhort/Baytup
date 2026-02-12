'use client';

import { useState, useEffect } from 'react';
import {
  FaCalendarAlt, FaHeart, FaStar, FaMapMarkerAlt, FaClock,
  FaShoppingCart, FaHistory, FaMoneyBillWave, FaBed, FaCar,
  FaEnvelope, FaChartLine, FaGift, FaUserCheck, FaCheckCircle,
  FaTimesCircle, FaHourglassHalf, FaExclamationCircle, FaArrowRight,
  FaComments, FaMapMarkedAlt, FaTrophy, FaFire, FaPlane, FaUser
} from 'react-icons/fa';
import axios from 'axios';
import Link from 'next/link';
import Image from 'next/image';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import toast from 'react-hot-toast';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import DashboardChecklist from '@/components/onboarding/DashboardChecklist';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function GuestDashboard() {
  const { state } = useApp();
  const user = state.user;
  const t = useTranslation('guest-dashboard');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/dashboard/guest`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error((t as any)?.toast?.loadFailed || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (listingId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/wishlists/${listingId}/toggle`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      toast.success((t as any)?.wishlist?.removedSuccess || 'Removed from wishlist');
      fetchDashboardData();
    } catch (error) {
      toast.error((t as any)?.wishlist?.removedFailed || 'Failed to remove from wishlist');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return <div className="text-center text-gray-500">{(t as any)?.charts?.noData || 'No data available'}</div>;
  }

  const { overview, spending, bookings, savedListings, reviews, travelHistory, recommendedListings, recentMessages } = dashboardData;

  // Chart data for spending trend
  const spendingChartData = {
    labels: spending.monthlyTrend?.map((item: any) =>
      `${item._id.month}/${item._id.year}`
    ) || [],
    datasets: [
      {
        label: (t as any)?.charts?.monthlySpending || 'Monthly Spending (DZD)',
        data: spending.monthlyTrend?.map((item: any) => item.spent) || [],
        borderColor: '#FF6B35',
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2
      }
    ]
  };

  // Chart data for travel map
  const citiesChartData = {
    labels: travelHistory?.slice(0, 5).map((item: any) => item._id) || [],
    datasets: [
      {
        data: travelHistory?.slice(0, 5).map((item: any) => item.count) || [],
        backgroundColor: [
          'rgba(255, 107, 53, 0.9)',
          'rgba(59, 130, 246, 0.9)',
          'rgba(34, 197, 94, 0.9)',
          'rgba(251, 146, 60, 0.9)',
          'rgba(168, 85, 247, 0.9)'
        ],
        borderColor: [
          'rgb(255, 107, 53)',
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
          'rgb(251, 146, 60)',
          'rgb(168, 85, 247)'
        ],
        borderWidth: 2
      }
    ]
  };

  // Booking status distribution
  const bookingStatusData = {
    labels: [(t as any)?.charts?.upcoming || 'Upcoming', (t as any)?.charts?.active || 'Active', (t as any)?.charts?.completed || 'Completed'],
    datasets: [
      {
        data: [
          overview.upcomingBookings || 0,
          overview.activeBookings || 0,
          overview.completedBookings || 0
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(100, 116, 139, 0.8)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
          'rgb(100, 116, 139)'
        ],
        borderWidth: 2
      }
    ]
  };

  const statCards = [
    {
      icon: FaShoppingCart,
      label: (t as any)?.stats?.totalBookings || 'Total Bookings',
      value: overview.totalBookings || 0,
      subtitle: `${overview.upcomingBookings || 0} ${(t as any)?.stats?.upcomingBookings || 'upcoming'}`,
      color: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      link: '/dashboard/bookings'
    },
    {
      icon: FaMapMarkerAlt,
      label: (t as any)?.stats?.citiesVisited || 'Cities Visited',
      value: overview.citiesVisited || 0,
      subtitle: (t as any)?.stats?.uniqueDestinations || 'unique destinations',
      color: 'from-green-500 to-green-600',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      link: '/dashboard/history'
    },
    {
      icon: FaHeart,
      label: (t as any)?.stats?.savedListings || 'Saved Listings',
      value: overview.savedListings || 0,
      subtitle: (t as any)?.stats?.inWishlist || 'in wishlist',
      color: 'from-red-500 to-red-600',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      link: '/dashboard/saved'
    },
    {
      icon: FaMoneyBillWave,
      label: (t as any)?.stats?.totalSpent || 'Total Spent',
      value: `${((spending.totalSpent || 0) / 1000).toFixed(1)}k`,
      subtitle: `${((spending.averageBookingValue || 0) / 1000).toFixed(1)}k ${(t as any)?.stats?.avg || 'avg'}`,
      color: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      link: null
    },
    {
      icon: FaStar,
      label: (t as any)?.stats?.reviewsWritten || 'Reviews Written',
      value: overview.totalReviews || 0,
      subtitle: (t as any)?.stats?.yourExperiences || 'your experiences',
      color: 'from-yellow-500 to-yellow-600',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      link: '/dashboard/reviews'
    },
    {
      icon: FaEnvelope,
      label: (t as any)?.stats?.messages || 'Messages',
      value: overview.unreadMessages || 0,
      subtitle: (t as any)?.stats?.unreadMessages || 'unread messages',
      color: 'from-indigo-500 to-indigo-600',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      link: '/dashboard/messages'
    }
  ];

  const getStatusBadge = (status: string) => {
    const badges: any = {
      'confirmed': { bg: 'bg-blue-100', text: 'text-blue-800', icon: FaCheckCircle, label: (t as any)?.statusBadges?.confirmed || 'Confirmed' },
      'active': { bg: 'bg-green-100', text: 'text-green-800', icon: FaUserCheck, label: (t as any)?.statusBadges?.active || 'Active' },
      'completed': { bg: 'bg-gray-100', text: 'text-gray-800', icon: FaCheckCircle, label: (t as any)?.statusBadges?.completed || 'Completed' },
      'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: FaHourglassHalf, label: (t as any)?.statusBadges?.pending || 'Pending' },
      'cancelled': { bg: 'bg-red-100', text: 'text-red-800', icon: FaTimesCircle, label: (t as any)?.statusBadges?.cancelled || 'Cancelled' },
      'cancelled_by_guest': { bg: 'bg-red-100', text: 'text-red-800', icon: FaTimesCircle, label: (t as any)?.statusBadges?.cancelled || 'Cancelled' },
      'cancelled_by_host': { bg: 'bg-red-100', text: 'text-red-800', icon: FaTimesCircle, label: (t as any)?.statusBadges?.cancelled || 'Cancelled' }
    };
    return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: FaExclamationCircle, label: status };
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getAvatarUrl = (avatar: string | undefined) => {
    if (!avatar) return '/uploads/users/default-avatar.png';
    if (avatar.startsWith('http')) return avatar;

    // Remove /api from the URL for static files
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    return `${baseUrl}${avatar}`;
  };

  return (
    <div className="space-y-6">
      {/* Onboarding Checklist */}
      <DashboardChecklist user={user} />

      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 flex-1">
            {/* Profile Picture */}
            <Link href="/dashboard/settings" className="group relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-xl ring-4 ring-primary-400 group-hover:ring-primary-300 transition-all duration-300">
                {user?.avatar ? (
                  <Image
                    src={getAvatarUrl(user.avatar)}
                    alt={`${user.firstName} ${user.lastName}`}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-white flex items-center justify-center">
                    <FaUser className="text-primary-500 text-4xl" />
                  </div>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="text-xs font-semibold bg-white text-primary-600 px-2 py-1 rounded">{(t as any)?.header?.edit || 'Edit'}</span>
              </div>
            </Link>

            {/* Welcome Text */}
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {(t as any)?.header?.welcomeBack?.replace('{name}', user?.firstName || '') || `Welcome back, ${user?.firstName}!`} {(t as any)?.header?.welcomeEmoji || '👋'}
              </h1>
              <p className="text-primary-100 text-lg">
                {(t as any)?.header?.subtitle || 'Ready for your next adventure? Let\'s explore amazing places!'}
              </p>
            </div>
          </div>
          <div className="hidden lg:block">
            <FaPlane className="text-8xl opacity-20" />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            href="/search"
            className="inline-flex items-center px-6 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <FaMapMarkedAlt className="mr-2" />
            {(t as any)?.cta?.exploreListings || 'Explore Listings'}
          </Link>
          {overview.upcomingBookings > 0 && (
            <Link
              href="/dashboard/bookings"
              className="inline-flex items-center px-6 py-3 bg-primary-700 text-white rounded-lg font-semibold hover:bg-primary-800 transition-all duration-200"
            >
              <FaCalendarAlt className="mr-2" />
              {(t as any)?.cta?.viewUpcomingTrips || 'View Upcoming Trips'}
            </Link>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-6 border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.iconBg} p-4 rounded-xl`}>
                <stat.icon className={`${stat.iconColor} text-2xl`} />
              </div>
              {stat.link && (
                <Link href={stat.link} className="text-primary-500 hover:text-primary-600">
                  <FaArrowRight />
                </Link>
              )}
            </div>
            <h3 className="text-3xl font-bold text-gray-800 mb-1">{stat.value}</h3>
            <p className="text-sm font-medium text-gray-600">{stat.label}</p>
            <p className="text-xs text-gray-400 mt-2">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      {overview.totalBookings === 0 && (
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <FaGift className="text-orange-600 text-2xl" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                {(t as any)?.firstBooking?.title || 'Start Your Journey with Baytup!'}
              </h3>
              <p className="text-gray-600 mb-4">
                {(t as any)?.firstBooking?.description || 'Book your first stay or vehicle and unlock exclusive benefits. Discover unique places across Algeria!'}
              </p>
              <Link
                href="/search"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-md"
              >
                {(t as any)?.cta?.startExploring || 'Start Exploring'}
                <FaArrowRight className="ml-2" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <nav className="flex overflow-x-auto">
          {[
            { id: 'overview', label: (t as any)?.tabs?.overview || 'Overview', icon: FaChartLine },
            { id: 'bookings', label: (t as any)?.tabs?.bookings || 'Bookings', icon: FaShoppingCart },
            { id: 'wishlist', label: (t as any)?.tabs?.wishlist || 'Wishlist', icon: FaHeart },
            { id: 'history', label: (t as any)?.tabs?.history || 'Travel History', icon: FaHistory },
            { id: 'reviews', label: (t as any)?.tabs?.reviews || 'My Reviews', icon: FaStar },
            { id: 'messages', label: (t as any)?.tabs?.messages || 'Messages', icon: FaComments }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-4 font-medium text-sm border-b-2 whitespace-nowrap transition-colors ${
                selectedTab === tab.id
                  ? 'border-primary-500 text-primary-600 bg-primary-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Spending Trend */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">{(t as any)?.charts?.spendingTrend || 'Spending Trend'}</h3>
                <FaMoneyBillWave className="text-purple-500" />
              </div>
              {spending.monthlyTrend && spending.monthlyTrend.length > 0 ? (
                <Line
                  data={spendingChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: function(value) {
                            return value.toLocaleString() + ' ' + ((t as any)?.charts?.currency || 'DZD');
                          }
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <FaChartLine size={48} className="mx-auto mb-4 opacity-30" />
                  <p>{(t as any)?.charts?.noSpendingData || 'No spending data yet'}</p>
                </div>
              )}
            </div>

            {/* Booking Status */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">{(t as any)?.charts?.bookingStatus || 'Booking Status'}</h3>
                <FaShoppingCart className="text-blue-500" />
              </div>
              {overview.totalBookings > 0 ? (
                <Doughnut
                  data={bookingStatusData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 15,
                          font: {
                            size: 12
                          }
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <FaShoppingCart size={48} className="mx-auto mb-4 opacity-30" />
                  <p>{(t as any)?.charts?.noBookings || 'No bookings yet'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Cities Visited */}
          {travelHistory && travelHistory.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">{(t as any)?.charts?.travelMap || 'Travel Map - Top Cities'}</h3>
                <FaMapMarkerAlt className="text-green-500" />
              </div>
              <div className="max-w-md mx-auto">
                <Doughnut
                  data={citiesChartData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          padding: 15,
                          font: {
                            size: 12
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Upcoming Trips */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FaCalendarAlt className="text-primary-500" />
                <h3 className="text-lg font-semibold text-gray-800">{(t as any)?.upcomingTrips?.title || 'Upcoming Trips'}</h3>
              </div>
              {bookings?.upcoming?.length > 0 && (
                <Link
                  href="/dashboard/bookings"
                  className="text-primary-500 hover:text-primary-600 text-sm font-medium flex items-center"
                >
                  {(t as any)?.upcomingTrips?.viewAll || 'View All'}
                  <FaArrowRight className="ml-1" />
                </Link>
              )}
            </div>
            <div className="divide-y">
              {bookings?.upcoming?.length > 0 ? (
                bookings.upcoming.slice(0, 3).map((booking: any, index: number) => {
                  const statusBadge = getStatusBadge(booking.status);
                  return (
                    <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                            {booking.listing?.images?.[0] ? (
                              <img
                                src={booking.listing.images[0].url}
                                alt={booking.listing.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                {booking.listing?.category === 'vehicle' ? <FaCar size={28} /> : <FaBed size={28} />}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-lg mb-1">
                              {booking.listing?.title}
                            </h4>
                            <p className="text-sm text-gray-500 mb-2 flex items-center">
                              <FaMapMarkerAlt className="mr-1" />
                              {booking.listing?.address?.city}, {booking.listing?.address?.country}
                            </p>
                            <p className="text-sm text-gray-600 flex items-center">
                              <FaCalendarAlt className="mr-2 text-primary-500" />
                              {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-bold text-gray-900 text-xl mb-2">
                            {booking.totalPrice?.toLocaleString()} DZD
                          </p>
                          <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                            <statusBadge.icon className="mr-1" />
                            {statusBadge.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <FaCalendarAlt className="text-gray-400 text-2xl" />
                  </div>
                  <p className="text-gray-500 mb-4">{(t as any)?.upcomingTrips?.noTrips || 'No upcoming trips'}</p>
                  <Link
                    href="/search"
                    className="inline-flex items-center px-6 py-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
                  >
                    {(t as any)?.upcomingTrips?.planTrip || 'Plan Your Next Trip'}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recommended Listings */}
          {recommendedListings && recommendedListings.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FaFire className="text-primary-500" />
                  <h3 className="text-lg font-semibold text-gray-800">{(t as any)?.recommendedListings?.title || 'Recommended for You'}</h3>
                </div>
                <Link
                  href="/search"
                  className="text-primary-500 hover:text-primary-600 text-sm font-medium flex items-center"
                >
                  {(t as any)?.recommendedListings?.viewMore || 'View More'}
                  <FaArrowRight className="ml-1" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {recommendedListings.slice(0, 6).map((listing: any, index: number) => (
                  <Link
                    key={index}
                    href={`/listings/${listing._id}`}
                    className="group block hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden border border-gray-200 hover:border-primary-300"
                  >
                    <div className="relative h-48 bg-gray-100 overflow-hidden">
                      {listing.images?.[0] ? (
                        <img
                          src={listing.images[0].url}
                          alt={listing.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          {listing.category === 'vehicle' ? <FaCar size={40} /> : <FaBed size={40} />}
                        </div>
                      )}
                      <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full shadow-md">
                        <div className="flex items-center space-x-1">
                          <FaStar className="text-yellow-400" size={12} />
                          <span className="text-sm font-semibold text-gray-800">
                            {listing.stats?.averageRating?.toFixed(1) || (t as any)?.recommendedListings?.new || 'New'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-semibold text-gray-900 truncate mb-1 group-hover:text-primary-600 transition-colors">
                        {listing.title}
                      </h4>
                      <p className="text-sm text-gray-500 mb-3 flex items-center">
                        <FaMapMarkerAlt className="mr-1" size={12} />
                        {listing.address?.city}, {listing.address?.country}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-primary-600">
                          {listing.pricing?.basePrice?.toLocaleString()} DZD
                        </span>
                        <span className="text-xs text-gray-500">
                          /{listing.pricing?.pricingType?.replace('per_', '')}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent Messages Preview */}
          {recentMessages && recentMessages.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FaEnvelope className="text-indigo-500" />
                  <h3 className="text-lg font-semibold text-gray-800">{(t as any)?.recentMessages?.title || 'Recent Messages'}</h3>
                </div>
                <Link
                  href="/dashboard/messages"
                  className="text-primary-500 hover:text-primary-600 text-sm font-medium flex items-center"
                >
                  {(t as any)?.recentMessages?.viewAll || 'View All'}
                  <FaArrowRight className="ml-1" />
                </Link>
              </div>
              <div className="divide-y">
                {recentMessages.slice(0, 3).map((message: any, index: number) => (
                  <Link
                    key={index}
                    href="/dashboard/messages"
                    className="block p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                        {message.sender?.avatar ? (
                          <img
                            src={message.sender.avatar}
                            alt={message.sender.firstName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 font-semibold">
                            {message.sender?.firstName?.[0]}{message.sender?.lastName?.[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {message.sender?.firstName} {message.sender?.lastName}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{message.content}</p>
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDate(message.createdAt)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'bookings' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-800">{(t as any)?.bookings?.title || 'All Bookings'}</h3>
            <p className="text-sm text-gray-500 mt-1">{(t as any)?.bookings?.subtitle || 'Manage and track all your bookings'}</p>
          </div>
          <div className="divide-y">
            {bookings?.all?.length > 0 ? (
              bookings.all.map((booking: any, index: number) => {
                const statusBadge = getStatusBadge(booking.status);
                return (
                  <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {booking.listing?.images?.[0] ? (
                            <img
                              src={booking.listing.images[0].url}
                              alt={booking.listing.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              {booking.listing?.category === 'vehicle' ? <FaCar size={24} /> : <FaBed size={24} />}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">
                            {booking.listing?.title}
                          </h4>
                          <p className="text-sm text-gray-500 mb-1">
                            {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {(t as any)?.bookings?.host || 'Host'}: {booking.host?.firstName} {booking.host?.lastName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-gray-900 text-lg mb-2">
                          {booking.totalPrice?.toLocaleString()} DZD
                        </p>
                        <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                          <statusBadge.icon className="mr-1" />
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <FaShoppingCart className="text-gray-400 text-2xl" />
                </div>
                <p className="text-gray-500 mb-4">{(t as any)?.bookings?.noBookings || 'No bookings yet'}</p>
                <Link
                  href="/search"
                  className="inline-flex items-center px-6 py-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
                >
                  {(t as any)?.cta?.browseListings || 'Browse Listings'}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTab === 'wishlist' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedListings?.length > 0 ? (
            savedListings.map((listing: any, index: number) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
                <Link href={`/listings/${listing._id}`}>
                  <div className="relative h-48 bg-gray-100">
                    {listing.images?.[0] ? (
                      <img
                        src={listing.images[0].url}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        {listing.category === 'vehicle' ? <FaCar size={36} /> : <FaBed size={36} />}
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full shadow-md">
                      <div className="flex items-center space-x-1">
                        <FaStar className="text-yellow-400" size={12} />
                        <span className="text-sm font-semibold text-gray-800">
                          {listing.stats?.averageRating?.toFixed(1) || (t as any)?.recommendedListings?.new || 'New'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="p-4">
                  <h4 className="font-semibold text-gray-900 truncate mb-1">
                    {listing.title}
                  </h4>
                  <p className="text-sm text-gray-500 mb-3 flex items-center">
                    <FaMapMarkerAlt className="mr-1" size={12} />
                    {listing.address?.city}, {listing.address?.country}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary-600">
                      {listing.pricing?.basePrice?.toLocaleString()} DZD
                    </span>
                    <button
                      onClick={() => handleRemoveFromWishlist(listing._id)}
                      className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={(t as any)?.wishlist?.removeFromWishlist || 'Remove from wishlist'}
                    >
                      <FaHeart size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
                <FaHeart className="text-red-500 text-3xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{(t as any)?.wishlist?.noSavedListings || 'No Saved Listings'}</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {(t as any)?.wishlist?.description || 'Start building your wishlist by saving listings you love. Find them all in one place!'}
              </p>
              <Link
                href="/search"
                className="inline-flex items-center px-8 py-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors shadow-md"
              >
                <FaMapMarkedAlt className="mr-2" />
                {(t as any)?.cta?.exploreListings || 'Explore Listings'}
              </Link>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'history' && (
        <div className="space-y-6">
          {/* Travel History */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-800">{(t as any)?.travelHistory?.title || 'Travel History'}</h3>
              <p className="text-sm text-gray-500 mt-1">{(t as any)?.travelHistory?.subtitle || 'Cities and places you\'ve visited'}</p>
            </div>
            <div className="divide-y">
              {travelHistory?.length > 0 ? (
                travelHistory.map((city: any, index: number) => (
                  <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl">
                          <FaMapMarkerAlt className="text-primary-600 text-2xl" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-lg">{city._id}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {city.count} {city.count === 1 ? ((t as any)?.travelHistory?.visit || 'visit') : ((t as any)?.travelHistory?.visits || 'visits')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">{(t as any)?.travelHistory?.lastVisit || 'Last visit'}</p>
                        <p className="text-sm font-medium text-gray-700">
                          {formatDate(city.lastVisit)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <FaHistory className="text-gray-400 text-2xl" />
                  </div>
                  <p className="text-gray-500 mb-4">{(t as any)?.travelHistory?.noHistory || 'No travel history yet'}</p>
                  <p className="text-sm text-gray-400 mb-6">{(t as any)?.travelHistory?.noHistoryDescription || 'Start your journey and create memories!'}</p>
                  <Link
                    href="/search"
                    className="inline-flex items-center px-6 py-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
                  >
                    {(t as any)?.cta?.startTraveling || 'Start Traveling'}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'reviews' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-800">{(t as any)?.reviews?.title || 'My Reviews'}</h3>
            <p className="text-sm text-gray-500 mt-1">{(t as any)?.reviews?.subtitle || 'Reviews you\'ve written about your stays'}</p>
          </div>
          <div className="divide-y">
            {reviews?.length > 0 ? (
              reviews.map((review: any, index: number) => (
                <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {review.listing?.images?.[0] ? (
                        <img
                          src={review.listing.images[0].url}
                          alt={review.listing.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          {review.listing?.category === 'vehicle' ? <FaCar size={20} /> : <FaBed size={20} />}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <Link
                          href={`/listings/${review.listing?._id}`}
                          className="font-semibold text-gray-900 hover:text-primary-600"
                        >
                          {review.listing?.title}
                        </Link>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <FaStar
                              key={i}
                              className={i < review.rating ? 'text-yellow-400' : 'text-gray-200'}
                              size={16}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                        {review.comment}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(review.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <FaStar className="text-gray-400 text-2xl" />
                </div>
                <p className="text-gray-500 mb-4">{(t as any)?.reviews?.noReviews || 'No reviews yet'}</p>
                <p className="text-sm text-gray-400">
                  {(t as any)?.reviews?.noReviewsDescription || 'Complete a booking to leave your first review'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTab === 'messages' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-800">{(t as any)?.messages?.title || 'Recent Messages'}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {overview.unreadMessages > 0 ? (
                <span className="text-primary-600 font-medium">
                  {overview.unreadMessages === 1
                    ? ((t as any)?.messages?.unreadCount?.replace('{count}', overview.unreadMessages.toString()) || `You have ${overview.unreadMessages} unread message`)
                    : ((t as any)?.messages?.unreadCountPlural?.replace('{count}', overview.unreadMessages.toString()) || `You have ${overview.unreadMessages} unread messages`)
                  }
                </span>
              ) : (
                (t as any)?.messages?.allCaughtUp || 'All caught up!'
              )}
            </p>
          </div>
          <div className="divide-y">
            {recentMessages && recentMessages.length > 0 ? (
              recentMessages.map((message: any, index: number) => (
                <Link
                  key={index}
                  href="/dashboard/messages"
                  className="block p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                      {message.sender?.avatar ? (
                        <img
                          src={message.sender.avatar}
                          alt={message.sender.firstName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 font-semibold text-lg">
                          {message.sender?.firstName?.[0]}{message.sender?.lastName?.[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 mb-1">
                        {message.sender?.firstName} {message.sender?.lastName}
                      </p>
                      <p className="text-sm text-gray-600 truncate">{message.content}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(message.createdAt)}
                      </p>
                    </div>
                    <FaArrowRight className="text-gray-400" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <FaComments className="text-gray-400 text-2xl" />
                </div>
                <p className="text-gray-500 mb-4">{(t as any)?.messages?.noMessages || 'No messages yet'}</p>
                <p className="text-sm text-gray-400">
                  {(t as any)?.messages?.noMessagesDescription || 'Messages from hosts will appear here'}
                </p>
              </div>
            )}
          </div>
          <div className="p-6 border-t bg-gray-50">
            <Link
              href="/dashboard/messages"
              className="block text-center px-6 py-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors"
            >
              {(t as any)?.cta?.goToMessages || 'Go to Messages'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
