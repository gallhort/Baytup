const Escrow = require('../models/Escrow');
const Booking = require('../models/Booking');
const Payout = require('../models/Payout');
const Dispute = require('../models/Dispute');
const Notification = require('../models/Notification');
const User = require('../models/User');
const refundCalculator = require('./refundCalculator');
const { GUEST_SERVICE_FEE_RATE, HOST_COMMISSION_RATE } = require('../config/fees');

class EscrowService {
  /**
   * Create escrow when payment is captured
   * @param {Object} booking - The booking document
   * @param {Object} paymentDetails - Payment provider details
   * @returns {Promise<Object>} - Created escrow document
   */
  async createEscrow(booking, paymentDetails) {
    // Calculate release date: checkout + 24h
    const releaseDate = new Date(booking.endDate);
    releaseDate.setHours(releaseDate.getHours() + 24);

    // Detailed breakdown for refund calculation
    // Baytup Fee Structure: 8% guest service fee + 3% host commission = 11% total
    const subtotal = booking.pricing.subtotal || 0;
    const cleaningFee = booking.pricing.cleaningFee || 0;
    const baseAmount = subtotal + cleaningFee;

    // Use new fields if available, calculate fallback for legacy bookings
    const guestServiceFee = booking.pricing.guestServiceFee || booking.pricing.serviceFee || Math.round(baseAmount * GUEST_SERVICE_FEE_RATE);
    const hostCommission = booking.pricing.hostCommission || Math.round(baseAmount * HOST_COMMISSION_RATE);
    const serviceFee = guestServiceFee; // Legacy alias
    const taxes = booking.pricing.taxes || 0;

    // What host receives = baseAmount - 3% commission
    const hostAmount = booking.pricing.hostPayout || (baseAmount - hostCommission);
    // Platform revenue = 8% guest fee + 3% host commission
    const platformFee = booking.pricing.platformRevenue || (guestServiceFee + hostCommission);

    const escrow = await Escrow.create({
      booking: booking._id,
      payer: booking.guest,
      payee: booking.host,
      amount: booking.pricing.totalAmount,
      currency: booking.pricing.currency || 'DZD',
      breakdown: {
        // Detailed amounts for refund calculation
        subtotal,
        cleaningFee,
        guestServiceFee,
        hostCommission,
        serviceFee, // Legacy alias
        taxes,
        // Calculated totals
        hostAmount,
        platformFee,
        taxAmount: taxes
      },
      status: 'held',
      capturedAt: new Date(),
      releaseScheduledAt: releaseDate,
      paymentProvider: paymentDetails.provider,
      providerTransactionId: paymentDetails.transactionId,
      history: [{
        action: 'captured',
        amount: booking.pricing.totalAmount,
        note: `Payment captured and held in escrow. Release scheduled for ${releaseDate.toISOString()}`
      }]
    });

    // Update booking with escrow reference
    booking.escrow = escrow._id;
    await booking.save();

    console.log(`[EscrowService] Created escrow ${escrow._id} for booking ${booking._id}`);

    return escrow;
  }

  /**
   * Auto-release funds (called by cron job)
   * Checks for disputes before releasing
   * @param {Object} escrow - The escrow document
   * @returns {Promise<Object>} - Updated escrow document
   */
  async autoReleaseFunds(escrow) {
    // Check for active disputes
    const activeDispute = await Dispute.findOne({
      booking: escrow.booking,
      status: { $in: ['open', 'pending'] }
    });

    if (activeDispute) {
      console.log(`[EscrowService] Active dispute found for escrow ${escrow._id}, freezing...`);
      return this.freezeEscrow(escrow, activeDispute);
    }

    return this.releaseFunds(escrow, 'auto');
  }

  /**
   * Release funds to host
   * @param {Object} escrow - The escrow document
   * @param {String} releaseType - 'auto', 'manual', or 'dispute_resolution'
   * @param {ObjectId} releasedBy - Admin user ID (for manual release)
   * @returns {Promise<Object>} - Updated escrow document
   */
  /**
   * Patch legacy escrows missing required breakdown fields
   */
  _patchLegacyBreakdown(escrow) {
    if (!escrow.breakdown) {
      escrow.breakdown = {};
    }
    if (!escrow.breakdown.subtotal) {
      escrow.breakdown.subtotal = escrow.amount || 0;
    }
    if (!escrow.breakdown.hostAmount) {
      escrow.breakdown.hostAmount = escrow.amount || 0;
    }
  }

  async releaseFunds(escrow, releaseType = 'manual', releasedBy = null) {
    if (!['held', 'frozen'].includes(escrow.status)) {
      throw new Error(`Cannot release escrow with status: ${escrow.status}`);
    }

    // Patch legacy escrows missing breakdown fields
    this._patchLegacyBreakdown(escrow);

    escrow.status = 'released';
    escrow.releasedAt = new Date();
    escrow.releaseType = releaseType;
    escrow.releasedBy = releasedBy;

    escrow.addHistory('released', {
      amount: escrow.breakdown.hostAmount,
      performedBy: releasedBy,
      note: `Funds released to host (${releaseType}). Amount: ${escrow.breakdown.hostAmount} ${escrow.currency}`
    });

    await escrow.save();

    // Create automatic payout for the host
    const payout = await this.createPayoutFromEscrow(escrow);

    // Notify host about funds release
    await this.notifyFundsReleased(escrow);

    console.log(`[EscrowService] Released escrow ${escrow._id}, created payout ${payout._id}`);

    return escrow;
  }

  /**
   * Freeze escrow due to dispute
   * @param {Object} escrow - The escrow document
   * @param {Object} dispute - The dispute document
   * @returns {Promise<Object>} - Updated escrow document
   */
  async freezeEscrow(escrow, dispute) {
    if (escrow.status === 'frozen') {
      console.log(`[EscrowService] Escrow ${escrow._id} already frozen`);
      return escrow;
    }

    this._patchLegacyBreakdown(escrow);
    escrow.status = 'frozen';
    escrow.frozenAt = new Date();
    escrow.dispute = dispute._id;

    escrow.addHistory('frozen', {
      note: `Escrow frozen due to dispute: ${dispute.reason}. Dispute ID: ${dispute._id}`
    });

    await escrow.save();

    // Notify both parties
    await this.notifyEscrowFrozen(escrow, dispute);

    console.log(`[EscrowService] Frozen escrow ${escrow._id} for dispute ${dispute._id}`);

    return escrow;
  }

  /**
   * Unfreeze escrow after dispute is resolved
   * @param {Object} escrow - The escrow document
   * @returns {Promise<Object>} - Updated escrow document
   */
  async unfreezeEscrow(escrow) {
    if (escrow.status !== 'frozen') {
      throw new Error('Escrow is not frozen');
    }

    this._patchLegacyBreakdown(escrow);
    escrow.status = 'held';
    escrow.unfrozenAt = new Date();

    escrow.addHistory('unfrozen', {
      note: 'Escrow unfrozen after dispute resolution'
    });

    await escrow.save();

    console.log(`[EscrowService] Unfrozen escrow ${escrow._id}`);

    return escrow;
  }

  /**
   * Resolve dispute and split funds between host and guest
   * @param {Object} escrow - The escrow document
   * @param {Object} resolution - { hostPortion, guestPortion, resolvedBy, notes }
   * @returns {Promise<Object>} - Updated escrow document
   */
  async resolveDispute(escrow, resolution) {
    const { hostPortion, guestPortion, resolvedBy, notes } = resolution;

    this._patchLegacyBreakdown(escrow);

    // Validate amounts
    const totalToDistribute = escrow.breakdown.hostAmount;
    if (hostPortion + guestPortion > totalToDistribute) {
      throw new Error(`Split exceeds available amount. Max: ${totalToDistribute} ${escrow.currency}`);
    }

    // Determine final status
    let newStatus;
    if (guestPortion === 0) {
      newStatus = 'released';
    } else if (hostPortion === 0) {
      newStatus = 'refunded';
    } else {
      newStatus = 'partial_release';
    }

    escrow.status = newStatus;
    escrow.unfrozenAt = new Date();
    escrow.releasedAt = new Date();
    escrow.releaseType = 'dispute_resolution';
    escrow.releasedBy = resolvedBy;

    escrow.disputeResolution = {
      hostPortion,
      guestPortion,
      resolvedAt: new Date(),
      resolvedBy,
      notes
    };

    escrow.addHistory('dispute_resolved', {
      amount: hostPortion,
      performedBy: resolvedBy,
      note: `Dispute resolved. Host: ${hostPortion} ${escrow.currency}, Guest refund: ${guestPortion} ${escrow.currency}. ${notes || ''}`
    });

    await escrow.save();

    // Process refund to guest if applicable
    if (guestPortion > 0) {
      await this.processRefund(escrow, guestPortion, 'Dispute resolution refund');
    }

    // Create payout for host portion if applicable
    if (hostPortion > 0) {
      await this.createPayoutFromEscrow(escrow, hostPortion);
    }

    // Notify both parties
    await this.notifyDisputeResolved(escrow, resolution);

    console.log(`[EscrowService] Resolved dispute for escrow ${escrow._id}. Host: ${hostPortion}, Guest: ${guestPortion}`);

    return escrow;
  }

  /**
   * Process cancellation with Airbnb-style refund policy
   * Service fee is NEVER refunded
   * Cleaning fee is refunded ONLY if before check-in
   * Taxes are proportional to refund amount
   * @param {Object} escrow - The escrow document
   * @param {Object} options - Cancellation options
   * @param {String} options.reason - 'guest_cancellation', 'host_cancellation', 'dispute'
   * @param {Number} options.customRefundPercent - Override for admin/dispute
   * @returns {Promise<Object>} - Updated escrow with refund details
   */
  async processCancellationRefund(escrow, options = {}) {
    this._patchLegacyBreakdown(escrow);
    const booking = await Booking.findById(escrow.booking).populate('listing');

    // Validate refund is possible
    const validation = refundCalculator.canRefund(booking);
    if (!validation.canRefund) {
      throw new Error(validation.reason);
    }

    // Calculate refund breakdown using Airbnb-style policy
    const refundResult = refundCalculator.calculateRefund(booking, {
      reason: options.reason || 'guest_cancellation',
      cancellationDate: options.cancellationDate || new Date(),
      customRefundPercent: options.customRefundPercent
    });

    const totalRefund = refundResult.refund.total;

    // Process actual refund via payment provider
    if (totalRefund > 0) {
      if (escrow.paymentProvider === 'stripe') {
        const stripeService = require('./stripeService');
        if (stripeService && booking.payment.stripeChargeId) {
          try {
            const refund = await stripeService.createRefund(
              booking.payment.stripeChargeId,
              totalRefund
            );
            escrow.providerRefundId = refund.id;
          } catch (error) {
            console.error(`[EscrowService] Stripe refund failed:`, error);
            // Continue with local update, admin will handle manually
          }
        }
      } else if (escrow.paymentProvider === 'slickpay') {
        console.log(`[EscrowService] SlickPay refund needs manual processing. Amount: ${totalRefund}`);
      }
    }

    // Store detailed refund breakdown
    escrow.refundBreakdown = {
      subtotal: refundResult.refund.subtotal,
      cleaningFee: refundResult.refund.cleaningFee,
      serviceFee: 0, // Never refunded
      taxes: refundResult.refund.taxes,
      total: totalRefund,
      reason: refundResult.cancellation.reason,
      isBeforeCheckIn: refundResult.cancellation.isBeforeCheckIn,
      cancellationPolicy: refundResult.booking.cancellationPolicy
    };

    escrow.refundAmount = totalRefund;
    escrow.refundReason = refundResult.summary;
    escrow.refundedAt = new Date();

    // Determine status
    const maxRefundable = escrow.breakdown.subtotal + escrow.breakdown.cleaningFee + escrow.breakdown.taxes;
    if (totalRefund >= maxRefundable) {
      escrow.status = 'refunded';
    } else if (totalRefund > 0) {
      escrow.status = 'partial_refund';
    }

    escrow.addHistory('refunded', {
      amount: totalRefund,
      note: refundResult.summary
    });

    await escrow.save();

    // Update booking
    booking.payment.status = totalRefund >= maxRefundable ? 'refunded' : 'partially_refunded';
    booking.payment.refundAmount = totalRefund;
    booking.payment.refundReason = refundResult.summary;
    booking.payment.refundedAt = new Date();
    booking.payment.refundBreakdown = refundResult.refund;
    await booking.save({ validateBeforeSave: false });

    // What host still receives (if partial refund)
    const hostReceives = refundResult.distribution.hostReceives;
    if (hostReceives > 0 && escrow.status === 'partial_refund') {
      // Create payout for remaining host amount
      await this.createPayoutFromEscrow(escrow, hostReceives);
    }

    // Notify guest
    await this.notifyRefundProcessed(escrow, totalRefund);

    console.log(`[EscrowService] Processed cancellation refund: ${totalRefund} ${escrow.currency}`);
    console.log(`[EscrowService] Breakdown - Subtotal: ${refundResult.refund.subtotal}, CleaningFee: ${refundResult.refund.cleaningFee}, Taxes: ${refundResult.refund.taxes}`);
    console.log(`[EscrowService] Service fee kept by platform: ${escrow.breakdown.serviceFee} ${escrow.currency}`);

    return {
      escrow,
      refundDetails: refundResult
    };
  }

  /**
   * Process refund to guest (legacy method - for backward compatibility)
   * For proper refund with fee breakdown, use processCancellationRefund
   * @param {Object} escrow - The escrow document
   * @param {Number} amount - Amount to refund
   * @param {String} reason - Refund reason
   * @returns {Promise<Object>} - Updated escrow document
   */
  async processRefund(escrow, amount, reason = 'Refund requested') {
    this._patchLegacyBreakdown(escrow);
    const booking = await Booking.findById(escrow.booking);

    // Calculate max refundable (exclude service fee which is never refunded)
    const maxRefundable = (escrow.breakdown.subtotal || 0) +
                          (escrow.breakdown.cleaningFee || 0) +
                          (escrow.breakdown.taxes || 0);

    // Check if refund would exceed available amount
    const alreadyRefunded = escrow.refundAmount || 0;
    const remainingRefundable = maxRefundable - alreadyRefunded;

    if (amount > remainingRefundable) {
      throw new Error(`Refund amount (${amount}) exceeds available refundable amount (${remainingRefundable}). Max refundable: ${maxRefundable}, Already refunded: ${alreadyRefunded}`);
    }

    // Process refund based on payment provider
    if (escrow.paymentProvider === 'stripe') {
      // Stripe refund will be handled in stripeService
      const stripeService = require('./stripeService');
      if (stripeService && booking.payment.stripeChargeId) {
        try {
          const refund = await stripeService.createRefund(
            booking.payment.stripeChargeId,
            amount
          );
          escrow.providerRefundId = refund.id;
        } catch (error) {
          console.error(`[EscrowService] Stripe refund failed:`, error);
          // Continue with local update, admin will handle manually
        }
      }
    } else if (escrow.paymentProvider === 'slickpay') {
      // SlickPay refund - manual process, just update status
      console.log(`[EscrowService] SlickPay refund needs manual processing. Amount: ${amount}`);
    }

    escrow.refundAmount = alreadyRefunded + amount;
    escrow.refundReason = reason;
    escrow.refundedAt = new Date();

    // Check if this is a full refund
    if (escrow.refundAmount >= maxRefundable) {
      escrow.status = 'refunded';
    } else {
      escrow.status = 'partial_refund';
    }

    escrow.addHistory('refunded', {
      amount,
      note: `Refund processed: ${amount} ${escrow.currency}. Reason: ${reason}`
    });

    await escrow.save();

    // Update booking payment status
    booking.payment.status = escrow.status === 'refunded' ? 'refunded' : 'partially_refunded';
    booking.payment.refundAmount = (booking.payment.refundAmount || 0) + amount;
    booking.payment.refundReason = reason;
    booking.payment.refundedAt = new Date();
    await booking.save({ validateBeforeSave: false });

    // Notify guest about refund
    await this.notifyRefundProcessed(escrow, amount);

    console.log(`[EscrowService] Processed refund of ${amount} ${escrow.currency} for escrow ${escrow._id}`);

    return escrow;
  }

  /**
   * Calculate refund preview (without actually processing)
   * Useful for showing user what they'll receive before confirming
   * @param {Object} booking - The booking document
   * @param {Object} options - Cancellation options
   * @returns {Object} - Refund breakdown preview
   */
  async calculateRefundPreview(booking, options = {}) {
    const populatedBooking = await Booking.findById(booking._id || booking).populate('listing');
    return refundCalculator.calculateRefund(populatedBooking, options);
  }

  /**
   * Create payout from released escrow
   * If host has Stripe Connect, execute transfer directly
   * Otherwise create manual payout record
   * @param {Object} escrow - The escrow document
   * @param {Number} customAmount - Optional custom amount (for dispute resolution)
   * @returns {Promise<Object>} - Created payout document
   */
  async createPayoutFromEscrow(escrow, customAmount = null) {
    // Validate escrow status - only allow payout from released/partial_release escrows
    // Exception: dispute resolution may pass customAmount with frozen escrow
    const validStatuses = ['released', 'partial_release', 'partial_refund'];
    if (!customAmount && !validStatuses.includes(escrow.status)) {
      throw new Error(`Cannot create payout for escrow with status: ${escrow.status}. Must be released first.`);
    }

    this._patchLegacyBreakdown(escrow);
    const booking = await Booking.findById(escrow.booking).populate('host listing');
    const host = booking.host;

    const payoutAmount = customAmount || escrow.breakdown.hostAmount;
    const stripeService = require('./stripeService');

    // Check if Stripe Connect transfer is possible (EUR payments with onboarded host)
    const canUseStripeConnect =
      escrow.currency === 'EUR' &&
      escrow.paymentProvider === 'stripe' &&
      host.stripeConnect?.accountId &&
      host.stripeConnect?.payoutsEnabled &&
      host.stripeConnect?.onboardingStatus === 'completed';

    let stripeTransfer = null;

    // Execute Stripe Connect transfer if available
    if (canUseStripeConnect) {
      try {
        console.log(`[EscrowService] Executing Stripe Connect transfer to ${host.stripeConnect.accountId}`);

        stripeTransfer = await stripeService.createTransfer({
          amount: payoutAmount,
          currency: escrow.currency,
          destinationAccountId: host.stripeConnect.accountId,
          bookingId: booking._id,
          escrowId: escrow._id,
          description: `Baytup - Paiement ${booking.listing?.title || 'Réservation'}`
        });

        console.log(`[EscrowService] Stripe transfer successful: ${stripeTransfer.transferId}`);
      } catch (transferError) {
        console.error(`[EscrowService] Stripe transfer failed:`, transferError.message);
        // Continue with manual payout creation
        stripeTransfer = null;
      }
    } else if (escrow.currency === 'EUR' && escrow.paymentProvider === 'stripe') {
      console.log(`[EscrowService] Host ${host._id} not onboarded to Stripe Connect, creating manual payout`);

      // Notify host to complete Stripe onboarding
      if (!host.stripeConnect?.accountId) {
        await Notification.createNotification({
          recipient: host._id,
          type: 'stripe_onboarding_required',
          title: 'Configurez Stripe pour vos paiements 💳',
          message: `Vous avez ${payoutAmount} ${escrow.currency} en attente. Activez les paiements Stripe pour les recevoir automatiquement.`,
          data: {
            pendingAmount: payoutAmount,
            currency: escrow.currency
          },
          link: '/dashboard/host/payments/setup',
          priority: 'high'
        });
      }
    }

    // Create payout record
    const payoutData = {
      host: host._id,
      booking: booking._id,
      escrow: escrow._id,
      amount: payoutAmount,
      currency: escrow.currency,
      autoGenerated: true,
      autoGeneratedAt: new Date(),
      hostNotes: `Auto-généré depuis escrow release pour booking ${booking._id}`
    };

    // If Stripe transfer succeeded, mark as completed
    if (stripeTransfer) {
      payoutData.status = 'completed';
      payoutData.stripeTransferId = stripeTransfer.transferId;
      payoutData.paymentMethod = 'stripe_connect';
      payoutData.processedAt = new Date();
      payoutData.adminNotes = `Transfert Stripe automatique: ${stripeTransfer.transferId}`;
    } else {
      // Manual payout needed
      payoutData.status = 'pending';
      payoutData.paymentMethod = escrow.currency === 'EUR' ? 'bank_transfer' : 'bank_transfer';
      payoutData.bankAccount = host.bankAccount || {
        bankName: 'À compléter',
        accountHolderName: `${host.firstName} ${host.lastName}`,
        accountNumber: 'À compléter',
        rib: '00000000000000000000'
      };
    }

    const payout = await Payout.create(payoutData);

    // Link payout to escrow
    escrow.payout = payout._id;
    if (stripeTransfer) {
      escrow.stripeTransferId = stripeTransfer.transferId;
    }
    await escrow.save();

    console.log(`[EscrowService] Created payout ${payout._id} for ${payoutAmount} ${escrow.currency} (${stripeTransfer ? 'Stripe Connect' : 'Manual'})`);

    return payout;
  }

  /**
   * Get escrow status for a booking
   * @param {ObjectId} bookingId - Booking ID
   * @returns {Promise<Object|null>} - Escrow document or null
   */
  async getEscrowStatus(bookingId) {
    return await Escrow.findOne({ booking: bookingId })
      .populate('booking', 'startDate endDate status')
      .populate('dispute', 'status reason')
      .populate('payout', 'status amount');
  }

  /**
   * Get all escrows with filters
   * @param {Object} filters - Query filters
   * @returns {Promise<Array>} - Array of escrow documents
   */
  async getAllEscrows(filters = {}) {
    const query = {};

    if (filters.status) query.status = filters.status;
    if (filters.currency) query.currency = filters.currency;
    if (filters.payee) query.payee = filters.payee;
    if (filters.payer) query.payer = filters.payer;

    return await Escrow.find(query)
      .populate('booking', 'startDate endDate status')
      .populate('payer', 'firstName lastName email')
      .populate('payee', 'firstName lastName email')
      .sort({ createdAt: -1 });
  }

  // ============ NOTIFICATION HELPERS ============

  async notifyFundsReleased(escrow) {
    try {
      await Notification.createNotification({
        recipient: escrow.payee,
        type: 'payout_completed',
        title: 'Fonds libérés !',
        message: `Votre paiement de ${escrow.breakdown.hostAmount} ${escrow.currency} a été libéré et sera transféré sous peu.`,
        link: '/dashboard/earnings'
      });
    } catch (error) {
      console.error('[EscrowService] Failed to send release notification:', error);
    }
  }

  async notifyEscrowFrozen(escrow, dispute) {
    try {
      // Notify host
      await Notification.createNotification({
        recipient: escrow.payee,
        type: 'system',
        title: 'Paiement en attente',
        message: `Le paiement pour votre réservation est temporairement bloqué en raison d'un litige. Notre équipe examine le dossier.`,
        link: `/dashboard/bookings/${escrow.booking}`
      });

      // Notify guest
      await Notification.createNotification({
        recipient: escrow.payer,
        type: 'system',
        title: 'Litige en cours',
        message: `Votre litige est en cours d'examen. Les fonds sont sécurisés jusqu'à résolution.`,
        link: `/dashboard/bookings/${escrow.booking}`
      });
    } catch (error) {
      console.error('[EscrowService] Failed to send freeze notification:', error);
    }
  }

  async notifyDisputeResolved(escrow, resolution) {
    try {
      const { hostPortion, guestPortion } = resolution;

      // Notify host
      await Notification.createNotification({
        recipient: escrow.payee,
        type: 'system',
        title: 'Litige résolu',
        message: hostPortion > 0
          ? `Le litige a été résolu. Vous recevrez ${hostPortion} ${escrow.currency}.`
          : `Le litige a été résolu. Un remboursement complet a été accordé au voyageur.`,
        link: '/dashboard/earnings'
      });

      // Notify guest
      await Notification.createNotification({
        recipient: escrow.payer,
        type: 'system',
        title: 'Litige résolu',
        message: guestPortion > 0
          ? `Le litige a été résolu. Vous recevrez un remboursement de ${guestPortion} ${escrow.currency}.`
          : `Le litige a été résolu en faveur de l'hôte.`,
        link: `/dashboard/bookings/${escrow.booking}`
      });
    } catch (error) {
      console.error('[EscrowService] Failed to send dispute resolution notification:', error);
    }
  }

  async notifyRefundProcessed(escrow, amount) {
    try {
      await Notification.createNotification({
        recipient: escrow.payer,
        type: 'booking_payment_updated',
        title: 'Remboursement traité',
        message: `Un remboursement de ${amount} ${escrow.currency} a été initié. Il sera crédité sous 5-10 jours ouvrés.`,
        link: `/dashboard/bookings/${escrow.booking}`
      });
    } catch (error) {
      console.error('[EscrowService] Failed to send refund notification:', error);
    }
  }
}

module.exports = new EscrowService();
