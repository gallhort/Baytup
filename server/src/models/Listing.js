const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const ListingSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxLength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxLength: [2000, 'Description cannot be more than 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['stay', 'vehicle']
  },
  subcategory: {
    type: String,
    required: [true, 'Subcategory is required'],
    enum: {
      values: [
        // Stay subcategories
        'apartment', 'house', 'villa', 'studio', 'room', 'riad', 'guesthouse', 'hotel_room',
        // Vehicle subcategories
        'car', 'motorcycle', 'truck', 'van', 'suv', 'bus', 'bicycle', 'scooter', 'boat'
      ],
      message: '{VALUE} is not a valid subcategory'
    }
  },

  // Host Information
  host: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },

  // Location
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
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
      validate: {
        validator: function(coords) {
          if (coords && coords.length > 0) {
            return coords.length === 2 && 
                   coords[0] >= -180 && coords[0] <= 180 &&
                   coords[1] >= -90 && coords[1] <= 90;
          }
          return true;
        },
        message: 'Coordinates must be [longitude, latitude] with valid ranges'
      }
    }
  },

  // Stay-specific fields
  stayDetails: {
    stayType: {
      type: String,
      enum: ['apartment', 'house', 'villa', 'studio', 'room', 'riad', 'guesthouse', 'hotel_room']
    },
    bedrooms: Number,
    beds: Number,
    bathrooms: Number,
    area: Number,
    floor: Number,
    furnished: {
      type: String,
      enum: ['furnished', 'semi_furnished', 'unfurnished']
    },
    capacity: {
      type: Number,
      min: 1,
      max: 50,
      validate: {
        validator: Number.isInteger,
        message: 'Capacity must be a whole number'
      }
    },
    amenities: [{
      type: String,
      enum: ['wifi', 'parking', 'pool', 'gym', 'garden', 'terrace', 'elevator', 'security', 'ac', 'heating', 'kitchen', 'balcony', 'tv', 'washer', 'beach_access', 'mountain_view']
    }]
  },

  // Vehicle-specific fields
  vehicleDetails: {
    vehicleType: {
      type: String,
      enum: ['car', 'motorcycle', 'truck', 'van', 'suv', 'bus', 'bicycle', 'scooter', 'boat']
    },
    make: String,
    model: String,
    year: Number,
    transmission: {
      type: String,
      enum: ['manual', 'automatic']
    },
    fuelType: {
      type: String,
      enum: ['gasoline', 'diesel', 'electric', 'hybrid']
    },
    seats: Number,
    capacity: {
      type: Number,
      min: 1,
      max: 50,
      validate: {
        validator: Number.isInteger,
        message: 'Capacity must be a whole number'
      }
    },
    features: [{
      type: String,
      enum: ['gps', 'bluetooth', 'ac', 'sunroof', 'backup_camera', 'cruise_control', 'heated_seats', 'wifi_hotspot', 'child_seat', 'ski_rack', 'bike_rack']
    }]
  },

  // Pricing
  pricing: {
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      enum: ['DZD', 'EUR'],
      default: 'DZD'
    },
    pricingType: {
      type: String,
      enum: ['per_night', 'per_day', 'per_week', 'per_month', 'per_hour'],
      default: 'per_night'
    },
    cleaningFee: {
      type: Number,
      default: 0
    },
    serviceFee: {
      type: Number,
      default: 0
    },
    securityDeposit: {
      type: Number,
      default: 0
    },
    // Alternative currency pricing (optional - for dual currency listings)
    altBasePrice: {
      type: Number,
      min: [0, 'Alternative price cannot be negative']
    },
    altCurrency: {
      type: String,
      enum: ['DZD', 'EUR']
    },
    altCleaningFee: {
      type: Number,
      default: 0
    }
  },

  /**
   * Dynamic Pricing - Predefined Rules
   * Priority: customPricing > pricingRules > basePrice
   */
  pricingRules: [{
    // Rule type
    type: {
      type: String,
      enum: [
        'weekend',        // Friday-Saturday nights
        'weekday',        // Monday-Thursday nights
        'haute_saison',   // High season (defined by dates)
        'basse_saison',   // Low season
        'long_sejour',    // Long stay discount (7+ nights)
        'very_long_sejour', // Very long stay (30+ nights)
        'last_minute',    // Last minute booking (within X days)
        'early_bird',     // Early booking discount
        'event',          // Special event pricing
        'custom'          // Custom rule
      ],
      required: true
    },
    name: {
      type: String,
      maxLength: 50
    },
    // Adjustment type
    adjustmentType: {
      type: String,
      enum: ['percentage', 'fixed', 'absolute'],
      default: 'percentage'
    },
    // Adjustment value
    // For percentage: positive = increase, negative = discount (e.g., 20 = +20%, -15 = -15%)
    // For fixed: amount to add/subtract from base price
    // For absolute: the exact price per night
    adjustmentValue: {
      type: Number,
      required: true
    },
    // Minimum nights for this rule to apply (for long_sejour)
    minNights: {
      type: Number,
      default: 1
    },
    // Date range for seasonal rules
    seasonDates: {
      startMonth: { type: Number, min: 1, max: 12 },
      startDay: { type: Number, min: 1, max: 31 },
      endMonth: { type: Number, min: 1, max: 12 },
      endDay: { type: Number, min: 1, max: 31 }
    },
    // Days before check-in for last_minute/early_bird
    daysBeforeCheckIn: {
      min: Number,
      max: Number
    },
    // Active status
    isActive: {
      type: Boolean,
      default: true
    },
    // Priority (higher = applied first in case of conflicts)
    priority: {
      type: Number,
      default: 0
    }
  }],

  /**
   * Custom Pricing - Calendar-based (like Airbnb)
   * Specific dates with custom prices
   */
  customPricing: [{
    // Start and end date for this custom price
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    // Price per night for this period
    pricePerNight: {
      type: Number,
      required: true,
      min: 0
    },
    // Optional reason/label for this custom price
    reason: {
      type: String,
      maxLength: 100
    },
    // Minimum nights for this period
    minNights: {
      type: Number,
      default: 1
    },
    // Whether this is a blocked period (price is 0, not bookable)
    isBlocked: {
      type: Boolean,
      default: false
    }
  }],

  /**
   * Discount Rules - Automatic discounts
   */
  discounts: {
    // Weekly discount (for 7+ nights)
    weeklyDiscount: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    // Monthly discount (for 28+ nights)
    monthlyDiscount: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    // New listing promotion (active for first X bookings)
    newListingPromo: {
      enabled: {
        type: Boolean,
        default: false
      },
      discountPercent: {
        type: Number,
        min: 0,
        max: 50,
        default: 10
      },
      maxBookings: {
        type: Number,
        default: 3
      }
    }
  },

  // Availability
  availability: {
    instantBook: {
      type: Boolean,
      default: false
    },
    minStay: {
      type: Number,
      default: 1
    },
    maxStay: {
      type: Number,
      default: 365
    },
    advanceNotice: {
      type: Number,
      default: 0
    },
    preparationTime: {
      type: Number,
      default: 0
    },
    checkInFrom: {
      type: String,
      default: '15:00'
    },
    checkInTo: {
      type: String,
      default: '21:00'
    },
    checkOutBefore: {
      type: String,
      default: '11:00'
    }
  },

  // Cancellation Policy
  cancellationPolicy: {
    type: String,
    enum: [
      'flexible',        // Remboursement intégral jusqu'à 24h avant l'arrivée
      'moderate',        // Remboursement intégral jusqu'à 5 jours avant l'arrivée
      'strict',          // Remboursement de 50% jusqu'à 1 semaine avant l'arrivée
      'strict_long_term', // Strict pour séjours longs (30+ jours)
      'non_refundable'   // Non remboursable
    ],
    default: 'moderate'
  },

  // House Rules
  rules: {
    smoking: {
      type: String,
      enum: ['allowed', 'not_allowed'],
      default: 'not_allowed'
    },
    pets: {
      type: String,
      enum: ['allowed', 'not_allowed'],
      default: 'not_allowed'
    },
    parties: {
      type: String,
      enum: ['allowed', 'not_allowed'],
      default: 'not_allowed'
    },
    children: {
      type: String,
      enum: ['allowed', 'not_allowed'],
      default: 'allowed'
    },
    additionalRules: [String]
  },

  // Media
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],

  // Status
  status: {
    type: String,
    enum: ['draft', 'pending', 'active', 'paused', 'inactive', 'blocked'],
    default: 'draft'
  },

  // Statistics
  stats: {
    views: {
      type: Number,
      default: 0
    },
    favorites: {
      type: Number,
      default: 0
    },
    bookings: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    reviewCount: {
      type: Number,
      default: 0
    },
    guestPhotoCount: {
      type: Number,
      default: 0
    }
  },

  // iCal calendar sync
  icalToken: {
    type: String,
    unique: true,
    sparse: true
  },
  externalCalendars: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    lastSynced: { type: Date },
    lastError: { type: String }
  }],

  // Blocked dates (enhanced for iCal sync)
  blockedDates: [{
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: String,
    source: {
      type: String,
      enum: ['manual', 'ical', 'booking'],
      default: 'manual'
    },
    externalCalendarName: { type: String }
  }],

  // Featured
  featured: {
    type: Boolean,
    default: false
  },
  featuredUntil: Date,

  // SEO
  slug: {
    type: String,
    unique: true,
    index: true
  },

  // Admin fields
  adminNotes: String,
  rejectionReason: String,

  // ✅ SOFT DELETE FIELDS
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add pagination plugin
ListingSchema.plugin(mongoosePaginate);

// ✅ MIDDLEWARE: Exclure les listings supprimés par défaut
ListingSchema.pre(/^find/, function(next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// ✅ Pre-save validation and defaults for location
ListingSchema.pre('save', function(next) {
  if (this.location && !this.location.type) {
    this.location.type = 'Point';
  }
  
  if (this.status !== 'draft' && this.status !== 'inactive') {
    if (!this.location || !this.location.coordinates || this.location.coordinates.length !== 2) {
      return next(new Error('Valid coordinates are required for published listings'));
    }
    
    const [lng, lat] = this.location.coordinates;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return next(new Error('Invalid coordinates: longitude must be [-180, 180], latitude [-90, 90]'));
    }
  } else if (this.status === 'draft' || this.status === 'inactive') {
    if (!this.location || !this.location.coordinates || this.location.coordinates.length === 0 || 
        (this.location.coordinates[0] === 0 && this.location.coordinates[1] === 0)) {
      this.location = {
        type: 'Point',
        coordinates: [3.0588, 36.7538]
      };
    }
  }
  
  next();
});

// Indexes
ListingSchema.index(
  { location: '2dsphere' },
  { 
    partialFilterExpression: { 
      'location.coordinates': { $exists: true }
    },
 
  }
);

ListingSchema.index({ category: 1, subcategory: 1 });
ListingSchema.index({ 'pricing.basePrice': 1 });
ListingSchema.index({ status: 1 });
ListingSchema.index({ featured: -1, createdAt: -1 });
ListingSchema.index({ 'stats.averageRating': -1 });
ListingSchema.index({ host: 1 });
ListingSchema.index({ 'customPricing.startDate': 1, 'customPricing.endDate': 1 });
ListingSchema.index({ icalToken: 1 });

// Virtual for primary image
ListingSchema.virtual('primaryImage').get(function() {
  if (!this.images || !Array.isArray(this.images)) return '/uploads/listings/default.jpg';
  const primary = this.images.find(img => img.isPrimary);
  return primary ? primary.url : (this.images[0] ? this.images[0].url : '/uploads/listings/default.jpg');
});

// Virtual for price per night in different currencies
ListingSchema.virtual('priceInEUR').get(function() {
  if (this.pricing.currency === 'EUR') return this.pricing.basePrice;
  return Math.round(this.pricing.basePrice / 150 * 100) / 100;
});

ListingSchema.virtual('priceInDZD').get(function() {
  if (this.pricing.currency === 'DZD') return this.pricing.basePrice;
  return Math.round(this.pricing.basePrice * 150);
});

// Coup de coeur badge (averageRating >= 4.7 AND reviewCount >= 3)
ListingSchema.virtual('isCoupDeCoeur').get(function() {
  return (this.stats?.averageRating >= 4.7 && this.stats?.reviewCount >= 3);
});

// Generate slug before saving
ListingSchema.pre('save', function(next) {
  if (this.isModified('title') || this.isNew) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim() + '-' + this._id.toString().slice(-6);
  }
  next();
});

// ✅ METHOD: Soft delete
ListingSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// ✅ METHOD: Restore
ListingSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  return this.save();
};

/**
 * Get price for a specific date
 * Priority: customPricing > pricingRules > basePrice
 * @param {Date} date - The date to get price for
 * @returns {Number} Price for that date
 */
ListingSchema.methods.getPriceForDate = function(date) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  // 1. Check customPricing first (highest priority)
  const customPrice = this.customPricing?.find(cp => {
    const start = new Date(cp.startDate);
    const end = new Date(cp.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return targetDate >= start && targetDate <= end && !cp.isBlocked;
  });

  if (customPrice) {
    return customPrice.pricePerNight;
  }

  // 2. Check pricingRules
  const basePrice = this.pricing.basePrice;
  let finalPrice = basePrice;

  // Sort rules by priority (higher first)
  const activeRules = (this.pricingRules || [])
    .filter(rule => rule.isActive)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const rule of activeRules) {
    if (this._ruleApplies(rule, targetDate)) {
      finalPrice = this._applyRule(rule, basePrice);
      break; // Only apply highest priority matching rule
    }
  }

  return Math.round(finalPrice);
};

/**
 * Check if a pricing rule applies to a date
 */
ListingSchema.methods._ruleApplies = function(rule, date) {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
  const month = date.getMonth() + 1;
  const day = date.getDate();

  switch (rule.type) {
    case 'weekend':
      // Friday (5) and Saturday (6) nights
      return dayOfWeek === 5 || dayOfWeek === 6;

    case 'weekday':
      // Monday-Thursday nights (Sunday-Wednesday check-in)
      return dayOfWeek >= 0 && dayOfWeek <= 4 && dayOfWeek !== 5 && dayOfWeek !== 6;

    case 'haute_saison':
    case 'basse_saison':
      if (!rule.seasonDates) return false;
      return this._isDateInSeason(month, day, rule.seasonDates);

    case 'event':
      // Event pricing is handled like haute_saison
      if (!rule.seasonDates) return false;
      return this._isDateInSeason(month, day, rule.seasonDates);

    default:
      return false;
  }
};

/**
 * Check if date is within seasonal range
 */
ListingSchema.methods._isDateInSeason = function(month, day, seasonDates) {
  const { startMonth, startDay, endMonth, endDay } = seasonDates;

  // Handle year-wrap (e.g., Dec 15 - Jan 15)
  if (startMonth > endMonth || (startMonth === endMonth && startDay > endDay)) {
    // Season wraps around year
    return (month > startMonth || (month === startMonth && day >= startDay)) ||
           (month < endMonth || (month === endMonth && day <= endDay));
  }

  // Normal range within same year
  if (month > startMonth && month < endMonth) return true;
  if (month === startMonth && day >= startDay) return true;
  if (month === endMonth && day <= endDay) return true;

  return false;
};

/**
 * Apply pricing rule to base price
 */
ListingSchema.methods._applyRule = function(rule, basePrice) {
  switch (rule.adjustmentType) {
    case 'percentage':
      return basePrice * (1 + rule.adjustmentValue / 100);
    case 'fixed':
      return basePrice + rule.adjustmentValue;
    case 'absolute':
      return rule.adjustmentValue;
    default:
      return basePrice;
  }
};

/**
 * Check if a date is blocked (either in blockedDates or customPricing with isBlocked)
 */
ListingSchema.methods.isDateBlocked = function(date) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  // Check blockedDates
  const blocked = this.blockedDates?.some(bd => {
    const start = new Date(bd.startDate);
    const end = new Date(bd.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return targetDate >= start && targetDate <= end;
  });

  if (blocked) return true;

  // Check customPricing with isBlocked
  const blockedCustom = this.customPricing?.some(cp => {
    if (!cp.isBlocked) return false;
    const start = new Date(cp.startDate);
    const end = new Date(cp.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return targetDate >= start && targetDate <= end;
  });

  return blockedCustom || false;
};

// Update stats when listing is updated
ListingSchema.methods.updateStats = async function() {
  const Booking = mongoose.model('Booking');
  const Review = mongoose.model('Review');

  const bookingStats = await Booking.aggregate([
    { $match: { listing: this._id, status: 'completed' } },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' }
      }
    }
  ]);

  const reviewStats = await Review.aggregate([
    { $match: { listing: this._id } },
    {
      $group: {
        _id: null,
        reviewCount: { $sum: 1 },
        averageRating: { $avg: '$rating' }
      }
    }
  ]);

  this.stats.bookings = bookingStats[0]?.totalBookings || 0;
  this.stats.totalRevenue = bookingStats[0]?.totalRevenue || 0;
  this.stats.reviewCount = reviewStats[0]?.reviewCount || 0;
  this.stats.averageRating = reviewStats[0]?.averageRating || 0;

  return this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model('Listing', ListingSchema);