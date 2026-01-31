# Baytup - Suivi des Parcours

**Dernière mise à jour:** 31/01/2026

---

## 1. Parcours Paiement (100%) ✅

| Fonctionnalité | Statut | Notes |
|----------------|--------|-------|
| SlickPay | ✅ FAIT | Integration complete avec webhooks |
| Stripe | ✅ FAIT | 29/01 - Payment Intents + Elements + Webhooks |
| Stripe Connect | ✅ FAIT | 31/01 - Onboarding hôte + transferts auto (EUR) |
| Multi-devises (DZD/EUR) | ✅ FAIT | EUR→Stripe, DZD→SlickPay automatique |
| Filtre recherche par devise | ✅ FAIT | 28/01 - Currency passée à l'API |
| Paiement espèces | ✅ FAIT | 29/01 - Nord Express mock avec vouchers |
| Nord Express | ✅ FAIT | 29/01 - Service mock + validation admin manuelle |
| Escrow/Séquestre | ✅ FAIT | 29/01 - Modèle + service + libération auto J+1 |
| Validation admin cash | ✅ FAIT | 29/01 - Route admin + dashboard |
| Libération fonds J+1 | ✅ FAIT | 28/01 - Cron autoReleaseEscrowFunds() toutes les 2h |
| Remboursements Stripe | ✅ FAIT | 31/01 - 4 politiques Airbnb-style + grace period 48h |
| Remboursements SlickPay | ⚠️ MANUEL | API non disponible, traitement admin manuel |
| Structure frais 11% | ✅ FAIT | 8% guest fee + 3% host commission |
| Webhooks complets | ✅ FAIT | 10+ événements (payment, refund, dispute, transfer) |

---

## 2. Parcours Hôte (75%)

| Fonctionnalité | Statut | Notes |
|----------------|--------|-------|
| Création annonce | ✅ FAIT | Multi-step form, categories stay/vehicle |
| Choix devise (DZD/EUR) | ✅ FAIT | Field pricing.currency |
| Les deux devises | ✅ FAIT | 31/01 - altBasePrice, altCurrency, altCleaningFee |
| Réservation instantanée | ✅ FAIT | instantBook toggle |
| Validation manuelle | ✅ FAIT | Status pending si non-instant |
| Délai réponse 24h | ✅ FAIT | 28/01 - Deadline + expiration auto |
| Rappels hôte 12h, 2h | ✅ FAIT | 28/01 - Notifications automatiques |
| Dashboard hôte | ✅ FAIT | Stats, bookings, revenus |
| Earnings & Payouts | ✅ FAIT | Système complet avec RIB validation |
| Vérification hôte | ✅ FAIT | Multi-step application avec documents |

---

## 3. Parcours Recherche (80%)

| Fonctionnalité | Statut | Notes |
|----------------|--------|-------|
| Sélection devise | ✅ FAIT | 28/01 - Contexte + envoi à l'API |
| Filtre par devise | ✅ FAIT | 28/01 - Backend + frontend connectés |
| Filtre rayon géographique | ✅ FAIT | 28/01 - Coordonnées + radius fonctionnels |
| Affichage multi-devises | ✅ FAIT | 31/01 - Système dual pricing (PAS de conversion auto) |
| Filtres avancés | ✅ FAIT | Location, prix, amenities, dates, etc. |
| Synchronisation liste/carte | ✅ FAIT | 28/01 - Vue split synchronisée |
| Params recherche → booking | ✅ FAIT | 28/01 - Dates/voyageurs transmis |

---

## 4. Parcours Voyageur (90%)

| Fonctionnalité | Statut | Notes |
|----------------|--------|-------|
| Recherche | ✅ FAIT | Filtres, carte, résultats |
| Sélection annonce | ✅ FAIT | Page détail, photos, amenités |
| Pré-remplissage booking | ✅ FAIT | 28/01 - Depuis recherche |
| Choix paiement carte | ✅ FAIT | SlickPay (DZD) + Stripe (EUR) |
| Choix paiement espèces | ✅ FAIT | 29/01 - PaymentMethodSelector + CashVoucherDisplay |
| Affichage voucher + QR | ✅ FAIT | 29/01 - Frontend complet avec countdown |
| Confirmation instantanée | ✅ FAIT | Si instantBook=true |
| Attente validation 24h | ✅ FAIT | 28/01 - Status pending + countdown |
| Dashboard voyageur | ✅ FAIT | Bookings, historique, stats |

---

## 5. Parcours Admin (85%)

| Fonctionnalité | Statut | Notes |
|----------------|--------|-------|
| Dashboard admin | ✅ FAIT | Stats, charts, exports PDF |
| Validation cash Nord Express | ✅ FAIT | 29/01 - Routes admin /cash-vouchers |
| Liste vouchers pending | ✅ FAIT | 29/01 - GET /api/admin/cash-vouchers |
| Validation manuelle voucher | ✅ FAIT | 29/01 - PUT /api/admin/cash-vouchers/:id/validate |
| Gestion utilisateurs | ✅ FAIT | CRUD, roles, block/activate |
| Gestion annonces | ⚠️ PARTIEL | Stats existent, pas d'approval workflow |
| Suivi commissions | ✅ FAIT | 31/01 - Dashboard complet avec stats/graphs/export CSV |
| Virements hôtes | ✅ FAIT | Payout management complet |
| Gestion escrow | ✅ FAIT | 29/01 - Routes admin escrow (release/freeze/resolve) |
| Support | ✅ FAIT | 31/01 - Système tickets complet (NON TESTÉ) |

---

## 6. Parcours Automations (95%)

| Fonctionnalité | Statut | Notes |
|----------------|--------|-------|
| Vouchers Nord Express | ✅ FAIT | 29/01 - Expiration 48h + rappels 24h/6h |
| Rappels voucher 24h/6h | ✅ FAIT | 29/01 - sendVoucherReminders() cron 30min |
| Expiration voucher 48h | ✅ FAIT | 29/01 - expireCashVouchers() cron 30min |
| Emails J-7, J-3, J-1 | ✅ FAIT | Déjà implémenté dans bookingAutomation.js |
| Rappels hôte 12h, 2h | ✅ FAIT | Déjà implémenté dans bookingAutomation.js |
| Expiration auto 24h | ✅ FAIT | Déjà implémenté dans bookingAutomation.js |
| Demande avis J+1 | ⚠️ PARTIEL | Envoyé à completion, pas J+1 |
| Libération escrow J+1 | ✅ FAIT | 29/01 - autoReleaseEscrowFunds() cron 2h |
| Auto-activation check-in | ✅ FAIT | Cron horaire |
| Auto-completion checkout | ✅ FAIT | 6h après checkout |

---

## 7. Parcours Disputes & Litiges (95%) ✅ FINALISÉ

| Fonctionnalité | Statut | Notes |
|----------------|--------|-------|
| **Backend - API** | | |
| Création dispute | ✅ FAIT | POST /api/disputes avec validation booking |
| Liste disputes | ✅ FAIT | GET /api/disputes (user/admin) |
| Détails dispute | ✅ FAIT | GET /api/disputes/:id avec auth |
| Upload preuves | ✅ FAIT | POST /api/disputes/:id/evidence (5 fichiers max) |
| Ajout notes | ✅ FAIT | POST /api/disputes/:id/notes (thread discussion) |
| Résolution admin | ✅ FAIT | PATCH /api/disputes/:id/resolve |
| **Frontend - Interfaces** | | |
| Page disputes voyageur | ✅ FAIT | /dashboard/disputes avec filtres |
| Page disputes hôte | ✅ FAIT | /dashboard/host-disputes |
| Page admin disputes | ✅ FAIT | /dashboard/admin/disputes (tous les litiges) |
| Modal création dispute | ✅ FAIT | 31/01 - ReportDisputeModal avec upload preuves |
| Modal détails dispute | ✅ FAIT | Stats, status, priorité, notes, résolution |
| Upload preuves initial | ✅ FAIT | Pendant création (max 5 fichiers, 10MB) |
| Upload preuves additionnel | ✅ FAIT | 31/01 - AddEvidenceModal après création |
| Affichage preuves | ✅ FAIT | 31/01 - EvidenceGallery intégrée dans les 3 modals + lightbox |
| **Catégories & Raisons** | | |
| Raisons voyageurs (10) | ✅ FAIT | dirty_arrival, amenities_missing, safety_issue, etc. |
| Raisons hôtes (10) | ✅ FAIT | property_damage, guest_behavior, noise_party, etc. |
| **Gestion & Workflow** | | |
| Système de priorités | ✅ FAIT | low, medium, high, urgent |
| Changement priorité | ❌ À FAIRE | Fixe à création (medium par défaut) |
| Statuts disputes | ✅ FAIT | open, pending, resolved, closed |
| Thread de discussion | ✅ FAIT | Notes entre guest/host/admin avec populate user |
| **Intégrations** | | |
| Freeze escrow auto | ✅ FAIT | Via cron (2h) + IMMÉDIAT à création (31/01 fix) |
| Freeze escrow immédiat | ✅ FAIT | 31/01 - Appel direct escrowService.freezeEscrow() |
| Block auto-completion | ✅ FAIT | Booking pas auto-complété si dispute ouverte |
| Résolution escrow | ✅ FAIT | Admin peut split funds guest/host |
| Lien avec avis | ❌ À FAIRE | Disputes n'impactent pas reviews |
| **Notifications** | | |
| Email dispute créée | ✅ FAIT | Aux 2 parties avec détails |
| Email dispute résolue | ✅ FAIT | 31/01 - Décision admin envoyée (manquait, ajouté) |
| Email nouvelle note | ✅ FAIT | Notification quand message ajouté |
| Notif in-app | ✅ FAIT | Via Notification model |
| Notif temps réel | ❌ À FAIRE | Pas de WebSocket updates |
| **Sécurité & Validation** | | |
| Auth création | ✅ FAIT | Seul guest/host du booking |
| Auth visualisation | ✅ FAIT | Guest/host/admin seulement |
| Protection multi-disputes | ✅ FAIT | 1 seul dispute ouvert par booking |
| Validation preuves | ⚠️ PARTIEL | Type/taille OK, pas de malware scan |
| Limite upload | ⚠️ PARTIEL | 5 fichiers/10MB mais pas de quota user |
| Validation timeframe | ❌ À FAIRE | Peut disputer bookings très anciens |
| **Analytics & Métriques** | | |
| Stats disputes admin | ✅ FAIT | 31/01 - Dashboard analytics complet (NON TESTÉ) |
| Taux résolution | ✅ FAIT | 31/01 - Calculé + affiché en % (NON TESTÉ) |
| Temps moyen résolution | ✅ FAIT | 31/01 - Calculé en jours (NON TESTÉ) |
| Top raisons disputes | ✅ FAIT | 31/01 - Top 10 bar chart (NON TESTÉ) |
| Repeat offenders | ✅ FAIT | 31/01 - Table utilisateurs 3+ disputes (NON TESTÉ) |
| Tendance mensuelle | ✅ FAIT | 31/01 - Line chart 6 mois (NON TESTÉ) |
| Guest vs Host analytics | ✅ FAIT | 31/01 - Comparaison qui signale (NON TESTÉ) |
| Disputes par statut | ✅ FAIT | 31/01 - Pie chart (NON TESTÉ) |
| Disputes par priorité | ✅ FAIT | 31/01 - Bar chart coloré (NON TESTÉ) |
| **Automatisations** | | |
| Auto-expiration disputes | ❌ À FAIRE | Jamais expirés automatiquement |
| Auto-escalation | ❌ À FAIRE | Pas de priorité auto |
| SLA tracking | ❌ À FAIRE | Pas de délais de traitement |
| **Modération Anti-spam** | | |
| Modération auto messages | ✅ FAIT | 31/01 - Système 3 niveaux (block/flag/allow) (NON TESTÉ) |
| Modération auto avis | ✅ FAIT | 31/01 - Idem messages + 18 règles par défaut (NON TESTÉ) |
| Dashboard admin modération | ✅ FAIT | 31/01 - CRUD règles, logs, stats, flagged content (NON TESTÉ) |
| **Améliorations UX** | | |
| Bouton "Signaler" booking | ⚠️ PARTIEL | Dans liste bookings, pas dans détails |
| Timeline événements | ❌ À FAIRE | Pas d'historique visuel |
| Preview preuves | ❌ À FAIRE | Upload OK mais pas d'affichage |
| Rich text notes | ❌ À FAIRE | Notes en plain text |
| Mobile optimization | ❌ À FAIRE | Upload preuves pas optimisé mobile |

---

## 8. Parcours Support Agent (75%)

| Fonctionnalité | Statut | Notes |
|----------------|--------|-------|
| Système ticketing complet | ✅ FAIT | 31/01 - Model, CRUD, assignation, rating (NON TESTÉ) |
| Email-to-ticket webhook | ✅ FAIT | 31/01 - POST /api/tickets/webhook/email (NON TESTÉ) |
| Auto-création tickets email | ✅ FAIT | 31/01 - Parse emails Mailgun/SendGrid/Postmark (NON TESTÉ) |
| Détection catégorie auto | ✅ FAIT | 31/01 - Depuis sujet/contenu email (NON TESTÉ) |
| Thread messages tickets | ✅ FAIT | 31/01 - User + agent peuvent répondre (NON TESTÉ) |
| Interface user tickets | ✅ FAIT | 31/01 - /dashboard/support (créer, suivre, noter) (NON TESTÉ) |
| Dashboard admin tickets | ✅ FAIT | 31/01 - /dashboard/admin/tickets (stats, filtres) (NON TESTÉ) |
| Chat live | ✅ FAIT | Socket.IO messaging |
| Support téléphone | ❌ À FAIRE | Champ existe, pas d'intégration |
| Base de connaissances | ✅ FAIT | 28/01 - FAQ model + API complète |
| KPIs performance | ⚠️ PARTIEL | Stats tickets (temps résolution), pas métriques agents |
| Gestion disputes | ✅ FAIT | Voir section "Parcours Disputes" ci-dessus |
| Analytics disputes | ✅ FAIT | 31/01 - Dashboard complet (NON TESTÉ) |
| Escalation | ⚠️ PARTIEL | Priorités, pas de workflow auto |

---

## 8. Parcours Avis (90%)

| Fonctionnalité | Statut | Notes |
|----------------|--------|-------|
| Système double-aveugle | ✅ FAIT | 28/01 - Reviews en attente jusqu'à publication simultanée |
| Demande avis J+1 | ⚠️ PARTIEL | À completion, pas J+1 spécifique |
| Fenêtre 14 jours | ✅ FAIT | Enforced dans controller |
| Rappels automatiques | ✅ FAIT | 31/01 - Rappels J+3, J+7 si avis non laissé |
| Publication simultanée | ✅ FAIT | 28/01 - Quand les 2 parties ont laissé un avis |
| Publication J+14 | ✅ FAIT | 28/01 - Cron job quotidien auto-publish |
| Modération anti-insultes | ✅ FAIT | 31/01 - Système anti-spam intégré (18 règles FR/AR) |
| Impact profils | ✅ FAIT | Stats recalculées auto |
| Réponses aux avis | ✅ FAIT | Reviewee peut répondre |

---

## 10. Parcours Vérification & Sécurité (65%) 🔒

| Fonctionnalité | Statut | Notes |
|----------------|--------|-------|
| Vérification email | ✅ FAIT | Token 24h, bloque login |
| Vérification téléphone | ❌ À FAIRE | Pas de SMS/OTP |
| Vérification identité | ⚠️ PARTIEL | Hôtes seulement (ID + documents) |
| Selfie + IA 85% | ❌ À FAIRE | Pas de reconnaissance faciale |
| Détection fraude | ❌ À FAIRE | Pas d'anomaly detection |
| Surveillance activité | ⚠️ MINIMAL | lastLogin seulement |
| Badge "Vérifié" | ⚠️ PARTIEL | Superhost existe, pas Verified user |
| **2FA / Authentification double** | | |
| Email OTP | ✅ FAIT | 31/01 - Codes 6 chiffres par email avec rate limiting |
| TOTP / Google Authenticator | ✅ FAIT | 31/01 - QR code + vérification codes |
| Backup codes | ✅ FAIT | 31/01 - 10 codes de secours style Airbnb |
| QR code generation | ✅ FAIT | Avec speakeasy + qrcode |
| Setup flow 3 étapes | ✅ FAIT | Scan QR → Vérifier → Backup codes |
| Audit logs | ✅ FAIT | AuditLog model pour actions sensibles |
| Require 2FA middleware | ✅ FAIT | Protection routes sensibles |
| Security banner hosts | ✅ FAIT | Suggestions intelligentes |
| Dashboard sécurité | ✅ FAIT | 31/01 - /dashboard/security avec gestion 2FA |

---

## 11. Parcours Communication (70%)

| Fonctionnalité | Statut | Notes |
|----------------|--------|-------|
| Messagerie interne | ✅ FAIT | Conversations, attachments, threads |
| Modération anti-spam | ✅ FAIT | 31/01 - Auto-modération messages/avis (NON TESTÉ) |
| Notifications email | ✅ FAIT | 10+ templates transactionnels |
| Notifications push | ✅ FAIT | 40+ types via WebSocket |
| SMS | ❌ À FAIRE | Pas d'intégration SMS |
| Emails transactionnels | ✅ BON | Manque booking-related emails |
| Campagnes marketing | ❌ À FAIRE | Pas de segmentation/bulk |
| Timeline pré/post séjour | ⚠️ PARTIEL | Auto-activation/completion only |
| Préférences notifications | ✅ FAIT | Toggles basiques |

---

## Historique des modifications

| Date | Parcours | Modifications |
|------|----------|---------------|
| 28/01/2026 | Recherche | Filtre rayon géographique corrigé |
| 28/01/2026 | Recherche | Filtre devise DZD/EUR fonctionnel |
| 28/01/2026 | Recherche | Synchronisation liste/carte corrigée |
| 28/01/2026 | Voyageur | Params recherche transmis au booking |
| 28/01/2026 | Automations | Vérifié: J-7/J-3/J-1 déjà implémentés |
| 28/01/2026 | Automations | Vérifié: Deadline 24h + expiration déjà implémentés |
| 28/01/2026 | Avis | Système double-aveugle implémenté (Review model + controller) |
| 28/01/2026 | Avis | Publication simultanée quand les 2 parties ont reviewé |
| 28/01/2026 | Avis | Cron job publication auto J+14 dans bookingAutomation.js |
| 28/01/2026 | Paiement | Auto-payout J+1 après checkout (Payout model + cron) |
| 28/01/2026 | Support | FAQ/Base de connaissances (model + controller + routes) |
| 29/01/2026 | Paiement | **Escrow/Séquestre** - Modèle + service + routes admin |
| 29/01/2026 | Paiement | **Stripe** - Payment Intents + Elements + Webhooks (EUR) |
| 29/01/2026 | Paiement | Auto-release escrow J+1 checkout (cron 2h) |
| 29/01/2026 | Paiement | **Nord Express** - Service mock + CashVoucher model |
| 29/01/2026 | Paiement | Vouchers QR + expiration 48h + rappels 24h/6h |
| 29/01/2026 | Voyageur | PaymentMethodSelector (carte/espèces DZD) |
| 29/01/2026 | Voyageur | CashVoucherDisplay + StripePaymentForm frontend |
| 29/01/2026 | Admin | Routes validation manuelle vouchers cash |
| 29/01/2026 | Automations | Crons voucher: expireCashVouchers + sendVoucherReminders |
| 31/01/2026 | Paiement | **Stripe Connect** - Onboarding hôte embedded + transferts automatiques |
| 31/01/2026 | Paiement | **Remboursements** - 4 politiques Airbnb (Flexible/Moderate/Strict/SuperStrict) |
| 31/01/2026 | Paiement | Grace period 48h avec remboursement complet (incluant service fee) |
| 31/01/2026 | Paiement | Vérification complète: tous les cron jobs escrow actifs |
| 31/01/2026 | Paiement | Structure frais confirmée: 8% guest + 3% host = 11% plateforme |
| 31/01/2026 | Sécurité | **Email OTP** - Codes 6 chiffres par email avec rate limiting |
| 31/01/2026 | Sécurité | **2FA/TOTP** - Google Authenticator + backup codes style Airbnb |
| 31/01/2026 | Sécurité | QR code generation + setup flow complet (3 étapes) |
| 31/01/2026 | Sécurité | AuditLog model pour tracking actions sensibles |
| 31/01/2026 | Sécurité | Security banner suggestions pour hosts |
| 31/01/2026 | Sécurité | Dashboard sécurité avec gestion 2FA complète |
| 31/01/2026 | **Disputes** | **Système complet de disputes/litiges créé** |
| 31/01/2026 | Disputes | Backend: 6 routes API (création, liste, détails, notes, preuves, résolution) |
| 31/01/2026 | Disputes | Frontend: 3 pages complètes (guest, host, admin) avec filtres |
| 31/01/2026 | Disputes | Modal création avec upload preuves (ReportDisputeModal) |
| 31/01/2026 | Disputes | Composants: EvidenceUpload, EvidenceGallery, AddEvidenceModal |
| 31/01/2026 | Disputes | Upload preuves: max 5 fichiers (10MB), formats images/PDF/docs |
| 31/01/2026 | Disputes | Integration escrow: freeze auto via cron (2h délai) |
| 31/01/2026 | Disputes | Block auto-completion bookings si dispute ouverte |
| 31/01/2026 | Disputes | Emails automatiques: création, résolution, nouvelle note |
| 31/01/2026 | Disputes | 18 catégories raisons (10 guest + 8 host) |
| 31/01/2026 | Disputes | Thread de discussion avec notes entre parties |
| 31/01/2026 | Disputes | Résolution admin avec split funds guest/host |
| 31/01/2026 | **Disputes** | **🎉 FINALISATION COMPLÈTE - Système 95% opérationnel** |
| 31/01/2026 | Disputes | EvidenceGallery intégrée dans 3 pages (guest/host/admin) + lightbox |
| 31/01/2026 | Disputes | Freeze escrow IMMÉDIAT lors création (fix race condition critique) |
| 31/01/2026 | Disputes | Email résolution ajouté dans PATCH /resolve (manquait) |
| 31/01/2026 | Disputes | Fix host-bookings modal (ReportDisputeModal intégré, 81 lignes supprimées) |
| 31/01/2026 | **Disputes** | **Analytics & Métriques** - Dashboard complet avec 9 visualisations |
| 31/01/2026 | Disputes | Backend: GET /api/disputes/analytics (aggregation MongoDB) |
| 31/01/2026 | Disputes | Frontend: Onglets Liste/Analytics dans admin disputes page |
| 31/01/2026 | Disputes | Graphiques Recharts: Line, Pie, Bar (tendance, statut, priorité, raisons) |
| 31/01/2026 | Disputes | Métriques: taux résolution, temps moyen, guest vs host, repeat offenders |
| 31/01/2026 | **Multi-devises** | Système dual pricing - Hosts peuvent choisir DZD, EUR ou LES DEUX |
| 31/01/2026 | Multi-devises | Backend: altBasePrice, altCurrency, altCleaningFee dans Listing model |
| 31/01/2026 | Multi-devises | Backend: Prix swap automatique selon devise recherchée (listingController) |
| 31/01/2026 | Multi-devises | Frontend: Formulaire création annonce avec checkbox "offrir les deux devises" |
| 31/01/2026 | Multi-devises | PAS de conversion automatique - respect contraintes marché algérien |
| 31/01/2026 | **Modération** | **Anti-spam automatique** - Système 3 niveaux pour messages & avis |
| 31/01/2026 | Modération | Backend: ModerationRule + ModerationLog models (règles configurables + audit) |
| 31/01/2026 | Modération | Backend: moderationService avec cache 5min, 3 types vérification (keyword/pattern/behavior) |
| 31/01/2026 | Modération | Backend: 18 règles par défaut (insultes FR/AR, contacts externes, spam) |
| 31/01/2026 | Modération | Backend: Intégration dans messageController (sendMessage + updateMessage) |
| 31/01/2026 | Modération | Backend: Intégration dans reviewController (createReview + updateReview) |
| 31/01/2026 | Modération | Backend: Routes admin /api/moderation/* (14 endpoints CRUD + stats) |
| 31/01/2026 | Modération | Frontend: Dashboard admin avec 4 onglets (Logs/Rules/Flagged/Stats) |
| 31/01/2026 | Modération | Actions: block (bloque + message), flag (signale admin), allow (passe) |
| 31/01/2026 | Modération | Détection: majuscules >70%, emojis >20%, répétitions 5+, patterns regex |
| 31/01/2026 | **Optimisations** | **Seed auto règles modération** - Au démarrage serveur si table vide |
| 31/01/2026 | Optimisations | server.js: Check count + appel moderationService.seedDefaultRules() |
| 31/01/2026 | **Avis** | **Rappels automatiques J+3 et J+7** - Notifications si avis non laissé |
| 31/01/2026 | Avis | sendReviewReminders() dans bookingAutomation.js (cron quotidien 12h) |
| 31/01/2026 | Avis | Vérifie guest + host, envoie notifs avec countdown jours restants |
| 31/01/2026 | Avis | Tracking remindersSent (reviewReminder3Days/7Days pour guest/host) |
| 31/01/2026 | **Admin** | **Dashboard Tracking Commissions** - Stats complètes + export CSV |
| 31/01/2026 | Admin | Route GET /api/admin/commissions/stats (filtres date/devise/période) |
| 31/01/2026 | Admin | Aggregation MongoDB: overview, byCurrency, byPeriod, topHosts |
| 31/01/2026 | Admin | Frontend: /dashboard/admin/commissions avec 4 cards stats |
| 31/01/2026 | Admin | Graphiques Recharts: Line (évolution), Pie (par devise) |
| 31/01/2026 | Admin | Tables: Top 10 hosts, 20 dernières réservations avec breakdown |
| 31/01/2026 | Admin | Export CSV avec toutes les données de commissions |

---

## 🧪 Tests à effectuer (Fonctionnalités 28/01 + 29/01 + 31/01)

| Fonctionnalité | Testé | Notes |
|----------------|-------|-------|
| **28/01 - Avis** |  |  |
| Système double-aveugle avis | ❌ NON | Tester: guest review → host review → publication simultanée |
| Publication J+14 avis | ❌ NON | Tester: cron auto-publish après 14 jours |
| **28/01 - Paiement** |  |  |
| Auto-payout J+1 | ❌ NON | Tester: checkout → J+1 → payout généré automatiquement |
| **28/01 - Support** |  |  |
| FAQ/Base de connaissances | ❌ NON | Tester: CRUD FAQ, recherche, catégories |
| **28/01 - Recherche** |  |  |
| Filtre rayon géographique | ❌ NON | Tester: recherche avec radius 5km, 10km, 50km |
| Synchronisation liste/carte | ❌ NON | Tester: hover liste ↔ marker carte, click sync |
| Params recherche → booking | ❌ NON | Tester: dates/guests de recherche pré-remplis dans booking |
| **29/01 - Escrow** |  |  |
| Création escrow au paiement | ❌ NON | Tester: paiement confirmé → escrow créé status=held |
| Libération auto J+1 checkout | ❌ NON | Tester: checkout+24h → escrow released → payout créé |
| Gel escrow si dispute | ❌ NON | Tester: dispute ouverte → escrow frozen |
| Admin release/freeze/resolve | ❌ NON | Tester: routes admin escrow |
| **29/01 - Stripe** |  |  |
| Booking EUR → Stripe form | ❌ NON | Tester: annonce EUR → StripePaymentForm affiché |
| Payment Intent + confirmation | ❌ NON | Tester: paiement réussi → webhook → booking confirmé |
| Stripe webhook | ❌ NON | Tester: POST /api/webhooks/stripe |
| **29/01 - Nord Express** |  |  |
| Booking DZD cash → voucher | ❌ NON | Tester: choix espèces → voucher généré + QR |
| Affichage voucher + countdown | ❌ NON | Tester: CashVoucherDisplay avec temps restant |
| Rappels 24h/6h voucher | ❌ NON | Tester: cron sendVoucherReminders |
| Expiration voucher 48h | ❌ NON | Tester: cron expireCashVouchers → booking expiré |
| Validation admin manuelle | ❌ NON | Tester: PUT /api/admin/cash-vouchers/:id/validate |
| **31/01 - Disputes** |  |  |
| Création dispute guest | ❌ NON | Tester: signaler problème → modal → upload preuves → création |
| Création dispute host | ❌ NON | Tester: signaler voyageur → raisons host → upload |
| Upload preuves initial | ❌ NON | Tester: sélection 3 photos + 1 PDF → preview → submit |
| Upload preuves additionnel | ❌ NON | Tester: ajouter preuves après création |
| Thread notes | ❌ NON | Tester: guest ajoute note → host reçoit email → répond |
| Freeze escrow dispute | ❌ NON | Tester: dispute créée → escrow frozen par cron |
| Block auto-completion | ❌ NON | Tester: dispute ouverte → booking pas auto-complété |
| Résolution admin | ❌ NON | Tester: admin résout → split funds → emails envoyés |
| Affichage preuves | ❌ NON | Tester: voir photos uploadées dans modal détails |
| Filtres disputes admin | ❌ NON | Tester: filtrer par status, priorité, recherche |
| **31/01 - Analytics Disputes** |  |  |
| Endpoint analytics backend | ❌ NON | Tester: GET /api/disputes/analytics (admin auth) |
| Onglet Analytics frontend | ❌ NON | Tester: clic onglet "Analytics & Métriques" |
| Cartes statistiques | ❌ NON | Tester: affichage total, résolus, taux %, temps moyen |
| Line chart tendance 6 mois | ❌ NON | Tester: graphique disputes par mois |
| Pie chart par statut | ❌ NON | Tester: répartition open/pending/resolved/closed |
| Bar chart par priorité | ❌ NON | Tester: graphique low/medium/high/urgent |
| Bar chart top 10 raisons | ❌ NON | Tester: raisons les plus fréquentes |
| Guest vs Host stats | ❌ NON | Tester: comparaison qui signale le plus |
| Table repeat offenders | ❌ NON | Tester: liste utilisateurs 3+ disputes |
| **31/01 - 2FA** |  |  |
| Setup 2FA Google Auth | ❌ NON | Tester: scan QR → vérifier code → backup codes |
| Login avec 2FA | ❌ NON | Tester: login → demande code → vérification |
| Email OTP | ❌ NON | Tester: action sensible → code par email → validation |
| Backup codes | ❌ NON | Tester: utiliser backup code si app perdue |
| Audit logs | ❌ NON | Tester: actions sensibles loggées dans AuditLog |
| **31/01 - Multi-devises Dual Pricing** |  |  |
| Création annonce DZD seul | ❌ NON | Tester: créer annonce → choisir DZD → prix DZD |
| Création annonce EUR seul | ❌ NON | Tester: créer annonce → choisir EUR → prix EUR |
| Création annonce DZD + EUR | ❌ NON | Tester: checkbox "les deux" → prix DZD et EUR manuels |
| Recherche DZD → voir DZD | ❌ NON | Tester: chercher en DZD → voir annonces DZD uniquement |
| Recherche EUR → voir EUR | ❌ NON | Tester: chercher en EUR → voir annonces EUR uniquement |
| Annonce dual → swap prix | ❌ NON | Tester: annonce DZD+EUR → chercher EUR → voir prix EUR |
| **31/01 - Modération Anti-spam** |  |  |
| Message avec insulte FR | ❌ NON | Tester: envoyer "connard" → bloqué + message erreur |
| Message avec insulte AR | ❌ NON | Tester: envoyer "kahba" → bloqué + message erreur |
| Message avec téléphone DZ | ❌ NON | Tester: envoyer "0555123456" → bloqué + message erreur |
| Message avec email | ❌ NON | Tester: envoyer "contact@email.com" → bloqué + message |
| Message avec lien externe | ❌ NON | Tester: envoyer "https://google.com" → bloqué |
| Message avec majuscules | ❌ NON | Tester: envoyer "URGENT VITE" → flaggé (pas bloqué) |
| Avis avec contenu inapproprié | ❌ NON | Tester: créer review avec insulte → bloqué |
| Dashboard admin logs | ❌ NON | Tester: voir /dashboard/admin/moderation → logs affichés |
| Dashboard admin règles | ❌ NON | Tester: onglet Rules → CRUD, toggle enabled/disabled |
| Dashboard admin stats | ❌ NON | Tester: onglet Stats → graphiques Recharts |
| Seed règles par défaut | ❌ NON | Tester: bouton "Charger règles" → 18 règles créées |
| Review contenu flaggé | ❌ NON | Tester: admin approve/reject contenu flaggé |

---

## Fonctionnalités critiques restantes

1. ~~**Nord Express**~~ - ✅ FAIT 29/01 (mode mock, validation admin manuelle)
2. ~~**Stripe**~~ - ✅ FAIT 29/01 (Payment Intents + Elements)
3. ~~**Stripe Connect**~~ - ✅ FAIT 31/01 (onboarding hôte + transferts auto EUR)
4. ~~**Escrow/Séquestre**~~ - ✅ FAIT 29/01 (libération auto J+1)
5. ~~**Remboursements**~~ - ✅ FAIT 31/01 (4 politiques Airbnb + grace period)
6. ~~**Email OTP + 2FA**~~ - ✅ FAIT 31/01 (TOTP + backup codes + email OTP)
7. **SMS OTP** - Vérification téléphone ❌ (optionnel)
8. ~~**Système double-aveugle avis**~~ - ✅ FAIT 28/01
9. ~~**Libération fonds J+1**~~ - ✅ FAIT 28/01
10. ~~**FAQ/Base de connaissances**~~ - ✅ FAIT 28/01
11. ~~**Modération anti-spam**~~ - ✅ FAIT 31/01 (messages + avis, 18 règles, dashboard admin)
12. ~~**Support tickets email-to-ticket**~~ - ✅ FAIT 31/01 (système complet + webhook + interfaces)

---

## Fichiers créés/modifiés (29/01)

### Backend - Nouveaux fichiers
- `server/src/models/Escrow.js` - Modèle escrow
- `server/src/models/CashVoucher.js` - Modèle voucher cash
- `server/src/services/escrowService.js` - Service escrow
- `server/src/services/stripeService.js` - Service Stripe
- `server/src/services/nordExpressService.js` - Service Nord Express (mock)
- `server/src/controllers/escrowController.js` - Controller escrow
- `server/src/routes/escrow.js` - Routes escrow

### Backend - Fichiers modifiés
- `server/src/models/Booking.js` - Ajout escrow, cashVoucher, stripe fields
- `server/src/models/Payout.js` - Ajout escrow reference
- `server/src/controllers/bookingController.js` - Multi-provider + cash payment
- `server/src/controllers/webhookController.js` - Stripe + escrow integration
- `server/src/routes/webhooks.js` - Route Stripe webhook
- `server/src/routes/bookings.js` - Routes cash payment
- `server/src/routes/admin.js` - Routes admin cash vouchers
- `server/src/services/bookingAutomation.js` - Crons escrow + vouchers
- `server/server.js` - Routes escrow

### Frontend - Nouveaux fichiers
- `client/src/components/payment/StripePaymentForm.tsx`
- `client/src/components/payment/PaymentMethodSelector.tsx`
- `client/src/components/payment/CashVoucherDisplay.tsx`

### Frontend - Fichiers modifiés
- `client/src/components/booking/BookingModal.tsx` - Multi-provider support
- `client/package.json` - Stripe dependencies

---

## Fichiers créés/modifiés (31/01)

### Backend - Nouveaux fichiers
- `server/src/controllers/stripeConnectController.js` - Controller Stripe Connect hôte
- `server/src/routes/stripeConnect.js` - Routes onboarding + dashboard hôte
- `server/src/services/refundCalculator.js` - Calcul remboursements Airbnb-style

### Backend - Fichiers modifiés
- `server/src/services/stripeService.js` - Ajout createTransfer, createRefund
- `server/src/services/escrowService.js` - Integration remboursements + Stripe Connect
- `server/src/models/User.js` - Champs stripeConnect (accountId, status, etc.)
- `server/server.js` - Route /api/stripe-connect

### Frontend - Nouveaux fichiers
- `client/src/components/payment/StripeConnectOnboarding.tsx` - Onboarding hôte embedded
- `client/src/app/dashboard/host-payments/page.tsx` - Dashboard paiements hôte

---

## Fichiers créés/modifiés (31/01 - Sécurité 2FA)

### Backend - Nouveaux fichiers
- `server/src/services/emailOTPService.js` - Email OTP (codes 6 chiffres, rate limiting)
- `server/src/services/twoFactorService.js` - TOTP + backup codes (Google Authenticator)
- `server/src/models/AuditLog.js` - Tracking actions sensibles
- `server/src/middleware/require2FA.js` - Middleware protection routes
- `server/src/controllers/twoFactorController.js` - Controller 2FA (8 endpoints)
- `server/src/routes/twoFactor.js` - Routes /api/auth/2fa/*

### Backend - Fichiers modifiés
- `server/src/models/User.js` - Champs 2FA (twoFactorSecret, backupCodes)
- `server/server.js` - Route /api/auth/2fa
- `server/package.json` - Dependencies speakeasy + qrcode

### Frontend - Nouveaux fichiers
- `client/src/components/security/TwoFactorSetup.tsx` - Setup 2FA (QR + vérification)
- `client/src/components/security/TwoFactorVerify.tsx` - Modal vérification code
- `client/src/components/security/BackupCodes.tsx` - Affichage + téléchargement codes
- `client/src/components/security/SecurityBanner.tsx` - Banner suggestions hosts
- `client/src/app/dashboard/security/page.tsx` - Page dashboard sécurité

### Fonctionnalités 2FA
- ✅ Email OTP (vérification email + actions sensibles)
- ✅ TOTP 2FA (Google Authenticator, Authy compatible)
- ✅ QR code generation
- ✅ 10 backup codes avec téléchargement
- ✅ Audit logs pour actions sensibles
- ✅ Rate limiting anti-spam
- ✅ Suggestions intelligentes pour hosts
- ✅ Style Airbnb (optionnel, recommandé, pas obligatoire)

---

## Fichiers créés/modifiés (31/01 - Disputes & Litiges) 🆕

### Backend - Nouveaux fichiers
- `server/src/models/Dispute.js` - Modèle dispute (18 catégories, preuves, notes)
- `server/src/routes/disputes.js` - Routes disputes (6 endpoints)
- `server/src/services/disputeEmailService.js` - Emails automatiques disputes

### Backend - Fichiers modifiés
- `server/src/services/bookingAutomation.js` - Block auto-completion si dispute + freeze escrow
- `server/src/services/escrowService.js` - resolveDispute() pour split funds
- `server/server.js` - Route /api/disputes avec rate limiting

### Frontend - Nouveaux fichiers
- `client/src/app/dashboard/disputes/page.tsx` - Page disputes voyageurs
- `client/src/app/dashboard/host-disputes/page.tsx` - Page disputes hôtes
- `client/src/app/dashboard/admin/disputes/page.tsx` - Page admin disputes
- `client/src/components/dispute/ReportDisputeModal.tsx` - Modal création avec upload
- `client/src/components/dispute/EvidenceUpload.tsx` - Composant upload preuves
- `client/src/components/dispute/EvidenceGallery.tsx` - Composant affichage preuves
- `client/src/components/dispute/AddEvidenceModal.tsx` - Modal upload additionnel

### Frontend - Fichiers modifiés
- `client/src/app/dashboard/bookings/page.tsx` - Integration ReportDisputeModal (guests)
- `client/src/app/dashboard/host-bookings/page.tsx` - Integration ReportDisputeModal (hosts)

### Fonctionnalités Disputes
- ✅ API complète (création, liste, détails, notes, preuves, résolution)
- ✅ Upload preuves: 5 fichiers max, 10MB, formats images/PDF/docs
- ✅ Thread de discussion (notes entre parties)
- ✅ 18 catégories raisons (10 guest + 8 host)
- ✅ Freeze escrow automatique via cron
- ✅ Block auto-completion bookings
- ✅ Emails automatiques (création, résolution, nouvelle note)
- ✅ Résolution admin avec split funds
- ✅ Affichage preuves avec lightbox + téléchargement (31/01 finalisé)
- ✅ Freeze escrow immédiat + email résolution (31/01 finalisé)
- ✅ **Analytics & Métriques** (31/01 - NON TESTÉ):
  - Endpoint GET /api/disputes/analytics avec MongoDB aggregation
  - Dashboard frontend avec onglets Liste/Analytics
  - 4 cartes stats (total, résolus, taux %, temps moyen)
  - 4 graphiques Recharts (tendance, statut, priorité, raisons)
  - Comparaison Guest vs Host
  - Table repeat offenders (3+ disputes)

---

## Fichiers créés/modifiés (31/01 - Analytics Disputes & Multi-devises) 🆕

### Backend - Fichiers modifiés
- `server/src/routes/disputes.js` - Ajout endpoint GET /analytics (MongoDB aggregation)
- `server/src/models/Listing.js` - Ajout altBasePrice, altCurrency, altCleaningFee
- `server/src/controllers/listingController.js` - Logique filter + swap prix selon devise

### Frontend - Fichiers modifiés
- `client/src/app/dashboard/admin/disputes/page.tsx` - Ajout onglet Analytics + 9 visualisations
- `client/src/app/dashboard/my-listings/create/page.tsx` - Checkbox + champs dual pricing

### Fonctionnalités Analytics Disputes (NON TESTÉ)
- ✅ Backend: Aggregation MongoDB (byStatus, byPriority, topReasons, monthlyTrend, repeatOffenders)
- ✅ Frontend: Tabs navigation (Liste / Analytics & Métriques)
- ✅ Cartes stats avec gradients (total, résolus, taux %, temps moyen)
- ✅ 4 graphiques Recharts (Line, Pie, 2x Bar)
- ✅ Comparaison Guest vs Host (cartes bleue/orange)
- ✅ Table repeat offenders (utilisateurs 3+ disputes)

### Fonctionnalités Multi-devises Dual Pricing (NON TESTÉ)
- ✅ Backend: Dual pricing fields (altBasePrice, altCurrency, altCleaningFee)
- ✅ Backend: Filter $or pour chercher primary OU alt currency
- ✅ Backend: Prix swap automatique si user cherche altCurrency
- ✅ Frontend: Checkbox "Offrir les deux devises" dans formulaire création
- ✅ Frontend: Validation + champs conditionnels
- ⚠️ PAS de conversion automatique - respect marché algérien

---

## Fichiers créés/modifiés (31/01 - Modération Anti-spam) 🆕

### Backend - Nouveaux fichiers
- `server/src/models/ModerationRule.js` - Règles de modération configurables (keyword/pattern/behavior)
- `server/src/models/ModerationLog.js` - Logs d'audit pour toutes actions de modération
- `server/src/services/moderationService.js` - Service central avec cache, vérification, 18 règles par défaut
- `server/src/routes/moderation.js` - Routes admin: CRUD rules, logs, stats, flagged content (14 endpoints)

### Backend - Fichiers modifiés
- `server/src/models/Message.js` - Ajout `moderationFlags`, `moderationScore`
- `server/src/models/Review.js` - Ajout `moderationFlags`, `moderationScore`
- `server/src/controllers/messageController.js` - Intégration modération dans sendMessage + updateMessage
- `server/src/controllers/reviewController.js` - Intégration modération dans createReview + updateReview
- `server/server.js` - Route /api/moderation enregistrée

### Frontend - Nouveaux fichiers
- `client/src/app/dashboard/admin/moderation/page.tsx` - Dashboard complet avec 4 onglets

### Fonctionnalités Modération Anti-spam (NON TESTÉ)
- ✅ **Backend: Models & Service**
  - ModerationRule: règles configurables (type, catégorie, score, action, langues)
  - ModerationLog: audit complet avec reviewStatus admin
  - moderationService: cache 5min, 3 types vérification (keyword/pattern/behavior)
  - 18 règles par défaut: insultes FR/AR, contacts externes, spam patterns

- ✅ **Backend: Intégration**
  - Messages: vérification sendMessage + updateMessage
  - Reviews: vérification createReview + updateReview
  - Actions: block (refuse + message), flag (signale admin), allow (passe)

- ✅ **Backend: Routes Admin** (14 endpoints)
  - GET/POST/PUT/DELETE /api/moderation/rules - CRUD règles
  - POST /api/moderation/rules/seed - Charger 18 règles par défaut
  - GET /api/moderation/logs - Liste logs avec filtres
  - PUT /api/moderation/logs/:id/review - Approve/reject/ignore
  - GET /api/moderation/stats - Stats complètes (overview, trends, top rules)
  - GET /api/moderation/flagged/messages - Messages flaggés
  - GET /api/moderation/flagged/reviews - Avis flaggés

- ✅ **Frontend: Dashboard Admin**
  - Onglet Logs: table logs avec filtres + modal détail + actions review
  - Onglet Rules: CRUD règles, toggle enabled/disabled, seed default
  - Onglet Flagged: (placeholder pour review rapide)
  - Onglet Stats: 4 cards métriques + 4 graphiques Recharts (Pie, Line, trends, top rules)

- ✅ **Détection automatique**
  - Keywords: mots exacts avec boundaries (\b)
  - Patterns: regex pour téléphone DZ, email, URLs, WhatsApp, Facebook
  - Behaviors: majuscules >70%, emojis >20%, répétitions 5+
  - Scoring: accumulation scores → action finale (block si ≥1 rule block)

---

## Récapitulatif Paiement (31/01 - COMPLET)

### Providers
| Provider | Devise | Paiement | Remboursement | Payout hôte |
|----------|--------|----------|---------------|-------------|
| **Stripe** | EUR | ✅ Auto | ✅ Auto API | ✅ Stripe Connect |
| **SlickPay** | DZD | ✅ Auto | ⚠️ Manuel | ⚠️ Virement manuel |
| **Nord Express** | DZD | ✅ Voucher | ⚠️ Manuel | ⚠️ Virement manuel |

### Structure des frais Baytup
```
Guest paie:     Subtotal + Cleaning Fee + 8% Service Fee
Host reçoit:    Subtotal + Cleaning Fee - 3% Commission
Plateforme:     8% + 3% = 11% total
```

### Politiques de remboursement
| Politique | Délai | Remboursement |
|-----------|-------|---------------|
| Flexible | ≥24h avant | 100% |
| Moderate | ≥5 jours | 100%, <5j = 50% |
| Strict | ≥14 jours | 100%, 7-14j = 50% |
| Super Strict | ≥30 jours | 100%, 14-30j = 50% |

**Grace Period 48h:** Remboursement complet incluant le service fee si annulation dans les 48h ET check-in > 14 jours.
