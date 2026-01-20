# 🔧 INSTALLATION - FIX BQ-9/10 : Erreurs Geo Index

## 📋 FICHIERS MODIFIÉS

### 1. Listing.js (Modèle)
**Chemin :** `server/src/models/Listing.js`
**Modifications :**
- ✅ `coordinates` rendu optionnel (supprimé `required: true`)
- ✅ Validation personnalisée pour coordonnées
- ✅ Pre-save hook pour validation conditionnelle
- ✅ Coordonnées par défaut (Alger) pour brouillons
- ✅ Index 2dsphere avec `partialFilterExpression`

### 2. fix-geo-index.js (Script de migration)
**Chemin :** `server/scripts/fix-geo-index.js`
**Actions :**
- ✅ Supprime ancien index 2dsphere
- ✅ Crée nouvel index avec filtre partiel
- ✅ Met à jour brouillons sans coordonnées
- ✅ Identifie listings actifs problématiques

---

## 💻 INSTALLATION MANUELLE

### Étape 1 : Backup

```bash
cd C:\xampp\htdocs\baytup

# Backup modèle
copy server\src\models\Listing.js server\src\models\Listing.js.backup

# Backup base de données (recommandé)
mongodump --db baytup --out backup_$(date +%Y%m%d)
```

### Étape 2 : Installation Modèle

```bash
# Copier le modèle corrigé
copy outputs\Listing-FIXED-BQ09-10.js server\src\models\Listing.js
```

### Étape 3 : Installation Script de Migration

```bash
# Créer le dossier scripts s'il n'existe pas
mkdir server\scripts

# Copier le script de migration
copy outputs\fix-geo-index.js server\scripts\fix-geo-index.js
```

### Étape 4 : Exécuter la Migration

```bash
cd server

# Vérifier que MongoDB tourne
# Si XAMPP: Démarrer MongoDB depuis le panneau de contrôle

# Exécuter la migration
node scripts\fix-geo-index.js
```

**Sortie attendue :**
```
🚀 Starting geo index migration...

📡 Connecting to: mongodb://localhost:27017/baytup
✅ Connected to MongoDB

📋 Existing indexes:
   - _id_: {"_id":1}
   - location_2dsphere: {"location":"2dsphere"}
   ...

🗑️  Dropping old geo index...
✅ Old geo index dropped

🔧 Creating new partial geo index...
✅ New partial geo index created

🔍 Analyzing listings...
   Total listings: 47
   Drafts without coordinates: 3
   Active without coordinates: 0

🔧 Updating draft listings with default coordinates...
✅ Updated 3 draft listings

✅ Verifying new index...
✅ New geo index is active with partial filter

══════════════════════════════════════════════════
✅ MIGRATION COMPLETE!
══════════════════════════════════════════════════
```

### Étape 5 : Redémarrage

```bash
# Redémarrer le serveur backend
cd server
npm start
```

---

## ✅ TESTS DE VALIDATION

### Test 1 : Créer Brouillon Sans Location
```
1. Se connecter en tant que Host
2. Créer un nouveau listing
3. Remplir titre, description, prix
4. NE PAS sélectionner l'emplacement sur la carte
5. Cliquer "Save as Draft"
6. ✅ Vérifier : Pas d'erreur "Geo keys"
7. ✅ Vérifier : Listing sauvegardé avec succès
8. Vérifier en BD : coordinates = [3.0588, 36.7538] (Alger)
```

### Test 2 : Modifier Listing Existant
```
1. Ouvrir un listing existant
2. Modifier le titre
3. Cliquer "Save"
4. ✅ Vérifier : Pas d'erreur
5. ✅ Vérifier : Modifications sauvegardées
```

### Test 3 : Publier Sans Location
```
1. Créer un brouillon sans location
2. Changer status à "Active"
3. Cliquer "Publish"
4. ✅ Vérifier : Erreur "Valid coordinates required"
5. ✅ Vérifier : Listing non publié (reste draft)
```

### Test 4 : Publier Avec Location
```
1. Créer un brouillon
2. Sélectionner emplacement sur carte
3. Changer status à "Active"
4. Cliquer "Publish"
5. ✅ Vérifier : Listing publié avec succès
6. ✅ Vérifier : Coordonnées sauvegardées
```

### Test 5 : Vérifier Index MongoDB
```bash
# Dans MongoDB shell
use baytup
db.listings.getIndexes()

# Devrait afficher :
{
  "v": 2,
  "key": { "location": "2dsphere" },
  "name": "location_2dsphere",
  "partialFilterExpression": {
    "location.coordinates": {
      "$exists": true,
      "$ne": []
    }
  }
}
```

---

## 🐛 DEBUGGING

### Si l'erreur "Geo keys" persiste :

#### 1. Vérifier que la Migration A Réussi

```bash
cd server
node scripts\fix-geo-index.js

# Vérifier la sortie :
# - "Old geo index dropped" → ✅
# - "New partial geo index created" → ✅
# - "Updated X draft listings" → ✅
```

#### 2. Vérifier le Modèle

```bash
# Ouvrir server/src/models/Listing.js
# Ligne ~62 : NE DOIT PAS avoir required: true sur coordinates
# Ligne ~298 : DOIT avoir partialFilterExpression
```

**AVANT (incorrect) :**
```javascript
coordinates: {
  type: [Number],
  required: [true, 'Coordinates are required']  // ❌
}

ListingSchema.index({ location: '2dsphere' });  // ❌
```

**APRÈS (correct) :**
```javascript
coordinates: {
  type: [Number],
  // Pas de required
  validate: { ... }
}

ListingSchema.index(
  { location: '2dsphere' },
  { partialFilterExpression: { ... } }  // ✅
);
```

#### 3. Vérifier Pre-Save Hook

```bash
# Dans Listing.js, ligne ~298
# DOIT avoir le pre-save hook :

ListingSchema.pre('save', function(next) {
  // Code de validation et defaults
});
```

#### 4. Tester Manuellement avec MongoDB

```javascript
// Dans MongoDB shell
use baytup

// Essayer d'insérer un document sans coordinates
db.listings.insertOne({
  title: "Test",
  status: "draft",
  location: {
    type: "Point"
    // Pas de coordinates
  }
})

// Devrait fonctionner APRÈS migration
```

#### 5. Logs Serveur

Activer les logs MongoDB dans le serveur :
```javascript
// Dans server.js
mongoose.set('debug', true);

// Redémarrer et observer les queries
```

---

## 🔧 SOLUTIONS ALTERNATIVES

### Si Migration Échoue

#### Solution 1 : Suppression Manuelle de l'Index

```javascript
// Dans MongoDB shell
use baytup
db.listings.dropIndex("location_2dsphere")
```

Puis redémarrer le serveur → Nouvel index se créera automatiquement.

#### Solution 2 : Reset Complet des Index

```javascript
// Dans MongoDB shell
use baytup
db.listings.dropIndexes()  // ⚠️  Supprime TOUS les index
```

Puis redémarrer serveur → Tous les index se recréent.

#### Solution 3 : Mettre à Jour Listings Manuellement

```javascript
// Si brouillons ont encore [] dans coordinates
db.listings.updateMany(
  {
    status: "draft",
    "location.coordinates": []
  },
  {
    $set: {
      "location.coordinates": [3.0588, 36.7538]
    }
  }
)
```

---

## 📊 MONITORING POST-DÉPLOIEMENT

### Métriques à Surveiller

```
✓ Erreurs "Geo keys" : Devrait passer de X/jour à 0
✓ Brouillons créés : Devrait fonctionner à 100%
✓ Listings modifiés : Devrait fonctionner à 100%
✓ Publications sans location : Devrait échouer (normal)
```

### Requête MongoDB de Vérification

```javascript
// Listings potentiellement problématiques
db.listings.find({
  $or: [
    { "location": { $exists: false } },
    { "location.coordinates": { $exists: false } },
    { "location.coordinates": [] },
    { "location.coordinates": { $size: 0 } }
  ]
}).count()

// Devrait être 0 pour status: "active"
```

---

## 🎯 SUCCÈS

La correction est réussie si :

✅ Créer brouillon sans location → Pas d'erreur  
✅ Modifier listing → Pas d'erreur  
✅ Publier sans location → Erreur de validation (attendu)  
✅ Publier avec location → Fonctionne  
✅ Aucune erreur "Geo keys" en logs  
✅ Index 2dsphere avec partialFilterExpression présent  

---

## 🆘 SUPPORT

### Erreur Persiste Après Tout ?

1. **Vérifier version MongoDB**
   ```bash
   mongo --version
   # Doit être >= 3.2 pour partialFilterExpression
   ```

2. **Vérifier connexion MongoDB**
   ```bash
   # Dans server/.env
   MONGODB_URI=mongodb://localhost:27017/baytup
   ```

3. **Recréer collection (DANGER)**
   ```javascript
   // ⚠️  SEULEMENT en dev, perte de données !
   db.listings.drop()
   // Redémarrer serveur → Collection se recrée
   ```

4. **Contacter support MongoDB**
   - Fournir version MongoDB
   - Fournir sortie de `db.listings.getIndexes()`
   - Fournir logs d'erreur complets

---

## 🔄 ROLLBACK (Si problème)

```bash
cd C:\xampp\htdocs\baytup

# 1. Restaurer modèle
copy server\src\models\Listing.js.backup server\src\models\Listing.js

# 2. Supprimer index problématique
mongo baytup --eval "db.listings.dropIndex('location_2dsphere')"

# 3. Redémarrer
cd server
npm start

# L'ancien index se recrée
# ⚠️  Les brouillons sans location ne marcheront pas
```

---

## 📝 NOTES IMPORTANTES

### Coordonnées Par Défaut

```javascript
// Alger, Algérie (centre-ville)
coordinates: [3.0588, 36.7538]
//             lng     lat

// Format: [longitude, latitude]
// ⚠️  PAS [lat, lng] !
```

### MongoDB GeoJSON

```javascript
// Format correct pour MongoDB
{
  type: "Point",
  coordinates: [lng, lat]
}

// ❌ Incorrect
{
  type: "Point",
  coordinates: [lat, lng]  // Inversé !
}
```

### Validation des Coordonnées

```
Longitude : -180 à +180
Latitude  : -90 à +90

Algérie (approximatif) :
Longitude : -8 à +12
Latitude  : 19 à 37
```

---

*Guide d'installation BQ-9/10 - Version 1.0*  
*Date : 11 Janvier 2026*
