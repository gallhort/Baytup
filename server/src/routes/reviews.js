const express = require('express');
const {
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
  getHostPendingReviews
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getReviews);
router.get('/listing/:listingId/stats', getListingStats);

// Protected routes
router.use(protect); // All routes below this require authentication

// Host's review management routes (must be before other routes)
router.get('/host-reviews/stats', getHostReviewStats);
router.get('/host-reviews', getHostReviews);
router.get('/host-pending-to-write', getHostPendingReviews);

// Guest's review management routes (must be before /:id route)
router.get('/my-reviews/stats', getMyReviewStats);
router.get('/my-reviews', getMyReviews);
router.get('/pending-to-write', getPendingReviews);

// Single review routes
router.get('/:id', getReview);
router.post('/', createReview);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);
router.post('/:id/response', addResponse);
router.post('/:id/helpful', markHelpful);
router.post('/:id/flag', flagReview);

module.exports = router;
