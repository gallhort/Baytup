const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

async function fixExistingLocations() {
  try {
    console.log('🚀 Fixing existing locations...\n');

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/baytup';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const Listing = mongoose.connection.collection('listings');

    // Corriger TOUS les documents avec coordinates mais sans type
    console.log('🔧 Adding missing location.type to all listings...');
    const result = await Listing.updateMany(
      {
        'location.coordinates': { $exists: true },
        'location.type': { $exists: false }
      },
      {
        $set: { 'location.type': 'Point' }
      }
    );

    console.log(`✅ Fixed ${result.modifiedCount} listings\n`);
    console.log('✅ COMPLETE!\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixExistingLocations();