const mongoose = require('mongoose');

const SystemSettingsSchema = new mongoose.Schema({
  // Unique identifier for the settings document (singleton pattern)
  _id: {
    type: String,
    default: 'system_settings',
    immutable: true
  },

  // Feature flags
  features: {
    vehiclesEnabled: {
      type: Boolean,
      default: true,
      index: true
    },
    accommodationsEnabled: {
      type: Boolean,
      default: true
    }
  },

  // Metadata
  lastModified: {
    type: Date,
    default: Date.now
  },
  modifiedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null
  },
  version: {
    type: Number,
    default: 1
  },

  // Audit trail
  changeHistory: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }]
}, {
  timestamps: true,
  collection: 'systemsettings'
});

// Index for fast lookups
SystemSettingsSchema.index({ 'features.vehiclesEnabled': 1 });

// Static method to get settings (singleton pattern)
SystemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findById('system_settings');

  // Create default settings if they don't exist
  if (!settings) {
    settings = await this.create({
      _id: 'system_settings',
      features: {
        vehiclesEnabled: true,
        accommodationsEnabled: true
      }
    });
  }

  return settings;
};

// Method to update a feature flag with audit trail
SystemSettingsSchema.methods.updateFeature = async function(featureName, value, userId, reason = '') {
  const oldValue = this.features[featureName];

  // Update the feature
  this.features[featureName] = value;
  this.lastModified = new Date();
  this.modifiedBy = userId;
  this.version += 1;

  // Add to change history
  this.changeHistory.push({
    field: `features.${featureName}`,
    oldValue,
    newValue: value,
    changedBy: userId,
    changedAt: new Date(),
    reason
  });

  // Keep only last 100 history entries
  if (this.changeHistory.length > 100) {
    this.changeHistory = this.changeHistory.slice(-100);
  }

  return await this.save();
};

module.exports = mongoose.model('SystemSettings', SystemSettingsSchema);
