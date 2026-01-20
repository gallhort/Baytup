/**
 * Migration Script: Fix Geo Index
 * 
 * Ce script :
 * 1. Supprime l'ancien index 2dsphere
 * 2. Crée le nouvel index avec partialFilterExpression
 * 3. Met à jour les brouillons sans coordonnées
 * 
 * Usage: node scripts/fix-geo-index.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

async function fixGeoIndex() {
  try {
    console.log('🚀 Starting geo index migration...\n');

    // Connexion MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/baytup';
    console.log(`📡 Connecting to: ${mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Charger le modèle Listing
    const Listing = mongoose.connection.collection('listings');

    // ÉTAPE 1 : Lister les index existants
    console.log('📋 Existing indexes:');
    const indexes = await Listing.indexes();
    indexes.forEach(idx => {
      console.log(`   - ${idx.name}:`, JSON.stringify(idx.key));
    });
    console.log('');

    // ÉTAPE 2 : Supprimer l'ancien index location_2dsphere
    console.log('🗑️  Dropping old geo index...');
    try {
      await Listing.dropIndex('location_2dsphere');
      console.log('✅ Old geo index dropped\n');
    } catch (err) {
      if (err.code === 27) { // IndexNotFound
        console.log('⚠️  No existing geo index to drop (already done)\n');
      } else {
        throw err;
      }
    }

    // ÉTAPE 3 : Créer le nouvel index avec filtre partiel
    console.log('🔧 Creating new partial geo index...');
await Listing.createIndex(
  { location: '2dsphere' },
  { 
    name: 'location_2dsphere',
    partialFilterExpression: { 
      'location.coordinates': { $exists: true }
    },
   }
);
    console.log('✅ New partial geo index created\n');

    // ÉTAPE 4 : Compter les listings problématiques
    console.log('🔍 Analyzing listings...');
    const totalListings = await Listing.countDocuments();
    const draftsWithoutCoords = await Listing.countDocuments({
      status: 'draft',
      $or: [
        { 'location.coordinates': { $exists: false } },
        { 'location.coordinates': [] },
        { 'location.coordinates': { $size: 0 } }
      ]
    });
    const activeWithoutCoords = await Listing.countDocuments({
      status: { $in: ['active', 'pending'] },
      $or: [
        { 'location.coordinates': { $exists: false } },
        { 'location.coordinates': [] },
        { 'location.coordinates': { $size: 0 } }
      ]
    });

    console.log(`   Total listings: ${totalListings}`);
    console.log(`   Drafts without coordinates: ${draftsWithoutCoords}`);
    console.log(`   Active without coordinates: ${activeWithoutCoords}\n`);

    // ÉTAPE 5 : Mettre à jour les brouillons sans coordonnées
    if (draftsWithoutCoords > 0) {
      console.log('🔧 Updating draft listings with default coordinates...');
      const result = await Listing.updateMany(
        {
          status: 'draft',
          $or: [
            { 'location.coordinates': { $exists: false } },
            { 'location.coordinates': [] },
            { 'location.coordinates': { $size: 0 } }
          ]
        },
        {
          $set: {
            'location.type': 'Point',
            'location.coordinates': [3.0588, 36.7538] // Alger, Algérie
          }
        }
      );
      console.log(`✅ Updated ${result.modifiedCount} draft listings\n`);
    }

    // ÉTAPE 6 : Avertir pour les listings actifs sans coordonnées
    if (activeWithoutCoords > 0) {
      console.log('⚠️  WARNING: Found active listings without coordinates!');
      console.log('   These should be fixed manually or deactivated:');
      
      const problemListings = await Listing.find(
        {
          status: { $in: ['active', 'pending'] },
          $or: [
            { 'location.coordinates': { $exists: false } },
            { 'location.coordinates': [] },
            { 'location.coordinates': { $size: 0 } }
          ]
        },
        { _id: 1, title: 1, status: 1 }
      ).limit(10).toArray();

      problemListings.forEach(listing => {
        console.log(`   - ${listing._id}: "${listing.title}" (${listing.status})`);
      });
      
      if (activeWithoutCoords > 10) {
        console.log(`   ... and ${activeWithoutCoords - 10} more`);
      }
      console.log('');
    }

    // ÉTAPE 7 : Vérifier le nouvel index
    console.log('✅ Verifying new index...');
    const newIndexes = await Listing.indexes();
    const geoIndex = newIndexes.find(idx => idx.name === 'location_2dsphere');
    
    if (geoIndex && geoIndex.partialFilterExpression) {
      console.log('✅ New geo index is active with partial filter\n');
    } else {
      console.log('⚠️  Warning: Index exists but partial filter not confirmed\n');
    }

    // Résumé
    console.log('═'.repeat(50));
    console.log('✅ MIGRATION COMPLETE!');
    console.log('═'.repeat(50));
    console.log('');
    console.log('Summary:');
    console.log(`  • Total listings: ${totalListings}`);
    console.log(`  • Drafts fixed: ${draftsWithoutCoords}`);
    console.log(`  • Active to review: ${activeWithoutCoords}`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Restart your Node.js server');
    console.log('  2. Test creating a draft without location');
    console.log('  3. Test updating an existing listing');
    if (activeWithoutCoords > 0) {
      console.log('  4. ⚠️  Fix or deactivate active listings without coordinates');
    }
    console.log('');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('❌ MIGRATION FAILED!');
    console.error('═'.repeat(50));
    console.error('Error:', error.message);
    console.error('');
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    console.error('');
    
    try {
      await mongoose.disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
    
    process.exit(1);
  }
}

// Exécuter la migration
fixGeoIndex();
