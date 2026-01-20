'use client';

import { useState, useEffect } from 'react';
import {
  FaStar, FaRegStar, FaStarHalfAlt, FaFilter, FaReply, FaTrash,
  FaEdit, FaFlag, FaThumbsUp, FaChevronLeft, FaChevronRight,
  FaMapMarkerAlt, FaCalendarAlt, FaTimes, FaCheck, FaExclamationCircle,
  FaChartLine, FaComments, FaClock, FaUser, FaPen, FaBed, FaCar,
  FaCheckCircle, FaTimesCircle, FaInfoCircle, FaEye
} from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import moment from 'moment';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';

interface Review {
  _id: string;
  listing: {
    _id: string;
    title: string;
    category: string;
    images: { url: string }[];
    address: any;
  } | null; // ✅ AJOUTER | null ICI
  reviewer: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar: string;
  };
  reviewee: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar: string;
  };
  booking: {
    _id: string;
    startDate: string;
    endDate: string;
  };
  rating: {
    overall: number;
    cleanliness?: number;
    communication?: number;
    checkIn?: number;
    accuracy?: number;
    location?: number;
    value?: number;
  };
  title?: string;
  comment: string;
  response?: {
    comment: string;
    respondedAt: string;
  };
  status: string;
  createdAt: string;
  type: string;
}

interface Stats {
  summary: {
    totalReviews: number;
    publishedReviews: number;
    pendingReviews: number;
    averageRatingGiven?: number;
    averageRatingReceived?: number;
    reviewsWithResponse: number;
    responseRate: number;
  };
  detailedRatings?: {
    cleanliness: number;
    communication: number;
    checkIn: number;
    accuracy: number;
    location: number;
    value: number;
  };
  reviewsByRating: {
    [key: number]: number;
  };
  reviewsByCategory?: {
    [key: string]: number;
  };
  reviewsByListing?: {
    [key: string]: {
      title: string;
      count: number;
      avgRating: number;
    };
  };
}

export default function ReviewsPage() {
  const t = useTranslation('reviews');
  const { state } = useApp();
  const user = state.user;
  const [userRole, setUserRole] = useState<'guest' | 'host' | 'admin'>('guest');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('published');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    // ✅ FIX BQ-55: Get user role from context instead of localStorage
    if (!user) return;
    setUserRole(user.role || 'guest');
  }, [user]);

  useEffect(() => {
    // ✅ FIX BQ-55: Wait for user to be loaded before fetching data
    if (!user) return;

    fetchReviews();
    fetchStats();
  }, [user, userRole, ratingFilter, statusFilter, currentPage]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params: any = {
        page: currentPage,
        limit: 10,
        status: statusFilter
      };

      if (ratingFilter !== 'all') {
        params.minRating = parseInt(ratingFilter);
      }

      const endpoint = (userRole === 'host' || userRole === 'admin')
        ? '/reviews/host-reviews'
        : '/reviews/my-reviews';

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params
        }
      );

      setReviews(response.data.data.reviews);
      setTotalPages(response.data.pagination.pages);
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
      toast.error(error.response?.data?.message || (t as any).toast.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = (userRole === 'host' || userRole === 'admin')
        ? '/reviews/host-reviews/stats'
        : '/reviews/my-reviews/stats';

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleAddResponse = async () => {
    if (!selectedReview || !responseText.trim()) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/reviews/${selectedReview._id}/response`,
        { comment: responseText },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success((t as any).toast.responseSuccess);
      setShowResponseModal(false);
      setResponseText('');
      setSelectedReview(null);
      fetchReviews();
    } catch (error: any) {
      toast.error(error.response?.data?.message || (t as any).toast.responseFailed);
    }
  };

  const handleDeleteReview = async () => {
    if (!selectedReview) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/reviews/${selectedReview._id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success((t as any).toast.deleteSuccess);
      setShowDeleteModal(false);
      setSelectedReview(null);
      fetchReviews();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || (t as any).toast.deleteFailed);
    }
  };

  const renderStars = (rating: number, size: string = 'text-base') => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) {
        stars.push(<FaStar key={i} className={`${size} text-yellow-400`} />);
      } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
        stars.push(<FaStarHalfAlt key={i} className={`${size} text-yellow-400`} />);
      } else {
        stars.push(<FaRegStar key={i} className={`${size} text-gray-300`} />);
      }
    }
    return <div className="flex items-center space-x-0.5">{stars}</div>;
  };

  const formatDate = (date: string) => {
    return moment(date).format('MMM D, YYYY');
  };

  const formatTimeAgo = (date: string) => {
    return moment(date).fromNow();
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      'published': { bg: 'bg-green-100', text: 'text-green-800', icon: FaCheckCircle, label: (t as any).status.published },
      'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: FaClock, label: (t as any).status.pending },
      'hidden': { bg: 'bg-gray-100', text: 'text-gray-800', icon: FaTimesCircle, label: (t as any).status.hidden },
      'flagged': { bg: 'bg-red-100', text: 'text-red-800', icon: FaFlag, label: (t as any).status.flagged }
    };
    return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: FaExclamationCircle, label: status };
  };

  const isHost = userRole === 'host' || userRole === 'admin';

  // ✅ FIX BQ-55: Show loading while user or data is loading
  if (!user || (loading && reviews.length === 0)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-500">{(t as any).loading.reviews}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isHost ? (t as any).header.hostTitle : (t as any).header.guestTitle}
          </h1>
          <p className="text-gray-500 mt-1">
            {isHost ? (t as any).header.hostSubtitle : (t as any).header.guestSubtitle}
          </p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{(t as any).stats.totalReviews}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.summary.totalReviews}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <FaComments className="text-blue-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{(t as any).stats.averageRating}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {(isHost ? stats.summary.averageRatingReceived : stats.summary.averageRatingGiven)?.toFixed(1) || '0.0'}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <FaStar className="text-yellow-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{(t as any).stats.responseRate}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.summary.responseRate}%</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <FaReply className="text-green-600 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{(t as any).stats.published}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.summary.publishedReviews}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <FaCheckCircle className="text-purple-600 text-xl" />
              </div>
            </div>
          </div>
        </div>
      )}

      {isHost && stats?.detailedRatings && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{(t as any).detailedRatings.title}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(stats.detailedRatings).map(([key, value]) => {
              const ratingLabel = (t as any).detailedRatings[key];
              return (
                <div key={key} className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{ratingLabel}</span>
                    <span className="text-sm font-bold text-gray-900">{value.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center">
                    {renderStars(value, 'text-sm')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center space-x-4">
          <FaFilter className="text-gray-400 text-lg" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={ratingFilter}
              onChange={(e) => {
                setRatingFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all"
            >
              <option value="all">{(t as any).filters.rating.all}</option>
              <option value="5">{(t as any).filters.rating['5stars']}</option>
              <option value="4">{(t as any).filters.rating['4plus']}</option>
              <option value="3">{(t as any).filters.rating['3plus']}</option>
              <option value="2">{(t as any).filters.rating['2plus']}</option>
              <option value="1">{(t as any).filters.rating['1plus']}</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all"
            >
              <option value="published">{(t as any).filters.status.published}</option>
              <option value="pending">{(t as any).filters.status.pending}</option>
              <option value="all">{(t as any).filters.status.all}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {reviews.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-yellow-100 mb-4">
              <FaComments className="text-[#FF6B35] text-3xl" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{(t as any).emptyState.title}</h3>
            <p className="text-gray-500 mb-6">
              {isHost
                ? (t as any).emptyState.hostMessage
                : (t as any).emptyState.guestMessage}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-[#FF6B35] to-[#ff8255] text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any).table.headers.listing}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{isHost ? (t as any).table.headers.reviewer : (t as any).table.headers.reviewee}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any).table.headers.rating}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any).table.headers.review}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any).table.headers.date}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any).table.headers.status}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">{(t as any).table.headers.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reviews.map((review) => {
                  const statusBadge = getStatusBadge(review.status);
                  const canRespond = isHost && !review.response;
                  const canDelete = !isHost;
                  const person = isHost ? review.reviewer : review.reviewee;

                  return (
                    <tr key={review._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        {!review.listing ? (
                          <div className="text-sm text-red-600 font-medium">
                            Listing Deleted
                          </div>
                        ) : (
                        <div className="flex items-center space-x-3">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 shadow-sm">
                            {review.listing.images?.[0] ? (
                              <img
                                src={review.listing.images[0].url}
                                alt={review.listing.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                {review.listing?.category === 'vehicle' ? (
                                  <FaCar size={24} />
                                ) : (
                                  <FaBed size={24} />
                                )}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/listing/${review.listing._id}`}
                              className="font-semibold text-gray-900 hover:text-[#FF6B35] transition-colors block truncate"
                            >
                              {review.listing.title}
                            </Link>
                            {review.listing.address && (
                              <p className="text-sm text-gray-500 flex items-center mt-1">
                                <FaMapMarkerAlt className="mr-1 flex-shrink-0" />
                                <span className="truncate">{review.listing.address.city}, {review.listing.address.country}</span>
                              </p>
                            )}
                          </div>
                        </div>
                                                )}  {/* ✅ AJOUTER CETTE LIGNE */}

                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-orange-200 to-yellow-200 flex-shrink-0">
                            {person.avatar ? (
                              <img
                                src={person.avatar}
                                alt={person.firstName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#FF6B35] font-bold text-sm">
                                {person.firstName[0]}{person.lastName[0]}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {person.firstName} {person.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{formatTimeAgo(review.createdAt)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {renderStars(review.rating.overall, 'text-sm')}
                          <span className="text-sm font-bold text-gray-900">{review.rating.overall.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="text-sm text-gray-700 line-clamp-2">{review.comment}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <FaCalendarAlt className="mr-1.5 text-[#FF6B35] flex-shrink-0" />
                          {formatDate(review.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const StatusIcon = statusBadge.icon;
                          return (
                            <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                              <StatusIcon className="mr-1" />
                              {statusBadge.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedReview(review);
                              setShowDetailsModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={(t as any).actions.viewDetails}
                          >
                            <FaEye size={16} />
                          </button>

                          {canRespond && (
                            <button
                              onClick={() => {
                                setSelectedReview(review);
                                setShowResponseModal(true);
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title={(t as any).actions.respond}
                            >
                              <FaReply size={16} />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => {
                                setSelectedReview(review);
                                setShowDeleteModal(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={(t as any).actions.delete}
                            >
                              <FaTrash size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FaChevronLeft />
          </button>
          <span className="text-gray-700 font-medium">
            {(t as any).pagination.page} {currentPage} {(t as any).pagination.of} {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FaChevronRight />
          </button>
        </div>
      )}

      {showDetailsModal && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-[#FF6B35] to-[#ff8255] text-white p-6 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">{(t as any).detailsModal.title}</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {selectedReview.listing ? (
                <div className="flex items-start space-x-4">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 shadow-md flex-shrink-0">
                    {selectedReview.listing?.images?.[0] && (
                      <img
                        src={selectedReview.listing.images[0].url}
                        alt={selectedReview.listing.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{selectedReview.listing.title}</h4>
                    <div className="flex items-center space-x-3 mb-2">
                      {renderStars(selectedReview.rating.overall, 'text-lg')}
                      <span className="text-xl font-bold text-gray-900">{selectedReview.rating.overall.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-red-600 font-medium">Listing Deleted</div>
              )}

              {selectedReview.title && (
                <div>
                  <h5 className="font-bold text-gray-900 mb-2">{(t as any).detailsModal.titleLabel}</h5>
                  <p className="text-gray-700">{selectedReview.title}</p>
                </div>
              )}

              <div>
                <h5 className="font-bold text-gray-900 mb-2">{(t as any).detailsModal.commentLabel}</h5>
                <p className="text-gray-700 leading-relaxed">{selectedReview.comment}</p>
              </div>

              {(selectedReview.rating.cleanliness || selectedReview.rating.communication) && (
                <div>
                  <h5 className="font-bold text-gray-900 mb-4">{(t as any).detailsModal.detailedRatingsLabel}</h5>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedReview.rating.cleanliness && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">{(t as any).detailedRatings.cleanliness}</p>
                        {renderStars(selectedReview.rating.cleanliness, 'text-sm')}
                      </div>
                    )}
                    {selectedReview.rating.communication && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">{(t as any).detailedRatings.communication}</p>
                        {renderStars(selectedReview.rating.communication, 'text-sm')}
                      </div>
                    )}
                    {selectedReview.rating.checkIn && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">{(t as any).detailedRatings.checkIn}</p>
                        {renderStars(selectedReview.rating.checkIn, 'text-sm')}
                      </div>
                    )}
                    {selectedReview.rating.accuracy && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">{(t as any).detailedRatings.accuracy}</p>
                        {renderStars(selectedReview.rating.accuracy, 'text-sm')}
                      </div>
                    )}
                    {selectedReview.rating.location && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">{(t as any).detailedRatings.location}</p>
                        {renderStars(selectedReview.rating.location, 'text-sm')}
                      </div>
                    )}
                    {selectedReview.rating.value && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">{(t as any).detailedRatings.value}</p>
                        {renderStars(selectedReview.rating.value, 'text-sm')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedReview.response && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <FaReply className="text-blue-600 mr-2" />
                    <span className="font-semibold text-blue-900">{(t as any).detailsModal.hostResponse}</span>
                    <span className="text-xs text-blue-600 ml-2">
                      {formatTimeAgo(selectedReview.response.respondedAt)}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm">{selectedReview.response.comment}</p>
                </div>
              )}

              <div className="flex items-center text-sm text-gray-500">
                <FaCalendarAlt className="mr-2" />
                <span>{(t as any).detailsModal.reviewedOn} {formatDate(selectedReview.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResponseModal && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">{(t as any).responseModal.title}</h3>
              <button
                onClick={() => {
                  setShowResponseModal(false);
                  setResponseText('');
                  setSelectedReview(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              {(t as any).responseModal.instructionPrefix} <span className="font-semibold">{selectedReview.reviewer.firstName}</span>{(t as any).responseModal.instructionSuffix}
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {(t as any).responseModal.label}
              </label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder={(t as any).responseModal.placeholder}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{responseText.length}/500 {(t as any).responseModal.characterCount}</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowResponseModal(false);
                  setResponseText('');
                  setSelectedReview(null);
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                {(t as any).responseModal.cancel}
              </button>
              <button
                onClick={handleAddResponse}
                disabled={!responseText.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-[#FF6B35] to-[#ff8255] text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(t as any).responseModal.submit}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">{(t as any).deleteModal.title}</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedReview(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              {(t as any).deleteModal.confirmPrefix}{' '}
              <span className="font-semibold">{selectedReview.listing?.title || 'Deleted Listing'}</span>{(t as any).deleteModal.confirmSuffix}
            </p>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedReview(null);
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                {(t as any).deleteModal.cancel}
              </button>
              <button
                onClick={handleDeleteReview}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
              >
                {(t as any).deleteModal.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
