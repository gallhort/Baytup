const mongoose = require('mongoose');

/**
 * Ticket Model
 * Système de support avec email-to-ticket
 */
const ticketSchema = new mongoose.Schema({
  // Ticket number (auto-increment, user-friendly)
  ticketNumber: {
    type: String,
    unique: true,
    index: true
  },

  // User qui a créé le ticket
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Sujet
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    maxLength: [200, 'Subject cannot exceed 200 characters'],
    trim: true
  },

  // Description initiale
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxLength: [5000, 'Description cannot exceed 5000 characters']
  },

  // Catégorie
  category: {
    type: String,
    enum: [
      'account',        // Compte & authentification
      'booking',        // Réservations
      'payment',        // Paiements & remboursements
      'listing',        // Annonces
      'technical',      // Problèmes techniques
      'dispute',        // Litiges
      'verification',   // Vérifications
      'other'           // Autre
    ],
    default: 'other',
    index: true
  },

  // Statut
  status: {
    type: String,
    enum: ['open', 'pending', 'resolved', 'closed'],
    default: 'open',
    index: true
  },

  // Priorité
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },

  // Agent assigné
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },

  // Thread de messages (conversation)
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderType: {
      type: String,
      enum: ['user', 'agent', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true,
      maxLength: 5000
    },
    attachments: [{
      url: String,
      filename: String,
      type: {
        type: String,
        enum: ['image', 'document', 'pdf']
      },
      size: Number
    }],
    isInternal: {
      type: Boolean,
      default: false  // true = note interne entre agents, pas visible par user
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Métadonnées email-to-ticket
  emailMetadata: {
    fromEmail: String,
    toEmail: String,
    messageId: String,       // Email Message-ID header
    inReplyTo: String,       // Email In-Reply-To header
    references: [String],    // Email References header
    receivedAt: Date
  },

  // Références liées (booking, listing, dispute, etc.)
  relatedBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  relatedListing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing'
  },
  relatedDispute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dispute'
  },

  // Tags personnalisés
  tags: [String],

  // Temps de résolution (calculé quand status → resolved)
  resolutionTime: {
    type: Number,  // en minutes
    default: null
  },

  // Satisfaction client (1-5)
  satisfaction: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    ratedAt: Date
  },

  // Dates
  resolvedAt: Date,
  closedAt: Date,
  lastActivityAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Index composites pour performance
ticketSchema.index({ user: 1, status: 1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ category: 1, priority: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ lastActivityAt: -1 });

// Virtual pour nombre de messages
ticketSchema.virtual('messageCount').get(function() {
  return this.messages.length;
});

// Virtual pour temps depuis création
ticketSchema.virtual('ageInHours').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  return Math.floor(diff / (1000 * 60 * 60));
});

// Pre-save hook pour générer ticketNumber
ticketSchema.pre('save', async function(next) {
  if (this.isNew && !this.ticketNumber) {
    // Generate ticket number: TKT-YYYYMM-XXXXX
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Find highest ticket number for this month
    const lastTicket = await this.constructor.findOne({
      ticketNumber: new RegExp(`^TKT-${year}${month}-`)
    }).sort('-ticketNumber');

    let sequence = 1;
    if (lastTicket && lastTicket.ticketNumber) {
      const lastSeq = parseInt(lastTicket.ticketNumber.split('-')[2]);
      sequence = lastSeq + 1;
    }

    this.ticketNumber = `TKT-${year}${month}-${String(sequence).padStart(5, '0')}`;
  }

  // Update lastActivityAt on any change
  if (!this.isNew) {
    this.lastActivityAt = new Date();
  }

  next();
});

// Pre-save hook pour calculer resolutionTime
ticketSchema.pre('save', function(next) {
  // Si status devient resolved et pas encore de resolutionTime
  if (this.status === 'resolved' && !this.resolutionTime && !this.resolvedAt) {
    this.resolvedAt = new Date();
    const diff = this.resolvedAt - this.createdAt;
    this.resolutionTime = Math.floor(diff / (1000 * 60)); // en minutes
  }

  // Si status devient closed
  if (this.status === 'closed' && !this.closedAt) {
    this.closedAt = new Date();
  }

  next();
});

// Method pour ajouter un message
ticketSchema.methods.addMessage = async function(senderId, content, senderType = 'user', attachments = [], isInternal = false) {
  this.messages.push({
    sender: senderId,
    senderType,
    content,
    attachments,
    isInternal,
    createdAt: new Date()
  });

  this.lastActivityAt = new Date();
  await this.save();

  return this.messages[this.messages.length - 1];
};

// Method pour assigner à un agent
ticketSchema.methods.assign = async function(agentId) {
  this.assignedTo = agentId;
  this.lastActivityAt = new Date();
  await this.save();
};

// Method pour changer le statut
ticketSchema.methods.updateStatus = async function(newStatus) {
  this.status = newStatus;
  this.lastActivityAt = new Date();

  if (newStatus === 'resolved' && !this.resolvedAt) {
    this.resolvedAt = new Date();
    const diff = this.resolvedAt - this.createdAt;
    this.resolutionTime = Math.floor(diff / (1000 * 60));
  }

  if (newStatus === 'closed' && !this.closedAt) {
    this.closedAt = new Date();
  }

  await this.save();
};

// Static method pour stats
ticketSchema.statics.getStats = async function(filters = {}) {
  const stats = await this.aggregate([
    { $match: filters },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        avgResolutionTime: { $avg: '$resolutionTime' }
      }
    }
  ]);

  return stats[0] || {
    total: 0,
    open: 0,
    pending: 0,
    resolved: 0,
    closed: 0,
    avgResolutionTime: 0
  };
};

module.exports = mongoose.model('Ticket', ticketSchema);
