const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const User = require('../models/User');

// Admin: Update booking status
const adminUpdateBookingStatus = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Access denied. Admin only.', 403));
  }

  const { status, reason } = req.body;
  const booking = await Booking.findById(req.params.id)
    .populate('listing', 'title')
    .populate('guest', 'firstName lastName email')
    .populate('host', 'firstName lastName email');

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  const validStatuses = [
    'pending',
    'pending_payment',
    'confirmed',
    'paid',
    'active',
    'completed',
    'cancelled_by_guest',
    'cancelled_by_host',
    'cancelled_by_admin',
    'expired',
    'disputed'
  ];

  if (!validStatuses.includes(status)) {
    return next(new AppError('Invalid status value', 400));
  }

  // Store old status for logging
  const oldStatus = booking.status;

  // Update status
  booking.status = status;

  // If cancelling as admin, handle cancellation
  if (status === 'cancelled_by_admin') {
    booking.cancellation = {
      cancelledBy: req.user.id,
      cancelledAt: new Date(),
      reason: reason || 'admin_action',
      refundAmount: booking.pricing.totalAmount, // Full refund for admin cancellations
      cancellationFee: 0
    };

    // Update payment if paid
    if (booking.payment.status === 'paid') {
      booking.payment.status = 'refunded';
      booking.payment.refundAmount = booking.pricing.totalAmount;
      booking.payment.refundReason = `Cancelled by admin: ${reason || 'admin_action'}`;
      booking.payment.refundedAt = new Date();
    }
  }

  // Add admin note
  const adminNote = `Status changed from ${oldStatus} to ${status} by ${req.user.firstName} ${req.user.lastName} (Admin)${reason ? '. Reason: ' + reason : ''}`;
  booking.adminNotes = booking.adminNotes ? `${booking.adminNotes}\n${adminNote}` : adminNote;

  await booking.save({ validateBeforeSave: false });

  // Create notifications for guest and host
  try {
    // Notify guest
    await Notification.createNotification({
      recipient: booking.guest._id,
      type: status === 'cancelled_by_admin' ? 'booking_cancelled_by_admin' : 'booking_status_changed',
      title: status === 'cancelled_by_admin' ? 'Booking Cancelled by Admin ❌' : 'Booking Status Updated 📋',
      message: status === 'cancelled_by_admin'
        ? `Your booking for "${booking.listing.title}" has been cancelled by an administrator. ${reason ? `Reason: ${reason}. ` : ''}You will receive a full refund.`
        : `Your booking status for "${booking.listing.title}" has been updated from ${oldStatus} to ${status} by an administrator.`,
      data: {
        bookingId: booking._id,
        listingTitle: booking.listing.title,
        oldStatus: oldStatus,
        newStatus: status,
        reason: reason
      },
      link: `/dashboard/bookings/${booking._id}`,
      priority: status === 'cancelled_by_admin' ? 'high' : 'normal'
    });

    // Notify host
    await Notification.createNotification({
      recipient: booking.host._id,
      type: status === 'cancelled_by_admin' ? 'booking_cancelled_by_admin' : 'booking_status_changed',
      title: status === 'cancelled_by_admin' ? 'Booking Cancelled by Admin ❌' : 'Booking Status Updated 📋',
      message: status === 'cancelled_by_admin'
        ? `Booking for your listing "${booking.listing.title}" has been cancelled by an administrator. ${reason ? `Reason: ${reason}` : ''}`
        : `Booking status for your listing "${booking.listing.title}" has been updated from ${oldStatus} to ${status} by an administrator.`,
      data: {
        bookingId: booking._id,
        listingTitle: booking.listing.title,
        oldStatus: oldStatus,
        newStatus: status,
        reason: reason
      },
      link: `/dashboard/bookings/${booking._id}`,
      priority: status === 'cancelled_by_admin' ? 'high' : 'normal'
    });

    // Notify all other admins
    const admins = await User.find({ role: 'admin', _id: { $ne: req.user.id } });
    for (const admin of admins) {
      await Notification.createNotification({
        recipient: admin._id,
        type: 'system',
        title: 'Booking Status Changed by Admin 🔄',
        message: `${req.user.firstName} ${req.user.lastName} changed booking ${booking._id} status from ${oldStatus} to ${status}.`,
        data: {
          bookingId: booking._id,
          listingTitle: booking.listing.title,
          oldStatus: oldStatus,
          newStatus: status
        },
        link: `/dashboard/bookings/${booking._id}`,
        priority: 'normal'
      });
    }
  } catch (notificationError) {
    console.error('Error creating booking status notifications:', notificationError);
  }

  res.status(200).json({
    status: 'success',
    message: 'Booking status updated successfully',
    data: {
      booking,
      oldStatus,
      newStatus: status
    }
  });
});

// Admin: Update payment status
const adminUpdatePaymentStatus = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Access denied. Admin only.', 403));
  }

  const { paymentStatus, transactionId, paidAmount, reason } = req.body;
  const booking = await Booking.findById(req.params.id)
    .populate('listing', 'title')
    .populate('guest', 'firstName lastName email')
    .populate('host', 'firstName lastName email');

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  const validPaymentStatuses = ['pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded'];

  if (!validPaymentStatuses.includes(paymentStatus)) {
    return next(new AppError('Invalid payment status value', 400));
  }

  // Store old payment status for logging
  const oldPaymentStatus = booking.payment.status;

  // Update payment status
  booking.payment.status = paymentStatus;

  if (transactionId) {
    booking.payment.transactionId = transactionId;
  }

  // Handle payment completion
  if (paymentStatus === 'paid') {
    booking.payment.paidAmount = paidAmount || booking.pricing.totalAmount;
    booking.payment.paidAt = booking.payment.paidAt || new Date();

    // Update booking status if still pending payment
    if (booking.status === 'pending_payment') {
      booking.status = 'confirmed';
    }
  }

  // Handle refund
  if (paymentStatus === 'refunded' || paymentStatus === 'partially_refunded') {
    booking.payment.refundAmount = paidAmount || booking.pricing.totalAmount;
    booking.payment.refundReason = reason || 'Admin action';
    booking.payment.refundedAt = new Date();
  }

  // Add admin note
  const adminNote = `Payment status changed from ${oldPaymentStatus} to ${paymentStatus} by ${req.user.firstName} ${req.user.lastName} (Admin)${reason ? '. Reason: ' + reason : ''}`;
  booking.adminNotes = booking.adminNotes ? `${booking.adminNotes}\n${adminNote}` : adminNote;

  await booking.save({ validateBeforeSave: false });

  // Create notifications for guest and host
  try {
    // Notify guest
    await Notification.createNotification({
      recipient: booking.guest._id,
      type: 'booking_payment_updated',
      title: 'Booking Payment Updated 💳',
      message: `Payment status for your booking "${booking.listing.title}" has been updated from ${oldPaymentStatus} to ${paymentStatus} by an administrator.${reason ? ` Reason: ${reason}` : ''}`,
      data: {
        bookingId: booking._id,
        listingTitle: booking.listing.title,
        oldPaymentStatus: oldPaymentStatus,
        newPaymentStatus: paymentStatus,
        reason: reason
      },
      link: `/dashboard/bookings/${booking._id}`,
      priority: ['refunded', 'failed'].includes(paymentStatus) ? 'high' : 'normal'
    });

    // Notify host
    await Notification.createNotification({
      recipient: booking.host._id,
      type: 'booking_payment_updated',
      title: 'Booking Payment Updated 💳',
      message: `Payment status for booking "${booking.listing.title}" has been updated from ${oldPaymentStatus} to ${paymentStatus} by an administrator.${reason ? ` Reason: ${reason}` : ''}`,
      data: {
        bookingId: booking._id,
        listingTitle: booking.listing.title,
        oldPaymentStatus: oldPaymentStatus,
        newPaymentStatus: paymentStatus,
        reason: reason
      },
      link: `/dashboard/bookings/${booking._id}`,
      priority: ['refunded', 'failed'].includes(paymentStatus) ? 'high' : 'normal'
    });
  } catch (notificationError) {
    console.error('Error creating payment status notifications:', notificationError);
  }

  res.status(200).json({
    status: 'success',
    message: 'Payment status updated successfully',
    data: {
      booking,
      oldPaymentStatus,
      newPaymentStatus: paymentStatus
    }
  });
});

// Admin: Add admin notes to booking
const adminAddNotes = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Access denied. Admin only.', 403));
  }

  const { notes, flagged, flagReason } = req.body;
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  if (notes) {
    const timestamp = new Date().toISOString();
    const noteEntry = `[${timestamp}] ${req.user.firstName} ${req.user.lastName}: ${notes}`;
    booking.adminNotes = booking.adminNotes ? `${booking.adminNotes}\n${noteEntry}` : noteEntry;
  }

  if (flagged !== undefined) {
    booking.flagged = flagged;
  }

  if (flagReason !== undefined) {
    booking.flagReason = flagReason;
  }

  await booking.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Admin notes updated successfully',
    data: {
      booking
    }
  });
});

// Host: Mark payment as received (for cash/bank transfer payments)
const hostConfirmPaymentReceived = catchAsync(async (req, res, next) => {
  const { transactionReference, notes } = req.body;
  const booking = await Booking.findById(req.params.id)
    .populate('listing', 'title')
    .populate('guest', 'firstName lastName email');

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Check if user is the host
  if (booking.host.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('Only the host can confirm payment received', 403));
  }

  // Only allow for pending or pending_payment bookings
  if (!['pending', 'pending_payment', 'confirmed'].includes(booking.status)) {
    return next(new AppError('Payment confirmation not applicable for this booking status', 400));
  }

  // Only for manual payment methods
  if (!['bank_transfer', 'cash'].includes(booking.payment.method)) {
    return next(new AppError('This payment method does not require manual confirmation', 400));
  }

  // Update payment and booking status
  booking.payment.status = 'paid';
  booking.payment.paidAmount = booking.pricing.totalAmount;
  booking.payment.paidAt = new Date();
  if (transactionReference) {
    booking.payment.transactionId = transactionReference;
  }

  // Update booking status
  booking.status = 'confirmed';

  // Add host message
  if (notes) {
    booking.hostMessage = booking.hostMessage
      ? `${booking.hostMessage}\n\nPayment confirmation: ${notes}`
      : `Payment confirmation: ${notes}`;
  }

  await booking.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Payment marked as received successfully',
    data: {
      booking
    }
  });
});

// Get booking activity log (admin only)
const getBookingActivityLog = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Access denied. Admin only.', 403));
  }

  const booking = await Booking.findById(req.params.id)
    .populate('listing', 'title')
    .populate('guest', 'firstName lastName email avatar')
    .populate('host', 'firstName lastName email avatar')
    .populate('cancellation.cancelledBy', 'firstName lastName email')
    .populate('checkIn.confirmedBy', 'firstName lastName')
    .populate('checkOut.confirmedBy', 'firstName lastName');

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Build activity log
  const activities = [];

  // Booking created
  activities.push({
    timestamp: booking.createdAt,
    action: 'Booking Created',
    description: `Booking created by ${booking.guest.firstName} ${booking.guest.lastName}`,
    status: booking.status,
    user: {
      id: booking.guest._id,
      name: `${booking.guest.firstName} ${booking.guest.lastName}`,
      role: 'guest'
    }
  });

  // Payment events
  if (booking.payment.paidAt) {
    activities.push({
      timestamp: booking.payment.paidAt,
      action: 'Payment Completed',
      description: `Payment of ${booking.pricing.totalAmount} ${booking.pricing.currency} completed via ${booking.payment.method}`,
      paymentStatus: booking.payment.status,
      transactionId: booking.payment.transactionId
    });
  }

  // Check-in
  if (booking.checkIn?.actualTime) {
    activities.push({
      timestamp: booking.checkIn.actualTime,
      action: 'Guest Checked In',
      description: `Guest checked in at property`,
      confirmedBy: booking.checkIn.confirmedBy ? {
        id: booking.checkIn.confirmedBy._id,
        name: `${booking.checkIn.confirmedBy.firstName} ${booking.checkIn.confirmedBy.lastName}`
      } : null,
      notes: booking.checkIn.notes
    });
  }

  // Check-out
  if (booking.checkOut?.actualTime) {
    activities.push({
      timestamp: booking.checkOut.actualTime,
      action: 'Guest Checked Out',
      description: `Guest checked out from property`,
      confirmedBy: booking.checkOut.confirmedBy ? {
        id: booking.checkOut.confirmedBy._id,
        name: `${booking.checkOut.confirmedBy.firstName} ${booking.checkOut.confirmedBy.lastName}`
      } : null,
      notes: booking.checkOut.notes,
      damageReport: booking.checkOut.damageReport
    });
  }

  // Completion confirmations
  if (booking.completion?.hostConfirmedAt) {
    activities.push({
      timestamp: booking.completion.hostConfirmedAt,
      action: 'Host Confirmed Completion',
      description: 'Host confirmed booking completion'
    });
  }

  if (booking.completion?.guestConfirmedAt) {
    activities.push({
      timestamp: booking.completion.guestConfirmedAt,
      action: 'Guest Confirmed Completion',
      description: 'Guest confirmed booking completion'
    });
  }

  if (booking.completion?.completedAt) {
    activities.push({
      timestamp: booking.completion.completedAt,
      action: 'Booking Completed',
      description: 'Both parties confirmed completion',
      status: 'completed'
    });
  }

  // Cancellation
  if (booking.cancellation?.cancelledAt) {
    const cancelledBy = booking.cancellation.cancelledBy;
    activities.push({
      timestamp: booking.cancellation.cancelledAt,
      action: 'Booking Cancelled',
      description: `Booking cancelled - Reason: ${booking.cancellation.reason}`,
      cancelledBy: cancelledBy ? {
        id: cancelledBy._id,
        name: `${cancelledBy.firstName} ${cancelledBy.lastName}`
      } : null,
      refundAmount: booking.cancellation.refundAmount,
      cancellationFee: booking.cancellation.cancellationFee,
      status: booking.status
    });
  }

  // Refund
  if (booking.payment.refundedAt) {
    activities.push({
      timestamp: booking.payment.refundedAt,
      action: 'Refund Processed',
      description: `Refund of ${booking.payment.refundAmount} ${booking.pricing.currency} processed`,
      refundReason: booking.payment.refundReason,
      paymentStatus: booking.payment.status
    });
  }

  // Sort by timestamp descending (newest first)
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.status(200).json({
    status: 'success',
    data: {
      booking: {
        id: booking._id,
        listing: booking.listing,
        guest: booking.guest,
        host: booking.host,
        currentStatus: booking.status,
        paymentStatus: booking.payment.status,
        adminNotes: booking.adminNotes,
        flagged: booking.flagged,
        flagReason: booking.flagReason
      },
      activities,
      totalActivities: activities.length
    }
  });
});

module.exports = {
  adminUpdateBookingStatus,
  adminUpdatePaymentStatus,
  adminAddNotes,
  hostConfirmPaymentReceived,
  getBookingActivityLog
};
