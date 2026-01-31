const mongoose = require('mongoose');

const escrowHistorySchema = new mongoose.Schema({
  action: {
    type: String,
    enum: [
      'created',
      'captured',
      'released',
      'partial_release',
      'frozen',
      'unfrozen',
      'refunded',
      'partial_refund',
      'dispute_opened',
      'dispute_resolved',
      'cancelled'
    ],
    required: true
  },
  amount: Number,
  performedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  note: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const escrowSchema = new mongoose.Schema({
  // Linked booking
  booking: {
    type: mongoose.Schema.ObjectId,
    ref: 'Booking',
    required: [true, 'Escrow must be linked to a booking'],
    unique: true,
    index: true
  },

  // Parties involved
  payer: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Escrow must have a payer (guest)']
  },
  payee: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Escrow must have a payee (host)']
  },

  // Amount details
  amount: {
    type: Number,
    required: [true, 'Escrow must have an amount'],
    min: [1, 'Amount must be at least 1']
  },
  currency: {
    type: String,
    enum: ['DZD', 'EUR'],
    required: true
  },

  // Breakdown of amounts (detailed for refund calculation)
  // Fee Structure: 8% Guest Service Fee + 3% Host Commission
  breakdown: {
    // What guest paid
    subtotal: {
      type: Number,
      required: true
    },
    cleaningFee: {
      type: Number,
      default: 0
    },
    // Guest Service Fee - 8% of (subtotal + cleaningFee)
    guestServiceFee: {
      type: Number,
      default: 0
    },
    // Host Commission - 3% of (subtotal + cleaningFee)
    hostCommission: {
      type: Number,
      default: 0
    },
    // Legacy field - equals guestServiceFee
    serviceFee: {
      type: Number,
      default: 0
    },
    taxes: {
      type: Number,
      default: 0
    },
    // Calculated amounts
    // Host receives: subtotal + cleaningFee - hostCommission
    hostAmount: {
      type: Number,
      required: true
    },
    // Platform revenue: guestServiceFee + hostCommission (11% total)
    platformFee: {
      type: Number,
      default: 0
    },
    taxAmount: {
      type: Number,
      default: 0
    }
  },

  // Refund breakdown (when refund is processed)
  refundBreakdown: {
    subtotal: { type: Number, default: 0 },
    cleaningFee: { type: Number, default: 0 },
    serviceFee: { type: Number, default: 0 }, // Always 0
    taxes: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    reason: String,
    isBeforeCheckIn: Boolean,
    cancellationPolicy: String
  },

  // Escrow status
  status: {
    type: String,
    enum: [
      'pending',         // Awaiting payment capture
      'held',            // Funds captured and held
      'partial_release', // Some funds released
      'released',        // All funds released to host
      'refunded',        // Full refund to guest
      'partial_refund',  // Partial refund
      'frozen',          // Frozen due to dispute
      'cancelled'        // Escrow cancelled
    ],
    default: 'pending',
    index: true
  },

  // Timeline
  capturedAt: {
    type: Date
  },
  releaseScheduledAt: {
    type: Date,
    index: true
  },
  releasedAt: {
    type: Date
  },
  frozenAt: {
    type: Date
  },
  unfrozenAt: {
    type: Date
  },

  // Release details
  releaseType: {
    type: String,
    enum: ['auto', 'manual', 'dispute_resolution']
  },
  releasedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },

  // Refund details
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: String,
  refundedAt: Date,

  // Dispute linkage
  dispute: {
    type: mongoose.Schema.ObjectId,
    ref: 'Dispute'
  },
  disputeResolution: {
    hostPortion: Number,
    guestPortion: Number,
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    notes: String
  },

  // Payment provider references
  paymentProvider: {
    type: String,
    enum: ['slickpay', 'stripe', 'nord_express']
  },
  providerTransactionId: String,
  providerRefundId: String,

  // Stripe Connect transfer (when funds released to host)
  stripeTransferId: String,

  // Audit trail
  history: [escrowHistorySchema],

  // Linked payout (when funds are released)
  payout: {
    type: mongoose.Schema.ObjectId,
    ref: 'Payout'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
escrowSchema.index({ status: 1, releaseScheduledAt: 1 });
escrowSchema.index({ payer: 1, status: 1 });
escrowSchema.index({ payee: 1, status: 1 });
escrowSchema.index({ createdAt: -1 });

// Virtual for net amount (what host will receive)
escrowSchema.virtual('netAmount').get(function() {
  return this.breakdown.hostAmount;
});

// Virtual for checking if escrow can be released
escrowSchema.virtual('canBeReleased').get(function() {
  return this.status === 'held' &&
         this.releaseScheduledAt &&
         new Date() >= this.releaseScheduledAt;
});

// Virtual for checking if escrow is active
escrowSchema.virtual('isActive').get(function() {
  return ['pending', 'held', 'frozen'].includes(this.status);
});

// Pre-save middleware to add history entry on status change
escrowSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    // Status change is handled by the service with proper history entry
  }
  next();
});

// Static method to find escrows ready for auto-release
escrowSchema.statics.findReadyForRelease = function() {
  return this.find({
    status: 'held',
    releaseScheduledAt: { $lte: new Date() }
  }).populate('booking payer payee');
};

// Static method to find frozen escrows
escrowSchema.statics.findFrozen = function() {
  return this.find({ status: 'frozen' })
    .populate('booking dispute payer payee');
};

// Instance method to add history entry
escrowSchema.methods.addHistory = function(action, { amount, performedBy, note } = {}) {
  this.history.push({
    action,
    amount,
    performedBy,
    note,
    timestamp: new Date()
  });
};

// Instance method to check if release is overdue
escrowSchema.methods.isReleaseOverdue = function() {
  if (!this.releaseScheduledAt) return false;
  return this.status === 'held' && new Date() > this.releaseScheduledAt;
};

const Escrow = mongoose.model('Escrow', escrowSchema);

module.exports = Escrow;
