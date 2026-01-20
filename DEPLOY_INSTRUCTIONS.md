# 🚀 Instructions de Déploiement - Baytup Production

## Méthode 1: Connexion SSH Manuelle (RECOMMANDÉ)

### 1. Connectez-vous au VPS
```bash
ssh root@212.227.96.59
# Password: n4OKwuNQ
```

### 2. Mettez à jour le code
```bash
cd /var/www/html
git stash                    # Sauvegarde les modifications locales
git pull origin master       # Récupère les nouveaux commits
```

### 3. Mettez à jour le SERVEUR
```bash
cd /var/www/html/server
npm install                  # Installe les dépendances
pm2 restart baytup-server    # Redémarre le serveur
```

### 4. Mettez à jour le CLIENT
```bash
cd /var/www/html/client
npm install                  # Installe les dépendances
npm run build                # Build le client Next.js
pm2 restart baytup-client    # Redémarre le client
```

### 5. Vérifiez le statut
```bash
pm2 status                   # Vérifier que tout tourne
pm2 logs baytup-client --lines 50   # Voir les logs client
pm2 logs baytup-server --lines 50   # Voir les logs serveur
```

### 6. Testez
- Visitez: https://baytup.fr
- Testez la recherche de villes avec accents
- Vérifiez les cartes Leaflet
- Testez sur mobile

---

## Méthode 2: Script PowerShell (Windows)

Exécutez depuis le dossier du projet:
```powershell
.\deploy.ps1
```

---

## Méthode 3: Commande SSH Unique (Git Bash sur Windows)

```bash
ssh root@212.227.96.59 "cd /var/www/html && git stash && git pull origin master && cd server && npm install && pm2 restart baytup-server && cd ../client && npm install && npm run build && pm2 restart baytup-client && pm2 status"
```

---

## 🔍 Dépannage

### Si PM2 n'est pas démarré:
```bash
pm2 start server/server.js --name baytup-server
pm2 start client/npm --name baytup-client -- start
pm2 save
```

### Si le build échoue:
```bash
cd /var/www/html/client
rm -rf .next node_modules
npm install
npm run build
pm2 restart baytup-client
```

### Voir les erreurs:
```bash
pm2 logs baytup-client --err --lines 100
pm2 logs baytup-server --err --lines 100
```

---

## 📊 Changements Déployés (9 commits)

✅ Migration Google Maps → Leaflet (économie $135/mois)
✅ Recherche insensible aux accents (bejaia trouve Béjaïa)
✅ Cards mobile style Airbnb (layout horizontal)
✅ Corrections UI mobile (z-index, popups, badges)
✅ Suppression badge redondant sur carte
✅ Suppression boutons CTA homepage (évite problèmes radius)
✅ Correction bug React hooks
✅ Portal React pour menu langue
✅ Popup Leaflet optimisé mobile

---

## ⚙️ Informations Serveur

- **IP**: 212.227.96.59
- **User**: root
- **Password**: n4OKwuNQ
- **Projet**: /var/www/html
- **Client**: /var/www/html/client (PM2: baytup-client)
- **Server**: /var/www/html/server (PM2: baytup-server)
- **Site**: https://baytup.fr

