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
  getHostPendingReviews,
  uploadPhotos
} = require('../controllers/reviewController');
const { uploadReviewPhotos, handleUploadError, validateFileContent } = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const {
  createReviewValidation,
  updateReviewValidation,
  reviewResponseValidation,
  flagReviewValidation,
  mongoIdValidation,
  validate
} = require('../utils/validation');
const { param } = require('express-validator');

const router = express.Router();

// Listing ID validation
const listingIdValidation = [
  param('listingId')
    .isMongoId()
    .withMessage('Invalid listing ID format')
];

// Public routes
router.get('/', getReviews);
router.get('/listing/:listingId/stats', listingIdValidation, validate, getListingStats);

// Protected routes
router.use(protect); // All routes below this require authentication

// Photo upload for reviews (max 5 photos, must be before /:id routes)
router.post('/upload-photos', uploadReviewPhotos.array('photos', 5), handleUploadError, validateFileContent, uploadPhotos);

// Host's review management routes (must be before other routes)
router.get('/host-reviews/stats', getHostReviewStats);
router.get('/host-reviews', getHostReviews);
router.get('/host-pending-to-write', getHostPendingReviews);

// Guest's review management routes (must be before /:id route)
router.get('/my-reviews/stats', getMyReviewStats);
router.get('/my-reviews', getMyReviews);
router.get('/pending-to-write', getPendingReviews);

// Single review routes
router.get('/:id', mongoIdValidation, validate, getReview);
router.post('/', createReviewValidation, validate, createReview);
router.put('/:id', mongoIdValidation, updateReviewValidation, validate, updateReview);
router.delete('/:id', mongoIdValidation, validate, deleteReview);
router.post('/:id/response', mongoIdValidation, reviewResponseValidation, validate, addResponse);
router.post('/:id/helpful', mongoIdValidation, validate, markHelpful);
router.post('/:id/flag', mongoIdValidation, flagReviewValidation, validate, flagReview);

module.exports = router;
