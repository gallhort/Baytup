const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  // Basic Information
    activatedAt: {
    type: Date,
    default: null
  },
  
  completedAt: {
    type: Date,
    default: null
  },
  
  autoCompleted: {
    type: Boolean,
    default: false
  },
  listing: {
    type: mongoose.Schema.ObjectId,
    ref: 'Listing',
    required: [true, 'Listing is required']
  },
  guest: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Guest is required']
  },
  host: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Host is required']
  },

  // Booking Dates
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  checkInTime: {
    type: String,
    default: '15:00'
  },
  checkOutTime: {
    type: String,
    default: '11:00'
  },

  // Guest Information
  guestCount: {
    adults: {
      type: Number,
      required: [true, 'Number of adults is required'],
      min: 1
    },
    children: {
      type: Number,
      default: 0,
      min: 0
    },
    infants: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Pricing Breakdown
  pricing: {
    basePrice: {
      type: Number,
      required: [true, 'Base price is required']
    },
    nights: {
      type: Number,
      required: [true, 'Number of nights is required']
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required']
    },
    cleaningFee: {
      type: Number,
      default: 0
    },
    serviceFee: {
      type: Number,
      default: 0
    },
    taxes: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required']
    },
    currency: {
      type: String,
      enum: ['DZD', 'EUR'],
      required: [true, 'Currency is required']
    },
    securityDeposit: {
      type: Number,
      default: 0
    }
  },

  // Payment Information
  payment: {
    method: {
      type: String,
      enum: ['slickpay', 'bank_transfer', 'cash', 'card'],
      required: [true, 'Payment method is required']
    },
    status: {
      type: String,
      enum: ['pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAmount: {
      type: Number,
      default: 0
    },
    paidAt: Date,
    refundAmount: {
      type: Number,
      default: 0
    },
    refundReason: String,
    refundedAt: Date
  },

  // Booking Status
  status: {
    type: String,
    enum: [
      'pending',           // Waiting for host approval
      'pending_payment',   // Awaiting payment completion
      'confirmed',         // Host approved, payment pending
      'paid',             // Payment completed
      'active',           // Currently ongoing
      'completed',        // Successfully completed
      'cancelled_by_guest',
      'cancelled_by_host',
      'cancelled_by_admin',
      'expired',          // Payment not made in time
      'disputed'          // Under dispute
    ],
    default: 'pending'
  },

  // Communication
  specialRequests: {
    type: String,
    maxLength: [500, 'Special requests cannot exceed 500 characters']
  },
  hostMessage: {
    type: String,
    maxLength: [500, 'Host message cannot exceed 500 characters']
  },

  // Cancellation
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    cancelledAt: Date,
    reason: {
      type: String,
      enum: [
        'guest_request',
        'host_unavailable',
        'emergency',
        'property_issue',
        'payment_issue',
        'policy_violation',
        'other'
      ]
    },
    refundAmount: Number,
    cancellationFee: Number
  },

  // Check-in/Check-out
  checkIn: {
    actualTime: Date,
    confirmedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    notes: String
  },
  checkOut: {
    actualTime: Date,
    confirmedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    notes: String,
    damageReport: String
  },

  // Completion Verification (both host and guest must confirm)
  completion: {
    hostConfirmed: {
      type: Boolean,
      default: false
    },
    hostConfirmedAt: Date,
    guestConfirmed: {
      type: Boolean,
      default: false
    },
    guestConfirmedAt: Date,
    completedAt: Date  // Set when both confirm
  },

  // Reviews
  guestReview: {
    type: mongoose.Schema.ObjectId,
    ref: 'Review'
  },
  hostReview: {
    type: mongoose.Schema.ObjectId,
    ref: 'Review'
  },

  // Admin fields
  adminNotes: String,
  flagged: {
    type: Boolean,
    default: false
  },
  flagReason: String,

  // Reminders and notifications
  remindersSent: {
    paymentReminder: { type: Boolean, default: false },
    checkInReminder: { type: Boolean, default: false },
    checkOutReminder: { type: Boolean, default: false },
    reviewReminder: { type: Boolean, default: false }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
BookingSchema.index({ listing: 1, startDate: 1, endDate: 1 });
BookingSchema.index({ guest: 1, status: 1 });
BookingSchema.index({ host: 1, status: 1 });
BookingSchema.index({ status: 1, startDate: 1 });
BookingSchema.index({ 'payment.status': 1 });
BookingSchema.index({ createdAt: -1 });

// Virtual for duration in nights
BookingSchema.virtual('duration').get(function() {
  if (!this.startDate || !this.endDate) return 0;
  const timeDiff = this.endDate.getTime() - this.startDate.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
});

// Virtual for total guests
BookingSchema.virtual('totalGuests').get(function() {
  return this.guestCount.adults + this.guestCount.children + this.guestCount.infants;
});

// Virtual for booking status color (for frontend)
BookingSchema.virtual('statusColor').get(function() {
  const colors = {
    pending: 'yellow',
    pending_payment: 'orange',
    confirmed: 'blue',
    paid: 'green',
    active: 'green',
    completed: 'gray',
    cancelled_by_guest: 'red',
    cancelled_by_host: 'red',
    cancelled_by_admin: 'red',
    expired: 'red',
    disputed: 'orange'
  };
  return colors[this.status] || 'gray';
});

// Validate dates
BookingSchema.pre('save', function(next) {
  if (this.startDate >= this.endDate) {
    return next(new Error('End date must be after start date'));
  }

  // Allow bookings from today onwards (reset hours to compare only dates)
  // Skip validation if this is marked as a seed/historical booking
  if (!this._skipDateValidation) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(this.startDate);
    startDate.setHours(0, 0, 0, 0);

    if (startDate < today) {
      return next(new Error('Start date cannot be in the past'));
    }
  }

  next();
});

// Calculate pricing before saving
BookingSchema.pre('save', function(next) {
  if (this.isModified('startDate') || this.isModified('endDate') || this.isModified('pricing.basePrice')) {
    this.pricing.nights = this.duration;
    this.pricing.subtotal = this.pricing.basePrice * this.pricing.nights;

    // Calculate service fee (10% of subtotal)
    this.pricing.serviceFee = Math.round(this.pricing.subtotal * 0.10);

    // Calculate taxes (5% of subtotal + cleaningFee + serviceFee)
    this.pricing.taxes = Math.round((this.pricing.subtotal + this.pricing.cleaningFee + this.pricing.serviceFee) * 0.05);

    // Calculate total
    this.pricing.totalAmount = this.pricing.subtotal +
                               this.pricing.cleaningFee +
                               this.pricing.serviceFee +
                               this.pricing.taxes;
  }
  next();
});

// Update booking status based on payment and dates
BookingSchema.methods.updateStatus = function() {
  const now = new Date();

  if (this.payment.status === 'paid' && this.startDate <= now && this.endDate > now) {
    this.status = 'active';
  } else if (this.payment.status === 'paid' && this.endDate <= now) {
    this.status = 'completed';
  } else if (this.payment.status === 'paid' && this.startDate > now) {
    this.status = 'paid';
  }

  return this.save({ validateBeforeSave: false });
};

// Check for overlapping bookings
BookingSchema.statics.checkAvailability = async function(listingId, startDate, endDate, excludeBookingId = null) {
  const query = {
    listing: listingId,
    status: { $in: ['confirmed', 'paid', 'active'] },
    $or: [
      {
        startDate: { $lte: startDate },
        endDate: { $gt: startDate }
      },
      {
        startDate: { $lt: endDate },
        endDate: { $gte: endDate }
      },
      {
        startDate: { $gte: startDate },
        endDate: { $lte: endDate }
      }
    ]
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const overlappingBookings = await this.find(query);
  return overlappingBookings.length === 0;
};

module.exports = mongoose.model('Booking', BookingSchema);