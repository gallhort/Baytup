const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');

const {
  // Public routes
  getFAQs,
  getFAQsGrouped,
  getFeaturedFAQs,
  getFAQ,
  voteFAQ,
  getCategories,
  // Admin routes
  adminGetFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  reorderFAQs,
  getFAQStats
} = require('../controllers/faqController');

// Validation middleware
const faqValidation = [
  body('question.fr')
    .notEmpty()
    .withMessage('Question (FR) is required')
    .isLength({ max: 500 })
    .withMessage('Question cannot exceed 500 characters'),
  body('answer.fr')
    .notEmpty()
    .withMessage('Answer (FR) is required')
    .isLength({ max: 5000 })
    .withMessage('Answer cannot exceed 5000 characters'),
  body('category')
    .optional()
    .isIn(['general', 'booking', 'payment', 'cancellation', 'host', 'guest', 'account', 'security', 'listing', 'reviews', 'support', 'legal'])
    .withMessage('Invalid category'),
  body('audience')
    .optional()
    .isIn(['all', 'guest', 'host'])
    .withMessage('Invalid audience'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status')
];

// ==================== PUBLIC ROUTES ====================

// Get FAQs (with filtering, search)
router.get('/', getFAQs);

// Get FAQs grouped by category
router.get('/grouped', getFAQsGrouped);

// Get featured FAQs
router.get('/featured', getFeaturedFAQs);

// Get FAQ categories with counts
router.get('/categories', getCategories);

// Get single FAQ (increments view count)
router.get('/:id', getFAQ);

// Vote FAQ helpful
router.post('/:id/vote', voteFAQ);

// ==================== ADMIN ROUTES ====================

// Get all FAQs (admin - includes drafts)
router.get('/admin/all', protect, authorize('admin'), adminGetFAQs);

// Get FAQ statistics
router.get('/admin/stats', protect, authorize('admin'), getFAQStats);

// Create FAQ
router.post('/admin', protect, authorize('admin'), faqValidation, createFAQ);

// Update FAQ
router.put('/admin/:id', protect, authorize('admin'), faqValidation, updateFAQ);

// Reorder FAQs
router.put('/admin/reorder', protect, authorize('admin'), reorderFAQs);

// Delete FAQ
router.delete('/admin/:id', protect, authorize('admin'), deleteFAQ);

module.exports = router;
