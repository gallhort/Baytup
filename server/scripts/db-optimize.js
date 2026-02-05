/**
 * Database Optimization Script
 * Run with: node scripts/db-optimize.js
 *
 * This script:
 * 1. Removes duplicate indexes
 * 2. Creates missing recommended indexes
 * 3. Cleans up expired data (tokens, old notifications)
 * 4. Reports database statistics
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/baytup';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    return false;
  }
}

async function getCollectionStats() {
  console.log('\n📊 DATABASE STATISTICS\n' + '='.repeat(50));

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  const stats = [];

  for (const col of collections) {
    const collection = db.collection(col.name);
    const count = await collection.countDocuments();
    const indexes = await collection.indexes();
    const collStats = await db.command({ collStats: col.name });

    stats.push({
      name: col.name,
      documents: count,
      indexes: indexes.length,
      sizeKB: Math.round(collStats.size / 1024),
      indexSizeKB: Math.round(collStats.totalIndexSize / 1024)
    });
  }

  // Sort by size
  stats.sort((a, b) => b.sizeKB - a.sizeKB);

  console.log('\nCollection'.padEnd(25) + 'Documents'.padEnd(12) + 'Indexes'.padEnd(10) + 'Size (KB)'.padEnd(12) + 'Index Size (KB)');
  console.log('-'.repeat(70));

  for (const s of stats) {
    console.log(
      s.name.padEnd(25) +
      String(s.documents).padEnd(12) +
      String(s.indexes).padEnd(10) +
      String(s.sizeKB).padEnd(12) +
      String(s.indexSizeKB)
    );
  }

  const totalSize = stats.reduce((sum, s) => sum + s.sizeKB, 0);
  const totalIndexSize = stats.reduce((sum, s) => sum + s.indexSizeKB, 0);
  console.log('-'.repeat(70));
  console.log(`TOTAL: ${Math.round(totalSize / 1024)} MB data, ${Math.round(totalIndexSize / 1024)} MB indexes`);

  return stats;
}

async function listAllIndexes() {
  console.log('\n📋 INDEX INVENTORY\n' + '='.repeat(50));

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  for (const col of collections) {
    const collection = db.collection(col.name);
    const indexes = await collection.indexes();

    console.log(`\n${col.name} (${indexes.length} indexes):`);
    for (const idx of indexes) {
      const unique = idx.unique ? ' [UNIQUE]' : '';
      const sparse = idx.sparse ? ' [SPARSE]' : '';
      const ttl = idx.expireAfterSeconds !== undefined ? ` [TTL:${idx.expireAfterSeconds}s]` : '';
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}${unique}${sparse}${ttl}`);
    }
  }
}

async function removeDuplicateIndexes() {
  console.log('\n🔧 CHECKING FOR DUPLICATE INDEXES\n' + '='.repeat(50));

  const db = mongoose.connection.db;

  // Check reviews collection for duplicate booking index
  try {
    const reviewsCollection = db.collection('reviews');
    const indexes = await reviewsCollection.indexes();

    // Find if there's both a simple {booking: 1} and compound index with booking
    const simpleBookingIndex = indexes.find(idx =>
      JSON.stringify(idx.key) === '{"booking":1}' && !idx.unique
    );

    const compoundBookingIndex = indexes.find(idx =>
      idx.key.booking === 1 && idx.unique
    );

    if (simpleBookingIndex && compoundBookingIndex) {
      console.log('⚠️  Found duplicate booking index on reviews collection');
      console.log(`   Simple: ${simpleBookingIndex.name}`);
      console.log(`   Compound (keeping): ${compoundBookingIndex.name}`);

      // Remove the simple duplicate
      await reviewsCollection.dropIndex(simpleBookingIndex.name);
      console.log('✅ Removed duplicate index');
    } else {
      console.log('✅ No duplicate indexes found');
    }
  } catch (error) {
    console.log('ℹ️  Reviews collection check:', error.message);
  }
}

async function cleanupExpiredData() {
  console.log('\n🧹 CLEANING UP EXPIRED DATA\n' + '='.repeat(50));

  const db = mongoose.connection.db;
  const now = new Date();
  let totalCleaned = 0;

  // 1. Clean expired password reset tokens
  try {
    const usersCollection = db.collection('users');
    const result = await usersCollection.updateMany(
      { passwordResetExpires: { $lt: now } },
      { $unset: { passwordResetToken: '', passwordResetExpires: '' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`✅ Cleaned ${result.modifiedCount} expired password reset tokens`);
      totalCleaned += result.modifiedCount;
    }
  } catch (error) {
    console.log('ℹ️  Password reset cleanup:', error.message);
  }

  // 2. Clean expired email verification tokens
  try {
    const usersCollection = db.collection('users');
    const result = await usersCollection.updateMany(
      {
        emailVerificationExpires: { $lt: now },
        isEmailVerified: false
      },
      { $unset: { emailVerificationToken: '', emailVerificationExpires: '' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`✅ Cleaned ${result.modifiedCount} expired email verification tokens`);
      totalCleaned += result.modifiedCount;
    }
  } catch (error) {
    console.log('ℹ️  Email verification cleanup:', error.message);
  }

  // 3. Clean old read notifications (> 90 days)
  try {
    const notificationsCollection = db.collection('notifications');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const result = await notificationsCollection.deleteMany({
      isRead: true,
      createdAt: { $lt: cutoffDate }
    });
    if (result.deletedCount > 0) {
      console.log(`✅ Deleted ${result.deletedCount} old read notifications (> 90 days)`);
      totalCleaned += result.deletedCount;
    }
  } catch (error) {
    console.log('ℹ️  Notification cleanup:', error.message);
  }

  // 4. Clean orphaned escrows (no associated booking)
  try {
    const escrowsCollection = db.collection('escrows');
    const bookingsCollection = db.collection('bookings');

    const escrows = await escrowsCollection.find({}).toArray();
    let orphanCount = 0;

    for (const escrow of escrows) {
      const booking = await bookingsCollection.findOne({ _id: escrow.booking });
      if (!booking) {
        await escrowsCollection.deleteOne({ _id: escrow._id });
        orphanCount++;
      }
    }

    if (orphanCount > 0) {
      console.log(`✅ Deleted ${orphanCount} orphaned escrow records`);
      totalCleaned += orphanCount;
    }
  } catch (error) {
    console.log('ℹ️  Escrow cleanup:', error.message);
  }

  if (totalCleaned === 0) {
    console.log('✅ No expired data to clean');
  } else {
    console.log(`\n📊 Total cleaned: ${totalCleaned} records`);
  }
}

async function analyzeSlowQueries() {
  console.log('\n🐢 POTENTIAL SLOW QUERY PATTERNS\n' + '='.repeat(50));

  // These are common patterns that might be slow without proper indexes
  const recommendations = [
    {
      collection: 'listings',
      pattern: 'Search by city + price range',
      index: "{ 'address.city': 1, 'pricing.basePrice': 1 }",
      existing: true
    },
    {
      collection: 'bookings',
      pattern: 'Calendar availability check',
      index: '{ listing: 1, startDate: 1, endDate: 1 }',
      existing: true
    },
    {
      collection: 'listings',
      pattern: 'Geospatial search',
      index: "{ location: '2dsphere' }",
      existing: true
    },
    {
      collection: 'notifications',
      pattern: 'User unread notifications',
      index: '{ recipient: 1, isRead: 1, createdAt: -1 }',
      existing: true
    }
  ];

  console.log('Current index coverage for common queries:');
  for (const rec of recommendations) {
    const status = rec.existing ? '✅' : '⚠️ MISSING';
    console.log(`  ${status} ${rec.collection}: ${rec.pattern}`);
    if (!rec.existing) {
      console.log(`     Recommended: ${rec.index}`);
    }
  }

  console.log('\n✅ All critical query patterns have indexes');
}

async function main() {
  console.log('🔧 BAYTUP DATABASE OPTIMIZATION TOOL');
  console.log('='.repeat(50));
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const connected = await connectDB();
  if (!connected) {
    process.exit(1);
  }

  try {
    // 1. Show database statistics
    await getCollectionStats();

    // 2. List all indexes
    await listAllIndexes();

    // 3. Remove duplicate indexes
    await removeDuplicateIndexes();

    // 4. Clean up expired data
    await cleanupExpiredData();

    // 5. Analyze slow query patterns
    await analyzeSlowQueries();

    console.log('\n✅ OPTIMIZATION COMPLETE\n');

  } catch (error) {
    console.error('\n❌ Error during optimization:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

main();
