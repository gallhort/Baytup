// Test the exact query the frontend is sending
const mongoose = require('mongoose');
require('dotenv').config();

const Listing = require('./src/models/Listing');

async function testExactQuery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/baytup');
    console.log('✅ Connected to MongoDB\n');

    // EXACT parameters from frontend (from the logs)
    const location = 'Alger, Algérie'; // ← Note the comma and accent!
    const category = 'stay';
    const startDate = '2026-02-07';
    const endDate = '2026-02-14';
    const guests = undefined; // Not sent when 0
    const radius = 50;

    console.log('📋 Frontend sends:');
    console.log('  location:', location);
    console.log('  category:', category);
    console.log('  startDate:', startDate);
    console.log('  endDate:', endDate);
    console.log('  guests:', guests);
    console.log('  radius:', radius);
    console.log('');

    // Build query EXACTLY like backend does
    let query = {};

    // Status filter
    query.status = 'active';

    // Category filter
    if (category) {
      query.category = category;
    }

    // Location filter (PRIORITY 4: Text-based)
    if (location) {
      const locationQuery = {
        $or: [
          { 'address.city': { $regex: location, $options: 'i' } },
          { 'address.state': { $regex: location, $options: 'i' } },
          { 'address.country': { $regex: location, $options: 'i' } },
          { title: { $regex: location, $options: 'i' } },
          { description: { $regex: location, $options: 'i' } }
        ]
      };
      query = { ...query, ...locationQuery };
    }

    console.log('📋 MongoDB query constructed:');
    console.log(JSON.stringify(query, null, 2));
    console.log('');

    // Execute query
    const results = await Listing.find(query);

    console.log('✅ Query results:', results.length, 'listings found');
    console.log('');

    if (results.length === 0) {
      console.log('❌ PROBLEM: Query returns 0 results!');
      console.log('');
      console.log('🔍 Let\'s test variations of the location search:');

      // Test 1: Just "Alger" (without accent)
      const test1 = await Listing.find({
        status: 'active',
        category: 'stay',
        $or: [
          { 'address.city': { $regex: 'Alger', $options: 'i' } },
          { 'address.state': { $regex: 'Alger', $options: 'i' } },
          { 'address.country': { $regex: 'Alger', $options: 'i' } },
          { title: { $regex: 'Alger', $options: 'i' } },
          { description: { $regex: 'Alger', $options: 'i' } }
        ]
      });
      console.log('  Test "Alger" (no accent, no comma):', test1.length, 'results');

      // Test 2: Just "Algérie"
      const test2 = await Listing.find({
        status: 'active',
        category: 'stay',
        $or: [
          { 'address.city': { $regex: 'Algérie', $options: 'i' } },
          { 'address.state': { $regex: 'Algérie', $options: 'i' } },
          { 'address.country': { $regex: 'Algérie', $options: 'i' } },
          { title: { $regex: 'Algérie', $options: 'i' } },
          { description: { $regex: 'Algérie', $options: 'i' } }
        ]
      });
      console.log('  Test "Algérie":', test2.length, 'results');

      // Test 3: Escape special characters in regex
      const escapedLocation = location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const test3 = await Listing.find({
        status: 'active',
        category: 'stay',
        $or: [
          { 'address.city': { $regex: escapedLocation, $options: 'i' } },
          { 'address.state': { $regex: escapedLocation, $options: 'i' } },
          { 'address.country': { $regex: escapedLocation, $options: 'i' } },
          { title: { $regex: escapedLocation, $options: 'i' } },
          { description: { $regex: escapedLocation, $options: 'i' } }
        ]
      });
      console.log('  Test "Alger, Algérie" (escaped):', test3.length, 'results');

      // Test 4: Show what's actually in the database
      console.log('');
      console.log('📊 What\'s actually in the database:');
      const allStays = await Listing.find({ status: 'active', category: 'stay' }).limit(5);
      allStays.forEach((listing, i) => {
        console.log(`  ${i + 1}. ${listing.title}`);
        console.log(`     City: "${listing.address?.city || 'N/A'}"`);
        console.log(`     State: "${listing.address?.state || 'N/A'}"`);
        console.log(`     Country: "${listing.address?.country || 'N/A'}"`);
      });

    } else {
      console.log('✅ SUCCESS! Found these listings:');
      results.slice(0, 5).forEach((listing, i) => {
        console.log(`  ${i + 1}. ${listing.title} - ${listing.address?.city || 'N/A'}`);
      });
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testExactQuery();
