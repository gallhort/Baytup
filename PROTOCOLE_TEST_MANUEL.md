# 📋 Protocole de Test Manuel - Corrections Bugs Baytup

**Date de création:** 19 Janvier 2026
**Version:** 1.0
**Testeur:** _[Votre nom]_
**Date de test:** _[Date]_

---

## 🎯 Objectif

Ce document fournit un protocole détaillé pour tester manuellement toutes les corrections de bugs effectuées sur la plateforme Baytup.

---

## ✅ Bugs Corrigés

| ID | Description | Priorité | Fichiers Modifiés |
|----|-------------|----------|-------------------|
| BQ-NEW | Sélection dates homepage cassée (Arrivée vs Départ) | P1 | `/client/src/components/Header.tsx` |
| BQ-DASHBOARD | Dashboard affiche seulement 10 listings au lieu de tous | P1 | `/server/src/controllers/dashboardController.js` |
| BQ-45 | Liste bookings vide malgré compteurs affichés | P1 | `/client/src/app/dashboard/bookings/page.tsx` |
| BQ-37 | Navigation back ferme le listing au lieu de revenir à l'image | High | `/client/src/app/listing/[id]/page.tsx` |
| BQ-38 | Toutes les images s'ouvrent en même temps | High | `/client/src/app/listing/[id]/page.tsx` |
| BQ-39 | Boutons Next/Previous ne fonctionnent pas | Medium | `/client/src/app/listing/[id]/page.tsx`, `/client/src/utils/imageUtils.ts` |
| BQ-31 | Pas d'indicateur de nouveaux messages | High | `/client/src/app/dashboard/layout.tsx` |
| BQ-16 | Liens Terms & Privacy → 404 | P1 | `/client/src/app/terms/page.tsx`, `/client/src/app/privacy/page.tsx` |
| BQ-17 | Liens footer → 404 | P1 | `/client/src/components/Footer.tsx`, `/client/src/app/coming-soon/page.tsx` |

---

## 🧪 Tests à Effectuer

### **TEST 0: BQ-NEW - Sélection Dates Homepage**

**Pré-requis:**
- Être sur la homepage
- Avoir la barre de recherche visible

#### **Test 0.1: Clic sur "Arrivée"**

**Étapes:**
1. Aller sur la homepage
2. Cliquer sur le champ **"Arrivée"**
3. Observer que le calendrier s'ouvre
4. Cliquer sur une date future (ex: 25 janvier)
5. Observer le champ "Arrivée"
6. Cliquer sur une deuxième date (ex: 30 janvier)
7. Observer les deux champs

**Résultat attendu:**
- ✅ Calendrier s'ouvre au clic sur "Arrivée"
- ✅ Premier clic sélectionne la date d'arrivée et l'affiche dans le champ
- ✅ Deuxième clic sélectionne la date de départ
- ✅ Les deux dates sont correctement affichées

**Résultat réel:**
- [ ] Conforme
- [ ] Non conforme - Détails: _________________

#### **Test 0.2: Clic sur "Départ" (avec arrivée définie)**

**Étapes:**
1. Avoir une date d'arrivée déjà sélectionnée (utiliser Test 0.1)
2. Cliquer sur le champ **"Départ"**
3. Observer que le calendrier s'ouvre
4. Cliquer sur une date après l'arrivée (ex: 5 février)
5. Observer le champ "Départ"

**Résultat attendu:**
- ✅ Calendrier s'ouvre au clic sur "Départ"
- ✅ Un seul clic suffit pour modifier la date de départ
- ✅ La date d'arrivée reste inchangée
- ✅ Le calendrier se ferme après sélection

**Résultat réel:**
- [ ] Conforme
- [ ] Non conforme - Détails: _________________

#### **Test 0.3: Clic sur "Départ" (sans arrivée)**

**Étapes:**
1. Rafraîchir la page pour réinitialiser les dates
2. Cliquer directement sur le champ **"Départ"**
3. Cliquer sur une date future (ex: 25 janvier)
4. Observer ce qui se passe
5. Cliquer sur une deuxième date (ex: 30 janvier)

**Résultat attendu:**
- ✅ Premier clic définit la date d'arrivée (logique)
- ✅ Deuxième clic définit la date de départ
- ✅ Comportement cohérent avec le clic sur "Arrivée"

**Résultat réel:**
- [ ] Conforme
- [ ] Non conforme - Détails: _________________

---

### **TEST 1: BQ-45 - Liste Bookings Vide**

**Pré-requis:**
- Avoir un compte Host avec des bookings existants
- Être connecté

**Étapes:**
1. Se connecter en tant que Host
2. Naviguer vers Dashboard → Bookings
3. Observer les compteurs en haut (Total Bookings, Active Bookings)
4. Observer la liste des bookings en dessous

**Résultat attendu:**
- ✅ Les compteurs affichent le nombre correct de bookings
- ✅ La liste affiche les bookings correspondants
- ✅ Aucune liste vide si les compteurs montrent des bookings

**Résultat réel:**
- [ ] Conforme
- [ ] Non conforme - Détails: _________________

---

### **TEST 2: BQ-37, 38, 39 - Galerie d'Images**

**Pré-requis:**
- Trouver un listing avec plusieurs images (au moins 5)

#### **Test 2.1: Navigation Images (BQ-39)**

**Étapes:**
1. Ouvrir une page listing avec plusieurs images
2. Cliquer sur une image de la grille
3. Observer le lightbox qui s'ouvre
4. Cliquer sur le bouton "Next" (flèche droite)
5. Cliquer sur le bouton "Previous" (flèche gauche)
6. Utiliser les touches clavier: ← et →
7. Cliquer sur les miniatures en bas

**Résultat attendu:**
- ✅ Le lightbox s'ouvre sur l'image cliquée
- ✅ Bouton "Next" change l'image vers la suivante
- ✅ Bouton "Previous" change l'image vers la précédente
- ✅ Touches clavier fonctionnent (← →)
- ✅ Miniatures changent l'image active
- ✅ Compteur affiche "X / Total" correctement

**Résultat réel:**
- [ ] Conforme
- [ ] Non conforme - Détails: _________________

#### **Test 2.2: Vue Focalisée (BQ-38)**

**Étapes:**
1. Ouvrir le lightbox (cliquer sur une image)
2. Observer l'affichage

**Résultat attendu:**
- ✅ Une seule image est affichée en grand format
- ✅ Pas de grille de toutes les images
- ✅ Fond noir avec image centrée
- ✅ Miniatures visibles en bas (max 10)

**Résultat réel:**
- [ ] Conforme
- [ ] Non conforme - Détails: _________________

#### **Test 2.3: Navigation Back (BQ-37)**

**Étapes:**
1. Ouvrir une page listing
2. Cliquer sur une image pour ouvrir le lightbox
3. Cliquer sur le bouton X (fermer) ou utiliser la touche Escape
4. Vérifier que vous êtes toujours sur la page listing

**Résultat attendu:**
- ✅ Le lightbox se ferme
- ✅ La page listing reste ouverte (pas de retour à la page précédente)
- ✅ L'URL ne change pas

**Résultat réel:**
- [ ] Conforme
- [ ] Non conforme - Détails: _________________

---

### **TEST 3: BQ-31 - Indicateur Nouveaux Messages**

**Pré-requis:**
- Avoir 2 comptes (ou un collègue pour tester)
- Compte 1: Host
- Compte 2: Guest

#### **Test 3.1: Badge dans Navigation**

**Étapes:**
1. Se connecter en tant que Guest (Compte 2)
2. Depuis un autre navigateur/onglet incognito, se connecter en tant que Host (Compte 1)
3. En tant que Host, envoyer un message au Guest
4. Revenir sur le compte Guest
5. Observer la sidebar navigation (Messages)

**Résultat attendu:**
- ✅ Un badge rouge apparaît sur "Messages" dans la sidebar
- ✅ Le badge affiche le nombre de messages non lus (ex: "1")
- ✅ Le badge disparaît après avoir lu le message

**Résultat réel:**
- [ ] Conforme
- [ ] Non conforme - Détails: _________________

#### **Test 3.2: Badge dans Liste Conversations**

**Étapes:**
1. Être sur la page Messages avec des messages non lus
2. Observer la liste des conversations

**Résultat attendu:**
- ✅ Un badge "X new" apparaît sur les conversations avec messages non lus
- ✅ Le badge disparaît après avoir ouvert la conversation

**Résultat réel:**
- [ ] Conforme
- [ ] Non conforme - Détails: _________________

---

### **TEST 4: BQ-16 - Liens Terms & Privacy**

**Étapes:**
1. Aller en bas de n'importe quelle page
2. Cliquer sur "Privacy Policy" dans le footer
3. Vérifier que la page se charge correctement
4. Revenir en arrière
5. Cliquer sur "Terms of Service" dans le footer
6. Vérifier que la page se charge correctement

**Résultat attendu:**
- ✅ Le lien "Privacy Policy" ouvre une page avec le contenu de la politique de confidentialité
- ✅ Pas d'erreur 404
- ✅ Le lien "Terms of Service" ouvre une page avec les conditions d'utilisation
- ✅ Pas d'erreur 404

**Résultat réel:**
- [ ] Conforme
- [ ] Non conforme - Détails: _________________

---

### **TEST 5: BQ-17 - Tous les Liens Footer**

**Étapes:**
1. Aller en bas de la page d'accueil
2. Tester chaque lien du footer:

**Section Support:**
- [ ] Help Center → Redirige vers "Coming Soon"
- [ ] Safety & Trust → Redirige vers "Coming Soon"
- [ ] Cancellation Options → Redirige vers "Coming Soon"
- [ ] COVID-19 Response → Redirige vers "Coming Soon"

**Section Hosting:**
- [ ] Become a Host → Page existante (doit fonctionner)
- [ ] Host Resources → Redirige vers "Coming Soon"
- [ ] Responsible Hosting → Redirige vers "Coming Soon"

**Section About:**
- [ ] Newsroom → Redirige vers "Coming Soon"
- [ ] Careers → Redirige vers "Coming Soon"
- [ ] Investors → Redirige vers "Coming Soon"
- [ ] Diversity & Belonging → Redirige vers "Coming Soon"

**Section Legal (bas de page):**
- [ ] Privacy → Page Privacy Policy
- [ ] Terms → Page Terms of Service
- [ ] Sitemap → Page Sitemap

**Résultat attendu:**
- ✅ Aucun lien ne produit d'erreur 404
- ✅ Les liens sans page redirigent vers "Coming Soon"
- ✅ Les liens légaux ouvrent les vraies pages
- ✅ Page "Coming Soon" affiche le nom du lien

**Résultat réel:**
- [ ] Conforme
- [ ] Non conforme - Détails: _________________

---

### **TEST 6: BQ-DASHBOARD - Tous les Listings dans Dashboard**

**Pré-requis:**
- Avoir un compte Host avec plusieurs listings (au moins 15+)
- Être connecté

**Étapes:**
1. Se connecter en tant que Host
2. Naviguer vers Dashboard principal (http://localhost:3000/dashboard)
3. Observer l'onglet "Annonces" avec la liste des listings
4. Compter le nombre de listings affichés
5. Comparer avec le compteur "Total Listings" en haut
6. Naviguer vers "Mes Annonces" (menu de gauche)
7. Compter le nombre de listings dans cette page

**Résultat attendu:**
- ✅ L'onglet "Annonces" du dashboard affiche TOUS les listings
- ✅ Le nombre de listings affichés correspond au compteur "Total Listings"
- ✅ Cohérence entre le dashboard et la page "Mes Annonces"
- ✅ Pas de limitation à 10 listings

**Résultat réel:**
- [ ] Conforme
- [ ] Non conforme - Détails: _________________

---

## 📊 Résumé des Tests

| Test | Statut | Commentaires |
|------|--------|--------------|
| BQ-NEW - Sélection Dates | ⬜ Pass / ⬜ Fail | |
| BQ-DASHBOARD - Listings Dashboard | ⬜ Pass / ⬜ Fail | |
| BQ-45 - Liste Bookings | ⬜ Pass / ⬜ Fail | |
| BQ-37 - Navigation Back | ⬜ Pass / ⬜ Fail | |
| BQ-38 - Vue Focalisée | ⬜ Pass / ⬜ Fail | |
| BQ-39 - Boutons Next/Prev | ⬜ Pass / ⬜ Fail | |
| BQ-31 - Indicateur Messages | ⬜ Pass / ⬜ Fail | |
| BQ-16 - Terms & Privacy | ⬜ Pass / ⬜ Fail | |
| BQ-17 - Liens Footer | ⬜ Pass / ⬜ Fail | |

**Score Global:** __ / 9 tests passés

---

## 🐛 Bugs Trouvés Pendant les Tests

| # | Description | Priorité | Bug Original? |
|---|-------------|----------|---------------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

---

## 📝 Notes & Observations

_Espace pour vos notes pendant les tests:_

```
[Vos notes ici]
```

---

## ✨ Environnements de Test

- [ ] **Navigateur:** Chrome / Firefox / Safari / Edge
- [ ] **Version:** _____
- [ ] **OS:** Windows / macOS / Linux
- [ ] **Résolution:** _____
- [ ] **Mode:** Desktop / Mobile / Tablet

---

## 👤 Signature

**Testeur:** ___________________
**Date:** ___________________
**Statut Final:** ⬜ Tous les tests passent / ⬜ Bugs trouvés

---

## 📞 Support

En cas de problème:
- Vérifier la console navigateur (F12 → Console)
- Vérifier les logs serveur
- Contacter l'équipe technique

**Fait avec ❤️ pour Baytup**
