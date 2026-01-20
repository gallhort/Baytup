const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const Booking = require('../models/Booking');
const slickPayService = require('../services/slickPayService');

/**
 * Handle Slick Pay webhook for payment notifications
 * This endpoint is called by Slick Pay when a payment status changes
 */
const handleSlickPayWebhook = catchAsync(async (req, res, next) => {
  const webhookData = req.body;
  const signature = req.headers['x-slickpay-signature'] || req.headers['slickpay-signature'];

  // Verify webhook signature
  if (!slickPayService.verifyWebhookSignature(webhookData, signature)) {
    console.error('Invalid webhook signature');
    return res.status(401).json({
      status: 'error',
      message: 'Invalid webhook signature'
    });
  }

  // Extract booking ID from metadata
  const bookingId = webhookData.webhook_meta_data?.bookingId;

  if (!bookingId) {
    console.error('Booking ID not found in webhook data');
    return res.status(400).json({
      status: 'error',
      message: 'Booking ID not found in webhook data'
    });
  }

  // Find booking
  const booking = await Booking.findById(bookingId)
    .populate('listing', 'title host')
    .populate('guest', 'firstName lastName email')
    .populate('host', 'firstName lastName email');

  if (!booking) {
    console.error('Booking not found:', bookingId);
    return res.status(404).json({
      status: 'error',
      message: 'Booking not found'
    });
  }

  // Process webhook based on event type or status
  const eventType = webhookData.event || webhookData.status;

  switch (eventType) {
    case 'invoice.paid':
    case 'paid':
    case 'completed':
      // Payment successful
      if (booking.payment.status !== 'paid') {
        booking.status = 'confirmed';
        booking.payment.status = 'paid';
        booking.payment.paidAmount = booking.pricing.totalAmount;
        booking.payment.paidAt = new Date();

        await booking.save({ validateBeforeSave: false });


        // - Email to guest with booking details
        // - Email to host with guest information
        // - SMS notifications (optional)
      }

      return res.status(200).json({
        status: 'success',
        message: 'Payment confirmed, booking updated'
      });

    case 'invoice.failed':
    case 'failed':
      // Payment failed
      booking.payment.status = 'failed';
      booking.status = 'expired';

      await booking.save({ validateBeforeSave: false });



      return res.status(200).json({
        status: 'success',
        message: 'Payment failure recorded'
      });

    case 'invoice.cancelled':
    case 'cancelled':
      // Payment cancelled
      booking.payment.status = 'failed';
      booking.status = 'cancelled_by_guest';

      await booking.save({ validateBeforeSave: false });


      return res.status(200).json({
        status: 'success',
        message: 'Payment cancellation recorded'
      });

    case 'invoice.refunded':
    case 'refunded':
      // Payment refunded
      booking.payment.status = 'refunded';
      booking.payment.refundAmount = webhookData.refund_amount || booking.pricing.totalAmount;
      booking.payment.refundedAt = new Date();

      await booking.save({ validateBeforeSave: false });



      return res.status(200).json({
        status: 'success',
        message: 'Refund recorded'
      });

    default:
      // Unknown event type

      return res.status(200).json({
        status: 'success',
        message: 'Webhook received'
      });
  }
});

/**
 * Test webhook endpoint for development
 * This allows testing webhook functionality without Slick Pay
 */
const testWebhook = catchAsync(async (req, res, next) => {
  const { bookingId, status } = req.body;

  if (!bookingId || !status) {
    return next(new AppError('Booking ID and status are required', 400));
  }

  const booking = await Booking.findById(bookingId);

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Simulate webhook processing
  if (status === 'paid') {
    booking.status = 'confirmed';
    booking.payment.status = 'paid';
    booking.payment.paidAmount = booking.pricing.totalAmount;
    booking.payment.paidAt = new Date();
  } else if (status === 'failed') {
    booking.payment.status = 'failed';
    booking.status = 'expired';
  }

  await booking.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Test webhook processed',
    data: { booking }
  });
});

module.exports = {
  handleSlickPayWebhook,
  testWebhook
};
