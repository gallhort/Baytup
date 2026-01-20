const express = require('express');
const router = express.Router();
const {
  getEarningsOverview,
  getEarningsTransactions,
  getEarningsByListing,
  getMonthlyEarningsStats,
  getEarningsByCategory
} = require('../controllers/earningsController');

const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and host role
router.use(protect);
router.use(authorize('host', 'admin'));

// Earnings overview
router.get('/overview', getEarningsOverview);

// Earnings transactions (detailed list)
router.get('/transactions', getEarningsTransactions);

// Earnings by listing
router.get('/by-listing', getEarningsByListing);

// Monthly earnings statistics
router.get('/monthly-stats', getMonthlyEarningsStats);

// Earnings by category
router.get('/by-category', getEarningsByCategory);

module.exports = router;
