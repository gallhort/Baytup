const mongoose = require('mongoose');

/**
 * Dispute Model with Automatic Mediation Workflow
 *
 * Workflow Steps:
 * 1. OPEN: Dispute created, escrow frozen
 * 2. AWAITING_RESPONSE: Other party has 48h to respond with their version
 * 3. MEDIATION_PROPOSED: System generates mediation proposal based on evidence
 * 4. ACCEPTED/CONTESTED: Both parties respond (auto-apply after 48h if no contestation)
 * 5. ADMIN_REVIEW: If contested or high value, admin reviews
 * 6. RESOLVED: Final decision applied
 */

// Mediation response sub-schema
const mediationResponseSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  respondedAt: Date,
  comment: {
    type: String,
    maxLength: 500
  }
}, { _id: false });

// Timeline event sub-schema
const timelineEventSchema = new mongoose.Schema({
  event: {
    type: String,
    enum: [
      'dispute_created',
      'evidence_added',
      'response_submitted',
      'mediation_proposed',
      'mediation_accepted',
      'mediation_rejected',
      'mediation_auto_applied',
      'escalated_to_admin',
      'admin_decision',
      'refund_processed',
      'compensation_paid',
      'dispute_resolved',
      'dispute_closed'
    ],
    required: true
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  actorRole: {
    type: String,
    enum: ['guest', 'host', 'system', 'admin']
  },
  description: String,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const disputeSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true
  },

  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  reportedByRole: {
    type: String,
    enum: ['guest', 'host'],
    required: true
  },

  reason: {
    type: String,
    required: true,
    enum: [
      // Host reasons (problems with guest)
      'property_damage',        // Dégâts causés par le voyageur
      'excessive_mess',         // Saleté excessive
      'guest_behavior',         // Comportement inapproprié
      'unauthorized_guests',    // Nombre de personnes non respecté
      'noise_party',           // Bruit/fête non autorisée
      'rule_violation',        // Non-respect des règles
      'early_late',            // Arrivée/départ non respecté
      'smoking',               // Fumer dans le logement
      // Guest reasons (problems with property/host)
      'dirty_arrival',         // Logement sale à l'arrivée
      'amenities_missing',     // Équipements manquants
      'safety_issue',          // Problème de sécurité
      'misleading_listing',    // Annonce trompeuse
      'no_access',             // Problème d'accès
      'host_unresponsive',     // Hôte injoignable
      'noise_disturbance',     // Nuisances sonores
      'cancellation_host',     // Annulation par l'hôte
      // Common
      'payment',               // Problème de paiement
      'other'                  // Autre
    ]
  },

  description: {
    type: String,
    required: true,
    minLength: [20, 'Description must be at least 20 characters'],
    maxLength: [2000, 'Description cannot exceed 2000 characters']
  },

  // Enhanced status with mediation workflow
  status: {
    type: String,
    enum: [
      'open',                  // Just created
      'awaiting_response',     // Waiting for other party (48h deadline)
      'mediation_proposed',    // System proposed a solution
      'contested',             // One party rejected mediation
      'admin_review',          // Escalated to admin
      'resolved',              // Final decision applied
      'closed'                 // Dispute closed
    ],
    default: 'open'
  },

  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Amount in dispute (for calculation purposes)
  disputedAmount: {
    type: Number,
    default: 0
  },

  // Escrow status
  escrowFrozen: {
    type: Boolean,
    default: true
  },

  // Other party's response
  otherPartyResponse: {
    respondedAt: Date,
    description: {
      type: String,
      maxLength: 2000
    },
    agreedWithReporter: Boolean
  },

  // Response deadline (48h from creation or mediation proposal)
  responseDeadline: Date,

  evidence: [{
    type: {
      type: String,
      enum: ['photo', 'video', 'document', 'message', 'receipt']
    },
    url: String,
    description: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedByRole: {
      type: String,
      enum: ['guest', 'host', 'admin']
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    verifiedByAdmin: {
      type: Boolean,
      default: false
    }
  }],

  // Automatic Mediation System
  mediation: {
    // Mediation score (0-100, higher = favor reporter)
    score: {
      type: Number,
      min: 0,
      max: 100
    },

    // Factors that contributed to the score
    scoreFactors: [{
      factor: String,
      points: Number,
      description: String
    }],

    // Proposed compensation type
    compensationType: {
      type: String,
      enum: [
        'full_refund_guest',      // 100% refund to guest
        'partial_refund_guest',   // Partial refund to guest
        'compensate_host',        // Compensation to host for damages
        'split',                  // Split between both parties
        'no_compensation'         // No monetary compensation
      ]
    },

    // Compensation amounts
    guestRefundAmount: {
      type: Number,
      default: 0
    },
    hostCompensationAmount: {
      type: Number,
      default: 0
    },

    // Refund percentage (for partial refunds)
    refundPercent: {
      type: Number,
      min: 0,
      max: 100
    },

    // System-generated reasoning
    reasoning: String,

    // Mediation proposal timestamp
    proposedAt: Date,

    // Response deadline for mediation (48h)
    responseDeadline: Date,

    // Responses from both parties
    guestResponse: mediationResponseSchema,
    hostResponse: mediationResponseSchema,

    // Whether mediation was auto-applied (no contestation within 48h)
    autoApplied: {
      type: Boolean,
      default: false
    },

    // Whether this requires admin review (high value or contested)
    requiresAdminReview: {
      type: Boolean,
      default: false
    },

    // Threshold for automatic application (disputes above this need both acceptances)
    highValueThreshold: {
      type: Number,
      default: 30000 // 30,000 DZD
    }
  },

  // Admin review section
  adminReview: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    decision: {
      type: String,
      enum: ['uphold_mediation', 'modify', 'reject_dispute', 'custom']
    },
    customDecision: String,
    modifiedRefundAmount: Number,
    modifiedHostCompensation: Number,
    adminNotes: String
  },

  // Final resolution
  resolution: {
    type: String,
    maxLength: [1000, 'Resolution cannot exceed 1000 characters']
  },

  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  resolutionType: {
    type: String,
    enum: ['mediation_accepted', 'mediation_auto_applied', 'admin_decision', 'mutual_agreement', 'withdrawn']
  },

  // Final amounts applied
  finalResolution: {
    guestRefunded: {
      type: Number,
      default: 0
    },
    hostCompensated: {
      type: Number,
      default: 0
    },
    stripeRefundId: String,
    stripeTransferId: String,
    processedAt: Date
  },

  // Timeline of all events
  timeline: [timelineEventSchema],

  // Legacy notes field (kept for backward compatibility)
  notes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    isInternal: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  resolvedAt: Date
}, {
  timestamps: true
});

// Indexes for quick lookups
disputeSchema.index({ booking: 1, status: 1 });
disputeSchema.index({ reportedBy: 1, createdAt: -1 });
disputeSchema.index({ status: 1, priority: -1 });
disputeSchema.index({ 'mediation.responseDeadline': 1, status: 1 }); // For auto-apply job
disputeSchema.index({ responseDeadline: 1, status: 1 }); // For response deadline job

// Update timestamps
disputeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add timeline event helper
disputeSchema.methods.addTimelineEvent = function(event, actor, actorRole, description, metadata = {}) {
  this.timeline.push({
    event,
    actor,
    actorRole,
    description,
    metadata,
    createdAt: new Date()
  });
};

// Check if mediation can be auto-applied
disputeSchema.methods.canAutoApplyMediation = function() {
  if (this.status !== 'mediation_proposed') return false;
  if (!this.mediation?.responseDeadline) return false;

  const now = new Date();
  const deadline = new Date(this.mediation.responseDeadline);

  // Deadline passed
  if (now < deadline) return false;

  // Check if high value dispute
  const isHighValue = this.disputedAmount > (this.mediation.highValueThreshold || 30000);

  if (isHighValue) {
    // High value: both must accept
    return this.mediation.guestResponse?.status === 'accepted' &&
           this.mediation.hostResponse?.status === 'accepted';
  }

  // Normal value: auto-apply if no rejection
  return this.mediation.guestResponse?.status !== 'rejected' &&
         this.mediation.hostResponse?.status !== 'rejected';
};

// Check if dispute is contested
disputeSchema.methods.isContested = function() {
  return this.mediation?.guestResponse?.status === 'rejected' ||
         this.mediation?.hostResponse?.status === 'rejected';
};

// Get the other party (not the reporter)
disputeSchema.methods.getOtherPartyId = async function() {
  await this.populate('booking', 'guest host');
  if (this.reportedByRole === 'guest') {
    return this.booking.host;
  }
  return this.booking.guest;
};

// Virtual for time remaining until deadline
disputeSchema.virtual('timeUntilDeadline').get(function() {
  const deadline = this.mediation?.responseDeadline || this.responseDeadline;
  if (!deadline) return null;

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate - now;

  if (diff <= 0) return { expired: true, hours: 0, minutes: 0 };

  return {
    expired: false,
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  };
});

// Ensure virtuals are included in JSON
disputeSchema.set('toJSON', { virtuals: true });
disputeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Dispute', disputeSchema);