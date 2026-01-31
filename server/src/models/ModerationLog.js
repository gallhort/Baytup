const mongoose = require('mongoose');

/**
 * ModerationLog Model
 * Logs de toutes les actions de modération pour audit et review admin
 */
const moderationLogSchema = new mongoose.Schema({
  // Type de contenu modéré
  contentType: {
    type: String,
    enum: ['message', 'review'],
    required: true
  },

  // ID du contenu (Message ou Review)
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false // Peut être null si bloqué avant création
  },

  // Utilisateur qui a créé le contenu
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Contenu original (pour review admin)
  originalContent: {
    type: String,
    required: true
  },

  // Règle(s) déclenchée(s)
  triggeredRules: [{
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ModerationRule'
    },
    ruleName: String,
    category: String,
    severity: String,
    score: Number
  }],

  // Score total de modération (somme des scores)
  totalScore: {
    type: Number,
    default: 0
  },

  // Action prise
  action: {
    type: String,
    enum: ['allow', 'flag', 'block'],
    required: true
  },

  // Status de review admin
  reviewStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'ignored'],
    default: 'pending'
  },

  // Admin qui a reviewé
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Date de review
  reviewedAt: Date,

  // Notes admin
  adminNotes: String,

  // Métadonnées contextuelles
  metadata: {
    ipAddress: String,
    userAgent: String,
    bookingId: mongoose.Schema.Types.ObjectId,
    conversationId: mongoose.Schema.Types.ObjectId
  }
}, {
  timestamps: true
});

// Index pour recherche et filtres admin
moderationLogSchema.index({ action: 1, reviewStatus: 1 });
moderationLogSchema.index({ user: 1, createdAt: -1 });
moderationLogSchema.index({ contentType: 1, action: 1 });
moderationLogSchema.index({ reviewStatus: 1, createdAt: -1 });

// Virtual pour affichage résumé
moderationLogSchema.virtual('summary').get(function() {
  return `${this.contentType} by user ${this.user} - ${this.action} (${this.triggeredRules.length} rules)`;
});

module.exports = mongoose.model('ModerationLog', moderationLogSchema);
