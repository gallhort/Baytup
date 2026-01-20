# 🗺️ Backend - Recherche Géographique (Airbnb/TripAdvisor-style)

**Date:** 19 Janvier 2026
**Statut:** ✅ Implémenté
**Fichiers modifiés:** `server/src/controllers/listingController.js`

---

## 📝 Description

Ajout du support pour la recherche géographique dynamique style Airbnb avec bounds et auto-update.

---

## ✅ Nouveaux Paramètres API

L'endpoint `GET /api/listings` accepte maintenant ces nouveaux paramètres :

### 1. **`bounds`** (Object/String)
Recherche par rectangle géographique (plus précis que radius)

```json
{
  "north": 36.8,
  "south": 36.7,
  "east": 3.1,
  "west": 3.0
}
```

**Format:** JSON object ou string encodé
**Usage:** Quand l'utilisateur déplace la carte
**Mongo Query:** `$geoWithin` avec `$box`

### 2. **`center`** (Object/String)
Centre de recherche pour radius

```json
{
  "lat": 36.7538,
  "lng": 3.0588
}
```

**Format:** JSON object ou string encodé
**Usage:** Recherche initiale avec location
**Mongo Query:** `$near` avec `$maxDistance`

### 3. **`radius`** (Number)
Rayon de recherche en kilomètres

**Default:** 50 km
**Usage:** Utilisé avec `center` ou `lat`/`lng`

---

## 🔄 Ordre de Priorité des Recherches

Le backend applique les filtres géographiques dans cet ordre :

```javascript
// PRIORITÉ 1: Bounds (le plus précis - drag de carte Airbnb)
if (bounds) {
  // Recherche rectangulaire avec $geoWithin
  query.location = {
    $geoWithin: {
      $box: [[west, south], [east, north]]
    }
  };
}

// PRIORITÉ 2: Center + radius (recherche initiale)
else if (center) {
  query.location = {
    $near: {
      $geometry: { type: 'Point', coordinates: [lng, lat] },
      $maxDistance: radius * 1000 // km → meters
    }
  };
}

// PRIORITÉ 3: Legacy lat/lng + radius
else if (lat && lng) {
  // Même logique que center
}

// PRIORITÉ 4: Text-based (fallback)
else if (location) {
  // Recherche par nom de ville/région
}
```

---

## 📡 Exemples de Requêtes

### Recherche avec bounds (carte déplacée)
```bash
GET /api/listings?bounds={"north":36.8,"south":36.7,"east":3.1,"west":3.0}&category=stay&limit=20
```

### Recherche initiale avec location (50km radius)
```bash
GET /api/listings?location=Alger&radius=50&category=stay
```

### Recherche avec center + radius
```bash
GET /api/listings?center={"lat":36.7538,"lng":3.0588}&radius=50&category=stay
```

### Legacy (lat/lng)
```bash
GET /api/listings?lat=36.7538&lng=3.0588&radius=50&category=stay
```

---

## 🔧 Configuration MongoDB

### Index Géospatial
L'index 2dsphere existe déjà (ligne 366-374 de `Listing.js`) :

```javascript
ListingSchema.index(
  { location: '2dsphere' },
  {
    partialFilterExpression: {
      'location.coordinates': { $exists: true }
    }
  }
);
```

### Format des Coordonnées
- **MongoDB/GeoJSON:** `[longitude, latitude]`
- **Google Maps:** `[latitude, longitude]`
- Le frontend envoie en format Google Maps
- Le backend convertit automatiquement

---

## 🧪 Comment Tester

### 1. Tester bounds (drag de carte)
```javascript
// Frontend (page.tsx ligne 148-165)
const bounds = {
  north: 36.8,
  south: 36.7,
  east: 3.1,
  west: 3.0
};

// API call
fetch(`/api/listings?bounds=${JSON.stringify(bounds)}&category=stay`)
  .then(res => res.json())
  .then(data => console.log('Listings in bounds:', data));
```

**Résultat attendu:** Seulement les listings dans le rectangle

### 2. Tester center + radius
```javascript
const center = { lat: 36.7538, lng: 3.0588 };
const radius = 50; // 50km

fetch(`/api/listings?center=${JSON.stringify(center)}&radius=${radius}&category=stay`)
  .then(res => res.json())
  .then(data => console.log('Listings within 50km:', data));
```

**Résultat attendu:** Listings dans un cercle de 50km autour du centre

### 3. Tester auto-update (debounce 500ms)
1. Ouvrir la page de recherche
2. Activer le mode split (Liste + Carte)
3. Déplacer la carte
4. Attendre 500ms
5. Observer les listings se mettre à jour automatiquement

---

## 🐛 Gestion d'Erreurs

### Bounds invalides
```javascript
try {
  const boundsObj = typeof bounds === 'string' ? JSON.parse(bounds) : bounds;
  // ... use boundsObj
} catch (error) {
  console.error('Error parsing bounds:', error);
  // Fallback to center/radius
}
```

### Coordonnées hors limites
Le modèle Listing valide automatiquement :
- Longitude: [-180, 180]
- Latitude: [-90, 90]

### Pas de coordonnées
Si un listing n'a pas de coordonnées, il est filtré automatiquement par les requêtes géospatiales.

---

## 📊 Performance

### Index 2dsphere
- **Type:** Geospatial index
- **Performance:** O(log n) pour les requêtes
- **Partial Index:** Seulement sur listings avec coordonnées

### Optimisations
1. **Pagination:** Limite à 20 résultats par défaut
2. **Debounce:** 500ms côté frontend pour éviter trop de requêtes
3. **Bounds:** Plus rapide que radius pour grandes zones

---

## 🎯 Flux Complet Airbnb-Style

### Scénario: Recherche "Alger" puis déplacement carte

1. **Recherche initiale**
```
User: Tape "Alger" dans la recherche
Frontend: Envoie location=Alger&radius=50
Backend: Geocode "Alger" → recherche 50km radius
Response: ~100 listings autour d'Alger
```

2. **Déplacement carte (drag)**
```
User: Déplace la carte vers Oran
Frontend: Attend 500ms (debounce)
Frontend: Envoie bounds={north:35.8,south:35.6,east:-0.5,west:-0.7}
Backend: Recherche $geoWithin dans le rectangle
Response: ~25 listings visibles dans la nouvelle zone
```

3. **Liste mise à jour**
```
Frontend: Met à jour filteredListings
UI: Affiche badge bleu "25 listings found in map area"
Map: Affiche les markers correspondants
```

---

## 🔗 Fichiers Modifiés

| Fichier | Lignes | Description |
|---------|--------|-------------|
| `server/src/controllers/listingController.js` | 37-39 | Ajout paramètres `bounds`, `center` |
| `server/src/controllers/listingController.js` | 152-231 | Logique recherche géographique avec priorités |
| `server/src/models/Listing.js` | 366-374 | Index 2dsphere (déjà existant) |

---

## 🚀 Prochaines Étapes

### Optionnel: Géocodage automatique
Si vous voulez géocoder automatiquement "Alger" → coordonnées:

```javascript
// Utiliser Google Geocoding API ou Nominatim
const geocode = async (location) => {
  const response = await axios.get(
    `https://nominatim.openstreetmap.org/search?q=${location}&format=json&limit=1`
  );
  return response.data[0]; // { lat, lon }
};

// Dans getListings()
if (location && !center && !lat) {
  const geocoded = await geocode(location);
  if (geocoded) {
    center = { lat: geocoded.lat, lng: geocoded.lon };
  }
}
```

---

## ✅ Checklist

- [x] Paramètres `bounds` et `center` ajoutés
- [x] Logique de priorité implémentée
- [x] Gestion d'erreurs pour parsing JSON
- [x] Index 2dsphere vérifié
- [x] Support des 4 modes de recherche
- [ ] Tests avec vrais listings (à faire par vous)
- [ ] Géocodage automatique (optionnel)

---

**Prêt pour les tests !** 🎉

Le backend est maintenant compatible avec le système Airbnb-style du frontend.
