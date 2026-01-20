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
    required: [true, 'Subcategory is required']
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
      // ✅ Supprimé required - Validation conditionnelle via pre-save hook
      validate: {
        validator: function(coords) {
          // Valider seulement si coordinates est fourni
          if (coords && coords.length > 0) {
            return coords.length === 2 && 
                   coords[0] >= -180 && coords[0] <= 180 && // longitude
                   coords[1] >= -90 && coords[1] <= 90;     // latitude
          }
          return true; // Accepter vide pour brouillons
        },
        message: 'Coordinates must be [longitude, latitude] with valid ranges'
      }
    }
  },

  // Stay-specific fields (properties for accommodation)
  stayDetails: {
    stayType: {
      type: String,
      enum: ['apartment', 'house', 'villa', 'studio', 'room', 'riad', 'guesthouse', 'hotel_room']
    },
    bedrooms: Number,
    bathrooms: Number,
    area: Number, // in square meters
    floor: Number,
    furnished: {
      type: String,
      enum: ['furnished', 'semi-furnished', 'unfurnished']
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
      default: 0 // days
    },
    preparationTime: {
      type: Number,
      default: 0 // hours
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
    }
  },

  // Blocked dates
  blockedDates: [{
    startDate: Date,
    endDate: Date,
    reason: String
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
  rejectionReason: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add pagination plugin
ListingSchema.plugin(mongoosePaginate);

// ✅ Pre-save validation and defaults for location
ListingSchema.pre('save', function(next) {
  // Pour les listings publiés, location avec coordonnées valides est obligatoire
  if (this.status !== 'draft' && this.status !== 'inactive') {
    if (!this.location || !this.location.coordinates || this.location.coordinates.length !== 2) {
      return next(new Error('Valid coordinates are required for published listings'));
    }
    
    const [lng, lat] = this.location.coordinates;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return next(new Error('Invalid coordinates: longitude must be [-180, 180], latitude [-90, 90]'));
    }
  } else if (this.status === 'draft' || this.status === 'inactive') {
    // Pour les brouillons et inactifs sans coordonnées, utiliser Alger par défaut
    if (!this.location || !this.location.coordinates || this.location.coordinates.length === 0) {
      this.location = {
        type: 'Point',
        coordinates: [3.0588, 36.7538] // Alger, Algérie (longitude, latitude)
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
      'location.coordinates': { $exists: true, $ne: [] } 
    } 
  }
);
ListingSchema.index({ category: 1, subcategory: 1 });
ListingSchema.index({ 'pricing.basePrice': 1 });
ListingSchema.index({ status: 1 });
ListingSchema.index({ featured: -1, createdAt: -1 });
ListingSchema.index({ 'stats.averageRating': -1 });
ListingSchema.index({ host: 1 });

// Virtual for primary image
ListingSchema.virtual('primaryImage').get(function() {
  if (!this.images || !Array.isArray(this.images)) return '/uploads/listings/default.jpg';
  const primary = this.images.find(img => img.isPrimary);
  return primary ? primary.url : (this.images[0] ? this.images[0].url : '/uploads/listings/default.jpg');
});

// Virtual for price per night in different currencies
ListingSchema.virtual('priceInEUR').get(function() {
  if (this.pricing.currency === 'EUR') return this.pricing.basePrice;
  // Convert DZD to EUR (approximate rate)
  return Math.round(this.pricing.basePrice / 150 * 100) / 100;
});

ListingSchema.virtual('priceInDZD').get(function() {
  if (this.pricing.currency === 'DZD') return this.pricing.basePrice;
  // Convert EUR to DZD (approximate rate)
  return Math.round(this.pricing.basePrice * 150);
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