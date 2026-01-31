/**
 * Nord Express Service (MODE MOCK)
 *
 * Service for handling cash payments via Nord Express agencies.
 * Currently in mock mode - no actual API integration.
 * Admin validates payments manually until API is available.
 */

const crypto = require('crypto');
const QRCode = require('qrcode');
const CashVoucher = require('../models/CashVoucher');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const escrowService = require('./escrowService');

class NordExpressService {
  constructor() {
    // Mock configuration - will be replaced with real API config
    this.isMockMode = true;
    this.defaultExpirationHours = 48;

    // These would be used with the real API
    this.baseURL = process.env.NORD_EXPRESS_API_URL || 'https://api.nordexpress.dz';
    this.apiKey = process.env.NORD_EXPRESS_API_KEY;
    this.merchantId = process.env.NORD_EXPRESS_MERCHANT_ID;
    this.webhookSecret = process.env.NORD_EXPRESS_WEBHOOK_SECRET;
  }

  /**
   * Generate unique voucher number
   * Format: NE-YYYY-XXXXXXXX
   */
  generateVoucherNumber() {
    const year = new Date().getFullYear();
    const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `NE-${year}-${randomPart}`;
  }

  /**
   * Create a cash voucher for a booking
   * @param {Object} voucherData - Voucher details
   * @returns {Promise<Object>} - Created voucher
   */
  async createVoucher(voucherData) {
    const {
      booking,
      amount,
      guestInfo,
      expirationHours = this.defaultExpirationHours
    } = voucherData;

    // Generate voucher number
    const voucherNumber = this.generateVoucherNumber();

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    // Generate QR code
    const qrCodeData = await this.generateQRCode(voucherNumber, amount);

    // Prepare instructions in multiple languages
    const instructions = this.generateInstructions(voucherNumber, amount, expiresAt);

    // Create voucher in database
    const voucher = await CashVoucher.create({
      booking: booking._id,
      voucherNumber,
      amount,
      currency: 'DZD',
      guestInfo: {
        fullName: guestInfo.fullName,
        phone: guestInfo.phone,
        email: guestInfo.email,
        nationalId: guestInfo.nationalId
      },
      status: 'pending',
      expiresAt,
      qrCode: qrCodeData,
      instructions
    });

    // Update booking with voucher reference
    await Booking.findByIdAndUpdate(booking._id, {
      cashVoucher: voucher._id,
      'payment.method': 'nord_express'
    });

    console.log(`[NordExpressService] Created voucher ${voucherNumber} for booking ${booking._id}`);

    // In mock mode, log instructions for testing
    if (this.isMockMode) {
      console.log(`[MOCK MODE] Voucher created:`);
      console.log(`  Number: ${voucherNumber}`);
      console.log(`  Amount: ${amount} DZD`);
      console.log(`  Expires: ${expiresAt.toISOString()}`);
      console.log(`  Admin can validate at: /admin/cash-vouchers/${voucher._id}/validate`);
    }

    return voucher;
  }

  /**
   * Generate QR code for voucher
   * @param {String} voucherNumber - Voucher number
   * @param {Number} amount - Amount to pay
   * @returns {Promise<String>} - Base64 QR code
   */
  async generateQRCode(voucherNumber, amount) {
    try {
      // QR code contains voucher info for agency scanning
      const qrData = JSON.stringify({
        voucher: voucherNumber,
        amount: amount,
        currency: 'DZD',
        merchant: 'BAYTUP',
        platform: 'baytup.fr'
      });

      const qrCodeBase64 = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      return qrCodeBase64;
    } catch (error) {
      console.error('[NordExpressService] QR code generation failed:', error);
      return null;
    }
  }

  /**
   * Generate voucher instructions in multiple languages
   */
  generateInstructions(voucherNumber, amount, expiresAt) {
    const formattedAmount = amount.toLocaleString('fr-FR');
    const formattedDate = expiresAt.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return {
      fr: `Instructions de paiement:
1. Rendez-vous dans une agence Nord Express
2. Présentez ce bon avec le numéro: ${voucherNumber}
3. Payez le montant de ${formattedAmount} DZD
4. Conservez votre reçu
5. Votre réservation sera confirmée automatiquement

IMPORTANT: Ce bon expire le ${formattedDate}`,

      ar: `تعليمات الدفع:
1. توجه إلى وكالة Nord Express
2. قدم هذا القسيمة برقم: ${voucherNumber}
3. ادفع مبلغ ${formattedAmount} دج
4. احتفظ بإيصالك
5. سيتم تأكيد حجزك تلقائيًا

هام: تنتهي صلاحية هذه القسيمة في ${formattedDate}`,

      en: `Payment Instructions:
1. Go to a Nord Express agency
2. Present this voucher with number: ${voucherNumber}
3. Pay the amount of ${formattedAmount} DZD
4. Keep your receipt
5. Your booking will be confirmed automatically

IMPORTANT: This voucher expires on ${formattedDate}`
    };
  }

  /**
   * Check voucher status
   * In mock mode, just returns database status
   * @param {String} voucherNumber - Voucher number
   * @returns {Promise<Object>} - Voucher status
   */
  async checkVoucherStatus(voucherNumber) {
    const voucher = await CashVoucher.findOne({ voucherNumber })
      .populate('booking');

    if (!voucher) {
      return { found: false, error: 'Voucher not found' };
    }

    // Check if expired
    if (voucher.status === 'pending' && new Date() > voucher.expiresAt) {
      voucher.status = 'expired';
      await voucher.save();
    }

    return {
      found: true,
      voucherNumber: voucher.voucherNumber,
      status: voucher.status,
      amount: voucher.amount,
      currency: voucher.currency,
      expiresAt: voucher.expiresAt,
      isExpired: voucher.isExpired,
      paidAt: voucher.paidAt,
      bookingId: voucher.booking?._id
    };
  }

  /**
   * Cancel a voucher
   * @param {String} voucherNumber - Voucher number
   * @returns {Promise<Object>} - Cancelled voucher
   */
  async cancelVoucher(voucherNumber) {
    const voucher = await CashVoucher.findOne({ voucherNumber });

    if (!voucher) {
      throw new Error('Voucher not found');
    }

    if (voucher.status !== 'pending') {
      throw new Error(`Cannot cancel voucher with status: ${voucher.status}`);
    }

    voucher.status = 'cancelled';
    await voucher.save();

    // Update booking status
    await Booking.findByIdAndUpdate(voucher.booking, {
      status: 'cancelled_by_guest',
      'payment.status': 'failed'
    });

    console.log(`[NordExpressService] Cancelled voucher ${voucherNumber}`);

    return voucher;
  }

  /**
   * Manually validate payment (Admin function)
   * Used when webhook fails or in mock mode
   * @param {String} voucherId - Voucher ID
   * @param {Object} validationData - Validation details
   * @returns {Promise<Object>} - Updated voucher
   */
  async validatePaymentManually(voucherId, validationData) {
    const { adminId, agencyCode, transactionId, notes } = validationData;

    const voucher = await CashVoucher.findById(voucherId)
      .populate('booking');

    if (!voucher) {
      throw new Error('Voucher not found');
    }

    if (voucher.status !== 'pending') {
      throw new Error(`Cannot validate voucher with status: ${voucher.status}`);
    }

    // Mark voucher as paid
    voucher.status = 'paid';
    voucher.paidAt = new Date();
    voucher.paidAtAgency = agencyCode || 'Manual';
    voucher.agencyTransactionId = transactionId || `MANUAL-${Date.now()}`;
    voucher.confirmedBy = 'admin';
    voucher.confirmedByUser = adminId;
    voucher.manuallyValidated = true;
    voucher.validatedBy = adminId;
    voucher.validatedAt = new Date();
    voucher.validationNotes = notes;

    await voucher.save();

    // Update booking
    const booking = await Booking.findById(voucher.booking._id)
      .populate('guest')
      .populate('host')
      .populate('listing');

    booking.status = 'confirmed';
    booking.payment.status = 'paid';
    booking.payment.paidAmount = voucher.amount;
    booking.payment.paidAt = new Date();
    await booking.save();

    // Create escrow for fund holding
    try {
      await escrowService.createEscrow(booking, {
        provider: 'nord_express',
        transactionId: voucher.voucherNumber
      });
      console.log(`[NordExpressService] Created escrow for booking ${booking._id}`);
    } catch (escrowError) {
      console.error('[NordExpressService] Failed to create escrow:', escrowError);
    }

    // Send notifications
    await this.sendPaymentConfirmationNotifications(voucher, booking);

    console.log(`[NordExpressService] Manually validated voucher ${voucher.voucherNumber} by admin ${adminId}`);

    return voucher;
  }

  /**
   * Send payment confirmation notifications
   */
  async sendPaymentConfirmationNotifications(voucher, booking) {
    try {
      // Notify guest
      await Notification.createNotification({
        recipient: booking.guest._id,
        type: 'booking_payment_successful',
        title: 'Paiement confirmé!',
        message: `Votre paiement de ${voucher.amount.toLocaleString()} DZD a été confirmé. Votre réservation pour "${booking.listing?.title}" est maintenant confirmée!`,
        data: {
          bookingId: booking._id,
          voucherNumber: voucher.voucherNumber,
          amount: voucher.amount
        },
        link: `/dashboard/bookings/${booking._id}`,
        priority: 'high'
      });

      // Notify host
      await Notification.createNotification({
        recipient: booking.host._id,
        type: 'booking_confirmed',
        title: 'Nouvelle réservation confirmée!',
        message: `${booking.guest?.firstName} a payé pour "${booking.listing?.title}". La réservation est confirmée.`,
        data: {
          bookingId: booking._id,
          guestName: booking.guest?.firstName + ' ' + booking.guest?.lastName
        },
        link: `/dashboard/host/bookings/${booking._id}`,
        priority: 'high'
      });
    } catch (error) {
      console.error('[NordExpressService] Failed to send notifications:', error);
    }
  }

  /**
   * Simulate payment received (DEV ONLY)
   * For testing purposes
   */
  async simulatePayment(voucherNumber) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Simulation not allowed in production');
    }

    const voucher = await CashVoucher.findOne({ voucherNumber })
      .populate('booking');

    if (!voucher) {
      throw new Error('Voucher not found');
    }

    // Simulate payment processing
    return this.validatePaymentManually(voucher._id, {
      adminId: null,
      agencyCode: 'SIMULATED',
      transactionId: `SIM-${Date.now()}`,
      notes: 'Simulated payment for testing'
    });
  }

  /**
   * Get voucher details for display
   */
  async getVoucherDetails(voucherNumber) {
    const voucher = await CashVoucher.findOne({ voucherNumber })
      .populate({
        path: 'booking',
        populate: [
          { path: 'listing', select: 'title images address' },
          { path: 'guest', select: 'firstName lastName email phone' },
          { path: 'host', select: 'firstName lastName email' }
        ]
      });

    if (!voucher) {
      return null;
    }

    return {
      voucherNumber: voucher.voucherNumber,
      amount: voucher.amount,
      currency: voucher.currency,
      status: voucher.status,
      expiresAt: voucher.expiresAt,
      isExpired: voucher.isExpired,
      hoursRemaining: voucher.hoursRemaining,
      qrCode: voucher.qrCode,
      instructions: voucher.instructions,
      guestInfo: {
        name: voucher.guestInfo.fullName,
        phone: voucher.guestInfo.phone
      },
      booking: voucher.booking ? {
        id: voucher.booking._id,
        listing: voucher.booking.listing?.title,
        startDate: voucher.booking.startDate,
        endDate: voucher.booking.endDate
      } : null,
      paidAt: voucher.paidAt,
      paidAtAgency: voucher.paidAtAgency
    };
  }

  /**
   * Get all pending vouchers for admin
   */
  async getPendingVouchers() {
    return CashVoucher.find({ status: 'pending' })
      .populate({
        path: 'booking',
        select: 'startDate endDate pricing',
        populate: [
          { path: 'listing', select: 'title' },
          { path: 'guest', select: 'firstName lastName email phone' }
        ]
      })
      .sort({ expiresAt: 1 });
  }

  /**
   * Verify webhook signature (for future API integration)
   */
  verifyWebhookSignature(payload, signature) {
    if (this.isMockMode) {
      return true; // Accept all in mock mode
    }

    // Real implementation would verify HMAC signature
    // const expectedSignature = crypto
    //   .createHmac('sha256', this.webhookSecret)
    //   .update(JSON.stringify(payload))
    //   .digest('hex');
    // return signature === expectedSignature;

    return true;
  }
}

module.exports = new NordExpressService();
