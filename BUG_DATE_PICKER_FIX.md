# 🐛 BUG: Sélection de Dates Homepage - BQ-NEW

**Date de découverte:** 19 Janvier 2026
**Priorité:** High (P1)
**Statut:** ✅ Corrigé

---

## 📝 Description du Bug

Sur la homepage, dans la barre de recherche :
- **Quand on clique sur "Arrivée"** → Rien ne se passe au premier clic sur une date
- **Quand on clique sur "Départ"** → On peut sélectionner les deux dates (arrivée ET départ)

L'expérience utilisateur est incohérente et confuse.

---

## 🔍 Analyse Technique

### Localisation
**Fichier:** `client/src/components/Header.tsx`
- **Lignes 46-134:** Composant `CalendarComponent`
- **Lignes 1219-1316:** Champs Check-In et Check-Out

### Cause Racine

Le composant `CalendarComponent` avait un état interne `isSelectingCheckOut` initialisé statiquement à `false`, indépendamment du champ actif :

```javascript
// ❌ AVANT (Bug)
const [isSelectingCheckOut, setIsSelectingCheckOut] = useState(false);
```

**Problème :**
- L'état ne savait pas si l'utilisateur avait cliqué sur "Arrivée" ou "Départ"
- Le calendrier se comportait toujours de la même manière :
  1. Premier clic → Sélection de checkIn
  2. Deuxième clic → Sélection de checkOut
- Pas de feedback visuel indiquant qu'il faut cliquer 2 fois

### Comportement Incorrect

| Action Utilisateur | Comportement Attendu | Comportement Réel (Bug) |
|-------------------|---------------------|-------------------------|
| Clic sur "Arrivée" → Sélectionner une date | Date d'arrivée enregistrée immédiatement | ❌ Rien ne se passe, faut cliquer 2 fois |
| Clic sur "Départ" → Sélectionner une date | Date de départ enregistrée | ❌ Fonctionne mais sélectionne AUSSI l'arrivée |

---

## ✅ Solution Implémentée - REDESIGN COMPLET

### Solution Finale: UN SEUL Champ Unifié

Après analyse du feedback utilisateur, la solution finale est un **redesign complet** :

**Avant :** 2 champs séparés ("Arrivée" et "Départ")
**Après :** 1 champ unifié "Choisir vos dates" avec **double méthode de saisie**

### 1. Champ Unique avec Affichage Intelligent

```javascript
// Lignes 1226-1257
<div
  className={`flex-1 cursor-pointer transition-all duration-200 relative ${
    activeSearchField === 'dates' ? 'bg-white rounded-full shadow-lg z-10' : 'hover:bg-gray-50'
  }`}
  onClick={() => setActiveSearchField(activeSearchField === 'dates' ? null : 'dates')}
>
  <div className="text-xs font-semibold text-gray-900 mb-1">
    {currentActiveCategory === 'vehicles' ? 'Période de location' : 'Dates de séjour'}
  </div>
  <div className="text-sm text-gray-600">
    {searchData.checkIn && searchData.checkOut ? (
      <>
        {new Date(searchData.checkIn).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short'
        })}
        {' → '}
        {new Date(searchData.checkOut).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short'
        })}
      </>
    ) : (
      'Ajouter dates'
    )}
  </div>
</div>
```

### 2. Double Méthode de Saisie

**Méthode A: Inputs HTML5 pour saisie directe au clavier**
```javascript
// Lignes 1268-1305
<div className="p-6 border-b border-gray-100">
  <div className="grid grid-cols-2 gap-4">
    {/* Input Début */}
    <input
      type="date"
      value={searchData.checkIn}
      onChange={(e) => {
        setSearchData({
          ...searchData,
          checkIn: e.target.value
        });
      }}
      min={new Date().toISOString().split('T')[0]}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35]"
    />

    {/* Input Fin */}
    <input
      type="date"
      value={searchData.checkOut}
      onChange={(e) => {
        setSearchData({
          ...searchData,
          checkOut: e.target.value
        });
      }}
      min={searchData.checkIn || new Date().toISOString().split('T')[0]}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6B35]"
    />
  </div>
</div>
```

**Méthode B: Calendrier visuel pour sélection à la souris**
```javascript
// Lignes 1307-1323
<div className="p-6">
  <CalendarComponent
    checkIn={searchData.checkIn}
    checkOut={searchData.checkOut}
    onDateSelect={(dates) => {
      setSearchData({
        ...searchData,
        checkIn: dates.checkIn,
        checkOut: dates.checkOut
      });
    }}
    onClose={() => setActiveSearchField(null)}
    vehicleMode={currentActiveCategory === 'vehicles'}
    activeField="checkin"
  />
</div>
```

---

## 🎯 Résultat Final

### Nouveau Comportement (Redesign)

| Scénario | Comportement |
|----------|--------------|
| ✅ Clic sur le champ unique | Ouvre dropdown avec 2 inputs + calendrier |
| ✅ Saisie directe dans input "Début" | Met à jour checkIn instantanément |
| ✅ Saisie directe dans input "Fin" | Met à jour checkOut instantanément |
| ✅ Clic sur date dans calendrier | Sélection visuelle checkIn puis checkOut |
| ✅ Affichage dans le champ | Format "25 Jan → 30 Jan" |

### UX Améliorée

- **Simplicité** : Un seul champ au lieu de deux = interface épurée
- **Flexibilité** : Double méthode de saisie (clavier OU souris)
- **Intuitivité** : Format "25 Jan → 30 Jan" clair et concis
- **Rapidité** : Saisie directe possible sans naviguer dans le calendrier
- **Validation automatique** : Input "Fin" ne peut pas être avant "Début"

---

## 🧪 Test Manuel

### Pré-requis
- Navigateur ouvert sur la homepage
- Console ouverte (F12) pour observer les changements d'état

### Procédure de Test

#### Test 1: Saisie Directe via Inputs
1. Cliquer sur le champ **"Dates de séjour"**
2. **Résultat attendu:** Dropdown s'ouvre avec 2 inputs date et le calendrier en bas
3. Dans le premier input (Début), taper ou sélectionner **25/01/2026**
4. **Résultat attendu:** Date enregistrée instantanément
5. Dans le deuxième input (Fin), taper ou sélectionner **30/01/2026**
6. **Résultat attendu:** Date enregistrée, affichage "25 Jan → 30 Jan" dans le champ principal

#### Test 2: Sélection Visuelle via Calendrier
1. Ouvrir le champ "Dates de séjour"
2. Cliquer sur une date dans le calendrier (ex: 25 janvier)
3. **Résultat attendu:** Date devient checkIn
4. Cliquer sur une deuxième date (ex: 30 janvier)
5. **Résultat attendu:** Date devient checkOut, affichage "25 Jan → 30 Jan"

#### Test 3: Validation des Dates
1. Saisir une date de début (ex: 25 janvier)
2. Essayer de saisir une date de fin AVANT la date de début dans l'input
3. **Résultat attendu:** Input "Fin" a un `min` égal à la date de début, empêchant la sélection

#### Test 4: Affichage et Fermeture
1. Ouvrir le dropdown de dates
2. Cliquer en dehors du dropdown
3. **Résultat attendu:** Dropdown se ferme, dates sélectionnées affichées dans le champ
4. Vérifier que le format d'affichage est "25 Jan → 30 Jan" (français)

---

## 📊 Checklist de Validation

- [ ] Le champ unique "Dates de séjour" s'affiche correctement
- [ ] Clic sur le champ ouvre le dropdown avec 2 inputs + calendrier
- [ ] Les inputs HTML5 permettent la saisie directe de dates
- [ ] Le calendrier visuel permet la sélection à la souris
- [ ] L'input "Fin" ne permet pas de date avant l'input "Début"
- [ ] Les dates sélectionnées s'affichent au format "25 Jan → 30 Jan"
- [ ] Pas d'erreur dans la console navigateur
- [ ] Le dropdown se ferme correctement après sélection
- [ ] Compatible Chrome, Firefox, Safari
- [ ] Fonctionne en mode "Véhicules" avec labels adaptés

---

## 🔗 Fichiers Modifiés

| Fichier | Lignes Modifiées | Description |
|---------|-----------------|-------------|
| `client/src/components/Header.tsx` | 1225-1326 | Redesign complet: champ unique avec double méthode de saisie (inputs directs + calendrier) |

---

## 📝 Notes Complémentaires

### Points d'Attention
- ⚠️ Tester avec différents fuseaux horaires
- ⚠️ Tester la logique avec des dates passées (devrait être désactivé)
- ⚠️ Vérifier le comportement en mode "Véhicule" (pickup/return)

### Améliorations Futures Possibles
- 💡 Ajouter un indicateur visuel "Sélectionnez une date de départ" après avoir choisi l'arrivée
- 💡 Ajouter un tooltip expliquant le comportement de sélection
- 💡 Sauvegarder les dates dans localStorage pour persister entre sessions

---

## 🏷️ Tags
`bug` `calendar` `date-picker` `ux` `homepage` `search-bar` `high-priority`

---

**Fait avec ❤️ pour Baytup**
*Bug découvert et corrigé le 19 Janvier 2026*
