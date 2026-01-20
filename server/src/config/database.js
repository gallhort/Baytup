const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000, // Timeout after 30 seconds
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
    });


    // MongoDB connection events
    mongoose.connection.on('connected', () => {
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
    });

    // Handle app termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);

    // Don't retry in development mode without MongoDB
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    // Retry connection after 5 seconds in production
    setTimeout(() => {
      connectDB();
    }, 5000);
  }
};

module.exports = connectDB;