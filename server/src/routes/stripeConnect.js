const express = require('express');
const router = express.Router();
const {
  createConnectedAccount,
  createAccountLink,
  createAccountSession,
  getAccountStatus,
  getDashboardLink
} = require('../controllers/stripeConnectController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// @route   POST /api/stripe-connect/create-account
// @desc    Create Stripe Connected Account for host
// @access  Private (hosts)
router.post('/create-account', authorize('host', 'admin'), createConnectedAccount);

// @route   POST /api/stripe-connect/account-link
// @desc    Get account link for redirect onboarding
// @access  Private (hosts)
router.post('/account-link', authorize('host', 'admin'), createAccountLink);

// @route   POST /api/stripe-connect/account-session
// @desc    Get account session for embedded onboarding
// @access  Private (hosts)
router.post('/account-session', authorize('host', 'admin'), createAccountSession);

// @route   GET /api/stripe-connect/status
// @desc    Get Stripe Connect account status
// @access  Private (hosts)
router.get('/status', authorize('host', 'admin'), getAccountStatus);

// @route   GET /api/stripe-connect/dashboard-link
// @desc    Get Stripe Dashboard login link
// @access  Private (hosts)
router.get('/dashboard-link', authorize('host', 'admin'), getDashboardLink);

module.exports = router;
