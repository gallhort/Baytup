const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const ReviewSchema = new mongoose.Schema({
  // Basic Information
  listing: {
    type: mongoose.Schema.ObjectId,
    ref: 'Listing',
    required: [true, 'Listing is required']
  },
  booking: {
    type: mongoose.Schema.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking is required']
  },
  reviewer: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Reviewer is required']
  },
  reviewee: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Reviewee is required']
  },

  // Review Type
  type: {
    type: String,
    enum: ['guest_to_host', 'host_to_guest'],
    required: [true, 'Review type is required']
  },

  // Ratings (1-5 scale)
  rating: {
    overall: {
      type: Number,
      required: [true, 'Overall rating is required'],
      min: 1,
      max: 5
    },
    cleanliness: {
      type: Number,
      min: 1,
      max: 5
    },
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    checkIn: {
      type: Number,
      min: 1,
      max: 5
    },
    accuracy: {
      type: Number,
      min: 1,
      max: 5
    },
    location: {
      type: Number,
      min: 1,
      max: 5
    },
    value: {
      type: Number,
      min: 1,
      max: 5
    }
  },

  // Review Content
  title: {
    type: String,
    maxLength: [100, 'Review title cannot exceed 100 characters']
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    minLength: [10, 'Review comment must be at least 10 characters'],
    maxLength: [1000, 'Review comment cannot exceed 1000 characters']
  },

  // Photos (optional)
  photos: [{
    url: String,
    caption: String
  }],

  // Response from reviewee
  response: {
    comment: {
      type: String,
      maxLength: [500, 'Response cannot exceed 500 characters']
    },
    respondedAt: Date
  },

  // Review Status
  status: {
    type: String,
    enum: ['pending', 'published', 'hidden', 'flagged'],
    default: 'pending'
  },

  // Moderation
  flagged: {
    type: Boolean,
    default: false
  },
  flagReason: {
    type: String,
    enum: ['inappropriate', 'spam', 'fake', 'offensive', 'irrelevant', 'other']
  },
  moderatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  moderationNotes: String,

  // Helpfulness
  helpful: {
    count: {
      type: Number,
      default: 0
    },
    users: [{
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }]
  },

  // Visibility
  isPublic: {
    type: Boolean,
    default: true
  },

  // Publication date (can be delayed)
  publishedAt: Date,

  // Language of review
  language: {
    type: String,
    enum: ['en', 'fr', 'ar'],
    default: 'en'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add pagination plugin
ReviewSchema.plugin(mongoosePaginate);

// Indexes
ReviewSchema.index({ listing: 1, publishedAt: -1 });
ReviewSchema.index({ reviewer: 1, createdAt: -1 });
ReviewSchema.index({ reviewee: 1, type: 1 });
ReviewSchema.index({ booking: 1 });
ReviewSchema.index({ status: 1 });
ReviewSchema.index({ 'rating.overall': -1 });

// Compound index for preventing duplicate reviews
ReviewSchema.index({ booking: 1, reviewer: 1, type: 1 }, { unique: true });

// Virtual for average rating
ReviewSchema.virtual('averageRating').get(function() {
  const ratings = [
    this.rating.cleanliness,
    this.rating.communication,
    this.rating.checkIn,
    this.rating.accuracy,
    this.rating.location,
    this.rating.value
  ].filter(rating => rating !== undefined);

  if (ratings.length === 0) return this.rating.overall;

  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
});

// Virtual for review age
ReviewSchema.virtual('age').get(function() {
  const now = new Date();
  const created = this.createdAt || this.publishedAt;
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
});

// Auto-publish review after 48 hours
ReviewSchema.pre('save', function(next) {
  if (this.isNew && this.status === 'pending') {
    // Auto-publish after 48 hours if no moderation needed
    this.publishedAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  }
  next();
});

// Update listing and user stats after review is published
ReviewSchema.post('save', async function(doc) {
  if (doc.status === 'published' && doc.type === 'guest_to_host') {
    // Update listing stats
    const Listing = mongoose.model('Listing');
    const Review = mongoose.model('Review');

    const listing = await Listing.findById(doc.listing);
    if (listing) {
      // Calculate listing stats from all published guest-to-host reviews
      const allReviews = await Review.find({
        listing: doc.listing,
        status: 'published',
        type: 'guest_to_host'
      });

      if (allReviews.length > 0) {
        const totalRating = allReviews.reduce((sum, r) => sum + (r.rating.overall || 0), 0);
        const averageRating = totalRating / allReviews.length;

        if (!listing.stats) listing.stats = {};
        listing.stats.averageRating = Math.round(averageRating * 10) / 10;
        listing.stats.reviewCount = allReviews.length;
        await listing.save({ validateBeforeSave: false });
      }
    }

    // Update user (host) stats
    const User = mongoose.model('User');
    const user = await User.findById(doc.reviewee);
    if (user) {
      const userReviews = await Review.find({
        reviewee: doc.reviewee,
        status: 'published',
        type: 'guest_to_host'
      });

      if (userReviews.length > 0) {
        const totalRating = userReviews.reduce((sum, r) => sum + (r.rating.overall || 0), 0);
        const averageRating = totalRating / userReviews.length;

        if (!user.stats) user.stats = {};
        user.stats.averageRating = Math.round(averageRating * 10) / 10;
        user.stats.totalReviews = userReviews.length;
        await user.save({ validateBeforeSave: false });
      }
    }
  } else if (doc.status === 'published' && doc.type === 'host_to_guest') {
    // Update guest stats
    const User = mongoose.model('User');
    const Review = mongoose.model('Review');

    const user = await User.findById(doc.reviewee);
    if (user) {
      const userReviews = await Review.find({
        reviewee: doc.reviewee,
        status: 'published',
        type: 'host_to_guest'
      });

      if (userReviews.length > 0) {
        const totalRating = userReviews.reduce((sum, r) => sum + (r.rating.overall || 0), 0);
        const averageRating = totalRating / userReviews.length;

        if (!user.stats) user.stats = {};
        user.stats.averageRating = Math.round(averageRating * 10) / 10;
        user.stats.totalReviews = userReviews.length;
        await user.save({ validateBeforeSave: false });
      }
    }
  }
});

// Static method to get review statistics for a listing
ReviewSchema.statics.getListingStats = async function(listingId) {
  const stats = await this.aggregate([
    {
      $match: {
        listing: mongoose.Types.ObjectId(listingId),
        status: 'published',
        type: 'guest_to_host'
      }
    },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageOverall: { $avg: '$rating.overall' },
        averageCleanliness: { $avg: '$rating.cleanliness' },
        averageCommunication: { $avg: '$rating.communication' },
        averageCheckIn: { $avg: '$rating.checkIn' },
        averageAccuracy: { $avg: '$rating.accuracy' },
        averageLocation: { $avg: '$rating.location' },
        averageValue: { $avg: '$rating.value' }
      }
    }
  ]);

  return stats[0] || {
    totalReviews: 0,
    averageOverall: 0,
    averageCleanliness: 0,
    averageCommunication: 0,
    averageCheckIn: 0,
    averageAccuracy: 0,
    averageLocation: 0,
    averageValue: 0
  };
};

// Static method to get user stats
ReviewSchema.statics.getUserStats = async function(userId, type = 'host') {
  const reviewType = type === 'host' ? 'guest_to_host' : 'host_to_guest';

  const stats = await this.aggregate([
    {
      $match: {
        reviewee: mongoose.Types.ObjectId(userId),
        status: 'published',
        type: reviewType
      }
    },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating.overall' }
      }
    }
  ]);

  return stats[0] || { totalReviews: 0, averageRating: 0 };
};

// Method to mark review as helpful
ReviewSchema.methods.markHelpful = function(userId) {
  if (this.helpful.users.includes(userId)) {
    // Remove from helpful
    this.helpful.users.pull(userId);
    this.helpful.count = Math.max(0, this.helpful.count - 1);
  } else {
    // Add to helpful
    this.helpful.users.push(userId);
    this.helpful.count += 1;
  }

  return this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model('Review', ReviewSchema);