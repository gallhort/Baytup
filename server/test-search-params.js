// Test search with exact same parameters as the screenshot
const mongoose = require('mongoose');
require('dotenv').config();

const Listing = require('./src/models/Listing');
const Booking = require('./src/models/Booking');

async function testSearch() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/baytup');
    console.log('✅ Connected to MongoDB\n');

    // Exact same parameters as screenshot
    const location = 'Alger';
    const category = 'stay';
    const startDate = '2026-02-07';
    const endDate = '2026-02-14';
    const guests = 2;

    console.log('📋 Search parameters from screenshot:');
    console.log('  Location:', location);
    console.log('  Category:', category);
    console.log('  Dates:', startDate, '→', endDate);
    console.log('  Guests:', guests);
    console.log('');

    // Step 1: Text-based location search (Priority 4 from backend)
    console.log('--- STEP 1: Text-based location search ---');
    const locationQuery = {
      status: 'active',
      category: category,
      $or: [
        { 'address.city': { $regex: location, $options: 'i' } },
        { 'address.state': { $regex: location, $options: 'i' } },
        { 'address.country': { $regex: location, $options: 'i' } },
        { title: { $regex: location, $options: 'i' } },
        { description: { $regex: location, $options: 'i' } }
      ]
    };

    const locationResults = await Listing.find(locationQuery);
    console.log('✅ Found', locationResults.length, 'listings matching location "Alger"');
    if (locationResults.length > 0) {
      locationResults.forEach((l, i) => {
        console.log(`  ${i + 1}. ${l.title} - ${l.address?.city || 'N/A'}`);
        console.log(`     Bedrooms: ${l.stayDetails?.bedrooms || 'N/A'}`);
      });
    }
    console.log('');

    // Step 2: Add guest filter
    console.log('--- STEP 2: Add guest filter (2 guests) ---');
    const minBedrooms = Math.ceil(guests / 2); // 2 guests → 1 bedroom minimum
    console.log('  Min bedrooms required:', minBedrooms);

    const withGuestFilter = {
      ...locationQuery,
      'stayDetails.bedrooms': { $gte: minBedrooms }
    };

    const guestResults = await Listing.find(withGuestFilter);
    console.log('✅ Found', guestResults.length, 'listings after guest filter');
    if (guestResults.length > 0) {
      guestResults.forEach((l, i) => {
        console.log(`  ${i + 1}. ${l.title} - Bedrooms: ${l.stayDetails?.bedrooms || 'N/A'}`);
      });
    } else {
      console.log('❌ NO RESULTS after adding guest filter!');
      console.log('');
      console.log('📊 Breakdown of why each listing was filtered out:');
      locationResults.forEach((l, i) => {
        const bedrooms = l.stayDetails?.bedrooms;
        const passes = bedrooms >= minBedrooms;
        console.log(`  ${i + 1}. ${l.title}`);
        console.log(`     Bedrooms: ${bedrooms || 'undefined'} | Required: ${minBedrooms} | Passes: ${passes ? '✅' : '❌'}`);
      });
    }
    console.log('');

    // Step 3: Add availability filter
    console.log('--- STEP 3: Add availability filter (Feb 7-14) ---');
    const start = new Date(startDate);
    const end = new Date(endDate);

    const unavailableListings = await Booking.distinct('listing', {
      status: { $in: ['confirmed', 'paid', 'active'] },
      $or: [
        {
          startDate: { $lte: start },
          endDate: { $gt: start }
        },
        {
          startDate: { $lt: end },
          endDate: { $gte: end }
        },
        {
          startDate: { $gte: start },
          endDate: { $lte: end }
        }
      ]
    });

    console.log('  Unavailable listings:', unavailableListings.length);
    if (unavailableListings.length > 0) {
      console.log('  IDs:', unavailableListings.map(id => id.toString()));
    }

    const finalQuery = {
      ...withGuestFilter,
      _id: { $nin: unavailableListings }
    };

    const finalResults = await Listing.find(finalQuery);
    console.log('✅ FINAL RESULTS:', finalResults.length, 'listings');
    if (finalResults.length > 0) {
      finalResults.forEach((l, i) => {
        console.log(`  ${i + 1}. ${l.title}`);
      });
    } else {
      console.log('❌ NO RESULTS in final query!');
    }
    console.log('');

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log('Location filter:     ', locationResults.length, 'listings');
    console.log('+ Guest filter:      ', guestResults.length, 'listings', guestResults.length < locationResults.length ? '❌ BLOCKING' : '');
    console.log('+ Availability:      ', finalResults.length, 'listings', finalResults.length < guestResults.length ? '❌ BLOCKING' : '');
    console.log('');

    if (finalResults.length === 0) {
      console.log('🔴 PROBLEM IDENTIFIED:');
      if (locationResults.length === 0) {
        console.log('   No listings match "Alger" in any field');
      } else if (guestResults.length === 0) {
        console.log('   ❗ GUEST FILTER is blocking all results!');
        console.log('   All listings have < ' + minBedrooms + ' bedrooms');
      } else if (finalResults.length === 0) {
        console.log('   ❗ AVAILABILITY FILTER is blocking all results!');
        console.log('   All listings are booked for Feb 7-14');
      }
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testSearch();
