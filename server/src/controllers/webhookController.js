const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Notification = require('../models/Notification');
const slickPayService = require('../services/slickPayService');
// Note: chargilyService is loaded lazily to avoid server crash if @chargily/chargily-pay not installed
const escrowService = require('../services/escrowService');
const stripeService = require('../services/stripeService');

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
    case 'completed': {
      // Payment successful - atomic update prevents race condition (P0 #1)
      const updatedSlickPay = await Booking.findOneAndUpdate(
        { _id: booking._id, 'payment.status': { $ne: 'paid' } },
        {
          $set: {
            status: 'confirmed',
            'payment.status': 'paid',
            'payment.paidAmount': booking.pricing.totalAmount,
            'payment.paidAt': new Date()
          }
        },
        { new: true }
      ).populate('listing', 'title host')
       .populate('guest', 'firstName lastName email')
       .populate('host', 'firstName lastName email');

      if (updatedSlickPay) {
        // Create escrow - revert payment if escrow fails (P0 #2)
        try {
          const escrow = await escrowService.createEscrow(updatedSlickPay, {
            provider: 'slickpay',
            transactionId: updatedSlickPay.payment.transactionId
          });
          console.log(`[Webhook] Created escrow ${escrow._id} for booking ${updatedSlickPay._id}`);
        } catch (escrowError) {
          console.error('[Webhook] Escrow failed, reverting payment:', escrowError);
          await Booking.findByIdAndUpdate(updatedSlickPay._id, {
            $set: { 'payment.status': 'escrow_failed', 'payment.escrowError': escrowError.message }
          });
          return res.status(200).json({ status: 'error', message: 'Escrow creation failed' });
        }

        await Notification.createNotification({
          recipient: updatedSlickPay.guest._id,
          type: 'booking_payment_successful',
          title: 'Paiement confirmé!',
          message: `Votre paiement de ${updatedSlickPay.pricing.totalAmount} DZD pour "${updatedSlickPay.listing?.title}" a été confirmé.`,
          data: { bookingId: updatedSlickPay._id },
          link: `/dashboard/bookings/${updatedSlickPay._id}`
        });

        await Notification.createNotification({
          recipient: updatedSlickPay.host._id,
          type: 'booking_confirmed',
          title: 'Nouvelle réservation confirmée!',
          message: `${updatedSlickPay.guest?.firstName} a réservé "${updatedSlickPay.listing?.title}" du ${new Date(updatedSlickPay.startDate).toLocaleDateString('fr-FR')} au ${new Date(updatedSlickPay.endDate).toLocaleDateString('fr-FR')}.`,
          data: { bookingId: updatedSlickPay._id },
          link: `/dashboard/host/bookings/${updatedSlickPay._id}`
        });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Payment confirmed, booking updated'
      });
    }

    case 'invoice.failed':
    case 'failed':
      // Payment failed
      booking.payment.status = 'failed';
      booking.status = 'expired';

      await booking.save({ validateBeforeSave: false });

      // ✅ Notify guest
      await Notification.createNotification({
        recipient: booking.guest._id,
        type: 'booking_payment_failed',
        title: 'Paiement échoué',
        message: `Votre paiement pour "${booking.listing?.title}" a échoué. Veuillez réessayer.`,
        data: { bookingId: booking._id },
        link: `/dashboard/bookings/${booking._id}`
      });

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

      // ✅ Notify guest
      await Notification.createNotification({
        recipient: booking.guest._id,
        type: 'booking_cancelled',
        title: 'Paiement annulé',
        message: `Votre paiement pour "${booking.listing?.title}" a été annulé.`,
        data: { bookingId: booking._id },
        link: `/dashboard/bookings/${booking._id}`
      });

      // ✅ Notify host
      await Notification.createNotification({
        recipient: booking.host._id,
        type: 'booking_cancelled',
        title: 'Réservation annulée',
        message: `La réservation de ${booking.guest?.firstName} pour "${booking.listing?.title}" a été annulée (paiement non effectué).`,
        data: { bookingId: booking._id },
        link: `/dashboard/host/bookings/${booking._id}`
      });

      return res.status(200).json({
        status: 'success',
        message: 'Payment cancellation recorded'
      });

    case 'invoice.refunded':
    case 'refunded':
      // Payment refunded
      const refundAmount = webhookData.refund_amount || booking.pricing.totalAmount;
      booking.payment.status = 'refunded';
      booking.payment.refundAmount = refundAmount;
      booking.payment.refundedAt = new Date();

      await booking.save({ validateBeforeSave: false });

      // ✅ Notify guest
      await Notification.createNotification({
        recipient: booking.guest._id,
        type: 'booking_payment_updated',
        title: 'Remboursement traité',
        message: `Un remboursement de ${refundAmount} DZD a été effectué pour "${booking.listing?.title}".`,
        data: { bookingId: booking._id },
        link: `/dashboard/bookings/${booking._id}`
      });

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
 * Handle Chargily Pay webhook for payment notifications
 * This endpoint is called by Chargily when a payment status changes
 * Events: checkout.paid, checkout.failed, checkout.canceled, checkout.expired
 */
const handleChargilyWebhook = catchAsync(async (req, res, next) => {
  // Lazy load chargilyService to avoid crash if package not installed
  const chargilyService = require('../services/chargilyService');

  const signature = req.headers['signature'] || req.headers['x-chargily-signature'];
  const rawBody = req.rawBody; // Set by bodyParser middleware

  console.log('[Chargily Webhook] Received webhook:', {
    hasSignature: !!signature,
    hasRawBody: !!rawBody,
    eventType: req.body?.type
  });

  // Verify webhook signature
  if (!chargilyService.verifyWebhookSignature(rawBody, signature)) {
    console.error('[Chargily Webhook] Invalid signature');
    return res.status(401).json({
      status: 'error',
      message: 'Invalid webhook signature'
    });
  }

  // Process the webhook event
  const processedEvent = chargilyService.processWebhookEvent(req.body);
  const { eventType, checkoutId, metadata } = processedEvent;

  // Extract booking ID from metadata
  const bookingId = metadata?.bookingId;

  if (!bookingId) {
    console.error('[Chargily Webhook] Booking ID not found in metadata');
    return res.status(400).json({
      status: 'error',
      message: 'Booking ID not found in webhook metadata'
    });
  }

  // Find booking
  const booking = await Booking.findById(bookingId)
    .populate('listing', 'title host')
    .populate('guest', 'firstName lastName email')
    .populate('host', 'firstName lastName email');

  if (!booking) {
    console.error('[Chargily Webhook] Booking not found:', bookingId);
    return res.status(404).json({
      status: 'error',
      message: 'Booking not found'
    });
  }

  // Process based on event type
  switch (eventType) {
    case 'payment_success': {
      // Payment successful - atomic update prevents race condition (P0 #1)
      const updatedChargily = await Booking.findOneAndUpdate(
        { _id: booking._id, 'payment.status': { $ne: 'paid' } },
        {
          $set: {
            status: 'confirmed',
            'payment.status': 'paid',
            'payment.paidAmount': booking.pricing.totalAmount,
            'payment.paidAt': new Date(),
            'payment.transactionId': checkoutId
          }
        },
        { new: true }
      ).populate('listing', 'title host')
       .populate('guest', 'firstName lastName email')
       .populate('host', 'firstName lastName email');

      if (updatedChargily) {
        console.log(`[Chargily Webhook] Payment confirmed for booking ${bookingId}`);

        // Create escrow - revert payment if escrow fails (P0 #2)
        try {
          const escrow = await escrowService.createEscrow(updatedChargily, {
            provider: 'chargily',
            transactionId: checkoutId
          });
          console.log(`[Chargily Webhook] Created escrow ${escrow._id} for booking ${updatedChargily._id}`);
        } catch (escrowError) {
          console.error('[Chargily Webhook] Escrow failed, reverting payment:', escrowError);
          await Booking.findByIdAndUpdate(updatedChargily._id, {
            $set: { 'payment.status': 'escrow_failed', 'payment.escrowError': escrowError.message }
          });
          return res.status(200).json({ status: 'error', message: 'Escrow creation failed' });
        }

        await Notification.createNotification({
          recipient: updatedChargily.guest._id,
          type: 'booking_payment_successful',
          title: 'Paiement confirmé!',
          message: `Votre paiement de ${updatedChargily.pricing.totalAmount} DZD pour "${updatedChargily.listing?.title}" a été confirmé.`,
          data: { bookingId: updatedChargily._id },
          link: `/dashboard/bookings/${updatedChargily._id}`
        });

        await Notification.createNotification({
          recipient: updatedChargily.host._id,
          type: 'booking_confirmed',
          title: 'Nouvelle réservation confirmée!',
          message: `${updatedChargily.guest?.firstName} a réservé "${updatedChargily.listing?.title}" du ${new Date(updatedChargily.startDate).toLocaleDateString('fr-FR')} au ${new Date(updatedChargily.endDate).toLocaleDateString('fr-FR')}.`,
          data: { bookingId: updatedChargily._id },
          link: `/dashboard/host/bookings/${updatedChargily._id}`
        });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Payment confirmed, booking updated'
      });
    }

    case 'payment_failed':
      booking.payment.status = 'failed';
      booking.status = 'expired';

      await booking.save({ validateBeforeSave: false });

      console.log(`[Chargily Webhook] Payment failed for booking ${bookingId}`);

      // Notify guest
      await Notification.createNotification({
        recipient: booking.guest._id,
        type: 'booking_payment_failed',
        title: 'Paiement échoué',
        message: `Votre paiement pour "${booking.listing?.title}" a échoué. Veuillez réessayer.`,
        data: { bookingId: booking._id },
        link: `/dashboard/bookings/${booking._id}`
      });

      return res.status(200).json({
        status: 'success',
        message: 'Payment failure recorded'
      });

    case 'payment_canceled':
    case 'payment_expired':
      booking.payment.status = 'failed';
      booking.status = 'cancelled_by_guest';

      await booking.save({ validateBeforeSave: false });

      console.log(`[Chargily Webhook] Payment ${eventType} for booking ${bookingId}`);

      // Notify guest
      await Notification.createNotification({
        recipient: booking.guest._id,
        type: 'booking_cancelled',
        title: eventType === 'payment_expired' ? 'Paiement expiré' : 'Paiement annulé',
        message: `Votre paiement pour "${booking.listing?.title}" a été ${eventType === 'payment_expired' ? 'expiré' : 'annulé'}.`,
        data: { bookingId: booking._id },
        link: `/dashboard/bookings/${booking._id}`
      });

      // Notify host
      await Notification.createNotification({
        recipient: booking.host._id,
        type: 'booking_cancelled',
        title: 'Réservation annulée',
        message: `La réservation de ${booking.guest?.firstName} pour "${booking.listing?.title}" a été annulée (paiement non effectué).`,
        data: { bookingId: booking._id },
        link: `/dashboard/host/bookings/${booking._id}`
      });

      return res.status(200).json({
        status: 'success',
        message: `Payment ${eventType} recorded`
      });

    default:
      console.log('[Chargily Webhook] Unknown event type:', eventType);
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

    await booking.save({ validateBeforeSave: false });

    // ✅ NEW: Create escrow for fund holding
    try {
      const escrow = await escrowService.createEscrow(booking, {
        provider: booking.payment.method || 'slickpay',
        transactionId: booking.payment.transactionId || 'test-' + Date.now()
      });
      console.log(`[TestWebhook] Created escrow ${escrow._id} for booking ${booking._id}`);
    } catch (escrowError) {
      console.error('[TestWebhook] Failed to create escrow:', escrowError);
    }
  } else if (status === 'failed') {
    booking.payment.status = 'failed';
    booking.status = 'expired';
    await booking.save({ validateBeforeSave: false });
  }

  res.status(200).json({
    status: 'success',
    message: 'Test webhook processed',
    data: { booking }
  });
});

/**
 * Handle Stripe webhook for payment notifications
 * IMPORTANT: This endpoint requires raw body (not parsed JSON)
 * Configure express.raw({type: 'application/json'}) on this route
 */
const handleStripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];

  let event;

  try {
    // Verify webhook signature
    event = stripeService.verifyWebhookSignature(req.body, signature);
  } catch (err) {
    console.error(`[Stripe Webhook] Signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handleStripePaymentSuccess(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handleStripePaymentFailure(event.data.object);
        break;

      case 'charge.refunded':
        await handleStripeRefund(event.data.object);
        break;

      case 'payment_intent.canceled':
        await handleStripePaymentCanceled(event.data.object);
        break;

      // Stripe Connect events
      case 'account.updated':
        await handleStripeAccountUpdated(event.data.object);
        break;

      case 'account.application.deauthorized':
        await handleStripeAccountDeauthorized(event.data.object);
        break;

      // Dispute events - CRITICAL for chargeback handling
      case 'charge.dispute.created':
        await handleStripeDisputeCreated(event.data.object);
        break;

      case 'charge.dispute.closed':
        await handleStripeDisputeClosed(event.data.object);
        break;

      case 'transfer.created':
        console.log(`[Stripe Webhook] Transfer created: ${event.data.object.id}`);
        break;

      case 'transfer.reversed':
        console.log(`[Stripe Webhook] Transfer reversed: ${event.data.object.id}`);
        break;

      case 'transfer.failed':
        await handleStripeTransferFailed(event.data.object);
        break;

      case 'payout.paid':
        console.log(`[Stripe Webhook] Payout completed: ${event.data.object.id}`);
        break;

      case 'payout.failed':
        console.log(`[Stripe Webhook] Payout failed: ${event.data.object.id}`);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, error);
    // Always return 200 to prevent Stripe retry loops (P0 #3)
    res.status(200).json({ received: true, error: 'Processing failed, will retry internally' });
  }
};

/**
 * Handle successful Stripe payment
 */
async function handleStripePaymentSuccess(paymentIntent) {
  const bookingId = paymentIntent.metadata?.bookingId;

  if (!bookingId) {
    console.error('[Stripe Webhook] No bookingId in payment intent metadata');
    return;
  }

  const booking = await Booking.findById(bookingId)
    .populate('listing', 'title')
    .populate('guest', 'firstName lastName email')
    .populate('host', 'firstName lastName email');

  if (!booking) {
    console.error(`[Stripe Webhook] Booking not found: ${bookingId}`);
    return;
  }

  // Atomic update prevents race condition (P0 #1)
  const updatedStripe = await Booking.findOneAndUpdate(
    { _id: bookingId, 'payment.status': { $ne: 'paid' } },
    {
      $set: {
        status: 'confirmed',
        'payment.status': 'paid',
        'payment.paidAmount': paymentIntent.amount / 100,
        'payment.paidAt': new Date(),
        'payment.stripeChargeId': paymentIntent.latest_charge
      }
    },
    { new: true }
  ).populate('listing', 'title')
   .populate('guest', 'firstName lastName email')
   .populate('host', 'firstName lastName email');

  if (updatedStripe) {
    console.log(`[Stripe Webhook] Payment successful for booking ${bookingId}`);

    // Create escrow - revert if fails (P0 #2)
    try {
      const escrow = await escrowService.createEscrow(updatedStripe, {
        provider: 'stripe',
        transactionId: paymentIntent.id
      });
      console.log(`[Stripe Webhook] Created escrow ${escrow._id} for booking ${updatedStripe._id}`);
    } catch (escrowError) {
      console.error('[Stripe Webhook] Escrow failed, reverting payment:', escrowError);
      await Booking.findByIdAndUpdate(updatedStripe._id, {
        $set: { 'payment.status': 'escrow_failed', 'payment.escrowError': escrowError.message }
      });
      return;
    }

    // Use actual currency from booking (P1 #18)
    const currency = (updatedStripe.pricing.currency || 'EUR').toUpperCase();
    const formattedAmount = currency === 'EUR'
      ? `${updatedStripe.pricing.totalAmount.toFixed(2)} €`
      : `${updatedStripe.pricing.totalAmount} ${currency}`;

    await Notification.createNotification({
      recipient: updatedStripe.guest._id,
      type: 'booking_payment_successful',
      title: 'Paiement confirmé!',
      message: `Votre paiement de ${formattedAmount} pour "${updatedStripe.listing?.title}" a été confirmé.`,
      data: { bookingId: updatedStripe._id },
      link: `/dashboard/bookings/${updatedStripe._id}`
    });

    await Notification.createNotification({
      recipient: updatedStripe.host._id,
      type: 'booking_confirmed',
      title: 'Nouvelle réservation confirmée!',
      message: `${updatedStripe.guest?.firstName} a réservé "${updatedStripe.listing?.title}" du ${new Date(updatedStripe.startDate).toLocaleDateString('fr-FR')} au ${new Date(updatedStripe.endDate).toLocaleDateString('fr-FR')}.`,
      data: { bookingId: updatedStripe._id },
      link: `/dashboard/host/bookings/${updatedStripe._id}`
    });
  }
}

/**
 * Handle failed Stripe payment
 */
async function handleStripePaymentFailure(paymentIntent) {
  const bookingId = paymentIntent.metadata?.bookingId;

  if (!bookingId) {
    console.error('[Stripe Webhook] No bookingId in payment intent metadata');
    return;
  }

  const booking = await Booking.findById(bookingId);

  if (!booking) {
    console.error(`[Stripe Webhook] Booking not found: ${bookingId}`);
    return;
  }

  booking.payment.status = 'failed';
  booking.status = 'expired';

  await booking.save({ validateBeforeSave: false });

  console.log(`[Stripe Webhook] Payment failed for booking ${bookingId}`);

  // Notify guest
  await Notification.createNotification({
    recipient: booking.guest,
    type: 'booking_payment_failed',
    title: 'Paiement échoué',
    message: `Votre paiement a échoué. Veuillez réessayer ou utiliser un autre moyen de paiement.`,
    data: { bookingId: booking._id },
    link: `/dashboard/bookings/${booking._id}`
  });
}

/**
 * Handle Stripe refund
 */
async function handleStripeRefund(charge) {
  // Find booking by stripe charge ID
  const booking = await Booking.findOne({
    'payment.stripeChargeId': charge.id
  });

  if (!booking) {
    console.log(`[Stripe Webhook] No booking found for charge: ${charge.id}`);
    return;
  }

  const refundAmount = charge.amount_refunded / 100;
  const isFullRefund = charge.refunded;

  booking.payment.status = isFullRefund ? 'refunded' : 'partially_refunded';
  booking.payment.refundAmount = refundAmount;
  booking.payment.refundedAt = new Date();
  booking.payment.stripeRefundId = charge.refunds?.data[0]?.id;

  await booking.save({ validateBeforeSave: false });

  console.log(`[Stripe Webhook] Refund recorded for booking ${booking._id}: ${refundAmount} EUR`);

  // Notify guest about refund
  await Notification.createNotification({
    recipient: booking.guest,
    type: 'booking_payment_updated',
    title: 'Remboursement traité',
    message: `Un remboursement de ${refundAmount} EUR a été effectué. Il sera crédité sous 5-10 jours.`,
    data: { bookingId: booking._id },
    link: `/dashboard/bookings/${booking._id}`
  });
}

/**
 * Handle canceled Stripe payment
 */
async function handleStripePaymentCanceled(paymentIntent) {
  const bookingId = paymentIntent.metadata?.bookingId;

  if (!bookingId) {
    return;
  }

  const booking = await Booking.findById(bookingId);

  if (!booking) {
    return;
  }

  if (booking.status === 'pending_payment') {
    booking.status = 'cancelled_by_guest';
    booking.payment.status = 'failed';
    await booking.save({ validateBeforeSave: false });

    console.log(`[Stripe Webhook] Payment canceled for booking ${bookingId}`);
  }
}

/**
 * Handle Stripe Connect account updated
 * Called when a connected account's status changes
 */
async function handleStripeAccountUpdated(account) {
  const accountId = account.id;

  // Find user by Stripe account ID
  const user = await User.findOne({ 'stripeConnect.accountId': accountId });

  if (!user) {
    console.log(`[Stripe Connect] No user found for account: ${accountId}`);
    return;
  }

  // Update user's Stripe Connect status
  const previousStatus = user.stripeConnect.onboardingStatus;

  user.stripeConnect.chargesEnabled = account.charges_enabled;
  user.stripeConnect.payoutsEnabled = account.payouts_enabled;
  user.stripeConnect.detailsSubmitted = account.details_submitted;
  user.stripeConnect.defaultCurrency = account.default_currency;
  user.stripeConnect.lastWebhookUpdate = new Date();

  // Determine onboarding status
  if (account.charges_enabled && account.payouts_enabled && account.details_submitted) {
    user.stripeConnect.onboardingStatus = 'completed';
    if (!user.stripeConnect.onboardingCompletedAt) {
      user.stripeConnect.onboardingCompletedAt = new Date();
    }
  } else if (account.requirements?.disabled_reason) {
    user.stripeConnect.onboardingStatus = 'restricted';
  } else if (account.details_submitted) {
    user.stripeConnect.onboardingStatus = 'pending';
  }

  // Track pending requirements
  user.stripeConnect.requirementsPending = account.requirements?.currently_due || [];

  await user.save({ validateBeforeSave: false });

  console.log(`[Stripe Connect] Updated account ${accountId} for user ${user._id}. Status: ${user.stripeConnect.onboardingStatus}`);

  // Notify user if onboarding just completed
  if (previousStatus !== 'completed' && user.stripeConnect.onboardingStatus === 'completed') {
    await Notification.createNotification({
      recipient: user._id,
      type: 'stripe_onboarding_completed',
      title: 'Paiements Stripe actives!',
      message: 'Felicitations! Votre compte Stripe est maintenant actif. Vous recevrez automatiquement vos paiements.',
      data: { accountId },
      link: '/dashboard/host/earnings',
      priority: 'high'
    });
  }

  // Notify if account is restricted
  if (user.stripeConnect.onboardingStatus === 'restricted') {
    await Notification.createNotification({
      recipient: user._id,
      type: 'stripe_account_restricted',
      title: 'Action requise sur votre compte Stripe',
      message: 'Des informations supplementaires sont necessaires pour votre compte Stripe. Veuillez completer votre profil.',
      data: { accountId, requirements: user.stripeConnect.requirementsPending },
      link: '/dashboard/host/payments/setup',
      priority: 'urgent'
    });
  }
}

/**
 * Handle Stripe dispute created (chargeback)
 * Freeze escrow and notify parties
 */
async function handleStripeDisputeCreated(dispute) {
  const chargeId = dispute.charge;

  // Find booking by charge ID
  const booking = await Booking.findOne({
    'payment.stripeChargeId': chargeId
  }).populate('guest host listing');

  if (!booking) {
    console.log(`[Stripe Webhook] No booking found for disputed charge: ${chargeId}`);
    return;
  }

  console.log(`[Stripe Webhook] Dispute created for booking ${booking._id}: ${dispute.reason}`);

  // Find and freeze escrow
  const Escrow = require('../models/Escrow');
  const escrow = await Escrow.findOne({ booking: booking._id });

  if (escrow && escrow.status === 'held') {
    escrow.status = 'frozen';
    escrow.frozenAt = new Date();
    escrow.addHistory('frozen', {
      note: `Stripe dispute opened: ${dispute.reason}. Dispute ID: ${dispute.id}`
    });
    await escrow.save();
    console.log(`[Stripe Webhook] Froze escrow ${escrow._id} due to dispute`);
  }

  // Notify host
  await Notification.createNotification({
    recipient: booking.host._id,
    type: 'dispute_opened',
    title: '⚠️ Litige Stripe ouvert',
    message: `Un litige a été ouvert pour la réservation "${booking.listing?.title}". Les fonds sont gelés. Raison: ${dispute.reason}`,
    data: { bookingId: booking._id, disputeId: dispute.id },
    link: `/dashboard/host/bookings/${booking._id}`,
    priority: 'urgent'
  });

  // Notify guest
  await Notification.createNotification({
    recipient: booking.guest._id,
    type: 'dispute_opened',
    title: 'Litige en cours',
    message: `Votre contestation de paiement est en cours d'examen.`,
    data: { bookingId: booking._id },
    link: `/dashboard/bookings/${booking._id}`
  });
}

/**
 * Handle Stripe dispute closed
 * Unfreeze escrow based on outcome
 */
async function handleStripeDisputeClosed(dispute) {
  const chargeId = dispute.charge;

  const booking = await Booking.findOne({
    'payment.stripeChargeId': chargeId
  }).populate('guest host');

  if (!booking) {
    console.log(`[Stripe Webhook] No booking found for closed dispute charge: ${chargeId}`);
    return;
  }

  console.log(`[Stripe Webhook] Dispute closed for booking ${booking._id}. Status: ${dispute.status}`);

  const Escrow = require('../models/Escrow');
  const escrow = await Escrow.findOne({ booking: booking._id });

  if (escrow && escrow.status === 'frozen') {
    if (dispute.status === 'won') {
      // Host won - unfreeze and release
      escrow.status = 'held';
      escrow.unfrozenAt = new Date();
      escrow.addHistory('unfrozen', {
        note: `Stripe dispute won. Funds will be released.`
      });
      await escrow.save();

      // Notify host
      await Notification.createNotification({
        recipient: booking.host._id,
        type: 'dispute_resolved',
        title: '✅ Litige gagné',
        message: `Le litige a été résolu en votre faveur. Les fonds seront libérés.`,
        link: `/dashboard/host/bookings/${booking._id}`
      });
    } else if (dispute.status === 'lost') {
      // Guest won - mark as refunded
      escrow.status = 'refunded';
      escrow.refundAmount = dispute.amount / 100;
      escrow.refundReason = `Stripe dispute lost: ${dispute.reason}`;
      escrow.refundedAt = new Date();
      escrow.addHistory('refunded', {
        amount: dispute.amount / 100,
        note: `Stripe dispute lost. Chargeback processed.`
      });
      await escrow.save();

      // Update booking
      booking.payment.status = 'refunded';
      booking.payment.refundAmount = dispute.amount / 100;
      booking.payment.refundedAt = new Date();
      await booking.save({ validateBeforeSave: false });

      // Notify host
      await Notification.createNotification({
        recipient: booking.host._id,
        type: 'dispute_resolved',
        title: '❌ Litige perdu',
        message: `Le litige a été résolu en faveur du voyageur. Un remboursement a été effectué.`,
        link: `/dashboard/host/bookings/${booking._id}`,
        priority: 'high'
      });
    }
  }
}

/**
 * Handle Stripe transfer failed
 * Create fallback manual payout and notify
 */
async function handleStripeTransferFailed(transfer) {
  console.log(`[Stripe Webhook] Transfer failed: ${transfer.id}`);

  // Find payout linked to this transfer
  const Payout = require('../models/Payout');
  const payout = await Payout.findOne({ stripeTransferId: transfer.id }).populate('host booking');

  if (!payout) {
    console.log(`[Stripe Webhook] No payout found for failed transfer: ${transfer.id}`);
    return;
  }

  // Mark payout as failed, needs manual processing
  payout.status = 'pending';
  payout.paymentMethod = 'bank_transfer'; // Fallback to manual
  payout.adminNotes = `Stripe transfer failed: ${transfer.failure_message || 'Unknown error'}. Requires manual processing.`;
  payout.stripeTransferId = null; // Clear failed transfer
  await payout.save();

  // Notify admin
  console.error(`[Stripe Webhook] ALERT: Transfer ${transfer.id} failed for payout ${payout._id}. Amount: ${payout.amount} ${payout.currency}`);

  // Notify host
  await Notification.createNotification({
    recipient: payout.host._id,
    type: 'payout_delayed',
    title: 'Paiement en attente',
    message: `Votre paiement de ${payout.amount} ${payout.currency} nécessite un traitement manuel. Notre équipe s'en occupe.`,
    data: { payoutId: payout._id },
    link: '/dashboard/host/earnings'
  });
}

/**
 * Handle Stripe Connect account deauthorized
 * Called when a host disconnects their Stripe account
 */
async function handleStripeAccountDeauthorized(account) {
  const accountId = account.id;

  const user = await User.findOne({ 'stripeConnect.accountId': accountId });

  if (!user) {
    console.log(`[Stripe Connect] No user found for deauthorized account: ${accountId}`);
    return;
  }

  // Mark account as disconnected but keep the record
  user.stripeConnect.onboardingStatus = 'not_started';
  user.stripeConnect.chargesEnabled = false;
  user.stripeConnect.payoutsEnabled = false;

  await user.save({ validateBeforeSave: false });

  console.log(`[Stripe Connect] Account ${accountId} deauthorized for user ${user._id}`);

  // Notify user
  await Notification.createNotification({
    recipient: user._id,
    type: 'stripe_account_disconnected',
    title: 'Compte Stripe deconnecte',
    message: 'Votre compte Stripe a ete deconnecte. Reconfigurez vos paiements pour continuer a recevoir des virements.',
    data: { accountId },
    link: '/dashboard/host/payments/setup',
    priority: 'high'
  });
}

module.exports = {
  handleSlickPayWebhook,
  handleChargilyWebhook,
  testWebhook,
  handleStripeWebhook
};
