/**
 * Database Test Helper
 * Use this for integration tests that require MongoDB
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/baytup-test';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
    console.log('Connected to test database');
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('Disconnected from test database');
  }
};

const clearDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  clearDB
};
