// Test search with GPS coordinates (as sent by frontend)
const axios = require('axios');

async function testWithCoordinates() {
  try {
    console.log('🔍 Testing search with GPS coordinates...\n');

    const params = {
      location: 'Alger, Algérie',
      category: 'stay',
      lat: 36.7538,
      lng: 3.0588,
      radius: 50,
      startDate: '2026-02-09',
      endDate: '2026-02-16',
      page: 1,
      limit: 20
    };

    console.log('📋 Request parameters:', params);
    console.log('');

    const response = await axios.get('http://localhost:5000/api/listings', { params });

    console.log('✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Found:', response.data?.data?.listings?.length || 0, 'listings');
    console.log('Total:', response.data?.data?.total || 0);

    if (response.data?.data?.listings?.length > 0) {
      console.log('\n📋 Sample results:');
      response.data.data.listings.slice(0, 5).forEach((listing, i) => {
        console.log(`  ${i + 1}. ${listing.title} - ${listing.address?.city || 'N/A'}`);
      });
    }

  } catch (error) {
    console.error('❌ ERROR:', error.response?.status || error.message);
    console.error('Response:', error.response?.data);
    console.error('\nFull error:', error);
  }
}

testWithCoordinates();
