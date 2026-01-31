const express = require('express');
const {
  getAllApplications,
  getApplication,
  approveApplication,
  rejectApplication,
  requestResubmission
} = require('../controllers/hostApplicationController');
const {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  updateUserRole,
  blockUser,
  activateUser,
  deleteUser,
  permanentlyDeleteUser,
  resetUserPassword,
  getUserStats,
  verifyUserEmail
} = require('../controllers/adminUserController');
const {
  getPendingCashVouchers,
  validateCashPayment
} = require('../controllers/bookingController');
const {
  getAllSettings,
  getCommissionRates,
  updateSetting,
  updateCommissionRates,
  getSettingHistory,
  initializeSettings,
  getStripeConnectHosts,
  getStripeBalance
} = require('../controllers/platformSettingsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and admin authorization
router.use(protect);
router.use(authorize('admin'));

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Admin route working' });
});

// ===== USER MANAGEMENT ROUTES =====

// @route   GET /api/admin/users/stats
// @desc    Get user statistics
// @access  Admin only
router.get('/users/stats', getUserStats);

// @route   GET /api/admin/users
// @desc    Get all users with filtering and pagination
// @access  Admin only
router.get('/users', getAllUsers);

// @route   POST /api/admin/users
// @desc    Create new user
// @access  Admin only
router.post('/users', createUser);

// @route   GET /api/admin/users/:id
// @desc    Get single user
// @access  Admin only
router.get('/users/:id', getUser);

// @route   PUT /api/admin/users/:id
// @desc    Update user
// @access  Admin only
router.put('/users/:id', updateUser);

// @route   DELETE /api/admin/users/:id
// @desc    Soft delete user
// @access  Admin only
router.delete('/users/:id', deleteUser);

// @route   DELETE /api/admin/users/:id/permanent
// @desc    Permanently delete user
// @access  Admin only
router.delete('/users/:id/permanent', permanentlyDeleteUser);

// @route   PATCH /api/admin/users/:id/role
// @desc    Update user role
// @access  Admin only
router.patch('/users/:id/role', updateUserRole);

// @route   PATCH /api/admin/users/:id/block
// @desc    Block/unblock user
// @access  Admin only
router.patch('/users/:id/block', blockUser);

// @route   PATCH /api/admin/users/:id/activate
// @desc    Activate/deactivate user
// @access  Admin only
router.patch('/users/:id/activate', activateUser);

// @route   PATCH /api/admin/users/:id/reset-password
// @desc    Reset user password
// @access  Admin only
router.patch('/users/:id/reset-password', resetUserPassword);

// @route   PATCH /api/admin/users/:id/verify-email
// @desc    Verify user email
// @access  Admin only
router.patch('/users/:id/verify-email', verifyUserEmail);

// ===== HOST APPLICATION MANAGEMENT ROUTES =====

// @route   GET /api/admin/host-applications
// @desc    Get all host applications with filtering and pagination
// @access  Admin only
router.get('/host-applications', getAllApplications);

// @route   GET /api/admin/host-applications/:id
// @desc    Get single host application
// @access  Admin only
router.get('/host-applications/:id', getApplication);

// @route   PUT /api/admin/host-applications/:id/approve
// @desc    Approve host application and upgrade user to host
// @access  Admin only
router.put('/host-applications/:id/approve', approveApplication);

// @route   PUT /api/admin/host-applications/:id/reject
// @desc    Reject host application
// @access  Admin only
router.put('/host-applications/:id/reject', rejectApplication);

// @route   PUT /api/admin/host-applications/:id/request-resubmission
// @desc    Request application resubmission with notes
// @access  Admin only
router.put('/host-applications/:id/request-resubmission', requestResubmission);

// ===== CASH VOUCHER MANAGEMENT ROUTES (NORD EXPRESS) =====

// @route   GET /api/admin/cash-vouchers
// @desc    Get all pending cash vouchers for validation
// @access  Admin only
router.get('/cash-vouchers', getPendingCashVouchers);

// @route   PUT /api/admin/cash-vouchers/:id/validate
// @desc    Manually validate a cash payment (Nord Express)
// @access  Admin only
router.put('/cash-vouchers/:id/validate', validateCashPayment);

// ===== PLATFORM SETTINGS ROUTES =====

// @route   GET /api/admin/settings
// @desc    Get all platform settings
// @access  Admin only
router.get('/settings', getAllSettings);

// @route   GET /api/admin/settings/commissions
// @desc    Get all commission rates
// @access  Admin only
router.get('/settings/commissions', getCommissionRates);

// @route   PUT /api/admin/settings/commissions
// @desc    Bulk update commission rates
// @access  Admin only
router.put('/settings/commissions', updateCommissionRates);

// @route   POST /api/admin/settings/initialize
// @desc    Initialize default settings
// @access  Admin only
router.post('/settings/initialize', initializeSettings);

// @route   GET /api/admin/settings/:key/history
// @desc    Get setting change history
// @access  Admin only
router.get('/settings/:key/history', getSettingHistory);

// @route   PUT /api/admin/settings/:key
// @desc    Update a single setting
// @access  Admin only
router.put('/settings/:key', updateSetting);

// ===== STRIPE CONNECT MANAGEMENT ROUTES =====

// @route   GET /api/admin/stripe-connect/hosts
// @desc    Get all hosts with Stripe Connect accounts
// @access  Admin only
router.get('/stripe-connect/hosts', getStripeConnectHosts);

// @route   GET /api/admin/stripe-connect/balance
// @desc    Get platform Stripe balance
// @access  Admin only
router.get('/stripe-connect/balance', getStripeBalance);

// ===== COMMISSIONS TRACKING ROUTES =====

// @route   GET /api/admin/commissions/stats
// @desc    Get commission statistics and breakdown
// @access  Admin only
router.get('/commissions/stats', async (req, res) => {
  try {
    const { startDate, endDate, currency, period = 'month' } = req.query;

    const Booking = require('../models/Booking');
    const mongoose = require('mongoose');

    // Build match query
    const matchQuery = {
      status: { $in: ['confirmed', 'paid', 'active', 'completed'] },
      'payments.status': 'succeeded'
    };

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    if (currency) {
      matchQuery['pricing.currency'] = currency;
    }

    // Calculate overview stats
    const overview = await Booking.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalGuestFees: { $sum: '$pricing.serviceFee' },
          totalHostCommissions: { $sum: '$pricing.hostCommission' },
          totalCommissions: { $sum: { $add: ['$pricing.serviceFee', '$pricing.hostCommission'] } },
          averageBookingValue: { $avg: '$pricing.total' },
          currencies: { $addToSet: '$pricing.currency' }
        }
      }
    ]);

    // Group by currency
    const byCurrency = await Booking.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$pricing.currency',
          count: { $sum: 1 },
          guestFees: { $sum: '$pricing.serviceFee' },
          hostCommissions: { $sum: '$pricing.hostCommission' },
          totalCommissions: { $sum: { $add: ['$pricing.serviceFee', '$pricing.hostCommission'] } }
        }
      },
      { $sort: { totalCommissions: -1 } }
    ]);

    // Group by period (month or week)
    let groupByPeriod;
    if (period === 'week') {
      groupByPeriod = {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            week: { $week: '$createdAt' }
          },
          count: { $sum: 1 },
          guestFees: { $sum: '$pricing.serviceFee' },
          hostCommissions: { $sum: '$pricing.hostCommission' },
          totalCommissions: { $sum: { $add: ['$pricing.serviceFee', '$pricing.hostCommission'] } }
        }
      };
    } else {
      groupByPeriod = {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          guestFees: { $sum: '$pricing.serviceFee' },
          hostCommissions: { $sum: '$pricing.hostCommission' },
          totalCommissions: { $sum: { $add: ['$pricing.serviceFee', '$pricing.hostCommission'] } }
        }
      };
    }

    const byPeriod = await Booking.aggregate([
      { $match: matchQuery },
      groupByPeriod,
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } },
      { $limit: 12 }
    ]);

    // Recent bookings with commission breakdown
    const recentBookings = await Booking.find(matchQuery)
      .sort('-createdAt')
      .limit(20)
      .populate('guest', 'firstName lastName email')
      .populate('host', 'firstName lastName email')
      .populate('listing', 'title')
      .select('createdAt pricing status guest host listing')
      .lean();

    // Top hosts by commissions
    const topHosts = await Booking.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$host',
          bookingsCount: { $sum: 1 },
          totalCommissions: { $sum: '$pricing.hostCommission' }
        }
      },
      { $sort: { totalCommissions: -1 } },
      { $limit: 10 }
    ]);

    // Populate host details
    await mongoose.model('User').populate(topHosts, { path: '_id', select: 'firstName lastName email' });

    res.status(200).json({
      success: true,
      data: {
        overview: overview[0] || {
          totalBookings: 0,
          totalGuestFees: 0,
          totalHostCommissions: 0,
          totalCommissions: 0,
          averageBookingValue: 0,
          currencies: []
        },
        byCurrency,
        byPeriod,
        recentBookings,
        topHosts
      }
    });
  } catch (error) {
    console.error('Error fetching commission stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch commission statistics'
    });
  }
});

module.exports = router;