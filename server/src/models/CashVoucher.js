const mongoose = require('mongoose');
const crypto = require('crypto');

const cashVoucherSchema = new mongoose.Schema({
  // Linked booking
  booking: {
    type: mongoose.Schema.ObjectId,
    ref: 'Booking',
    required: [true, 'Voucher must be linked to a booking'],
    index: true
  },

  // Unique voucher reference (NE-2026-XXXX)
  voucherNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Amount to pay
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [1, 'Amount must be at least 1']
  },
  currency: {
    type: String,
    enum: ['DZD'],
    default: 'DZD'
  },

  // Guest information for agency verification
  guestInfo: {
    fullName: {
      type: String,
      required: [true, 'Guest name is required']
    },
    phone: {
      type: String,
      required: [true, 'Guest phone is required']
    },
    email: String,
    nationalId: String // Optional: CIN for verification
  },

  // Voucher status
  status: {
    type: String,
    enum: ['pending', 'paid', 'expired', 'cancelled'],
    default: 'pending',
    index: true
  },

  // Expiration (48h from creation by default)
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },

  // Payment confirmation
  paidAt: Date,
  paidAtAgency: String, // Agency code/name where payment was made
  agencyTransactionId: String, // Nord Express reference number

  // Confirmed by (admin/webhook/system)
  confirmedBy: {
    type: String,
    enum: ['webhook', 'admin', 'system']
  },
  confirmedByUser: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },

  // QR code for scanning at agency (Base64)
  qrCode: String,

  // Barcode if needed
  barcode: String,

  // Manual validation by admin (when webhook fails)
  manuallyValidated: {
    type: Boolean,
    default: false
  },
  validatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  validatedAt: Date,
  validationNotes: String,

  // Notifications tracking
  remindersSent: {
    reminder24h: {
      type: Boolean,
      default: false
    },
    reminder6h: {
      type: Boolean,
      default: false
    },
    expirationWarning: {
      type: Boolean,
      default: false
    }
  },

  // PDF voucher generation
  pdfUrl: String,
  pdfGeneratedAt: Date,

  // Instructions for the guest
  instructions: {
    fr: String,
    ar: String,
    en: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
cashVoucherSchema.index({ status: 1, expiresAt: 1 });
cashVoucherSchema.index({ 'guestInfo.phone': 1 });
cashVoucherSchema.index({ createdAt: -1 });

// Virtual for checking if voucher is expired
cashVoucherSchema.virtual('isExpired').get(function() {
  return this.status === 'pending' && new Date() > this.expiresAt;
});

// Virtual for time remaining before expiration
cashVoucherSchema.virtual('timeRemaining').get(function() {
  if (this.status !== 'pending') return null;
  const remaining = this.expiresAt.getTime() - new Date().getTime();
  return remaining > 0 ? remaining : 0;
});

// Virtual for hours remaining
cashVoucherSchema.virtual('hoursRemaining').get(function() {
  const remaining = this.timeRemaining;
  if (remaining === null) return null;
  return Math.floor(remaining / (1000 * 60 * 60));
});

// Static method to generate unique voucher number
cashVoucherSchema.statics.generateVoucherNumber = function() {
  const year = new Date().getFullYear();
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `NE-${year}-${randomPart}`;
};

// Static method to find expired vouchers that need to be processed
cashVoucherSchema.statics.findExpiredPending = function() {
  return this.find({
    status: 'pending',
    expiresAt: { $lt: new Date() }
  }).populate('booking');
};

// Static method to find vouchers needing 24h reminder
cashVoucherSchema.statics.findNeedingReminder24h = function() {
  const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const in25Hours = new Date(Date.now() + 25 * 60 * 60 * 1000);

  return this.find({
    status: 'pending',
    expiresAt: { $gte: in24Hours, $lt: in25Hours },
    'remindersSent.reminder24h': false
  }).populate('booking');
};

// Static method to find vouchers needing 6h reminder
cashVoucherSchema.statics.findNeedingReminder6h = function() {
  const in6Hours = new Date(Date.now() + 6 * 60 * 60 * 1000);
  const in7Hours = new Date(Date.now() + 7 * 60 * 60 * 1000);

  return this.find({
    status: 'pending',
    expiresAt: { $gte: in6Hours, $lt: in7Hours },
    'remindersSent.reminder6h': false
  }).populate('booking');
};

// Instance method to mark as paid
cashVoucherSchema.methods.markAsPaid = async function(paymentDetails = {}) {
  this.status = 'paid';
  this.paidAt = new Date();
  this.paidAtAgency = paymentDetails.agency || 'Unknown';
  this.agencyTransactionId = paymentDetails.transactionId || 'N/A';
  this.confirmedBy = paymentDetails.confirmedBy || 'system';

  if (paymentDetails.userId) {
    this.confirmedByUser = paymentDetails.userId;
  }

  return this.save();
};

// Instance method to mark as expired
cashVoucherSchema.methods.markAsExpired = async function() {
  this.status = 'expired';
  return this.save();
};

// Instance method to cancel
cashVoucherSchema.methods.cancel = async function() {
  this.status = 'cancelled';
  return this.save();
};

// Pre-save middleware to generate voucher number if not set
cashVoucherSchema.pre('save', function(next) {
  if (this.isNew && !this.voucherNumber) {
    this.voucherNumber = this.constructor.generateVoucherNumber();
  }
  next();
});

const CashVoucher = mongoose.model('CashVoucher', cashVoucherSchema);

module.exports = CashVoucher;
