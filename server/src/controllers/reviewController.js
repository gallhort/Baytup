const Review = require('../models/Review');
const Listing = require('../models/Listing');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Notification = require('../models/Notification');
const moderationService = require('../services/moderationService');
const { sendReviewReceivedEmail } = require('../utils/emailService');

// @desc    Get all reviews
// @route   GET /api/reviews
// @access  Public
const getReviews = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      listing,
      reviewer,
      reviewee,
      status = 'published',
      minRating,
      sort = '-createdAt'
    } = req.query;

    // Build query
    let query = {};

    if (listing) {
      query.listing = listing;
    }

    if (reviewer) {
      query.reviewer = reviewer;
    }

    if (reviewee) {
      query.reviewee = reviewee;
    }

    if (status) {
      query.status = status;
    }

    if (minRating) {
      query['rating.overall'] = { $gte: parseFloat(minRating) };
    }

    // Execute query with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sort,
      populate: [
        {
          path: 'reviewer',
          select: 'firstName lastName avatar'
        },
        {
          path: 'reviewee',
          select: 'firstName lastName avatar'
        },
        {
          path: 'listing',
          select: 'title category images'
        }
      ]
    };

    const reviews = await Review.paginate(query, options);

    res.status(200).json({
      status: 'success',
      results: reviews.docs.length,
      pagination: {
        page: reviews.page,
        pages: reviews.totalPages,
        total: reviews.totalDocs,
        limit: reviews.limit,
        hasNext: reviews.hasNextPage,
        hasPrev: reviews.hasPrevPage
      },
      data: {
        reviews: reviews.docs
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single review
// @route   GET /api/reviews/:id
// @access  Public
const getReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('reviewer', 'firstName lastName avatar')
      .populate('reviewee', 'firstName lastName avatar')
      .populate('listing', 'title category images');

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        review
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new review
// @route   POST /api/reviews
// @access  Private
const createReview = async (req, res, next) => {
  try {
    const {
      listing: listingId,
      booking: bookingId,
      reviewee: revieweeId,
      type,
      rating,
      title,
      comment,
      photos
    } = req.body;

    // Verify booking exists and belongs to user
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Check if user is authorized to create review
    const isGuest = booking.guest.toString() === req.user.id && type === 'guest_to_host';
    const isHost = booking.host.toString() === req.user.id && type === 'host_to_guest';

    if (!isGuest && !isHost) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to create this review'
      });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Can only review completed bookings'
      });
    }

    // Check if stay has actually ended
    if (new Date(booking.endDate) > new Date()) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot review before the stay has ended'
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      booking: bookingId,
      reviewer: req.user.id,
      type
    });

    if (existingReview) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already reviewed this booking'
      });
    }

    // ✅ NEW: Check content moderation (title + comment)
    const contentToCheck = `${title || ''} ${comment}`.trim();
    const moderation = await moderationService.checkContent(contentToCheck, 'review', {
      userId: req.user.id,
      metadata: { bookingId, listingId, revieweeId }
    });

    // If blocked, prevent review from being created
    if (moderation.action === 'block') {
      return res.status(400).json({
        status: 'error',
        message: moderation.message || 'Votre avis contient du contenu inapproprié et ne peut être publié'
      });
    }

    // Prepare moderation data if flagged
    let moderationData = {};
    if (moderation.action === 'flag') {
      moderationData = {
        flagged: true,
        moderationFlags: moderation.flags,
        moderationScore: moderation.totalScore,
        flagReason: 'spam'
      };
    }

    // ✅ NEW: Check if the other party has already left a review (double-blind system)
    const pairedReview = await Review.findPairedReview(bookingId, type);

    // Create review with waiting_pair status
    const review = await Review.create({
      listing: listingId,
      booking: bookingId,
      reviewer: req.user.id,
      reviewee: revieweeId,
      type,
      rating,
      title,
      comment,
      photos,
      ...moderationData
      // status and blindStatus are set by pre-save hook
    });

    // ✅ NEW: If paired review exists, publish both simultaneously
    let bothPublished = false;
    if (pairedReview) {
      console.log(`📊 Paired review found for booking ${bookingId} - publishing both reviews`);

      // Link the reviews
      review.pairedReview = pairedReview._id;
      pairedReview.pairedReview = review._id;
      await pairedReview.save({ validateBeforeSave: false });
      await review.save({ validateBeforeSave: false });

      // Publish both reviews simultaneously
      await Review.publishPair(review._id, pairedReview._id);
      bothPublished = true;

      // Reload the review with updated status
      await review.populate([
        { path: 'reviewer', select: 'firstName lastName avatar' },
        { path: 'reviewee', select: 'firstName lastName avatar' },
        { path: 'listing', select: 'title category' }
      ]);
    } else {
      // Populate the review (still in waiting_pair status)
      await review.populate([
        { path: 'reviewer', select: 'firstName lastName avatar' },
        { path: 'reviewee', select: 'firstName lastName avatar' },
        { path: 'listing', select: 'title category' }
      ]);
    }

    // Create notification for reviewee
    try {
      if (bothPublished) {
        // ✅ Notify both parties that reviews are now visible
        await Notification.createNotification({
          recipient: revieweeId,
          sender: req.user.id,
          type: 'review_revealed',
          title: 'Les avis sont maintenant visibles! ⭐',
          message: `Les deux avis ont été publiés. Vous pouvez maintenant voir l'avis de ${review.reviewer.firstName}${review.type === 'guest_to_host' ? ` pour "${review.listing.title}"` : ''}.`,
          data: {
            reviewId: review._id,
            rating: review.rating.overall,
            reviewerName: `${review.reviewer.firstName} ${review.reviewer.lastName}`,
            reviewType: type,
            listingTitle: review.listing?.title,
            doubleBlind: true
          },
          link: type === 'guest_to_host' ? `/dashboard/host/reviews` : `/dashboard/reviews`,
          priority: 'normal'
        });

        // Notify the other reviewer too
        await Notification.createNotification({
          recipient: pairedReview.reviewer,
          sender: req.user.id,
          type: 'review_revealed',
          title: 'Les avis sont maintenant visibles! ⭐',
          message: `L'autre partie a aussi laissé un avis. Vous pouvez maintenant voir les deux avis.`,
          data: {
            reviewId: pairedReview._id,
            doubleBlind: true
          },
          link: pairedReview.type === 'guest_to_host' ? `/dashboard/reviews` : `/dashboard/host/reviews`,
          priority: 'normal'
        });

        // Send email notification to reviewee
        const revieweeUser = await User.findById(revieweeId);
        await sendReviewReceivedEmail(revieweeUser, review);
      } else {
        // ✅ Notify that review is submitted but waiting for the other party
        await Notification.createNotification({
          recipient: revieweeId,
          sender: req.user.id,
          type: 'review_pending_pair',
          title: 'Un avis vous attend! ⏳',
          message: `${review.reviewer.firstName} a laissé un avis. Il sera visible une fois que vous aurez aussi laissé le vôtre (ou dans 14 jours).`,
          data: {
            reviewId: review._id,
            reviewerName: `${review.reviewer.firstName} ${review.reviewer.lastName}`,
            reviewType: type,
            listingTitle: review.listing?.title,
            doubleBlind: true,
            autoPublishAt: review.autoPublishAt
          },
          link: type === 'guest_to_host' ? `/dashboard/host/reviews` : `/dashboard/reviews`,
          priority: 'normal'
        });
      }
    } catch (notificationError) {
      console.error('Error creating review notification:', notificationError);
    }

    res.status(201).json({
      status: 'success',
      data: {
        review,
        doubleBlind: {
          status: bothPublished ? 'published' : 'waiting_pair',
          message: bothPublished
            ? 'Les deux avis sont maintenant visibles!'
            : 'Votre avis sera visible une fois que l\'autre partie aura aussi laissé son avis (ou dans 14 jours).',
          autoPublishAt: review.autoPublishAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
const updateReview = async (req, res, next) => {
  try {
    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    // Check ownership
    if (review.reviewer.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this review'
      });
    }

    // Only allow updating certain fields
    const allowedUpdates = ['rating', 'title', 'comment', 'photos'];
    const updates = {};

    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Check content moderation if title or comment is being updated
    if (updates.title || updates.comment) {
      const contentToCheck = `${updates.title || review.title || ''} ${updates.comment || review.comment}`.trim();
      const moderation = await moderationService.checkContent(contentToCheck, 'review', {
        userId: req.user.id,
        metadata: {
          reviewId: req.params.id,
          bookingId: review.booking,
          listingId: review.listing
        }
      });

      // If blocked, prevent update
      if (moderation.action === 'block') {
        return res.status(400).json({
          status: 'error',
          message: moderation.message || 'Votre avis contient du contenu inapproprié et ne peut être publié'
        });
      }

      // Update moderation flags if content is flagged
      if (moderation.action === 'flag') {
        updates.flagged = true;
        updates.moderationFlags = moderation.flags;
        updates.moderationScore = moderation.totalScore;
        updates.flagReason = 'spam';
      } else {
        // Clear flags if content is now clean
        updates.flagged = false;
        updates.moderationFlags = [];
        updates.moderationScore = 0;
        updates.flagReason = undefined;
      }
    }

    // Mark as edited
    updates.edited = true;
    updates.editedAt = new Date();
    updates.originalContent = review.comment;

    review = await Review.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate([
      { path: 'reviewer', select: 'firstName lastName avatar' },
      { path: 'reviewee', select: 'firstName lastName avatar' },
      { path: 'listing', select: 'title category' }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        review
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    // Check ownership or admin
    if (review.reviewer.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this review'
      });
    }

    await review.deleteOne();

    // Update listing stats
    const listing = await Listing.findById(review.listing);
    if (listing) {
      await listing.updateStats();
    }

    res.status(200).json({
      status: 'success',
      message: 'Review deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add response to review
// @route   POST /api/reviews/:id/response
// @access  Private
const addResponse = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    // Check if user is the reviewee
    if (review.reviewee.toString() !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the reviewee can respond to this review'
      });
    }

    // Check if response already exists
    if (review.response && review.response.comment) {
      return res.status(400).json({
        status: 'error',
        message: 'Response already exists for this review'
      });
    }

    review.response = {
      comment: req.body.comment,
      respondedAt: new Date()
    };

    await review.save();

    // Populate reviewer info for notification
    await review.populate([
      { path: 'reviewer', select: 'firstName lastName' },
      { path: 'reviewee', select: 'firstName lastName' },
      { path: 'listing', select: 'title' }
    ]);

    // Create notification for reviewer
    try {
      await Notification.createNotification({
        recipient: review.reviewer._id,
        sender: req.user.id,
        type: 'review_response',
        title: 'Response to Your Review! 💬',
        message: `${review.reviewee.firstName} ${review.reviewee.lastName} responded to your review${review.listing ? ` for "${review.listing.title}"` : ''}.`,
        data: {
          reviewId: review._id,
          responseComment: req.body.comment,
          responderName: `${review.reviewee.firstName} ${review.reviewee.lastName}`,
          listingTitle: review.listing?.title
        },
        link: review.type === 'guest_to_host' ? `/dashboard/reviews` : `/dashboard/host/reviews`,
        priority: 'normal'
      });
    } catch (notificationError) {
      console.error('Error creating review response notification:', notificationError);
    }

    res.status(200).json({
      status: 'success',
      data: {
        review
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark review as helpful
// @route   POST /api/reviews/:id/helpful
// @access  Private
const markHelpful = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    await review.markHelpful(req.user.id);

    res.status(200).json({
      status: 'success',
      data: {
        helpful: {
          count: review.helpful.count,
          isHelpful: review.helpful.users.includes(req.user.id)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get listing review stats
// @route   GET /api/reviews/listing/:listingId/stats
// @access  Public
const getListingStats = async (req, res, next) => {
  try {
    const stats = await Review.getListingStats(req.params.listingId);

    res.status(200).json({
      status: 'success',
      data: {
        stats
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Flag review
// @route   POST /api/reviews/:id/flag
// @access  Private
const flagReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    review.flagged = true;
    review.flagReason = req.body.reason || 'other';
    review.status = 'flagged';

    await review.save();

    res.status(200).json({
      status: 'success',
      message: 'Review flagged successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get guest's reviews
// @route   GET /api/reviews/my-reviews
// @access  Private
const getMyReviews = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      status,
      minRating
    } = req.query;

    // Build query for reviews created by the logged-in user
    // Support both guest_to_host and host_to_guest reviews
    let query = {
      reviewer: req.user.id
    };

    // Don't filter by type - show all reviews written by this user
    // This allows both guests and hosts to see their written reviews

    if (status) {
      query.status = status;
    }

    if (minRating) {
      query['rating.overall'] = { $gte: parseFloat(minRating) };
    }

    // Execute query with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sort,
      populate: [
        {
          path: 'reviewee',
          select: 'firstName lastName avatar hostInfo'
        },
        {
          path: 'listing',
          select: 'title category subcategory images address pricing'
        },
        {
          path: 'booking',
          select: 'startDate endDate status'
        }
      ]
    };

    const reviews = await Review.paginate(query, options);

    res.status(200).json({
      status: 'success',
      results: reviews.docs.length,
      pagination: {
        page: reviews.page,
        pages: reviews.totalPages,
        total: reviews.totalDocs,
        limit: reviews.limit,
        hasNext: reviews.hasNextPage,
        hasPrev: reviews.hasPrevPage
      },
      data: {
        reviews: reviews.docs
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's review statistics
// @route   GET /api/reviews/my-reviews/stats
// @access  Private
const getMyReviewStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all reviews by this user (both guest_to_host and host_to_guest)
    const allReviews = await Review.find({
      reviewer: userId
    }).populate('listing', 'category');

    // Calculate statistics
    const totalReviews = allReviews.length;
    const publishedReviews = allReviews.filter(r => r.status === 'published').length;
    const pendingReviews = allReviews.filter(r => r.status === 'pending').length;

    // Average ratings given
    const averageRatingGiven = totalReviews > 0
      ? allReviews.reduce((sum, r) => sum + r.rating.overall, 0) / totalReviews
      : 0;

    // Reviews by rating
    const reviewsByRating = {
      5: allReviews.filter(r => r.rating.overall === 5).length,
      4: allReviews.filter(r => r.rating.overall === 4).length,
      3: allReviews.filter(r => r.rating.overall === 3).length,
      2: allReviews.filter(r => r.rating.overall === 2).length,
      1: allReviews.filter(r => r.rating.overall === 1).length
    };

    // Reviews with responses
    const reviewsWithResponse = allReviews.filter(r => r.response && r.response.comment).length;

    // Reviews by category
    const reviewsByCategory = allReviews.reduce((acc, review) => {
      const category = review.listing?.category || 'unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    // Recent reviews (last 5)
    const recentReviews = await Review.find({
      reviewer: userId,
      status: 'published'
    })
      .sort('-createdAt')
      .limit(5)
      .populate('listing', 'title images')
      .populate('reviewee', 'firstName lastName avatar')
      .lean();

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalReviews,
          publishedReviews,
          pendingReviews,
          averageRatingGiven: Math.round(averageRatingGiven * 10) / 10,
          reviewsWithResponse,
          responseRate: totalReviews > 0 ? Math.round((reviewsWithResponse / totalReviews) * 100) : 0
        },
        reviewsByRating,
        reviewsByCategory,
        recentReviews
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending reviews for guest (bookings without reviews)
// @route   GET /api/reviews/pending-to-write
// @access  Private
const getPendingReviews = async (req, res, next) => {
  try {
    const guestId = req.user.id;

    // Find completed bookings
    const completedBookings = await Booking.find({
      guest: guestId,
      status: 'completed',
      endDate: { $lt: new Date() }
    })
      .populate('listing', 'title category images address')
      .populate('host', 'firstName lastName avatar')
      .sort('-endDate')
      .lean();

    // Find reviews already written
    const existingReviews = await Review.find({
      reviewer: guestId,
      type: 'guest_to_host'
    }).select('booking');

    const reviewedBookingIds = new Set(
      existingReviews.map(r => r.booking.toString())
    );

    // Filter out bookings that already have reviews
    const pendingReviews = completedBookings.filter(
      booking => !reviewedBookingIds.has(booking._id.toString())
    );

    res.status(200).json({
      status: 'success',
      results: pendingReviews.length,
      data: {
        bookings: pendingReviews
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get host's reviews (reviews about their listings)
// @route   GET /api/reviews/host-reviews
// @access  Private (Host)
const getHostReviews = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      status,
      minRating,
      listingId
    } = req.query;

    const hostId = req.user.id;

    // Build query for reviews about host
    let query = {
      reviewee: hostId,
      type: 'guest_to_host',
      status: status || 'published'
    };

    if (minRating) {
      query['rating.overall'] = { $gte: parseFloat(minRating) };
    }

    if (listingId) {
      query.listing = listingId;
    }

    // Execute query with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sort,
      populate: [
        {
          path: 'reviewer',
          select: 'firstName lastName avatar'
        },
        {
          path: 'listing',
          select: 'title category subcategory images address pricing'
        },
        {
          path: 'booking',
          select: 'startDate endDate status'
        }
      ]
    };

    const reviews = await Review.paginate(query, options);

    res.status(200).json({
      status: 'success',
      results: reviews.docs.length,
      pagination: {
        page: reviews.page,
        pages: reviews.totalPages,
        total: reviews.totalDocs,
        limit: reviews.limit,
        hasNext: reviews.hasNextPage,
        hasPrev: reviews.hasPrevPage
      },
      data: {
        reviews: reviews.docs
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get host's review statistics
// @route   GET /api/reviews/host-reviews/stats
// @access  Private (Host)
const getHostReviewStats = async (req, res, next) => {
  try {
    const hostId = req.user.id;

    // Get all reviews about host
    const allReviews = await Review.find({
      reviewee: hostId,
      type: 'guest_to_host'
    }).populate('listing', 'category title');

    // Calculate statistics
    const totalReviews = allReviews.length;
    const publishedReviews = allReviews.filter(r => r.status === 'published').length;
    const pendingReviews = allReviews.filter(r => r.status === 'pending').length;

    // Average rating received
    const averageRatingReceived = totalReviews > 0
      ? allReviews.reduce((sum, r) => sum + r.rating.overall, 0) / totalReviews
      : 0;

    // Average detailed ratings
    const avgCleanliness = totalReviews > 0
      ? allReviews.reduce((sum, r) => sum + (r.rating.cleanliness || 0), 0) / totalReviews
      : 0;
    const avgCommunication = totalReviews > 0
      ? allReviews.reduce((sum, r) => sum + (r.rating.communication || 0), 0) / totalReviews
      : 0;
    const avgCheckIn = totalReviews > 0
      ? allReviews.reduce((sum, r) => sum + (r.rating.checkIn || 0), 0) / totalReviews
      : 0;
    const avgAccuracy = totalReviews > 0
      ? allReviews.reduce((sum, r) => sum + (r.rating.accuracy || 0), 0) / totalReviews
      : 0;
    const avgLocation = totalReviews > 0
      ? allReviews.reduce((sum, r) => sum + (r.rating.location || 0), 0) / totalReviews
      : 0;
    const avgValue = totalReviews > 0
      ? allReviews.reduce((sum, r) => sum + (r.rating.value || 0), 0) / totalReviews
      : 0;

    // Reviews by rating
    const reviewsByRating = {
      5: allReviews.filter(r => r.rating.overall === 5).length,
      4: allReviews.filter(r => r.rating.overall === 4).length,
      3: allReviews.filter(r => r.rating.overall === 3).length,
      2: allReviews.filter(r => r.rating.overall === 2).length,
      1: allReviews.filter(r => r.rating.overall === 1).length
    };

    // Reviews with responses
    const reviewsWithResponse = allReviews.filter(r => r.response && r.response.comment).length;

    // Reviews by listing
    const reviewsByListing = allReviews.reduce((acc, review) => {
      const listingId = review.listing?._id.toString();
      const listingTitle = review.listing?.title || 'Unknown';
      if (!acc[listingId]) {
        acc[listingId] = {
          title: listingTitle,
          count: 0,
          avgRating: 0,
          ratings: []
        };
      }
      acc[listingId].count++;
      acc[listingId].ratings.push(review.rating.overall);
      return acc;
    }, {});

    // Calculate average rating per listing
    Object.keys(reviewsByListing).forEach(listingId => {
      const listing = reviewsByListing[listingId];
      listing.avgRating = Math.round(
        (listing.ratings.reduce((sum, r) => sum + r, 0) / listing.ratings.length) * 10
      ) / 10;
      delete listing.ratings;
    });

    // Recent reviews (last 5)
    const recentReviews = await Review.find({
      reviewee: hostId,
      type: 'guest_to_host',
      status: 'published'
    })
      .sort('-createdAt')
      .limit(5)
      .populate('listing', 'title images')
      .populate('reviewer', 'firstName lastName avatar')
      .lean();

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalReviews,
          publishedReviews,
          pendingReviews,
          averageRatingReceived: Math.round(averageRatingReceived * 10) / 10,
          reviewsWithResponse,
          responseRate: totalReviews > 0 ? Math.round((reviewsWithResponse / totalReviews) * 100) : 0
        },
        detailedRatings: {
          cleanliness: Math.round(avgCleanliness * 10) / 10,
          communication: Math.round(avgCommunication * 10) / 10,
          checkIn: Math.round(avgCheckIn * 10) / 10,
          accuracy: Math.round(avgAccuracy * 10) / 10,
          location: Math.round(avgLocation * 10) / 10,
          value: Math.round(avgValue * 10) / 10
        },
        reviewsByRating,
        reviewsByListing,
        recentReviews
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending reviews for host to write (guest reviews)
// @route   GET /api/reviews/host-pending-to-write
// @access  Private (Host)
const getHostPendingReviews = async (req, res, next) => {
  try {
    const hostId = req.user.id;

    // Find completed bookings where user is host
    const completedBookings = await Booking.find({
      host: hostId,
      status: 'completed',
      endDate: { $lt: new Date() }
    })
      .populate('listing', 'title category images address')
      .populate('guest', 'firstName lastName avatar')
      .sort('-endDate')
      .lean();

    // Find reviews already written by host
    const existingReviews = await Review.find({
      reviewer: hostId,
      type: 'host_to_guest'
    }).select('booking');

    const reviewedBookingIds = new Set(
      existingReviews.map(r => r.booking.toString())
    );

    // Filter out bookings that already have reviews
    const pendingReviews = completedBookings.filter(
      booking => !reviewedBookingIds.has(booking._id.toString())
    );

    res.status(200).json({
      status: 'success',
      results: pendingReviews.length,
      data: {
        bookings: pendingReviews
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload review photos
// @route   POST /api/reviews/upload-photos
// @access  Private
const uploadPhotos = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No files uploaded'
      });
    }

    const photoUrls = req.files.map(file => ({
      url: `/uploads/reviews/${file.filename}`,
      caption: ''
    }));

    res.status(200).json({
      status: 'success',
      data: {
        photos: photoUrls
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
  addResponse,
  markHelpful,
  getListingStats,
  flagReview,
  getMyReviews,
  getMyReviewStats,
  getPendingReviews,
  getHostReviews,
  getHostReviewStats,
  getHostPendingReviews,
  uploadPhotos
};
