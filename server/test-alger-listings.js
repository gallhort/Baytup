// Quick script to check if there are any listings in Alger
const mongoose = require('mongoose');
require('dotenv').config();

const Listing = require('./src/models/Listing');

async function checkAlgerListings() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/baytup');
    console.log('✅ Connected to MongoDB');

    // Count all listings
    const totalListings = await Listing.countDocuments();
    console.log('📊 Total listings in DB:', totalListings);

    // Count active listings
    const activeListings = await Listing.countDocuments({ status: 'active' });
    console.log('✅ Active listings:', activeListings);

    // Search for "Alger" in different fields (case insensitive)
    const algerQuery = {
      status: 'active',
      $or: [
        { 'address.city': { $regex: 'alger', $options: 'i' } },
        { 'address.state': { $regex: 'alger', $options: 'i' } },
        { title: { $regex: 'alger', $options: 'i' } },
        { description: { $regex: 'alger', $options: 'i' } }
      ]
    };

    const algerListings = await Listing.find(algerQuery).limit(5);
    console.log('🗺️  Listings matching "Alger":', algerListings.length);

    if (algerListings.length > 0) {
      console.log('\n📋 Sample listings:');
      algerListings.forEach((listing, i) => {
        console.log(`\n${i + 1}. ${listing.title}`);
        console.log(`   ID: ${listing._id}`);
        console.log(`   City: ${listing.address?.city || 'N/A'}`);
        console.log(`   State: ${listing.address?.state || 'N/A'}`);
        console.log(`   Category: ${listing.category}`);
        console.log(`   Status: ${listing.status}`);
        console.log(`   Coordinates: ${listing.location?.coordinates || 'N/A'}`);
      });
    } else {
      console.log('\n❌ No listings found with "Alger" in any field!');

      // Show sample of ALL active listings
      console.log('\n📋 Sample of active listings (any location):');
      const sampleListings = await Listing.find({ status: 'active' }).limit(5);
      sampleListings.forEach((listing, i) => {
        console.log(`\n${i + 1}. ${listing.title}`);
        console.log(`   City: ${listing.address?.city || 'N/A'}`);
        console.log(`   State: ${listing.address?.state || 'N/A'}`);
      });
    }

    // Check for listings without coordinates
    const noCoordinates = await Listing.countDocuments({
      status: 'active',
      'location.coordinates': { $exists: false }
    });
    console.log('\n⚠️  Active listings without coordinates:', noCoordinates);

    mongoose.connection.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAlgerListings();
