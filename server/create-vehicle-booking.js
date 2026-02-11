// Script pour créer un booking avec un VEHICLE
// Usage: node create-vehicle-booking.js

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/baytup');

const db = mongoose.connection;

db.once('open', async function() {
  console.log('✅ Connected to MongoDB');

  try {
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const Listing = mongoose.model('Listing', new mongoose.Schema({}, { strict: false }));
    
    // IDs des vehicles
    const vehicleIds = [
      '6901efb40360ce31a82cb732',  // Toyota Corolla 2022
      '694db5727004cf591bf24405',  // Honda City 2025
      '694db86a7004cf591bf2452f'   // Honda Civic
    ];

    console.log(`🚗 Recherche de vehicles...`);

    // Trouver les vehicles
    const vehicles = await Listing.find({
      _id: { $in: vehicleIds.map(id => new mongoose.Types.ObjectId(id)) },
      category: 'vehicle'
    });

    if (vehicles.length === 0) {
      console.error('❌ Aucun vehicle trouvé en DB');
      process.exit(1);
    }

    console.log(`✅ ${vehicles.length} vehicles trouvés`);

    // Trouver des users
    const users = await User.find().limit(5);

    if (users.length < 2) {
      console.error('❌ Besoin d\'au moins 2 users en DB');
      process.exit(1);
    }

    console.log(`👤 ${users.length} users trouvés\n`);

    const BookingSchema = new mongoose.Schema({}, { strict: false });
    const Booking = mongoose.model('Booking', BookingSchema);

    const today = new Date();
    const vehicleBookings = [];

    // Créer 2 bookings avec vehicles
    for (let i = 0; i < 2; i++) {
      const vehicle = vehicles[i % vehicles.length];
      const guest = users[i % users.length];
      const host = users[(i + 1) % users.length];

      // Dates dans le dernier mois
      const daysAgo = Math.floor(Math.random() * 25) + 5;
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - daysAgo);
      
      const days = Math.floor(Math.random() * 5) + 2;
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + days);
      
      const createdAt = new Date(startDate);
      createdAt.setDate(startDate.getDate() - 2);

      // Prix - Baytup Fee Structure: 8% guest + 3% host = 11% total
      const basePrice = vehicle.pricing?.basePrice || 5000;
      const subtotal = basePrice * days;
      const cleaningFee = Math.floor(basePrice * 0.1);
      const baseAmount = subtotal + cleaningFee;
      const guestServiceFee = Math.round(baseAmount * 0.08); // 8% guest service fee
      const hostCommission = Math.round(baseAmount * 0.03); // 3% host commission
      const serviceFee = guestServiceFee; // Legacy field
      const totalAmount = subtotal + cleaningFee + guestServiceFee;
      const platformFee = guestServiceFee + hostCommission; // 11% total
      const hostEarnings = baseAmount - hostCommission;

      const status = Math.random() > 0.5 ? 'completed' : 'active';

      vehicleBookings.push({
        guest: guest._id,
        host: host._id,
        listing: vehicle._id,  // ✅ Vehicle listing
        startDate: startDate,
        endDate: endDate,
        status: status,
        guestCount: {
          adults: Math.floor(Math.random() * 3) + 1,
          children: 0,
          infants: 0
        },
        pricing: {
          basePrice: basePrice,
          nights: days,
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
          method: 'card',
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

      console.log(`${i + 1}. 🚗 ${status.toUpperCase().padEnd(10)} → ${vehicle.title} (${totalAmount.toLocaleString()} DZD)`);
    }

    // Insérer
    const result = await Booking.insertMany(vehicleBookings);
    
    console.log(`\n✅ ${result.length} bookings VEHICLE créés avec succès !`);
    
    // Stats
    const completedCount = result.filter(b => b.status === 'completed').length;
    const activeCount = result.filter(b => b.status === 'active').length;
    const totalRevenue = result.reduce((sum, b) => sum + b.pricing.totalAmount, 0);

    console.log('\n📊 STATISTIQUES:');
    console.log(`   Completed: ${completedCount}`);
    console.log(`   Active: ${activeCount}`);
    console.log(`   Total Revenue: ${totalRevenue.toLocaleString()} DZD`);

    console.log('\n🎯 MAINTENANT TESTE LE FILTRE !');
    console.log('   1. Generate Report → Revenue Report');
    console.log('   2. Category: Vehicles');
    console.log(`   3. Tu devrais voir ${result.length} bookings vehicles !`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Déconnecté de MongoDB');
  }
});
