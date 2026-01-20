const express = require('express');
const router = express.Router();
const {
  requestPayout,
  getMyPayouts,
  getAllPayouts,
  updatePayoutStatus,
  getPayoutDetails,
  cancelPayout,
  getBankAccount,
  updateBankAccount,
  getAvailableBalance
} = require('../controllers/payoutController');

const { protect, authorize } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// Host routes
router.post('/request', authorize('host'), requestPayout);
router.get('/my-payouts', authorize('host'), getMyPayouts);
router.put('/:id/cancel', authorize('host'), cancelPayout);
router.get('/bank-account', authorize('host'), getBankAccount);
router.put('/bank-account', authorize('host'), updateBankAccount);
router.get('/available-balance', authorize('host'), getAvailableBalance);

// Admin routes
router.get('/admin/all', authorize('admin'), getAllPayouts);
router.put('/admin/:id/status', authorize('admin'), updatePayoutStatus);

// Shared routes (host can view their own, admin can view all)
router.get('/:id', getPayoutDetails);

module.exports = router;
