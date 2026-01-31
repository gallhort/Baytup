/**
 * Refund Calculator Service
 * Implements Airbnb-style refund policies
 *
 * Baytup Fee Structure:
 * - Guest Service Fee (8%): NEVER refunded (platform revenue)
 * - Host Commission (3%): Applied only to portion host keeps
 * - Cleaning Fee: Refunded ONLY if cancellation is BEFORE check-in
 * - NO TAXES: Hosts are responsible for their own tax declarations
 *
 * GRACE PERIOD (48h rule):
 * - If cancelled within 48h of booking AND check-in > 14 days away
 * - Guest gets FULL refund including service fees
 * - Baytup absorbs Stripe fees (~1.5%) as goodwill gesture
 *
 * On cancellation:
 * - Guest receives: refunded portion of subtotal + cleaningFee
 * - Host receives: kept portion of (subtotal + cleaningFee) - 3% commission on kept portion
 * - Platform keeps: guestServiceFee (8% of original) + hostCommission (3% of kept portion)
 */

// Grace period configuration
const GRACE_PERIOD = {
  hoursAfterBooking: 48,    // Cancel within 48h of booking
  minDaysBeforeCheckIn: 14  // Check-in must be > 14 days away
};

class RefundCalculator {
  /**
   * Calculate refund breakdown based on booking and cancellation timing
   * @param {Object} booking - The booking document
   * @param {Object} options - Refund options
   * @param {String} options.reason - 'guest_cancellation', 'host_cancellation', 'dispute', 'admin'
   * @param {Date} options.cancellationDate - When the cancellation was requested
   * @param {Number} options.customRefundPercent - Optional override (for disputes)
   * @returns {Object} Detailed refund breakdown
   */
  calculateRefund(booking, options = {}) {
    const {
      reason = 'guest_cancellation',
      cancellationDate = new Date(),
      customRefundPercent = null
    } = options;

    const pricing = booking.pricing;
    const checkInDate = new Date(booking.startDate);
    const checkOutDate = new Date(booking.endDate);
    const isBeforeCheckIn = cancellationDate < checkInDate;
    const isAfterCheckOut = cancellationDate >= checkOutDate;

    // Get cancellation policy from listing or booking
    const cancellationPolicy = booking.listing?.cancellationPolicy ||
                               booking.cancellationPolicy ||
                               'moderate';

    // Calculate base refund percentage based on policy and timing
    let subtotalRefundPercent;

    if (customRefundPercent !== null) {
      // Admin/dispute override
      subtotalRefundPercent = customRefundPercent;
    } else if (reason === 'host_cancellation') {
      // Host cancels = 100% refund to guest
      subtotalRefundPercent = 100;
    } else if (isAfterCheckOut) {
      // After checkout = no refund
      subtotalRefundPercent = 0;
    } else if (isBeforeCheckIn) {
      // Before check-in = based on cancellation policy
      subtotalRefundPercent = this.getPolicyRefundPercent(
        cancellationPolicy,
        checkInDate,
        cancellationDate
      );
    } else {
      // During stay = refund unused nights only
      subtotalRefundPercent = this.calculateUnusedNightsPercent(
        checkInDate,
        checkOutDate,
        cancellationDate,
        pricing.nights
      );
    }

    // Calculate amounts - support new fee structure with backward compatibility
    const subtotal = pricing.subtotal || 0;
    const cleaningFee = pricing.cleaningFee || 0;
    // Use guestServiceFee if available, otherwise fall back to serviceFee
    const guestServiceFee = pricing.guestServiceFee || pricing.serviceFee || 0;
    const taxes = pricing.taxes || 0;
    const totalAmount = pricing.totalAmount || 0;

    // Original base amount (what host would receive before commission)
    const originalBaseAmount = subtotal + cleaningFee;

    // Check GRACE PERIOD eligibility
    // Conditions: within 48h of booking AND check-in > 14 days away
    const isInGracePeriod = this.isInGracePeriod(booking, cancellationDate, checkInDate);

    // Subtotal refund
    const subtotalRefund = Math.round(subtotal * (subtotalRefundPercent / 100));

    // Cleaning fee: refunded only if before check-in
    const cleaningFeeRefund = isBeforeCheckIn ? cleaningFee : 0;

    // Guest Service Fee:
    // - In grace period: FULL refund (Baytup absorbs Stripe fees)
    // - Otherwise: NEVER refunded (Baytup keeps 8%)
    const guestServiceFeeRefund = isInGracePeriod ? guestServiceFee : 0;

    // Taxes: proportional to what's being refunded
    const refundableBase = subtotal + cleaningFee; // Base for tax calculation
    const refundedBase = subtotalRefund + cleaningFeeRefund;
    const taxRefundPercent = refundableBase > 0 ? (refundedBase / refundableBase) * 100 : 0;
    const taxRefund = Math.round(taxes * (taxRefundPercent / 100));

    // Total refund to guest
    const totalRefund = subtotalRefund + cleaningFeeRefund + guestServiceFeeRefund + taxRefund;

    // What host would have received (before refund and after 3% commission)
    // Host keeps: subtotal + cleaningFee - refunds - 3% commission on kept portion
    const hostKeptBase = (subtotal - subtotalRefund) + (cleaningFee - cleaningFeeRefund);
    const hostCommissionOnKept = Math.round(hostKeptBase * 0.03);

    // What host loses (portion refunded to guest)
    const hostLoss = subtotalRefund + cleaningFeeRefund;

    // What host still receives after refund and commission
    const hostReceives = hostKeptBase - hostCommissionOnKept;

    // What Baytup keeps:
    // - In grace period: only commission on kept (Baytup absorbs Stripe fees)
    // - Otherwise: 8% guest service fee + 3% commission on kept
    const platformKeeps = (guestServiceFee - guestServiceFeeRefund) + hostCommissionOnKept;

    return {
      // Input data
      booking: {
        id: booking._id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        nights: pricing.nights,
        cancellationPolicy
      },
      cancellation: {
        date: cancellationDate,
        reason,
        isBeforeCheckIn,
        isAfterCheckOut,
        isDuringStay: !isBeforeCheckIn && !isAfterCheckOut,
        isInGracePeriod // 48h grace period applies
      },

      // Original amounts
      original: {
        subtotal,
        cleaningFee,
        guestServiceFee,
        serviceFee: guestServiceFee, // Legacy alias
        taxes,
        totalAmount,
        baseAmount: originalBaseAmount // subtotal + cleaningFee
      },

      // Refund breakdown
      refund: {
        subtotal: subtotalRefund,
        subtotalPercent: subtotalRefundPercent,
        cleaningFee: cleaningFeeRefund,
        cleaningFeeRefunded: isBeforeCheckIn,
        guestServiceFee: guestServiceFeeRefund,
        serviceFee: guestServiceFeeRefund, // Legacy alias
        serviceFeeRefunded: isInGracePeriod, // Only in 48h grace period
        taxes: taxRefund,
        taxPercent: Math.round(taxRefundPercent),
        total: totalRefund
      },

      // Distribution - Baytup fee model: 8% guest + 3% host
      distribution: {
        guestRefund: totalRefund,
        hostReceives,
        hostLoss,
        hostCommissionOnKept, // 3% of what host keeps
        platformKeeps, // What Baytup actually keeps after refund
        platformBreakdown: {
          guestServiceFeeKept: guestServiceFee - guestServiceFeeRefund, // 0 if grace period
          guestServiceFeeRefunded: guestServiceFeeRefund, // Full amount if grace period
          hostCommission: hostCommissionOnKept // 3% of kept portion
        },
        gracePeriodApplied: isInGracePeriod
      },

      // Summary message
      summary: this.generateSummary({
        totalRefund,
        subtotalRefundPercent,
        isBeforeCheckIn,
        cleaningFeeRefund,
        guestServiceFee,
        guestServiceFeeRefund,
        isInGracePeriod,
        reason
      })
    };
  }

  /**
   * Get refund percentage based on cancellation policy
   * @param {String} policy - 'flexible', 'moderate', 'strict', 'super_strict'
   * @param {Date} checkInDate - Check-in date
   * @param {Date} cancellationDate - When cancellation was made
   * @returns {Number} Refund percentage (0-100)
   */
  getPolicyRefundPercent(policy, checkInDate, cancellationDate) {
    const hoursUntilCheckIn = (checkInDate - cancellationDate) / (1000 * 60 * 60);
    const daysUntilCheckIn = hoursUntilCheckIn / 24;

    switch (policy) {
      case 'flexible':
        // Full refund if cancelled 24h+ before check-in
        // 0% if cancelled < 24h before check-in
        return hoursUntilCheckIn >= 24 ? 100 : 0;

      case 'moderate':
        // Full refund if cancelled 5+ days before check-in
        // 50% if cancelled < 5 days before check-in
        return daysUntilCheckIn >= 5 ? 100 : 50;

      case 'strict':
        // Full refund if cancelled 14+ days before check-in
        // 50% if cancelled 7-14 days before check-in
        // 0% if cancelled < 7 days before check-in
        if (daysUntilCheckIn >= 14) return 100;
        if (daysUntilCheckIn >= 7) return 50;
        return 0;

      case 'super_strict':
        // Full refund if cancelled 30+ days before check-in
        // 50% if cancelled 14-30 days before check-in
        // 0% if cancelled < 14 days before check-in
        if (daysUntilCheckIn >= 30) return 100;
        if (daysUntilCheckIn >= 14) return 50;
        return 0;

      default:
        // Default to moderate
        return daysUntilCheckIn >= 5 ? 100 : 50;
    }
  }

  /**
   * Calculate refund percentage for unused nights (early departure)
   * @param {Date} checkInDate - Original check-in date
   * @param {Date} checkOutDate - Original check-out date
   * @param {Date} departureDate - Actual departure date
   * @param {Number} totalNights - Total booked nights
   * @returns {Number} Refund percentage for unused nights
   */
  calculateUnusedNightsPercent(checkInDate, checkOutDate, departureDate, totalNights) {
    // Calculate nights already used
    const nightsUsed = Math.ceil((departureDate - checkInDate) / (1000 * 60 * 60 * 24));
    const nightsUnused = Math.max(0, totalNights - nightsUsed);

    // Refund percentage = unused nights / total nights
    return totalNights > 0 ? Math.round((nightsUnused / totalNights) * 100) : 0;
  }

  /**
   * Generate human-readable summary of refund
   * @param {Object} data - Refund data
   * @returns {String} Summary message
   */
  generateSummary(data) {
    const {
      totalRefund,
      subtotalRefundPercent,
      isBeforeCheckIn,
      cleaningFeeRefund,
      guestServiceFee,
      guestServiceFeeRefund,
      isInGracePeriod,
      reason
    } = data;

    let parts = [];

    // Grace period message
    if (isInGracePeriod) {
      parts.push('✨ Période de grâce 48h: remboursement intégral');
    } else if (reason === 'host_cancellation') {
      parts.push('Annulation par l\'hôte: remboursement intégral');
    } else if (subtotalRefundPercent === 100) {
      parts.push('Remboursement intégral du séjour');
    } else if (subtotalRefundPercent === 0) {
      parts.push('Aucun remboursement sur le séjour');
    } else {
      parts.push(`Remboursement de ${subtotalRefundPercent}% du séjour`);
    }

    if (cleaningFeeRefund > 0) {
      parts.push('frais de ménage remboursés');
    } else if (!isBeforeCheckIn) {
      parts.push('frais de ménage non remboursés (après check-in)');
    }

    // Service fee message
    if (isInGracePeriod && guestServiceFeeRefund > 0) {
      parts.push(`frais de service (8%) remboursés (${guestServiceFeeRefund}€)`);
    } else {
      parts.push(`frais de service (8%) non remboursés (${guestServiceFee}€ conservés par Baytup)`);
    }

    return parts.join('. ') + '.';
  }

  /**
   * Check if cancellation is within grace period
   * Grace period: within 48h of booking AND check-in > 14 days away
   * @param {Object} booking - The booking document
   * @param {Date} cancellationDate - When cancellation was requested
   * @param {Date} checkInDate - Check-in date
   * @returns {Boolean} True if in grace period
   */
  isInGracePeriod(booking, cancellationDate, checkInDate) {
    // Need booking creation date
    const bookingCreatedAt = booking.createdAt ? new Date(booking.createdAt) : null;

    if (!bookingCreatedAt) {
      // If no creation date, assume not in grace period (legacy bookings)
      return false;
    }

    // Calculate hours since booking was created
    const hoursSinceBooking = (cancellationDate - bookingCreatedAt) / (1000 * 60 * 60);

    // Calculate days until check-in
    const daysUntilCheckIn = (checkInDate - cancellationDate) / (1000 * 60 * 60 * 24);

    // Grace period conditions:
    // 1. Cancelled within 48h of booking
    // 2. Check-in is more than 14 days away
    const isWithin48h = hoursSinceBooking <= GRACE_PERIOD.hoursAfterBooking;
    const isCheckInFarEnough = daysUntilCheckIn >= GRACE_PERIOD.minDaysBeforeCheckIn;

    return isWithin48h && isCheckInFarEnough;
  }

  /**
   * Calculate refund for dispute resolution
   * Admin can specify custom split between host and guest
   * @param {Object} booking - The booking document
   * @param {Number} guestPercent - Percentage to refund to guest (0-100)
   * @returns {Object} Refund breakdown
   */
  calculateDisputeRefund(booking, guestPercent) {
    return this.calculateRefund(booking, {
      reason: 'dispute',
      customRefundPercent: guestPercent,
      cancellationDate: new Date()
    });
  }

  /**
   * Validate if refund is possible
   * @param {Object} booking - The booking document
   * @returns {Object} { canRefund: boolean, reason: string }
   */
  canRefund(booking) {
    // Check payment status
    if (booking.payment?.status !== 'paid') {
      return { canRefund: false, reason: 'Le paiement n\'a pas été effectué' };
    }

    // Check if already refunded
    if (booking.payment?.status === 'refunded') {
      return { canRefund: false, reason: 'Le remboursement a déjà été effectué' };
    }

    // Check booking status
    const nonRefundableStatuses = ['cancelled', 'expired', 'rejected'];
    if (nonRefundableStatuses.includes(booking.status)) {
      return { canRefund: false, reason: `Impossible de rembourser une réservation ${booking.status}` };
    }

    return { canRefund: true, reason: null };
  }
}

module.exports = new RefundCalculator();
