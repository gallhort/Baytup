const mongoose = require('mongoose');

/**
 * Audit Log Model
 * Tracker toutes les actions sensibles pour sécurité et debugging
 * Style Airbnb : garder historique complet pour disputes et investigations
 */

const AuditLogSchema = new mongoose.Schema({
  // User concerné
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Type d'action
  action: {
    type: String,
    required: true,
    enum: [
      // Authentication
      'LOGIN',
      'LOGOUT',
      'LOGIN_FAILED',
      'PASSWORD_RESET',
      'EMAIL_VERIFIED',

      // 2FA
      '2FA_ENABLED',
      '2FA_DISABLED',
      '2FA_VERIFIED',
      '2FA_FAILED',
      'BACKUP_CODE_USED',
      'BACKUP_CODES_REGENERATED',

      // Account changes
      'EMAIL_CHANGED',
      'PASSWORD_CHANGED',
      'PHONE_CHANGED',
      'PROFILE_UPDATED',

      // Banking/Payout
      'BANK_ACCOUNT_ADDED',
      'BANK_ACCOUNT_UPDATED',
      'BANK_ACCOUNT_REMOVED',
      'STRIPE_CONNECT_ONBOARDING',
      'STRIPE_CONNECT_UPDATED',
      'PAYOUT_REQUESTED',
      'PAYOUT_COMPLETED',
      'PAYOUT_FAILED',

      // Listings
      'LISTING_CREATED',
      'LISTING_UPDATED',
      'LISTING_DELETED',
      'LISTING_PUBLISHED',
      'LISTING_UNPUBLISHED',

      // Bookings
      'BOOKING_CREATED',
      'BOOKING_CANCELLED',
      'BOOKING_COMPLETED',

      // Security
      'SUSPICIOUS_ACTIVITY',
      'ACCOUNT_LOCKED',
      'ACCOUNT_UNLOCKED',
      'IP_BLOCKED',

      // Admin actions
      'ADMIN_ACCESS',
      'ADMIN_USER_MODIFIED',
      'ADMIN_BOOKING_MODIFIED'
    ],
    index: true
  },

  // Détails de l'action
  details: {
    // Ancienne valeur (si modification)
    oldValue: mongoose.Schema.Types.Mixed,
    // Nouvelle valeur (si modification)
    newValue: mongoose.Schema.Types.Mixed,
    // Informations additionnelles
    metadata: mongoose.Schema.Types.Mixed
  },

  // Informations de connexion
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: String,
  device: {
    type: String,
    browser: String,
    os: String,
    isMobile: Boolean
  },
  location: {
    country: String,
    city: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },

  // Status
  status: {
    type: String,
    enum: ['success', 'failed', 'pending', 'flagged'],
    default: 'success'
  },
  errorMessage: String,

  // Niveau de sévérité
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },

  // Pour les alertes de sécurité
  flagged: {
    type: Boolean,
    default: false
  },
  flaggedReason: String,
  flaggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  flaggedAt: Date,

  // Investigation
  investigated: {
    type: Boolean,
    default: false
  },
  investigationNotes: String,
  investigatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  investigatedAt: Date

}, {
  timestamps: true
});

// Indexes pour recherche rapide
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ ipAddress: 1, createdAt: -1 });
AuditLogSchema.index({ flagged: 1, createdAt: -1 });
AuditLogSchema.index({ severity: 1, createdAt: -1 });

// Static method: Log une action
AuditLogSchema.statics.log = async function(data) {
  try {
    return await this.create(data);
  } catch (error) {
    console.error('Audit log error:', error);
    // Ne jamais fail l'opération principale à cause d'un problème de log
    return null;
  }
};

// Static method: Détecter activité suspecte
AuditLogSchema.statics.checkSuspiciousActivity = async function(userId, ipAddress) {
  const now = new Date();
  const oneHourAgo = new Date(now - 3600000);

  // Vérifier nombre de tentatives de login failed
  const failedLogins = await this.countDocuments({
    userId,
    action: 'LOGIN_FAILED',
    createdAt: { $gte: oneHourAgo }
  });

  // Plus de 5 tentatives = suspect
  if (failedLogins >= 5) {
    await this.log({
      userId,
      action: 'SUSPICIOUS_ACTIVITY',
      details: {
        metadata: {
          reason: 'Multiple failed login attempts',
          count: failedLogins
        }
      },
      ipAddress,
      severity: 'high',
      flagged: true,
      flaggedReason: `${failedLogins} failed login attempts in 1 hour`
    });
    return true;
  }

  // Vérifier changements rapides (email, password, IBAN dans 1h)
  const recentChanges = await this.countDocuments({
    userId,
    action: { $in: ['EMAIL_CHANGED', 'PASSWORD_CHANGED', 'BANK_ACCOUNT_UPDATED'] },
    createdAt: { $gte: oneHourAgo }
  });

  if (recentChanges >= 3) {
    await this.log({
      userId,
      action: 'SUSPICIOUS_ACTIVITY',
      details: {
        metadata: {
          reason: 'Multiple sensitive changes in short time',
          count: recentChanges
        }
      },
      ipAddress,
      severity: 'critical',
      flagged: true,
      flaggedReason: `${recentChanges} sensitive changes in 1 hour`
    });
    return true;
  }

  return false;
};

// Static method: Obtenir logs d'un user
AuditLogSchema.statics.getUserLogs = async function(userId, options = {}) {
  const {
    limit = 50,
    skip = 0,
    action = null,
    severity = null,
    startDate = null,
    endDate = null
  } = options;

  const query = { userId };

  if (action) query.action = action;
  if (severity) query.severity = severity;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

module.exports = mongoose.model('AuditLog', AuditLogSchema);
