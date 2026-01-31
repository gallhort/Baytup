const express = require('express');
const router = express.Router();
const {
  getGuestBookings,
  getBooking,
  createBooking,
  updateBooking,
  cancelBooking,
  deleteBooking,
  getBookingCalendar,
  getBookingStats,
  getTravelHistory,
  addReviewToBooking,
  getTravelHistoryStats,
  getHostBookings,
  getHostBookingsCalendar,
  updateBookingStatus,
  createBookingWithPayment,
  verifyPaymentAndConfirmBooking,
  reviewHostAfterBooking,
  reviewGuestAfterBooking,
  retryBookingPayment,
  checkInGuest,
  checkOutGuest,
  confirmBookingCompletion,
  getAllBookingsAdmin,
  // Cash payment (Nord Express)
  createBookingWithCashPayment,
  getVoucherDetails
} = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// Admin booking route
router.get('/admin/all', getAllBookingsAdmin);

// Host booking routes
router.get('/host', getHostBookings);
router.get('/host/calendar', getHostBookingsCalendar);
router.patch('/:id/status', updateBookingStatus);

// Guest booking routes
router.get('/guest', getGuestBookings);

// Travel history routes
router.get('/travel-history/stats', getTravelHistoryStats);
router.get('/travel-history', getTravelHistory);
router.post('/:bookingId/review', addReviewToBooking);

// Review routes
router.post('/:id/review-host', reviewHostAfterBooking);
router.post('/:id/review-guest', reviewGuestAfterBooking);

// Get booking statistics
router.get('/stats', getBookingStats);

// Get booking calendar
router.get('/calendar', getBookingCalendar);

// Create a new booking with payment
router.post('/create-with-payment', createBookingWithPayment);

// ✅ NEW: Create a new booking with cash payment (Nord Express)
router.post('/create-with-cash', createBookingWithCashPayment);

// ✅ NEW: Get voucher details
router.get('/voucher/:voucherNumber', getVoucherDetails);

// Verify payment for a booking
router.get('/:id/verify-payment', verifyPaymentAndConfirmBooking);

// Retry payment for a booking
router.post('/:id/retry-payment', retryBookingPayment);

// Check-in/Check-out/Completion endpoints
router.post('/:id/check-in', checkInGuest);
router.post('/:id/check-out', checkOutGuest);
router.post('/:id/confirm-completion', confirmBookingCompletion);

// Create a new booking (legacy endpoint)
router.post('/', createBooking);

// Get, update, or delete a specific booking
router
  .route('/:id')
  .get(getBooking)
  .patch(updateBooking)
  .delete(deleteBooking);

// Cancel a booking
router.patch('/:id/cancel', cancelBooking);

module.exports = router;