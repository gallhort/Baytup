const mongoose = require('mongoose');

/**
 * Platform Settings Schema
 * Stores configurable platform settings like commission rates
 */
const platformSettingsSchema = new mongoose.Schema({
  // Unique key for the setting
  key: {
    type: String,
    required: true,
    unique: true,
    enum: [
      'commission_default',
      'commission_stay',
      'commission_vehicle',
      'commission_luxury',
      'commission_experience',
      'escrow_release_delay_hours',
      'voucher_expiry_hours',
      'host_response_deadline_hours',
      'stripe_enabled',
      'slickpay_enabled',
      'nordexpress_enabled'
    ]
  },

  // Value (stored as string, parsed based on type)
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // Type of the value for proper parsing
  valueType: {
    type: String,
    enum: ['number', 'boolean', 'string', 'percentage'],
    default: 'string'
  },

  // Description for admin UI
  description: {
    type: String
  },

  // Category for grouping in admin UI
  category: {
    type: String,
    enum: ['commission', 'timing', 'payment_providers', 'other'],
    default: 'other'
  },

  // Min/max for numeric values
  minValue: Number,
  maxValue: Number,

  // Last updated by
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // History of changes
  history: [{
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }]
}, {
  timestamps: true
});

// Static method to get a setting value
platformSettingsSchema.statics.getValue = async function(key, defaultValue = null) {
  const setting = await this.findOne({ key });
  if (!setting) return defaultValue;

  // Parse value based on type
  switch (setting.valueType) {
    case 'number':
    case 'percentage':
      return parseFloat(setting.value);
    case 'boolean':
      return setting.value === true || setting.value === 'true';
    default:
      return setting.value;
  }
};

// Static method to set a setting value
platformSettingsSchema.statics.setValue = async function(key, value, userId = null, reason = null) {
  const setting = await this.findOne({ key });

  if (setting) {
    // Add to history
    setting.history.push({
      previousValue: setting.value,
      newValue: value,
      changedBy: userId,
      reason
    });

    setting.value = value;
    setting.updatedBy = userId;
    await setting.save();
    return setting;
  }

  return null;
};

// Static method to get all commission rates
platformSettingsSchema.statics.getCommissionRates = async function() {
  const commissions = await this.find({ category: 'commission' });

  const rates = {};
  for (const setting of commissions) {
    const key = setting.key.replace('commission_', '');
    rates[key] = parseFloat(setting.value);
  }

  return rates;
};

// Static method to get commission rate for a listing
platformSettingsSchema.statics.getCommissionForListing = async function(listing) {
  // Try category-specific commission first
  let categoryKey = 'commission_default';

  if (listing.category === 'stay') {
    categoryKey = 'commission_stay';
  } else if (listing.category === 'vehicle') {
    categoryKey = 'commission_vehicle';
  }

  // Check for luxury (high-end listings)
  if (listing.pricing?.basePrice >= 500) {
    const luxuryRate = await this.getValue('commission_luxury');
    if (luxuryRate !== null) {
      return luxuryRate;
    }
  }

  // Get category rate
  const categoryRate = await this.getValue(categoryKey);
  if (categoryRate !== null) {
    return categoryRate;
  }

  // Fallback to default
  return await this.getValue('commission_default', 0.20);
};

// Static method to initialize default settings
platformSettingsSchema.statics.initializeDefaults = async function() {
  const defaults = [
    // Commission settings
    {
      key: 'commission_default',
      value: 0.20,
      valueType: 'percentage',
      description: 'Commission par défaut (20%)',
      category: 'commission',
      minValue: 0,
      maxValue: 1
    },
    {
      key: 'commission_stay',
      value: 0.20,
      valueType: 'percentage',
      description: 'Commission pour hébergements',
      category: 'commission',
      minValue: 0,
      maxValue: 1
    },
    {
      key: 'commission_vehicle',
      value: 0.15,
      valueType: 'percentage',
      description: 'Commission pour véhicules',
      category: 'commission',
      minValue: 0,
      maxValue: 1
    },
    {
      key: 'commission_luxury',
      value: 0.25,
      valueType: 'percentage',
      description: 'Commission pour biens de luxe (>500€/nuit)',
      category: 'commission',
      minValue: 0,
      maxValue: 1
    },
    // Timing settings
    {
      key: 'escrow_release_delay_hours',
      value: 24,
      valueType: 'number',
      description: 'Délai libération escrow après checkout (heures)',
      category: 'timing',
      minValue: 0,
      maxValue: 168
    },
    {
      key: 'voucher_expiry_hours',
      value: 48,
      valueType: 'number',
      description: 'Expiration voucher Nord Express (heures)',
      category: 'timing',
      minValue: 12,
      maxValue: 168
    },
    {
      key: 'host_response_deadline_hours',
      value: 24,
      valueType: 'number',
      description: 'Délai réponse hôte (heures)',
      category: 'timing',
      minValue: 1,
      maxValue: 72
    },
    // Payment providers
    {
      key: 'stripe_enabled',
      value: true,
      valueType: 'boolean',
      description: 'Paiements Stripe (EUR) activés',
      category: 'payment_providers'
    },
    {
      key: 'slickpay_enabled',
      value: true,
      valueType: 'boolean',
      description: 'Paiements SlickPay (DZD) activés',
      category: 'payment_providers'
    },
    {
      key: 'nordexpress_enabled',
      value: true,
      valueType: 'boolean',
      description: 'Paiements Nord Express (espèces) activés',
      category: 'payment_providers'
    }
  ];

  for (const setting of defaults) {
    await this.findOneAndUpdate(
      { key: setting.key },
      { $setOnInsert: setting },
      { upsert: true, new: true }
    );
  }

  console.log('✅ Platform settings initialized');
};

const PlatformSettings = mongoose.model('PlatformSettings', platformSettingsSchema);

module.exports = PlatformSettings;
