// Script pour créer des bookings avec des listings DIFFÉRENTS
// Usage: node create-realistic-bookings.js

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/baytup');

const db = mongoose.connection;

db.once('open', async function() {
  console.log('✅ Connected to MongoDB');

  try {
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const Listing = mongoose.model('Listing', new mongoose.Schema({}, { strict: false }));
    
    // IDs des listings fournis par l'utilisateur
    const listingIds = [
      '692edc5e7004cf591bf14399',
      '692f28027004cf591bf14553',
      '692f64657004cf591bf14683',
      '69309b8e7004cf591bf1490c',
      '69309cc07004cf591bf14937',
      '6930a1157004cf591bf149f8',
      '6930a3887004cf591bf14aa4',
      '6934916d7004cf591bf15051',
      '6934922d7004cf591bf150ae',
      '693492df7004cf591bf15108',
      '6934939c7004cf591bf15166',
      '6946c02f7004cf591bf1c5f7',
      '6962c4384664f29db391d364',
      '6962c5e24664f29db391d415',
      '6962c65c4664f29db391d492',
      '6963d21006095c20efa41221',
      '696408fd6985e9e2b9ccf792',
      '69640ae36985e9e2b9ccfdce',
      '69640ae56985e9e2b9ccfdf0',
      '69640ae66985e9e2b9ccfe0c',
      '69640ae86985e9e2b9ccfe24',
      '69640ae96985e9e2b9ccfe3c',
      '69640b006985e9e2b9ccfe53',
      '6930a2b97004cf591bf14a49'
    ];

    console.log(`📍 ${listingIds.length} listings fournis`);

    // Récupérer les users
    const users = await User.find().limit(10);
    
    if (users.length < 2) {
      console.error('❌ Besoin d\'au moins 2 users en DB');
      process.exit(1);
    }

    console.log(`👤 ${users.length} users trouvés`);

    // Vérifier que les listings existent
    const existingListings = await Listing.find({ 
      _id: { $in: listingIds.map(id => new mongoose.Types.ObjectId(id)) } 
    });

    console.log(`✅ ${existingListings.length} / ${listingIds.length} listings existent en DB`);

    if (existingListings.length === 0) {
      console.error('❌ Aucun des listings fournis n\'existe en DB');
      process.exit(1);
    }

    const BookingSchema = new mongoose.Schema({}, { strict: false });
    const Booking = mongoose.model('Booking', BookingSchema);

    const testBookings = [];
    const today = new Date();
    
    // Créer 20 bookings avec des listings DIFFÉRENTS
    const numberOfBookings = Math.min(20, existingListings.length * 2);
    
    console.log(`\n🎯 Création de ${numberOfBookings} bookings...\n`);
    
    for (let i = 0; i < numberOfBookings; i++) {
      // Rotation des users
      const guestIndex = i % users.length;
      const hostIndex = (i + 1) % users.length;
      
      // ✅ Rotation des listings (DIFFÉRENT pour chaque booking)
      const listingIndex = i % existingListings.length;
      const listing = existingListings[listingIndex];

      // Dates aléatoires dans le dernier mois
      const daysAgo = Math.floor(Math.random() * 30);
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - daysAgo);
      
      const nights = Math.floor(Math.random() * 7) + 1;
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + nights);
      
      const createdAt = new Date(startDate);
      createdAt.setDate(startDate.getDate() - 3);

      // Prix basés sur le listing réel (ou aléatoire si pas de prix)
      // Baytup Fee Structure: 8% guest service fee + 3% host commission = 11% total
      const basePrice = listing.pricing?.basePrice || Math.floor(Math.random() * 5000) + 2000;
      const subtotal = basePrice * nights;
      const cleaningFee = Math.floor(basePrice * 0.2);
      const baseAmount = subtotal + cleaningFee;
      const guestServiceFee = Math.round(baseAmount * 0.08); // 8% guest service fee
      const hostCommission = Math.round(baseAmount * 0.03); // 3% host commission
      const serviceFee = guestServiceFee; // Legacy field
      const totalAmount = subtotal + cleaningFee + guestServiceFee;
      const platformFee = guestServiceFee + hostCommission; // 11% total platform revenue
      const hostEarnings = baseAmount - hostCommission; // Host receives base - 3%

      // 70% completed, 30% active
      const status = Math.random() > 0.3 ? 'completed' : 'active';

      testBookings.push({
        guest: users[guestIndex]._id,
        host: users[hostIndex]._id,
        listing: listing._id,  // ✅ Différent pour chaque booking !
        startDate: startDate,
        endDate: endDate,
        status: status,
        guestCount: {
          adults: Math.floor(Math.random() * 4) + 1,
          children: Math.floor(Math.random() * 3),
          infants: Math.floor(Math.random() * 2)
        },
        pricing: {
          basePrice: basePrice,
          nights: nights,
          subtotal: subtotal,
          cleaningFee: cleaningFee,
          guestServiceFee: guestServiceFee,
          hostCommission: hostCommission,
          serviceFee: serviceFee,
          taxes: 0,
          totalAmount: totalAmount,
          hostPayout: hostEarnings,
          platformRevenue: platformFee,
          currency: 'DZD'
        },
        payment: {
          status: 'paid',
          method: Math.random() > 0.5 ? 'card' : 'bank_transfer',
          paidAt: createdAt,
          amount: totalAmount,
          currency: 'DZD'
        },
        checkIn: status === 'completed' ? {
          scheduledTime: startDate,
          actualTime: startDate,
          verified: true
        } : undefined,
        checkOut: status === 'completed' ? {
          scheduledTime: endDate,
          actualTime: endDate,
          verified: true
        } : undefined,
        createdAt: createdAt,
        updatedAt: status === 'completed' ? endDate : new Date()
      });

      console.log(`${i + 1}. ${status.toUpperCase().padEnd(10)} → ${listing.title?.substring(0, 40) || listing._id} (${totalAmount.toLocaleString()} DZD)`);
    }

    // Insérer les bookings
    const result = await Booking.insertMany(testBookings);
    
    console.log(`\n✅ ${result.length} bookings créés avec succès !`);
    
    // Statistiques détaillées
    const completedCount = result.filter(b => b.status === 'completed').length;
    const activeCount = result.filter(b => b.status === 'active').length;
    const totalRevenue = result.reduce((sum, b) => sum + b.pricing.totalAmount, 0);
    const totalPlatformFee = result.reduce((sum, b) => sum + b.pricing.platformFee, 0);
    const totalHostEarnings = result.reduce((sum, b) => sum + b.pricing.hostEarnings, 0);

    // Compter les listings uniques utilisés
    const uniqueListings = new Set(result.map(b => b.listing.toString()));
    const listingUsageCount = {};
    result.forEach(b => {
      const lid = b.listing.toString();
      listingUsageCount[lid] = (listingUsageCount[lid] || 0) + 1;
    });

    console.log('\n📊 STATISTIQUES:');
    console.log(`   Total bookings: ${result.length}`);
    console.log(`   Completed: ${completedCount} (${Math.round(completedCount/result.length*100)}%)`);
    console.log(`   Active: ${activeCount} (${Math.round(activeCount/result.length*100)}%)`);
    console.log(`   Listings différents utilisés: ${uniqueListings.size}`);
    console.log('');
    console.log('💰 REVENUS:');
    console.log(`   Total Revenue: ${totalRevenue.toLocaleString()} DZD`);
    console.log(`   Platform Fees: ${totalPlatformFee.toLocaleString()} DZD (10%)`);
    console.log(`   Host Earnings: ${totalHostEarnings.toLocaleString()} DZD`);
    console.log('');
    console.log('📅 PÉRIODE:');
    const oldestDate = new Date(Math.min(...result.map(b => b.createdAt)));
    const newestDate = new Date(Math.max(...result.map(b => b.createdAt)));
    console.log(`   Du ${oldestDate.toLocaleDateString()} au ${newestDate.toLocaleDateString()}`);

    console.log('\n🎯 PRÊT POUR LE TEST !');
    console.log('   1. Generate Report → Revenue Report');
    console.log('   2. Date Range: Last Month');
    console.log('   3. Category: All Categories');
    console.log(`   4. Tu devrais voir ${result.length} bookings avec des listings variés !`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Déconnecté de MongoDB');
  }
});
