const mongoose = require('mongoose');
const SystemSettings = require('../src/models/SystemSettings');
require('dotenv').config({ path: '../.env' });

/**
 * Initialize System Settings
 * Creates the default SystemSettings document with default feature flags
 */
async function initSystemSettings() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/baytup');
    console.log('✅ Connected to MongoDB');

    // Check if settings already exist
    let settings = await SystemSettings.findById('system_settings');

    if (settings) {
      console.log('⚠️  System settings already exist:');
      console.log('   Features:', JSON.stringify(settings.features, null, 2));
      console.log('   Version:', settings.version);
      console.log('   Last Modified:', settings.lastModified);
      console.log('\n✅ No action needed - settings already initialized');
      return;
    }

    // Create default settings
    settings = await SystemSettings.create({
      _id: 'system_settings',
      features: {
        vehiclesEnabled: true,      // ✅ DEFAULT: Vehicles enabled (backward compatible)
        accommodationsEnabled: true
      }
    });

    console.log('✅ System settings initialized successfully:');
    console.log('   Features:', JSON.stringify(settings.features, null, 2));
    console.log('   Version:', settings.version);
    console.log('   Created At:', settings.createdAt);

  } catch (error) {
    console.error('❌ Error initializing system settings:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the initialization
initSystemSettings();
