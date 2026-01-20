const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  checkWishlistStatus,
  clearWishlist,
  getWishlistStats
} = require('../controllers/wishlistController');

// All routes require authentication
router.use(protect);

// Get wishlist statistics
router.get('/stats', getWishlistStats);

// Get user's wishlist
router.get('/', getWishlist);

// Check wishlist status for multiple listings
router.post('/check', checkWishlistStatus);

// Clear all saved listings
router.delete('/clear', clearWishlist);

// Toggle wishlist status
router.put('/:listingId/toggle', toggleWishlist);

// Add to wishlist
router.post('/:listingId', addToWishlist);

// Remove from wishlist
router.delete('/:listingId', removeFromWishlist);

module.exports = router;