// Test the NEW split location logic
const mongoose = require('mongoose');
require('dotenv').config();

const Listing = require('./src/models/Listing');

async function testSplitLocation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/baytup');
    console.log('✅ Connected to MongoDB\n');

    const location = 'Alger, Algérie';
    const category = 'stay';

    console.log('📋 Testing NEW logic with location:', location);
    console.log('');

    // NEW LOGIC: Split by comma
    const locationParts = location.split(',').map(part => part.trim());
    console.log('✅ Split into parts:', locationParts);
    console.log('');

    // Create OR conditions for EACH part
    const orConditions = [];
    locationParts.forEach(part => {
      if (part) {
        orConditions.push(
          { 'address.city': { $regex: part, $options: 'i' } },
          { 'address.state': { $regex: part, $options: 'i' } },
          { 'address.country': { $regex: part, $options: 'i' } },
          { title: { $regex: part, $options: 'i' } },
          { description: { $regex: part, $options: 'i' } }
        );
      }
    });

    console.log('📋 Created', orConditions.length, 'OR conditions');
    console.log('');

    const query = {
      status: 'active',
      category: category,
      $or: orConditions
    };

    console.log('📋 Final query:');
    console.log(JSON.stringify(query, null, 2).substring(0, 500) + '...');
    console.log('');

    // Execute query
    const results = await Listing.find(query);

    console.log('✅ RESULTS:', results.length, 'listings found!');
    console.log('');

    if (results.length > 0) {
      console.log('📋 Sample results:');
      results.slice(0, 10).forEach((listing, i) => {
        console.log(`  ${i + 1}. ${listing.title}`);
        console.log(`     City: ${listing.address?.city || 'N/A'}`);
        console.log(`     State: ${listing.address?.state || 'N/A'}`);
        console.log(`     Bedrooms: ${listing.stayDetails?.bedrooms || 'N/A'}`);
      });
    } else {
      console.log('❌ Still no results!');
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testSplitLocation();
