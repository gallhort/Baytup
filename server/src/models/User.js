const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxLength: [50, 'First name cannot be more than 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxLength: [50, 'Last name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    index: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId;
    },
    minLength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  phone: {
    type: String,
    match: [/^\+?[1-9]\d{6,14}$/, 'Please provide a valid phone number (E.164 format)']
  },

  // User Role
  role: {
    type: String,
    enum: ['guest', 'host', 'admin'],
    default: 'guest'
  },

  // Profile Information
  avatar: {
    type: String,
    default: '/uploads/users/default-avatar.png'
  },
  bio: {
    type: String,
    maxLength: [500, 'Bio cannot be more than 500 characters']
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },

  // Location
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: {
      type: String,
      default: 'Algeria'
    }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [3.0588, 36.7753] // Algiers coordinates
    }
  },

  // Preferences
  language: {
    type: String,
    enum: ['en', 'fr', 'ar'],
    default: 'en'
  },
  currency: {
    type: String,
    enum: ['DZD', 'EUR'],
    default: 'DZD'
  },
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'light'
  },

  // Authentication
  googleId: String,
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,

  // Two-Factor Authentication (2FA)
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false // Ne pas inclure dans les queries par défaut
  },
  twoFactorEnabledAt: Date,
  backupCodes: [{
    code: {
      type: String,
      select: false
    },
    used: {
      type: Boolean,
      default: false
    },
    usedAt: Date
  }],
  lastBackupCodeGeneration: Date,

  // Host-specific fields
  hostInfo: {
    isHost: {
      type: Boolean,
      default: false
    },
    hostSince: Date,
    responseRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    responseTime: {
      type: Number,
      default: 24 // hours
    },
    superhost: {
      type: Boolean,
      default: false
    },
    verifications: {
      identity: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
      government: { type: Boolean, default: false }
    }
  },

  // Bank account information for payouts (host only)
  bankAccount: {
    bankName: String,
    accountHolderName: String,
    accountNumber: String,
    rib: String, // 20-digit bank account key for Algeria
    iban: String,
    swiftCode: String,
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date
  },

  // Stripe Connect (for EUR payouts to hosts)
  stripeConnect: {
    // Connected account ID (acct_xxx)
    accountId: {
      type: String,
      index: true
    },
    // Onboarding status
    onboardingStatus: {
      type: String,
      enum: ['not_started', 'pending', 'completed', 'restricted'],
      default: 'not_started'
    },
    // Can receive payouts?
    payoutsEnabled: {
      type: Boolean,
      default: false
    },
    // Can accept charges?
    chargesEnabled: {
      type: Boolean,
      default: false
    },
    // Details submitted to Stripe
    detailsSubmitted: {
      type: Boolean,
      default: false
    },
    // Account type
    accountType: {
      type: String,
      enum: ['express', 'standard', 'custom'],
      default: 'express'
    },
    // Default currency for payouts
    defaultCurrency: {
      type: String,
      default: 'eur'
    },
    // Onboarding completed at
    onboardingCompletedAt: Date,
    // Last webhook update
    lastWebhookUpdate: Date,
    // Any requirements pending
    requirementsPending: [String],
    // Errors from Stripe
    errors: [{
      code: String,
      message: String,
      occurredAt: Date
    }]
  },

  // Statistics
  stats: {
    totalBookings: { type: Number, default: 0 },
    totalListings: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 }
  },

  // Saved items
  savedListings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing'
  }],

  // Notifications
  notifications: {
    email: {
      bookingUpdates: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      newsletter: { type: Boolean, default: true }
    },
    push: {
      bookingUpdates: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false }
    }
  },

  // Privacy
  privacy: {
    showEmail: { type: Boolean, default: false },
    showPhone: { type: Boolean, default: false },
    profileVisibility: {
      type: String,
      enum: ['public', 'private', 'contacts'],
      default: 'public'
    }
  },

  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockReason: String,
  deletedAt: Date,
  deletionReason: String,

  // Timestamps
  lastLogin: Date,
  lastActive: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
UserSchema.index({ location: '2dsphere' });
UserSchema.index({ 'stats.averageRating': -1 });
UserSchema.index({ createdAt: -1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
UserSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  return Math.floor((Date.now() - this.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate password reset token
UserSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Generate email verification token
UserSchema.methods.createEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');

  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  return verificationToken;
};

// Update last active
UserSchema.methods.updateLastActive = function() {
  this.lastActive = new Date();
  return this.save({ validateBeforeSave: false });
};

// Cascade delete related data when user is removed (P0 #14)
UserSchema.pre('findOneAndDelete', async function(next) {
  const userId = this.getQuery()._id;
  if (!userId) return next();
  try {
    const Listing = require('./Listing');
    const Booking = require('./Booking');
    const { Conversation, Message } = require('./Message');
    const Notification = require('./Notification');
    const Review = require('./Review');

    // Deactivate listings instead of deleting (preserve booking history)
    await Listing.updateMany({ host: userId }, { $set: { status: 'inactive', deletedAt: new Date() } });
    // Cancel pending bookings
    await Booking.updateMany(
      { $or: [{ guest: userId }, { host: userId }], status: { $in: ['pending', 'confirmed'] } },
      { $set: { status: 'cancelled_by_admin', 'cancellation.reason': 'user_account_deleted' } }
    );
    // Clean up notifications
    await Notification.deleteMany({ recipient: userId });
    // Anonymize reviews
    await Review.updateMany({ author: userId }, { $set: { authorDeleted: true } });
    console.log(`[User] Cascade cleanup for deleted user ${userId}`);
  } catch (error) {
    console.error('[User] Cascade delete error:', error);
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);