const mongoose = require('mongoose');

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
  
  status: {
    type: String,
    enum: ['open', 'pending', 'resolved', 'closed'],
    default: 'open'
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  evidence: [{
    type: {
      type: String,
      enum: ['photo', 'document', 'message']
    },
    url: String,
    description: String
  }],
  
  resolution: {
    type: String,
    maxLength: [1000, 'Resolution cannot exceed 1000 characters']
  },
  
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  notes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
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

// Index for quick lookups
disputeSchema.index({ booking: 1, status: 1 });
disputeSchema.index({ reportedBy: 1, createdAt: -1 });
disputeSchema.index({ status: 1, priority: -1 });

// Update timestamps
disputeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Dispute', disputeSchema);