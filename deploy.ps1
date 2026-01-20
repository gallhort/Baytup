# Script de déploiement Baytup - Production VPS
# Usage: .\deploy.ps1

$VPS_IP = "212.227.96.59"
$VPS_USER = "root"
$VPS_PASSWORD = "n4OKwuNQ"

Write-Host "🚀 Déploiement de Baytup sur le VPS de production..." -ForegroundColor Green
Write-Host ""

# Créer un script SSH temporaire
$sshCommands = @"
cd /var/www/html
echo "📦 Stashing local changes..."
git stash
echo "⬇️  Pulling latest changes from GitHub..."
git pull origin master
echo "📦 Installing server dependencies..."
cd server
npm install
echo "🔄 Restarting server..."
pm2 restart baytup-server
echo "📦 Installing client dependencies..."
cd ../client
npm install
echo "🏗️  Building client..."
npm run build
echo "🔄 Restarting client..."
pm2 restart baytup-client
echo "✅ Deployment complete!"
pm2 status
"@

# Sauvegarder les commandes dans un fichier temporaire
$tempFile = [System.IO.Path]::GetTempFileName()
$sshCommands | Out-File -FilePath $tempFile -Encoding ASCII

Write-Host "Exécution des commandes de déploiement..." -ForegroundColor Yellow
Write-Host ""

# Note: Vous devrez entrer le mot de passe manuellement
# Pour automatiser complètement, utilisez une clé SSH
ssh "$VPS_USER@$VPS_IP" "bash -s" < $tempFile

# Nettoyer
Remove-Item $tempFile

Write-Host ""
Write-Host "✨ Déploiement terminé! Vérifiez https://baytup.fr" -ForegroundColor Green
