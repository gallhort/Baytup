// Test the API endpoint directly
const axios = require('axios');

async function testAPI() {
  try {
    const params = {
      location: 'Alger',
      category: 'stay',
      startDate: '2026-02-07',
      endDate: '2026-02-14',
      guests: 2,
      adults: 2,
      page: 1,
      limit: 20
    };

    console.log('🔍 Testing API endpoint with params:');
    console.log(JSON.stringify(params, null, 2));
    console.log('');

    const response = await axios.get('http://localhost:5000/api/listings', { params });

    console.log('✅ API Response Status:', response.status);
    console.log('📊 Data structure:', {
      status: response.data.status,
      dataType: typeof response.data.data,
      hasListings: !!response.data.data?.listings,
      listingsCount: response.data.data?.listings?.length || 0,
      totalDocs: response.data.data?.totalDocs,
      totalPages: response.data.data?.totalPages
    });
    console.log('');

    if (response.data.data?.listings?.length > 0) {
      console.log('✅ LISTINGS FOUND:', response.data.data.listings.length);
      console.log('');
      console.log('📋 Sample listings:');
      response.data.data.listings.slice(0, 5).forEach((listing, i) => {
        console.log(`  ${i + 1}. ${listing.title}`);
        console.log(`     ID: ${listing._id}`);
        console.log(`     Category: ${listing.category}`);
        console.log(`     City: ${listing.address?.city || 'N/A'}`);
        console.log(`     Bedrooms: ${listing.stayDetails?.bedrooms || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('❌ NO LISTINGS in API response!');
      console.log('');
      console.log('Full response data:', JSON.stringify(response.data, null, 2));
    }

  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAPI();
