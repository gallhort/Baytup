/**
 * Unit Tests for Refund Calculator Service
 * Tests Airbnb-style refund policies with Baytup fee structure
 */

const refundCalculator = require('../../src/services/refundCalculator');

describe('Refund Calculator Service', () => {

  describe('getPolicyRefundPercent', () => {
    // Signature: getPolicyRefundPercent(policy, checkInDate, cancellationDate)

    it('should return 100% for flexible policy with early cancellation (>24h)', () => {
      const checkIn = new Date('2026-03-20T14:00:00Z');
      const cancellation = new Date('2026-03-15T12:00:00Z'); // 5 days before
      const result = refundCalculator.getPolicyRefundPercent('flexible', checkIn, cancellation);
      expect(result).toBe(100);
    });

    it('should return 0% for flexible policy cancelled less than 24h before', () => {
      const checkIn = new Date('2026-03-15T14:00:00Z');
      const cancellation = new Date('2026-03-15T12:00:00Z'); // 2 hours before
      const result = refundCalculator.getPolicyRefundPercent('flexible', checkIn, cancellation);
      expect(result).toBe(0);
    });

    it('should return 100% for moderate policy 5+ days before', () => {
      const checkIn = new Date('2026-03-25T14:00:00Z');
      const cancellation = new Date('2026-03-15T12:00:00Z'); // 10 days before
      const result = refundCalculator.getPolicyRefundPercent('moderate', checkIn, cancellation);
      expect(result).toBe(100);
    });

    it('should return 50% for moderate policy less than 5 days before', () => {
      const checkIn = new Date('2026-03-18T14:00:00Z');
      const cancellation = new Date('2026-03-15T12:00:00Z'); // 3 days before
      const result = refundCalculator.getPolicyRefundPercent('moderate', checkIn, cancellation);
      expect(result).toBe(50);
    });

    it('should return 100% for strict policy 14+ days before', () => {
      const checkIn = new Date('2026-04-01T14:00:00Z');
      const cancellation = new Date('2026-03-15T12:00:00Z'); // 17 days before
      const result = refundCalculator.getPolicyRefundPercent('strict', checkIn, cancellation);
      expect(result).toBe(100);
    });

    it('should return 50% for strict policy 7-14 days before', () => {
      const checkIn = new Date('2026-03-25T14:00:00Z');
      const cancellation = new Date('2026-03-15T12:00:00Z'); // 10 days before
      const result = refundCalculator.getPolicyRefundPercent('strict', checkIn, cancellation);
      expect(result).toBe(50);
    });

    it('should return 0% for strict policy less than 7 days before', () => {
      const checkIn = new Date('2026-03-20T14:00:00Z');
      const cancellation = new Date('2026-03-15T12:00:00Z'); // 5 days before
      const result = refundCalculator.getPolicyRefundPercent('strict', checkIn, cancellation);
      expect(result).toBe(0);
    });

    it('should return 100% for super_strict 30+ days before', () => {
      const checkIn = new Date('2026-04-20T14:00:00Z');
      const cancellation = new Date('2026-03-15T12:00:00Z'); // 36 days before
      const result = refundCalculator.getPolicyRefundPercent('super_strict', checkIn, cancellation);
      expect(result).toBe(100);
    });

    it('should return 50% for super_strict 14-30 days before', () => {
      const checkIn = new Date('2026-04-05T14:00:00Z');
      const cancellation = new Date('2026-03-15T12:00:00Z'); // 21 days before
      const result = refundCalculator.getPolicyRefundPercent('super_strict', checkIn, cancellation);
      expect(result).toBe(50);
    });

    it('should return 0% for super_strict less than 14 days before', () => {
      const checkIn = new Date('2026-03-25T14:00:00Z');
      const cancellation = new Date('2026-03-15T12:00:00Z'); // 10 days before
      const result = refundCalculator.getPolicyRefundPercent('super_strict', checkIn, cancellation);
      expect(result).toBe(0);
    });

    it('should default to moderate behavior for unknown policy', () => {
      const checkIn = new Date('2026-03-25T14:00:00Z');
      const cancellation = new Date('2026-03-15T12:00:00Z'); // 10 days before
      const result = refundCalculator.getPolicyRefundPercent('unknown_policy', checkIn, cancellation);
      expect(result).toBe(100); // 10 days before = 100% for moderate
    });
  });

  describe('isInGracePeriod', () => {
    // Signature: isInGracePeriod(booking, cancellationDate, checkInDate)

    it('should return true if within 48h of booking and check-in is 14+ days away', () => {
      const booking = {
        createdAt: new Date('2026-03-15T10:00:00Z')
      };
      const cancellationDate = new Date('2026-03-15T20:00:00Z'); // 10 hours later
      const checkInDate = new Date('2026-04-01T14:00:00Z'); // 17 days away

      const result = refundCalculator.isInGracePeriod(booking, cancellationDate, checkInDate);
      expect(result).toBe(true);
    });

    it('should return false if booking made more than 48h ago', () => {
      const booking = {
        createdAt: new Date('2026-03-10T10:00:00Z')
      };
      const cancellationDate = new Date('2026-03-15T20:00:00Z'); // 5 days later
      const checkInDate = new Date('2026-04-01T14:00:00Z');

      const result = refundCalculator.isInGracePeriod(booking, cancellationDate, checkInDate);
      expect(result).toBe(false);
    });

    it('should return false if check-in is less than 14 days away', () => {
      const booking = {
        createdAt: new Date('2026-03-15T10:00:00Z')
      };
      const cancellationDate = new Date('2026-03-15T20:00:00Z'); // 10 hours later
      const checkInDate = new Date('2026-03-20T14:00:00Z'); // 5 days away

      const result = refundCalculator.isInGracePeriod(booking, cancellationDate, checkInDate);
      expect(result).toBe(false);
    });

    it('should return false if no createdAt on booking', () => {
      const booking = {};
      const cancellationDate = new Date('2026-03-15T20:00:00Z');
      const checkInDate = new Date('2026-04-01T14:00:00Z');

      const result = refundCalculator.isInGracePeriod(booking, cancellationDate, checkInDate);
      expect(result).toBe(false);
    });
  });

  describe('canRefund', () => {
    it('should return false if booking is already cancelled', () => {
      const booking = {
        status: 'cancelled',
        payment: { status: 'paid' }
      };

      const result = refundCalculator.canRefund(booking);
      expect(result.canRefund).toBe(false);
    });

    it('should return false if booking is expired', () => {
      const booking = {
        status: 'expired',
        payment: { status: 'paid' }
      };

      const result = refundCalculator.canRefund(booking);
      expect(result.canRefund).toBe(false);
    });

    it('should return false if booking is rejected', () => {
      const booking = {
        status: 'rejected',
        payment: { status: 'paid' }
      };

      const result = refundCalculator.canRefund(booking);
      expect(result.canRefund).toBe(false);
    });

    it('should return false if payment not completed', () => {
      const booking = {
        status: 'confirmed',
        payment: { status: 'pending' }
      };

      const result = refundCalculator.canRefund(booking);
      expect(result.canRefund).toBe(false);
    });

    it('should return false if already refunded', () => {
      const booking = {
        status: 'confirmed',
        payment: { status: 'refunded' }
      };

      const result = refundCalculator.canRefund(booking);
      expect(result.canRefund).toBe(false);
    });

    it('should return true for valid refund request', () => {
      const booking = {
        status: 'confirmed',
        payment: { status: 'paid' }
      };

      const result = refundCalculator.canRefund(booking);
      expect(result.canRefund).toBe(true);
    });
  });

  describe('calculateRefund', () => {
    const createBooking = (overrides = {}) => ({
      _id: '507f1f77bcf86cd799439011',
      status: 'confirmed',
      startDate: new Date('2026-03-25T14:00:00Z'),
      endDate: new Date('2026-03-28T11:00:00Z'),
      createdAt: new Date('2026-03-01T10:00:00Z'),
      cancellationPolicy: 'flexible',
      pricing: {
        subtotal: 15000,
        nights: 3,
        cleaningFee: 2000,
        guestServiceFee: 1360, // 8% of (15000 + 2000)
        taxes: 0,
        totalAmount: 18360
      },
      payment: {
        status: 'paid',
        amount: 18360
      },
      ...overrides
    });

    it('should calculate full refund for host cancellation', () => {
      const booking = createBooking();

      const result = refundCalculator.calculateRefund(booking, {
        reason: 'host_cancellation',
        cancellationDate: new Date('2026-03-15T12:00:00Z')
      });

      expect(result.refund.subtotalPercent).toBe(100);
      expect(result.refund.subtotal).toBe(15000);
    });

    it('should include cleaning fee in refund if before check-in', () => {
      const booking = createBooking();

      const result = refundCalculator.calculateRefund(booking, {
        reason: 'guest_cancellation',
        cancellationDate: new Date('2026-03-20T12:00:00Z') // 5 days before
      });

      expect(result.refund.cleaningFeeRefunded).toBe(true);
      expect(result.refund.cleaningFee).toBe(2000);
    });

    it('should not refund guest service fee outside grace period', () => {
      const booking = createBooking({
        createdAt: new Date('2026-03-01T10:00:00Z') // Not in grace period
      });

      const result = refundCalculator.calculateRefund(booking, {
        reason: 'guest_cancellation',
        cancellationDate: new Date('2026-03-20T12:00:00Z')
      });

      expect(result.refund.serviceFeeRefunded).toBe(false);
      expect(result.refund.guestServiceFee).toBe(0);
    });

    it('should refund guest service fee in grace period', () => {
      const now = new Date();
      const booking = createBooking({
        createdAt: new Date(now.getTime() - 1000 * 60 * 60), // 1 hour ago
        startDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 20), // 20 days from now
        endDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 23)
      });

      const result = refundCalculator.calculateRefund(booking, {
        reason: 'guest_cancellation',
        cancellationDate: now
      });

      expect(result.distribution.gracePeriodApplied).toBe(true);
      expect(result.refund.serviceFeeRefunded).toBe(true);
    });

    it('should handle strict cancellation policy', () => {
      const booking = createBooking({
        cancellationPolicy: 'strict',
        createdAt: new Date('2026-03-01T10:00:00Z')
      });

      const result = refundCalculator.calculateRefund(booking, {
        reason: 'guest_cancellation',
        cancellationDate: new Date('2026-03-20T12:00:00Z') // 5 days before (< 7 days)
      });

      // Strict policy: 0% refund if less than 7 days
      expect(result.refund.subtotalPercent).toBe(0);
    });

    it('should return 0% refund after checkout', () => {
      const booking = createBooking();

      const result = refundCalculator.calculateRefund(booking, {
        reason: 'guest_cancellation',
        cancellationDate: new Date('2026-03-30T12:00:00Z') // After checkout
      });

      expect(result.refund.subtotalPercent).toBe(0);
    });
  });

  describe('generateSummary', () => {
    it('should generate summary for grace period refund', () => {
      const data = {
        totalRefund: 18360,
        subtotalRefundPercent: 100,
        isBeforeCheckIn: true,
        cleaningFeeRefund: 2000,
        guestServiceFee: 1360,
        guestServiceFeeRefund: 1360,
        isInGracePeriod: true,
        reason: 'guest_cancellation'
      };

      const summary = refundCalculator.generateSummary(data);

      expect(summary).toContain('grâce');
      expect(summary).toContain('intégral');
    });

    it('should generate summary for host cancellation', () => {
      const data = {
        totalRefund: 18360,
        subtotalRefundPercent: 100,
        isBeforeCheckIn: true,
        cleaningFeeRefund: 2000,
        guestServiceFee: 1360,
        guestServiceFeeRefund: 0,
        isInGracePeriod: false,
        reason: 'host_cancellation'
      };

      const summary = refundCalculator.generateSummary(data);

      expect(summary).toContain("hôte");
      expect(summary).toContain('intégral');
    });

    it('should generate summary for partial refund', () => {
      const data = {
        totalRefund: 7000,
        subtotalRefundPercent: 50,
        isBeforeCheckIn: true,
        cleaningFeeRefund: 2000,
        guestServiceFee: 1360,
        guestServiceFeeRefund: 0,
        isInGracePeriod: false,
        reason: 'guest_cancellation'
      };

      const summary = refundCalculator.generateSummary(data);

      expect(summary).toContain('50%');
    });

    it('should generate summary for no refund', () => {
      const data = {
        totalRefund: 0,
        subtotalRefundPercent: 0,
        isBeforeCheckIn: false,
        cleaningFeeRefund: 0,
        guestServiceFee: 1360,
        guestServiceFeeRefund: 0,
        isInGracePeriod: false,
        reason: 'guest_cancellation'
      };

      const summary = refundCalculator.generateSummary(data);

      expect(summary).toContain('Aucun');
    });
  });

  describe('calculateDisputeRefund', () => {
    it('should calculate custom refund for dispute resolution', () => {
      const booking = {
        _id: '507f1f77bcf86cd799439011',
        startDate: new Date('2026-03-25T14:00:00Z'),
        endDate: new Date('2026-03-28T11:00:00Z'),
        pricing: {
          subtotal: 15000,
          cleaningFee: 2000,
          guestServiceFee: 1360,
          taxes: 0,
          totalAmount: 18360
        }
      };

      const result = refundCalculator.calculateDisputeRefund(booking, 75);

      expect(result.refund.subtotalPercent).toBe(75);
      expect(result.cancellation.reason).toBe('dispute');
    });

    it('should handle 100% guest refund', () => {
      const booking = {
        _id: '507f1f77bcf86cd799439011',
        startDate: new Date('2026-03-25T14:00:00Z'),
        endDate: new Date('2026-03-28T11:00:00Z'),
        pricing: {
          subtotal: 15000,
          cleaningFee: 2000,
          guestServiceFee: 1360,
          totalAmount: 18360
        }
      };

      const result = refundCalculator.calculateDisputeRefund(booking, 100);

      expect(result.refund.subtotalPercent).toBe(100);
    });

    it('should handle 0% guest refund', () => {
      const booking = {
        _id: '507f1f77bcf86cd799439011',
        startDate: new Date('2026-03-25T14:00:00Z'),
        endDate: new Date('2026-03-28T11:00:00Z'),
        pricing: {
          subtotal: 15000,
          cleaningFee: 2000,
          guestServiceFee: 1360,
          totalAmount: 18360
        }
      };

      const result = refundCalculator.calculateDisputeRefund(booking, 0);

      expect(result.refund.subtotalPercent).toBe(0);
    });
  });

  describe('calculateUnusedNightsPercent', () => {
    it('should calculate unused nights for early departure', () => {
      const checkIn = new Date('2026-03-20T14:00:00Z');
      const checkOut = new Date('2026-03-27T11:00:00Z'); // 7 nights
      const departureDate = new Date('2026-03-23T10:00:00Z'); // Left after 3 nights

      const result = refundCalculator.calculateUnusedNightsPercent(
        checkIn,
        checkOut,
        departureDate,
        7
      );

      // 4 unused nights out of 7 = ~57%
      expect(result).toBeGreaterThan(50);
      expect(result).toBeLessThan(60);
    });

    it('should return 0 if stayed entire booking', () => {
      const checkIn = new Date('2026-03-20T14:00:00Z');
      const checkOut = new Date('2026-03-25T11:00:00Z'); // 5 nights
      const departureDate = new Date('2026-03-25T10:00:00Z');

      const result = refundCalculator.calculateUnusedNightsPercent(
        checkIn,
        checkOut,
        departureDate,
        5
      );

      expect(result).toBe(0);
    });

    it('should handle 0 total nights gracefully', () => {
      const checkIn = new Date('2026-03-20T14:00:00Z');
      const checkOut = new Date('2026-03-20T14:00:00Z');
      const departureDate = new Date('2026-03-20T10:00:00Z');

      const result = refundCalculator.calculateUnusedNightsPercent(
        checkIn,
        checkOut,
        departureDate,
        0
      );

      expect(result).toBe(0);
    });
  });
});
