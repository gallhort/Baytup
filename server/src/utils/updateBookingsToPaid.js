const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Utility Script to Update All Bookings to Paid Status
 * This script is needed for localhost testing since SlickPay webhook verification
 * doesn't work on localhost (requires public URL for production)
 */

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/baytup';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// Update all bookings to paid status
const updateAllBookingsToPaid = async () => {
  try {
    // Import Booking model
    const Booking = require('../models/Booking');


    // Find all bookings that are not already paid
    const bookingsToUpdate = await Booking.find({
      status: { $in: ['pending_payment', 'pending', 'confirmed'] },
      'payment.status': { $ne: 'paid' }
    });

    if (bookingsToUpdate.length === 0) {
      return;
    }


    // Display bookings that will be updated
    bookingsToUpdate.forEach((booking, index) => {
    });

    // Update each booking individually

    let successCount = 0;
    let failureCount = 0;

    for (const booking of bookingsToUpdate) {
      try {
        booking.status = 'paid';
        booking.payment.status = 'paid';
        booking.payment.paidAmount = booking.pricing.totalAmount;
        booking.payment.paidAt = new Date();

        await booking.save({ validateBeforeSave: false });

        successCount++;
      } catch (error) {
        failureCount++;
      }
    }


    // Verify updates by fetching updated bookings
    const updatedBookings = await Booking.find({
      _id: { $in: bookingsToUpdate.map(b => b._id) }
    }).select('_id status payment.status payment.paidAt pricing.totalAmount pricing.currency');

    updatedBookings.forEach((booking, index) => {
    });


  } catch (error) {
    console.error('❌ Error updating bookings:', error.message);
    console.error(error);
  }
};

// Main execution
const main = async () => {

  await connectDB();
  await updateAllBookingsToPaid();


  // Close database connection
  await mongoose.connection.close();

  process.exit(0);
};

// Run the script
main().catch((error) => {
  console.error('❌ Fatal Error:', error);
  process.exit(1);
});
