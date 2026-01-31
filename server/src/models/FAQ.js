const mongoose = require('mongoose');

const FAQSchema = new mongoose.Schema({
  // Question and Answer
  question: {
    fr: {
      type: String,
      required: [true, 'Question (FR) is required'],
      maxLength: [500, 'Question cannot exceed 500 characters']
    },
    en: {
      type: String,
      maxLength: [500, 'Question cannot exceed 500 characters']
    },
    ar: {
      type: String,
      maxLength: [500, 'Question cannot exceed 500 characters']
    }
  },
  answer: {
    fr: {
      type: String,
      required: [true, 'Answer (FR) is required'],
      maxLength: [5000, 'Answer cannot exceed 5000 characters']
    },
    en: {
      type: String,
      maxLength: [5000, 'Answer cannot exceed 5000 characters']
    },
    ar: {
      type: String,
      maxLength: [5000, 'Answer cannot exceed 5000 characters']
    }
  },

  // Category for grouping FAQs
  category: {
    type: String,
    enum: [
      'general',           // Questions générales
      'booking',           // Réservations
      'payment',           // Paiements
      'cancellation',      // Annulations
      'host',              // Pour les hôtes
      'guest',             // Pour les voyageurs
      'account',           // Compte et profil
      'security',          // Sécurité
      'listing',           // Annonces
      'reviews',           // Avis
      'support',           // Support
      'legal'              // Légal / CGU
    ],
    default: 'general',
    index: true
  },

  // Target audience
  audience: {
    type: String,
    enum: ['all', 'guest', 'host'],
    default: 'all',
    index: true
  },

  // Tags for search
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],

  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    index: true
  },

  // Display order within category
  order: {
    type: Number,
    default: 0
  },

  // Featured/Popular flag
  isFeatured: {
    type: Boolean,
    default: false
  },

  // View count for analytics
  viewCount: {
    type: Number,
    default: 0
  },

  // Helpful votes
  helpful: {
    yes: { type: Number, default: 0 },
    no: { type: Number, default: 0 }
  },

  // Related FAQs
  relatedFAQs: [{
    type: mongoose.Schema.ObjectId,
    ref: 'FAQ'
  }],

  // Author/Editor tracking
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  publishedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
FAQSchema.index({ category: 1, status: 1, order: 1 });
FAQSchema.index({ audience: 1, status: 1 });
FAQSchema.index({ tags: 1 });
FAQSchema.index({ 'question.fr': 'text', 'question.en': 'text', 'answer.fr': 'text', 'answer.en': 'text' });

// Virtual for helpfulness score
FAQSchema.virtual('helpfulnessScore').get(function() {
  const total = this.helpful.yes + this.helpful.no;
  if (total === 0) return 0;
  return Math.round((this.helpful.yes / total) * 100);
});

// Pre-save hook to set publishedAt
FAQSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Static method to get FAQs by category
FAQSchema.statics.getByCategory = async function(category, language = 'fr', audience = 'all') {
  const query = {
    status: 'published',
    category
  };

  if (audience !== 'all') {
    query.$or = [
      { audience: 'all' },
      { audience }
    ];
  }

  return this.find(query)
    .sort({ order: 1, viewCount: -1 })
    .select(`question.${language} answer.${language} category audience tags isFeatured`);
};

// Static method to get featured FAQs
FAQSchema.statics.getFeatured = async function(language = 'fr', limit = 5) {
  return this.find({
    status: 'published',
    isFeatured: true
  })
    .sort({ viewCount: -1 })
    .limit(limit)
    .select(`question.${language} answer.${language} category`);
};

// Static method to search FAQs
FAQSchema.statics.search = async function(query, language = 'fr', audience = 'all') {
  const searchQuery = {
    status: 'published',
    $text: { $search: query }
  };

  if (audience !== 'all') {
    searchQuery.$or = [
      { audience: 'all' },
      { audience }
    ];
  }

  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(20)
    .select(`question.${language} answer.${language} category tags`);
};

// Instance method to increment view count
FAQSchema.methods.incrementView = async function() {
  this.viewCount += 1;
  return this.save({ validateBeforeSave: false });
};

// Instance method to vote helpful
FAQSchema.methods.voteHelpful = async function(isHelpful) {
  if (isHelpful) {
    this.helpful.yes += 1;
  } else {
    this.helpful.no += 1;
  }
  return this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model('FAQ', FAQSchema);
