'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  FaBed, FaCalendarAlt, FaChartLine, FaStar, FaEye,
  FaMoneyBillWave, FaClipboardCheck, FaEnvelope, FaArrowUp,
  FaArrowDown, FaEdit, FaTrash, FaPause, FaPlay, FaUser
} from 'react-icons/fa';
import axios from 'axios';
import Link from 'next/link';
import Image from 'next/image';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import toast from 'react-hot-toast';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useFeature } from '@/contexts/FeatureFlagsContext'; // ✅ Feature flags

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function HostDashboard() {
  const { state } = useApp();
  const user = state.user;
  const t = useTranslation('host-dashboard');
  const vehiclesEnabled = useFeature('vehiclesEnabled'); // ✅ Feature flag check
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedTab === 'bookings' && allBookings.length === 0) {
      fetchAllBookings();
    }
  }, [selectedTab]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/dashboard/host`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error((t as any)?.errors?.loadFailed || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBookings = async () => {
    try {
      setLoadingBookings(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/bookings/host`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setAllBookings(response.data.data.bookings || []);
    } catch (error) {
      console.error('Error fetching all bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoadingBookings(false);
    }
  };

  // ✅ FEATURE FLAG: Filter data with useMemo BEFORE any conditional returns
  const filteredListings = useMemo(() => {
    const listings = dashboardData?.listings;
    if (!listings) return [];
    if (vehiclesEnabled) return listings;
    return listings.filter((listing: any) => listing.category !== 'vehicle');
  }, [dashboardData?.listings, vehiclesEnabled]);

  const filteredUpcomingBookings = useMemo(() => {
    const upcomingBookings = dashboardData?.upcomingBookings;
    if (!upcomingBookings) return [];
    if (vehiclesEnabled) return upcomingBookings;
    return upcomingBookings.filter((booking: any) => booking.listing?.category !== 'vehicle');
  }, [dashboardData?.upcomingBookings, vehiclesEnabled]);

  const filteredAllBookings = useMemo(() => {
    if (!allBookings) return [];
    if (vehiclesEnabled) return allBookings;
    return allBookings.filter((booking: any) => booking.listing?.category !== 'vehicle');
  }, [allBookings, vehiclesEnabled]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#FF6B35] mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">{(t as any)?.loading?.message || 'Loading dashboard...'}</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return <div className="text-center text-gray-500">{(t as any)?.errors?.noData || 'No data available'}</div>;
  }

  const { overview, revenue, listings, upcomingBookings, recentReviews, performanceChart } = dashboardData;

  // Chart data with Baytup theme
  const revenueChartData = {
    labels: revenue.monthlyTrend?.map((item: any) =>
      `${item._id.month}/${item._id.year}`
    ) || [],
    datasets: [
      {
        label: (t as any)?.charts?.revenue?.label || 'Revenue',
        data: revenue.monthlyTrend?.map((item: any) => item.revenue) || [],
        borderColor: '#FF6B35',
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const performanceChartData = {
    labels: performanceChart?.views?.slice(0, 5).map((item: any) => item.title) || [],
    datasets: [
      {
        label: (t as any)?.charts?.performance?.viewsLabel || 'Views',
        data: performanceChart?.views?.slice(0, 5).map((item: any) => item.views) || [],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      },
      {
        label: (t as any)?.charts?.performance?.bookingsLabel || 'Bookings',
        data: performanceChart?.views?.slice(0, 5).map((item: any) => item.bookings) || [],
        backgroundColor: 'rgba(255, 107, 53, 0.8)',
        borderColor: '#FF6B35',
        borderWidth: 1
      }
    ]
  };

  const statCards = [
    {
      icon: FaBed,
      label: (t as any)?.stats?.activeListings?.label || 'Active Listings',
      value: overview.activeListings,
      total: overview.totalListings,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600'
    },
    {
      icon: FaClipboardCheck,
      label: (t as any)?.stats?.totalBookings?.label || 'Total Bookings',
      value: overview.totalBookings,
      active: overview.activeBookings,
      color: 'bg-gradient-to-br from-green-500 to-green-600'
    },
    {
      icon: FaMoneyBillWave,
      label: (t as any)?.stats?.totalRevenue?.label || 'Total Revenue',
      value: `${(revenue.totalRevenue / 1000).toFixed(1)}k`,
      subValue: (t as any)?.stats?.totalRevenue?.currency || 'DZD',
      avg: `${(revenue.averageBookingValue / 1000).toFixed(1)}k ${(t as any)?.stats?.totalRevenue?.avg || 'avg'}`,
      color: 'bg-gradient-to-br from-[#FF6B35] to-[#ff8255]'
    },
    {
      icon: FaStar,
      label: (t as any)?.stats?.averageRating?.label || 'Average Rating',
      value: overview.averageRating,
      views: `${(overview.totalViews / 1000).toFixed(1)}k ${(t as any)?.stats?.averageRating?.views || 'views'}`,
      color: 'bg-gradient-to-br from-purple-500 to-purple-600'
    }
  ];

  const handleListingAction = async (listingId: string, action: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/listings/${listingId}/status`,
        { status: action },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      const successMessage = action === 'paused'
        ? (t as any)?.messages?.listingPaused || 'Listing paused successfully'
        : (t as any)?.messages?.listingActivated || 'Listing activated successfully';
      toast.success(successMessage);
      fetchDashboardData();
    } catch (error) {
      toast.error((t as any)?.messages?.listingActionFailed || 'Failed to update listing status');
    }
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
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center space-x-6">
          {/* Profile Picture */}
          <Link href="/dashboard/settings" className="group relative flex-shrink-0">
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
              <span className="text-xs font-semibold bg-white text-primary-600 px-2 py-1 rounded">{(t as any)?.header?.editProfile || 'Edit Profile'}</span>
            </div>
          </Link>

          {/* Header Text */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{(t as any)?.header?.title || 'Host Dashboard'}</h1>
            <p className="text-primary-100 mt-1">{(t as any)?.header?.subtitle || 'Manage your properties and bookings'}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className={`${stat.color} p-4 rounded-xl text-white shadow-lg`}>
                <stat.icon size={24} />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mb-2">
              <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
              {stat.subValue && (
                <span className="text-sm font-medium text-gray-500">{stat.subValue}</span>
              )}
            </div>
            <p className="text-sm text-gray-600 font-medium mb-2">{stat.label}</p>
            <p className="text-xs text-gray-400">
              {stat.total && `${stat.total} ${(t as any)?.stats?.totalListings?.total || 'total'}`}
              {stat.active && `${stat.active} ${(t as any)?.stats?.totalBookings?.active || 'active'}`}
              {stat.avg}
              {stat.views}
            </p>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white rounded-t-xl">
        <nav className="-mb-px flex space-x-8 px-6 pt-4">
          {[
            { key: 'overview', label: (t as any)?.tabs?.overview || 'Overview' },
            { key: 'listings', label: (t as any)?.tabs?.listings || 'Listings' },
            { key: 'bookings', label: (t as any)?.tabs?.bookings || 'Bookings' },
            { key: 'reviews', label: (t as any)?.tabs?.reviews || 'Reviews' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key)}
              className={`py-3 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                selectedTab === tab.key
                  ? 'border-[#FF6B35] text-[#FF6B35]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 h-[400px] flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FaChartLine className="mr-2 text-[#FF6B35]" />
                  {(t as any)?.charts?.revenue?.title || 'Revenue Trend'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{(t as any)?.charts?.revenue?.subtitle || 'Monthly revenue overview'}</p>
              </div>
              <div className="flex-1 min-h-0">
                <Line
                  data={revenueChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      },
                      tooltip: {
                        backgroundColor: '#1F2937',
                        padding: 12,
                        titleColor: '#FFFFFF',
                        bodyColor: '#FFFFFF',
                        borderColor: '#FF6B35',
                        borderWidth: 1
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                          callback: function(value) {
                            return value + ' ' + ((t as any)?.currency?.dzd || 'DZD');
                          }
                        }
                      },
                      x: {
                        grid: {
                          display: false
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Performance Chart */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 h-[400px] flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FaEye className="mr-2 text-blue-500" />
                  {(t as any)?.charts?.performance?.title || 'Listing Performance'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{(t as any)?.charts?.performance?.subtitle || 'Top 5 performing listings'}</p>
              </div>
              <div className="flex-1 min-h-0">
                <Bar
                  data={performanceChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 15,
                          font: {
                            size: 11
                          }
                        }
                      },
                      tooltip: {
                        backgroundColor: '#1F2937',
                        padding: 12,
                        titleColor: '#FFFFFF',
                        bodyColor: '#FFFFFF'
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)'
                        }
                      },
                      x: {
                        grid: {
                          display: false
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Upcoming Bookings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[450px] flex flex-col overflow-hidden">
            <div className="p-6 border-b bg-gradient-to-r from-green-50 to-green-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <FaCalendarAlt className="mr-2 text-green-600" />
                {(t as any)?.sections?.upcomingBookings?.title || 'Upcoming Bookings'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{(t as any)?.sections?.upcomingBookings?.subtitle || 'Next 5 upcoming reservations'}</p>
            </div>
            <div className="divide-y flex-1 overflow-y-auto">
              {filteredUpcomingBookings?.length > 0 ? (
                filteredUpcomingBookings.slice(0, 5).map((booking: any, index: number) => (
                  <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shadow-sm flex-shrink-0">
                          {booking.listing?.images?.[0] ? (
                            <img
                              src={booking.listing.images[0].url}
                              alt={booking.listing.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <FaBed size={24} />
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{booking.listing?.title}</h4>
                          <p className="text-sm text-gray-600">
                            {(t as any)?.bookings?.guest || 'Guest'}: {booking.guest?.firstName} {booking.guest?.lastName}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center mt-1">
                            <FaCalendarAlt className="mr-1" />
                            {(t as any)?.bookings?.checkIn || 'Check-in'}: {new Date(booking.checkIn).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#FF6B35] text-lg">{booking.totalPrice} {(t as any)?.currency?.dzd || 'DZD'}</p>
                        <p className="text-xs text-gray-500">
                          {booking.nights} {booking.nights === 1 ? ((t as any)?.bookings?.night || 'night') : ((t as any)?.bookings?.nights || 'nights')}
                        </p>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 mt-1">
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <FaCalendarAlt className="mx-auto text-4xl text-gray-300 mb-3" />
                  <p>{(t as any)?.emptyStates?.noUpcomingBookings || 'No upcoming bookings'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'listings' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[600px] flex flex-col overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-blue-50 to-blue-100">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{(t as any)?.sections?.myListings?.title || 'My Listings'}</h3>
              <p className="text-sm text-gray-600 mt-1">{(t as any)?.sections?.myListings?.subtitle || 'Manage your property listings'}</p>
            </div>
            <Link
              href="/host/listings/create"
              className="px-4 py-2 bg-[#FF6B35] text-white rounded-lg hover:bg-[#ff8255] transition-colors shadow-sm"
            >
              {(t as any)?.actions?.addNewListing || 'Add New Listing'}
            </Link>
          </div>
          <div className="divide-y flex-1 overflow-y-auto">
            {filteredListings?.length > 0 ? (
              filteredListings.map((listing: any, index: number) => (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shadow-sm flex-shrink-0">
                        {listing.images?.[0] ? (
                          <img
                            src={listing.images[0].url}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <FaBed size={24} />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{listing.title}</h4>
                        <p className="text-sm text-gray-500 capitalize">{listing.category} • {listing.subcategory}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-xs text-gray-600 flex items-center bg-blue-50 px-2 py-1 rounded">
                            <FaEye className="mr-1" />
                            {listing.stats?.views || 0}
                          </span>
                          <span className="text-xs text-gray-600 flex items-center bg-yellow-50 px-2 py-1 rounded">
                            <FaStar className="mr-1 text-yellow-400" />
                            {listing.stats?.averageRating?.toFixed(1) || '0.0'}
                          </span>
                          <span className="text-xs text-gray-600 bg-green-50 px-2 py-1 rounded">
                            {listing.stats?.bookings || 0} {(listing.stats?.bookings || 0) === 1 ? ((t as any)?.listings?.booking || 'booking') : ((t as any)?.listings?.bookings || 'bookings')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        listing.status === 'active' ? 'bg-green-100 text-green-800' :
                        listing.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {listing.status === 'active' ? ((t as any)?.listings?.status?.active || 'Active') :
                         listing.status === 'paused' ? ((t as any)?.listings?.status?.paused || 'Paused') :
                         listing.status === 'draft' ? ((t as any)?.listings?.status?.draft || 'Draft') :
                         ((t as any)?.listings?.status?.archived || 'Archived')}
                      </span>
                      <div className="flex space-x-2">
                        <Link
                          href={`/host/listings/${listing._id}/edit`}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <FaEdit size={16} />
                        </Link>
                        <button
                          onClick={() => handleListingAction(
                            listing._id,
                            listing.status === 'active' ? 'paused' : 'active'
                          )}
                          className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                        >
                          {listing.status === 'active' ? <FaPause size={16} /> : <FaPlay size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-500">
                <FaBed className="mx-auto text-4xl text-gray-300 mb-3" />
                <p className="mb-4">{(t as any)?.emptyStates?.noListings || 'No listings yet'}</p>
                <Link
                  href="/host/listings/create"
                  className="inline-block px-6 py-3 bg-[#FF6B35] text-white rounded-lg hover:bg-[#ff8255] transition-colors"
                >
                  {(t as any)?.actions?.createFirstListing || 'Create Your First Listing'}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTab === 'bookings' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[600px] flex flex-col overflow-hidden">
          <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-purple-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FaClipboardCheck className="mr-2 text-purple-600" />
              {(t as any)?.sections?.allBookings?.title || 'All Bookings'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{(t as any)?.sections?.allBookings?.subtitle || 'View and manage all bookings'}</p>
          </div>
          
          {loadingBookings ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              <p className="ml-3 text-gray-600">Loading bookings...</p>
            </div>
          ) : (
            <div className="divide-y flex-1 overflow-y-auto">
              {filteredAllBookings?.length > 0 ? (
                filteredAllBookings.map((booking: any, index: number) => (
                  <div key={booking._id || index} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {booking.guest?.firstName || 'N/A'} {booking.guest?.lastName || ''}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">{booking.listing?.title || 'Listing N/A'}</p>
                        <p className="text-xs text-gray-500 flex items-center mt-2">
                          <FaCalendarAlt className="mr-1" />
                          {booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : 'N/A'} - {booking.checkOut ? new Date(booking.checkOut).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#FF6B35] text-lg">
                          {booking.pricing?.totalAmount || booking.totalPrice || 0} {(t as any)?.currency?.dzd || 'DZD'}
                        </p>
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full mt-2 ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          booking.status === 'active' ? 'bg-blue-100 text-blue-800' :
                          booking.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {booking.status === 'confirmed' ? ((t as any)?.bookings?.status?.confirmed || 'Confirmed') :
                           booking.status === 'pending' ? ((t as any)?.bookings?.status?.pending || 'Pending') :
                           booking.status === 'active' ? ((t as any)?.bookings?.status?.active || 'Active') :
                           booking.status === 'completed' ? ((t as any)?.bookings?.status?.completed || 'Completed') :
                           booking.status === 'cancelled' ? ((t as any)?.bookings?.status?.cancelled || 'Cancelled') :
                           booking.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <FaClipboardCheck className="mx-auto text-4xl text-gray-300 mb-3" />
                  <p>{(t as any)?.emptyStates?.noBookings || 'No bookings yet'}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedTab === 'reviews' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[600px] flex flex-col overflow-hidden">
          <div className="p-6 border-b bg-gradient-to-r from-yellow-50 to-yellow-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FaStar className="mr-2 text-yellow-600" />
              {(t as any)?.sections?.recentReviews?.title || 'Recent Reviews'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{(t as any)?.sections?.recentReviews?.subtitle || 'Latest guest feedback'}</p>
          </div>
          <div className="divide-y flex-1 overflow-y-auto">
            {recentReviews?.length > 0 ? (
              recentReviews.map((review: any, index: number) => (
                <div key={index} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 shadow-sm">
                      {review.reviewer?.avatar ? (
                        <img
                          src={review.reviewer.avatar}
                          alt={review.reviewer.firstName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-[#FF6B35] to-[#ff8255] text-white font-bold text-lg">
                          {review.reviewer?.firstName?.[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {review.reviewer?.firstName} {review.reviewer?.lastName}
                        </h4>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <FaStar
                              key={i}
                              className={i < review.rating ? 'text-yellow-400' : 'text-gray-200'}
                              size={14}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 font-medium mb-2">{review.listing?.title}</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-500">
                <FaStar className="mx-auto text-4xl text-gray-300 mb-3" />
                <p>{(t as any)?.emptyStates?.noReviews || 'No reviews yet'}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}