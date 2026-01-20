# 🔴 BUG #3 - BQ-9/10 : Erreurs Geo Index

## 🔍 DIAGNOSTIC

**Fichier problématique :** `server/src/models/Listing.js`

### Problème Identifié

**Lignes 54-64 + 286 :** Conflit entre champ requis et index géospatial

```javascript
// LIGNE 54-64 - Location schema
location: {
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number],
    required: [true, 'Coordinates are required']  // ❌ PROBLÈME !
  }
}

// LIGNE 286 - Geo index
ListingSchema.index({ location: '2dsphere' });  // ❌ Requiert coordinates valides
```

### Cause Racine

**Scénario problématique :**
1. Utilisateur crée un listing en brouillon
2. N'a pas encore sélectionné l'emplacement sur la carte
3. `location.coordinates` est vide ou absent
4. MongoDB refuse la sauvegarde car :
   - `coordinates` est marqué `required: true`
   - L'index 2dsphere nécessite des coordonnées valides

**Erreur retournée :**
```
MongoError: Can't extract geo keys: 
{ _id: ..., location: { type: "Point", coordinates: [] } }
```

---

## ✅ SOLUTIONS APPLIQUÉES

### Solution 1 : Rendre Coordinates Optionnel

Retirer le `required: true` sur coordinates :

```javascript
location: {
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number],
    // ✅ SUPPRIMÉ required: true
    // Validation conditionnelle ajoutée plus bas
  }
}
```

### Solution 2 : Validation Conditionnelle

Ajouter une validation personnalisée qui ne requiert coordinates que si `status !== 'draft'` :

```javascript
// LIGNE ~280 - Avant l'export du modèle
ListingSchema.pre('save', function(next) {
  // ✅ Validation conditionnelle de location
  if (this.status !== 'draft' && this.status !== 'inactive') {
    // Si le listing n'est pas un brouillon, location est obligatoire
    if (!this.location || !this.location.coordinates || this.location.coordinates.length !== 2) {
      return next(new Error('Valid coordinates are required for published listings'));
    }
    
    // Vérifier que les coordonnées sont dans une plage valide
    const [lng, lat] = this.location.coordinates;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return next(new Error('Coordinates must be valid: longitude [-180, 180], latitude [-90, 90]'));
    }
  }
  
  next();
});
```

### Solution 3 : Index 2dsphere Conditionnel

Modifier l'index pour ignorer les documents sans coordonnées :

```javascript
// LIGNE 286 - Index géospatial avec filtre
ListingSchema.index(
  { location: '2dsphere' },
  { 
    partialFilterExpression: { 
      'location.coordinates': { $exists: true, $ne: [] } 
    } 
  }
);
```

Cela permet à MongoDB d'ignorer les documents dont `coordinates` est vide.

### Solution 4 : Coordonnées Par Défaut pour Brouillons

Si aucune coordonnée n'est fournie pour un brouillon, utiliser des coordonnées par défaut (Alger) :

```javascript
// LIGNE ~280 - Pre-save hook
ListingSchema.pre('save', function(next) {
  // ✅ Coordonnées par défaut pour brouillons sans location
  if (this.status === 'draft' && (!this.location || !this.location.coordinates || this.location.coordinates.length === 0)) {
    this.location = {
      type: 'Point',
      coordinates: [3.0588, 36.7538] // Alger, Algérie (longitude, latitude)
    };
  }
  
  next();
});
```

---

## 🔧 CODE COMPLET CORRIGÉ

**Fichier :** `server/src/models/Listing.js`

```javascript
// LIGNE 54-64 - Location schema modifié
location: {
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number],
    // ✅ Supprimé : required: [true, 'Coordinates are required']
    // Validation conditionnelle ajoutée via pre-save hook
  }
},

// LIGNE ~280 - Ajouter AVANT ListingSchema.index()
// Pre-save validation for location
ListingSchema.pre('save', function(next) {
  // Pour les listings publiés, location est obligatoire
  if (this.status !== 'draft' && this.status !== 'inactive') {
    if (!this.location || !this.location.coordinates || this.location.coordinates.length !== 2) {
      return next(new Error('Valid coordinates are required for published listings'));
    }
    
    const [lng, lat] = this.location.coordinates;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return next(new Error('Invalid coordinates range'));
    }
  } else if (this.status === 'draft') {
    // Pour les brouillons sans coordonnées, utiliser Alger par défaut
    if (!this.location || !this.location.coordinates || this.location.coordinates.length === 0) {
      this.location = {
        type: 'Point',
        coordinates: [3.0588, 36.7538] // Alger, Algérie
      };
    }
  }
  
  next();
});

// LIGNE 286 - Index géospatial modifié
ListingSchema.index(
  { location: '2dsphere' },
  { 
    partialFilterExpression: { 
      'location.coordinates': { $exists: true, $ne: [] } 
    } 
  }
);
```

---

## 🗄️ MIGRATION BASE DE DONNÉES

### Étape 1 : Supprimer l'Ancien Index

Si l'index existe déjà, il faut le supprimer et le recréer :

```javascript
// Script de migration : server/scripts/fix-geo-index.js
const mongoose = require('mongoose');
require('dotenv').config();

async function fixGeoIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Listing = mongoose.model('Listing');
    
    // 1. Supprimer l'ancien index
    try {
      await Listing.collection.dropIndex('location_2dsphere');
      console.log('✅ Dropped old geo index');
    } catch (err) {
      console.log('⚠️  No existing geo index to drop');
    }

    // 2. Créer le nouvel index avec filtre
    await Listing.collection.createIndex(
      { location: '2dsphere' },
      { 
        partialFilterExpression: { 
          'location.coordinates': { $exists: true, $ne: [] } 
        } 
      }
    );
    console.log('✅ Created new partial geo index');

    // 3. Mettre à jour les brouillons sans coordonnées
    const result = await Listing.updateMany(
      {
        status: 'draft',
        $or: [
          { 'location.coordinates': { $exists: false } },
          { 'location.coordinates': [] }
        ]
      },
      {
        $set: {
          'location.type': 'Point',
          'location.coordinates': [3.0588, 36.7538] // Alger
        }
      }
    );
    console.log(`✅ Updated ${result.modifiedCount} draft listings`);

    console.log('✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

fixGeoIndex();
```

### Étape 2 : Exécuter la Migration

```bash
cd server
node scripts/fix-geo-index.js
```

---

## 📋 CHECKLIST DE VALIDATION

- [ ] Modèle Listing modifié (coordinates optionnel)
- [ ] Pre-save hook ajouté (validation conditionnelle)
- [ ] Index 2dsphere mis à jour (partialFilterExpression)
- [ ] Migration exécutée (ancien index supprimé)
- [ ] Test : Créer brouillon sans location → ✅ Fonctionne
- [ ] Test : Publier listing sans location → ❌ Erreur (normal)
- [ ] Test : Modifier listing existant → ✅ Fonctionne

---

## 🎯 RÉSULTATS ATTENDUS

**Avant :**
- Sauvegarder brouillon → Erreur "Can't extract geo keys"
- Modifier listing → Erreur Geo Index

**Après :**
- Sauvegarder brouillon sans location → ✅ Sauvegarde avec coords par défaut
- Modifier listing → ✅ Fonctionne
- Publier sans location → ❌ Erreur de validation (attendu)

---

## 🐛 CAS D'USAGE

### Cas 1 : Nouveau Brouillon Sans Location
```javascript
// Frontend envoie :
{
  title: "Test Apartment",
  status: "draft",
  // Pas de location
}

// Backend sauvegarde avec :
{
  title: "Test Apartment",
  status: "draft",
  location: {
    type: "Point",
    coordinates: [3.0588, 36.7538] // ✅ Alger par défaut
  }
}
```

### Cas 2 : Brouillon Avec Location Partielle
```javascript
// Frontend envoie :
{
  title: "Test Apartment",
  status: "draft",
  location: {
    coordinates: [] // Vide
  }
}

// Backend sauvegarde avec :
{
  location: {
    type: "Point",
    coordinates: [3.0588, 36.7538] // ✅ Remplacé
  }
}
```

### Cas 3 : Publication Sans Location
```javascript
// Frontend envoie :
{
  title: "Test Apartment",
  status: "active",
  // Pas de location
}

// Backend répond :
{
  success: false,
  message: "Valid coordinates are required for published listings"
} // ✅ Erreur attendue
```

### Cas 4 : Modification Listing Actif
```javascript
// Frontend envoie :
{
  title: "Updated Title",
  location: {
    coordinates: [2.9345, 36.4567] // Coordonnées valides
  }
}

// Backend sauvegarde :
// ✅ Fonctionne normalement
```

---

*Diagnostic BQ-9/10 - Version 1.0*
