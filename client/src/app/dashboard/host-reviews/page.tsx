'use client';

import { useApp } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { FaStar, FaUser, FaHome, FaCalendar } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function HostReviewsPage() {
  const { state } = useApp();
  const user = state.user;
  const router = useRouter();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'host') {
      router.push('/dashboard');
      return;
    }
    fetchReviews();
  }, [user, router]);

  const fetchReviews = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch host's listings first
      const listingsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/listings/my-listings`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      const listingIds = (listingsResponse.data.data?.listings || []).map((l: any) => l._id);
      
      // Fetch reviews for all listings
      const reviewsPromises = listingIds.map((id: string) =>
        axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/listings/${id}/reviews`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        ).catch(() => ({ data: { data: { reviews: [] } } }))
      );
      
      const reviewsResponses = await Promise.all(reviewsPromises);
      const allReviews = reviewsResponses.flatMap(r => r.data.data?.reviews || r.data.reviews || []);
      
      setReviews(allReviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#FF6B35]"></div>
      </div>
    );
  }

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const ratingDistribution = {
    5: reviews.filter(r => r.rating === 5).length,
    4: reviews.filter(r => r.rating === 4).length,
    3: reviews.filter(r => r.rating === 3).length,
    2: reviews.filter(r => r.rating === 2).length,
    1: reviews.filter(r => r.rating === 1).length
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar
            key={star}
            className={star <= rating ? 'text-yellow-400' : 'text-gray-300'}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <span className="text-4xl mr-3">⭐</span>
          Avis Reçus
        </h1>
        <p className="text-gray-600 mt-2">
          Les avis laissés par vos voyageurs
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Average Rating */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Note Moyenne</h3>
          <div className="flex items-center">
            <div className="text-5xl font-bold text-[#FF6B35] mr-4">{averageRating}</div>
            <div>
              {renderStars(Math.round(parseFloat(averageRating)))}
              <p className="text-sm text-gray-600 mt-1">{reviews.length} avis</p>
            </div>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribution</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = ratingDistribution[rating as keyof typeof ratingDistribution];
              const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              
              return (
                <div key={rating} className="flex items-center">
                  <span className="text-sm font-medium text-gray-700 w-12">{rating} ⭐</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 mx-3">
                    <div
                      className="bg-[#FF6B35] h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {reviews.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FaStar className="mx-auto text-4xl text-gray-300 mb-3" />
            <p>Aucun avis pour le moment</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {reviews.map((review: any, index: number) => (
              <div key={review._id || index} className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    {review.reviewer?.avatar ? (
                      <img
                        src={review.reviewer.avatar}
                        alt={review.reviewer.firstName}
                        className="w-12 h-12 rounded-full object-cover mr-3"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                        <FaUser className="text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {review.reviewer?.firstName || 'Anonyme'} {review.reviewer?.lastName || ''}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString('fr-FR') : ''}
                      </p>
                    </div>
                  </div>
                  {renderStars(review.rating)}
                </div>

                {/* Listing Info */}
                {review.listing && (
                  <div className="flex items-center text-sm text-gray-600 mb-3">
                    <FaHome className="mr-2" />
                    <span>{review.listing.title}</span>
                  </div>
                )}

                {/* Review Text */}
                <p className="text-gray-700 leading-relaxed">{review.comment}</p>

                {/* Response if any */}
                {review.response && (
                  <div className="mt-4 pl-4 border-l-2 border-[#FF6B35]">
                    <p className="text-sm font-medium text-gray-900 mb-1">Votre réponse :</p>
                    <p className="text-sm text-gray-600">{review.response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}