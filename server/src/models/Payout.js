const mongoose = require('mongoose');

const PayoutSchema = new mongoose.Schema({
  // Host who requested the payout
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Host is required'],
    index: true
  },

  // Payout amount and currency
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [1, 'Amount must be at least 1']
  },
  currency: {
    type: String,
    enum: ['DZD', 'EUR'],
    default: 'DZD'
  },

  // Bank account details
  bankAccount: {
    bankName: {
      type: String,
      required: [true, 'Bank name is required']
    },
    accountHolderName: {
      type: String,
      required: [true, 'Account holder name is required']
    },
    accountNumber: {
      type: String,
      required: [true, 'Account number is required']
    },
    rib: {
      type: String,
      required: [true, 'RIB (Bank account key) is required'],
      match: [/^\d{20}$/, 'RIB must be exactly 20 digits']
    },
    iban: {
      type: String
    },
    swiftCode: {
      type: String
    }
  },

  // Payout status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },

  // Processing information
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: {
    type: Date
  },

  // Transaction details
  transactionId: {
    type: String
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'ccp', 'baridi_mob', 'other'],
    default: 'bank_transfer'
  },

  // Notes and feedback
  hostNotes: {
    type: String,
    maxLength: [500, 'Host notes cannot exceed 500 characters']
  },
  adminNotes: {
    type: String,
    maxLength: [500, 'Admin notes cannot exceed 500 characters']
  },
  rejectionReason: {
    type: String,
    maxLength: [500, 'Rejection reason cannot exceed 500 characters']
  },

  // Fee deductions
  platformFee: {
    type: Number,
    default: 0
  },
  processingFee: {
    type: Number,
    default: 0
  },
  finalAmount: {
    type: Number
  },

  // Metadata
  requestedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: {
    type: Date
  },
  estimatedArrival: {
    type: Date
  },

  // Email notifications tracking
  notifications: {
    hostNotified: {
      type: Boolean,
      default: false
    },
    adminNotified: {
      type: Boolean,
      default: false
    },
    completionNotified: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
PayoutSchema.index({ host: 1, status: 1 });
PayoutSchema.index({ requestedAt: -1 });
PayoutSchema.index({ status: 1, createdAt: -1 });

// Calculate final amount before saving
PayoutSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('amount') || this.isModified('platformFee') || this.isModified('processingFee')) {
    this.finalAmount = this.amount - (this.platformFee || 0) - (this.processingFee || 0);
  }
  next();
});

// Virtual for net amount (same as finalAmount, for clarity)
PayoutSchema.virtual('netAmount').get(function() {
  return this.finalAmount || this.amount;
});

module.exports = mongoose.model('Payout', PayoutSchema);
