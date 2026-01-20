# 🐛 BUG: Validation Capacité Voyageurs - Réservation Illimitée

**Date de découverte:** 19 Janvier 2026
**Priorité:** P0 (Critique - Sécurité/Business)
**Statut:** ✅ Corrigé

---

## 📝 Description du Bug

### Problème Principal
Un utilisateur peut réserver pour **50 personnes** (ou n'importe quel nombre) dans un petit appartement qui n'a clairement pas cette capacité. Il n'y a **AUCUNE validation** du nombre maximum de voyageurs lors de la réservation.

### Impact Business
- ❌ **Réservations impossibles à honorer** : Un hôte ne peut pas accueillir 50 personnes dans un studio
- ❌ **Conflits et litiges** : Disputes entre hôtes et voyageurs sur place
- ❌ **Réputation plateforme** : Perte de confiance des utilisateurs
- ❌ **Problèmes légaux** : Dépassement des normes de sécurité (capacité maximale)

---

## 🔍 Analyse Technique

### Localisation
**Fichier:** `client/src/app/listing/[id]/page.tsx`

### Cause Racine

#### Bug 1: Pas de champ capacité dans le modèle
Le modèle `Listing` (backend et frontend) ne possède **AUCUN champ** pour définir la capacité maximale de voyageurs :
- ❌ Pas de `capacity`
- ❌ Pas de `maxGuests`
- ❌ Pas de `accommodates`

**Fichiers concernés:**
- `server/src/models/Listing.js` (lignes 76-117)
- `client/src/types/index.ts` (lignes 53-145)

#### Bug 2: Boutons + sans limite
Les boutons pour augmenter le nombre de voyageurs n'ont **AUCUNE validation** :

```typescript
// ❌ AVANT (Bug) - lignes 1103, 1121, 1139
<button
  onClick={() => setGuestDetails(prev => ({ ...prev, adults: prev.adults + 1 }))}
  className="..."
>
  +
</button>
// Résultat: On peut cliquer à l'infini → 1, 2, 5, 10, 50, 100, 1000...
```

---

## ✅ Solution Implémentée

### Solution 0: Ajout Champ `capacity` au Modèle

**IMPORTANT:** La capacité définie par l'hôte est maintenant **PRIORITAIRE** sur tout calcul automatique.

**Backend - Ajout du champ dans le modèle Mongoose:**

```javascript
// server/src/models/Listing.js
stayDetails: {
  // ... autres champs
  capacity: {
    type: Number,
    min: 1,
    max: 50,
    validate: {
      validator: Number.isInteger,
      message: 'Capacity must be a whole number'
    }
  }
}

vehicleDetails: {
  // ... autres champs
  capacity: {
    type: Number,
    min: 1,
    max: 50,
    validate: {
      validator: Number.isInteger,
      message: 'Capacity must be a whole number'
    }
  }
}
```

**Frontend - Ajout du champ dans l'interface TypeScript:**

```typescript
// client/src/types/index.ts
stayDetails?: {
  // ... autres champs
  capacity?: number;
}

vehicleDetails?: {
  // ... autres champs
  capacity?: number;
}
```

### Solution 1: Fonction de Calcul de Capacité Maximale avec Priorité

Création d'une fonction `getMaxCapacity()` qui **priorise la capacité définie par l'hôte**, puis utilise le calcul heuristique en fallback :

**Ajout (lignes 393-428):**
```typescript
// ✅ FIX: Calculate max capacity based on listing details
const getMaxCapacity = (): number => {
  if (!listing) return 2; // Default minimum capacity

  // ✅ PRIORITY #1: Use host-defined capacity if available (for both stays and vehicles)
  if (listing.category === 'stay' && listing.stayDetails?.capacity) {
    return listing.stayDetails.capacity;
  }
  if (listing.category === 'vehicle' && listing.vehicleDetails?.capacity) {
    return listing.vehicleDetails.capacity;
  }

  // ⚠️ FALLBACK: Calculate capacity when host hasn't specified one

  // For vehicles: use seats as fallback
  if (listing.category === 'vehicle' && listing.vehicleDetails?.seats) {
    return listing.vehicleDetails.seats;
  }

  // For stays: use bedrooms (heuristic: 2 people per bedroom + 2 for living space)
  if (listing.category === 'stay' && listing.stayDetails?.bedrooms) {
    return Math.max(2, listing.stayDetails.bedrooms * 2 + 2);
  }

  // Default fallback based on stay type
  if (listing.category === 'stay') {
    const stayType = listing.stayDetails?.stayType;
    if (stayType === 'studio' || stayType === 'room') return 2;
    if (stayType === 'apartment') return 4;
    if (stayType === 'house' || stayType === 'villa') return 6;
    if (stayType === 'riad' || stayType === 'guesthouse') return 8;
    return 4; // Default for stays
  }

  return 2; // Absolute minimum
};

const maxCapacity = getMaxCapacity();
```

### Solution 2: Validation des Boutons +

Ajout de validation sur TOUS les boutons d'incrémentation (adults, children, infants) :

**Bouton Adults (lignes 1130-1141):**
```typescript
// ✅ APRÈS (Corrigé)
<button
  onClick={() => {
    const newTotal = guestDetails.adults + 1 + guestDetails.children + guestDetails.infants;
    if (newTotal <= maxCapacity) {
      setGuestDetails(prev => ({ ...prev, adults: prev.adults + 1 }));
    }
  }}
  disabled={guestDetails.adults + guestDetails.children + guestDetails.infants >= maxCapacity}
  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-[#FF6B35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
  +
</button>
```

**Même logique appliquée pour:**
- Bouton Children (lignes 1154-1165)
- Bouton Infants (lignes 1178-1189)

### Solution 3: Affichage de la Capacité Maximale

Ajout d'un message informatif pour l'utilisateur (lignes 1193-1199) :

```typescript
{/* Capacity Info */}
<div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
  <span>Maximum capacity: {maxCapacity} {maxCapacity === 1 ? 'guest' : 'guests'}</span>
  {totalGuests >= maxCapacity && (
    <span className="text-orange-600 font-medium">Limit reached</span>
  )}
</div>
```

---

## 🎯 Résultat Final

### Nouveau Comportement

| Scénario | Avant | Après |
|----------|-------|-------|
| Studio (0 chambre) | ❌ Peut réserver 50 personnes | ✅ Maximum 2 voyageurs |
| Appartement 2 chambres | ❌ Peut réserver 100 personnes | ✅ Maximum 6 voyageurs (2*2+2) |
| Voiture 5 places | ❌ Peut réserver 20 personnes | ✅ Maximum 5 voyageurs (seats) |
| Villa 3 chambres | ❌ Illimité | ✅ Maximum 8 voyageurs (3*2+2) |

### Logique de Calcul (Ordre de Priorité)

**🥇 PRIORITÉ #1: Capacité définie par l'hôte**
- Si `stayDetails.capacity` existe → Utiliser cette valeur
- Si `vehicleDetails.capacity` existe → Utiliser cette valeur
- **C'est l'hôte qui connaît le mieux son bien!**

**🥈 FALLBACK: Calcul automatique (si pas de capacité définie)**

**Pour les véhicules:**
- Utilise `vehicleDetails.seats` (nombre exact de places)

**Pour les stays:**
1. Si `bedrooms` existe: `bedrooms * 2 + 2`
   - **Heuristique:** 2 personnes par chambre + 2 pour l'espace commun
   - Exemple: 2 chambres → 2*2+2 = 6 personnes max
2. Sinon, fallback selon `stayType`:
   - Studio/Room: 2 personnes
   - Apartment: 4 personnes
   - House/Villa: 6 personnes
   - Riad/Guesthouse: 8 personnes
3. Minimum absolu: 2 personnes

### UX Améliorée

- **Transparence** : Utilisateur voit "Maximum capacity: 6 guests"
- **Feedback visuel** : Bouton + devient grisé quand limite atteinte
- **Message d'alerte** : "Limit reached" en orange quand capacité atteinte
- **Prévention** : Impossible de dépasser la limite (bouton disabled)

---

## 🧪 Test Manuel

### Pré-requis
- Avoir plusieurs types de listings (studio, appartement, villa, véhicule)
- Navigateur ouvert sur la page d'un listing

### Procédure de Test

#### Test 1: Studio (2 personnes max)
1. Ouvrir un listing de type "Studio" (0 chambre)
2. Essayer d'ajouter 3 adultes en cliquant sur le bouton +
3. **Résultat attendu:**
   - ✅ Message "Maximum capacity: 2 guests" affiché
   - ✅ Bouton + désactivé après 2 personnes
   - ✅ Message "Limit reached" en orange

#### Test 2: Appartement 2 chambres (6 personnes max)
1. Ouvrir un listing "Appartement" avec 2 chambres
2. Ajouter 4 adultes et 2 enfants (total: 6)
3. Essayer d'ajouter un 7ème voyageur
4. **Résultat attendu:**
   - ✅ Affiche "Maximum capacity: 6 guests"
   - ✅ Bouton + désactivé pour tous les types de voyageurs
   - ✅ Impossible d'aller au-delà de 6

#### Test 3: Voiture 5 places (5 personnes max)
1. Ouvrir un listing de type "Véhicule" avec 5 sièges
2. Ajouter 5 adultes
3. Essayer d'ajouter un enfant ou infant
4. **Résultat attendu:**
   - ✅ Affiche "Maximum capacity: 5 guests"
   - ✅ Tous les boutons + désactivés

#### Test 4: Villa 4 chambres (10 personnes max)
1. Ouvrir un listing "Villa" avec 4 chambres
2. Calculer: 4*2+2 = 10 personnes max
3. Ajouter 10 voyageurs (combinaison adultes/enfants/infants)
4. **Résultat attendu:**
   - ✅ Affiche "Maximum capacity: 10 guests"
   - ✅ Peut aller jusqu'à 10 mais pas au-delà

#### Test 5: Validation Dynamique
1. Avoir 5 adultes et 1 enfant (total: 6) dans un appartement max 6
2. Essayer d'ajouter 1 infant
3. **Résultat attendu:** ❌ Impossible (limite déjà atteinte)
4. Retirer 1 adulte (total: 5)
5. Essayer d'ajouter 1 infant
6. **Résultat attendu:** ✅ Possible (on repasse à 6)

---

## 📊 Checklist de Validation

- [ ] La capacité maximale est calculée correctement pour les véhicules (seats)
- [ ] La capacité maximale est calculée correctement pour les stays (bedrooms * 2 + 2)
- [ ] Le fallback par type de stay fonctionne (studio=2, apartment=4, etc.)
- [ ] Les boutons + sont désactivés quand la limite est atteinte
- [ ] Le message "Maximum capacity: X guests" s'affiche
- [ ] Le message "Limit reached" apparaît en orange quand limite atteinte
- [ ] Impossible de cliquer sur les boutons + désactivés
- [ ] La validation fonctionne pour adults, children ET infants
- [ ] Le calcul est dynamique (retirer un adulte réactive les boutons)
- [ ] Pas d'erreur dans la console navigateur

---

## 🔗 Fichiers Modifiés

| Fichier | Lignes Modifiées | Description |
|---------|-----------------|-------------|
| `server/src/models/Listing.js` | 90-98 | Ajout champ `capacity` dans `stayDetails` |
| `server/src/models/Listing.js` | 123-131 | Ajout champ `capacity` dans `vehicleDetails` |
| `client/src/types/index.ts` | 79 | Ajout champ `capacity?: number` dans `stayDetails` |
| `client/src/types/index.ts` | 90 | Ajout champ `capacity?: number` dans `vehicleDetails` |
| `client/src/app/listing/[id]/page.tsx` | 393-428 | Fonction `getMaxCapacity()` avec priorité hôte |
| `client/src/app/listing/[id]/page.tsx` | 1130-1141 | Validation bouton + Adults |
| `client/src/app/listing/[id]/page.tsx` | 1154-1165 | Validation bouton + Children |
| `client/src/app/listing/[id]/page.tsx` | 1178-1189 | Validation bouton + Infants |
| `client/src/app/listing/[id]/page.tsx` | 1193-1199 | Affichage capacité maximale et alerte |

---

## 📝 Notes Complémentaires

### Architecture de la Solution

✅ **Solution complète implémentée** avec:
1. ✅ Champ `capacity` ajouté au modèle Listing (backend + frontend)
2. ✅ Priorité donnée à la capacité définie par l'hôte
3. ✅ Calcul heuristique en fallback quand l'hôte n'a pas défini de capacité
4. ✅ Validation frontend avec boutons désactivés et messages clairs

### Ordre de Priorité (Logique Finale)

```
1. listing.stayDetails.capacity (défini par l'hôte)
   ↓ si absent
2. listing.vehicleDetails.capacity (défini par l'hôte)
   ↓ si absent
3. vehicleDetails.seats (pour véhicules)
   ↓ si absent
4. bedrooms * 2 + 2 (pour stays avec chambres)
   ↓ si absent
5. Fallback par type de stay (studio=2, apartment=4, etc.)
   ↓ dernier recours
6. Minimum absolu: 2 personnes
```

### Heuristique de Fallback

La formule `bedrooms * 2 + 2` est une approximation raisonnable mais :
- Peut sous-estimer les grandes villas (solution: fallbacks par type)
- Peut surestimer les petits espaces (solution: minimum par type)
- Ne tient pas compte des lits superposés ou canapés-lits

**Cette heuristique sert uniquement de FALLBACK** quand l'hôte n'a pas défini de capacité.

### Prochaines Étapes Recommandées

1. **Ajouter le champ "Capacité maximale" dans le formulaire de création/édition de listing**
   - Input number avec min=1 et max=50
   - Suggestion automatique basée sur le calcul heuristique (mais modifiable par l'hôte)
   - Message: "Nombre maximum de voyageurs que vous pouvez accueillir"

2. **Validation backend** lors de la création de réservation
   ```javascript
   // server/src/controllers/bookingController.js
   const totalGuests = guestCount.adults + guestCount.children + guestCount.infants;
   const maxCapacity = listing.stayDetails?.capacity || listing.vehicleDetails?.capacity || calculateFallbackCapacity(listing);

   if (totalGuests > maxCapacity) {
     return res.status(400).json({
       status: 'error',
       message: `This listing can accommodate maximum ${maxCapacity} guests`
     });
   }
   ```

3. **Migration des listings existants**
   - Script de migration pour calculer et définir `capacity` pour tous les listings existants
   - Utiliser le calcul heuristique actuel comme valeur par défaut

---

## 🎯 Impact et Bénéfices

### Pour les Hôtes
- ✅ **Protection** : Empêche les réservations impossibles à honorer
- ✅ **Clarté** : Pas de surprise à l'arrivée des voyageurs
- ✅ **Conformité** : Respect des normes de sécurité

### Pour les Voyageurs
- ✅ **Transparence** : Connaissent la capacité maximale avant de réserver
- ✅ **Confiance** : Pas de conflit sur place
- ✅ **UX claire** : Feedback visuel immédiat

### Pour la Plateforme
- ✅ **Qualité** : Réservations réalistes et conformes
- ✅ **Réputation** : Prévention des litiges
- ✅ **Légalité** : Conformité aux normes de sécurité

---

## 🏷️ Tags
`bug` `validation` `capacity` `booking` `security` `business-critical` `p0-critical`

---

**Fait avec ❤️ pour Baytup**
*Bug découvert et corrigé le 19 Janvier 2026*
