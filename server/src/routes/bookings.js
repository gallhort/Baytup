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
const {
  createBookingValidation,
  updateBookingStatusValidation,
  mongoIdValidation,
  validate
} = require('../utils/validation');

// Protect all routes
router.use(protect);

// Admin booking route
router.get('/admin/all', getAllBookingsAdmin);

// Host booking routes
router.get('/host', getHostBookings);
router.get('/host/calendar', getHostBookingsCalendar);
router.patch('/:id/status', mongoIdValidation, updateBookingStatusValidation, validate, updateBookingStatus);

// Guest booking routes
router.get('/guest', getGuestBookings);

// Travel history routes
router.get('/travel-history/stats', getTravelHistoryStats);
router.get('/travel-history', getTravelHistory);
router.post('/:bookingId/review', addReviewToBooking);

// Review routes
router.post('/:id/review-host', mongoIdValidation, validate, reviewHostAfterBooking);
router.post('/:id/review-guest', mongoIdValidation, validate, reviewGuestAfterBooking);

// Get booking statistics
router.get('/stats', getBookingStats);

// Get booking calendar
router.get('/calendar', getBookingCalendar);

// Create a new booking with payment
router.post('/create-with-payment', createBookingValidation, validate, createBookingWithPayment);

// Create a new booking with cash payment (Nord Express)
router.post('/create-with-cash', createBookingValidation, validate, createBookingWithCashPayment);

// Get voucher details
router.get('/voucher/:voucherNumber', getVoucherDetails);

// Verify payment for a booking
router.get('/:id/verify-payment', mongoIdValidation, validate, verifyPaymentAndConfirmBooking);

// Retry payment for a booking
router.post('/:id/retry-payment', mongoIdValidation, validate, retryBookingPayment);

// Check-in/Check-out/Completion endpoints
router.post('/:id/check-in', mongoIdValidation, validate, checkInGuest);
router.post('/:id/check-out', mongoIdValidation, validate, checkOutGuest);
router.post('/:id/confirm-completion', mongoIdValidation, validate, confirmBookingCompletion);

// Create a new booking (legacy endpoint)
router.post('/', createBookingValidation, validate, createBooking);

// Get, update, or delete a specific booking
router.get('/:id', mongoIdValidation, validate, getBooking);
router.patch('/:id', mongoIdValidation, validate, updateBooking);
router.delete('/:id', mongoIdValidation, validate, deleteBooking);

// Cancel a booking
router.patch('/:id/cancel', mongoIdValidation, validate, cancelBooking);

module.exports = router;
