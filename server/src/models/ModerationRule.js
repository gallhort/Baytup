const mongoose = require('mongoose');

/**
 * ModerationRule Model
 * Règles de modération configurables pour filtrer le spam et contenu inapproprié
 */
const moderationRuleSchema = new mongoose.Schema({
  // Nom de la règle (pour référence admin)
  name: {
    type: String,
    required: [true, 'Nom de la règle requis'],
    unique: true,
    trim: true
  },

  // Type de règle
  type: {
    type: String,
    enum: ['keyword', 'pattern', 'behavior'],
    required: true
  },

  // Catégorie
  category: {
    type: String,
    enum: ['insult', 'spam', 'external_contact', 'inappropriate', 'other'],
    required: true
  },

  // Contenu de la règle (mot-clé ou regex)
  content: {
    type: String,
    required: [true, 'Contenu de la règle requis']
  },

  // Niveau de sévérité
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },

  // Action à prendre
  action: {
    type: String,
    enum: ['flag', 'block'],
    default: 'flag'
  },

  // Score de modération (0-100)
  score: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },

  // Message d'erreur personnalisé (pour blocage)
  errorMessage: {
    type: String,
    default: null
  },

  // S'applique à quels types de contenu
  appliesTo: [{
    type: String,
    enum: ['message', 'review', 'both'],
    default: 'both'
  }],

  // Langue(s) concernée(s)
  languages: [{
    type: String,
    enum: ['fr', 'ar', 'en', 'all'],
    default: 'all'
  }],

  // Activé/désactivé
  enabled: {
    type: Boolean,
    default: true
  },

  // Statistiques
  stats: {
    totalTriggered: { type: Number, default: 0 },
    totalBlocked: { type: Number, default: 0 },
    totalFlagged: { type: Number, default: 0 },
    lastTriggered: Date
  }
}, {
  timestamps: true
});

// Index pour recherche rapide
moderationRuleSchema.index({ enabled: 1, severity: 1 });
moderationRuleSchema.index({ category: 1, type: 1 });

// Méthode pour incrémenter les stats
moderationRuleSchema.methods.recordTrigger = async function(action) {
  this.stats.totalTriggered += 1;
  if (action === 'block') {
    this.stats.totalBlocked += 1;
  } else if (action === 'flag') {
    this.stats.totalFlagged += 1;
  }
  this.stats.lastTriggered = new Date();
  await this.save();
};

module.exports = mongoose.model('ModerationRule', moderationRuleSchema);
