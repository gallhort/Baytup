@echo off
REM ========================================================================
REM  BAYTUP - Installation Automatique des Correctifs BQ-40, BQ-48, BQ-9/10
REM  
REM  Ce script installe automatiquement les 3 correctifs critiques :
REM  - BQ-40 : Listing cards cliquables
REM  - BQ-48 : Admin Dashboard navigation
REM  - BQ-9/10 : Erreurs Geo Index
REM
REM  Usage : Double-cliquer sur ce fichier ou executer depuis cmd
REM ========================================================================

echo.
echo ========================================================================
echo   BAYTUP - Installation Automatique des Correctifs Critiques
echo ========================================================================
echo.

REM Vérifier qu'on est dans le bon répertoire
if not exist "client\src" (
    echo [ERREUR] Ce script doit etre execute depuis le dossier racine baytup
    echo          Repertoire actuel : %CD%
    echo          Attendu : C:\xampp\htdocs\baytup
    echo.
    pause
    exit /b 1
)

echo [INFO] Repertoire de travail : %CD%
echo.

REM ========================================================================
REM  ETAPE 1 : BACKUPS
REM ========================================================================
echo ========================================================================
echo  ETAPE 1/5 : Creation des backups
echo ========================================================================
echo.

set BACKUP_DIR=backups\%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set BACKUP_DIR=%BACKUP_DIR: =0%

echo [INFO] Creation du dossier backup : %BACKUP_DIR%
mkdir "%BACKUP_DIR%" 2>nul

echo [INFO] Backup des fichiers originaux...

REM Backup frontend
if exist "client\src\components\search\SearchResults.tsx" (
    copy /Y "client\src\components\search\SearchResults.tsx" "%BACKUP_DIR%\SearchResults.tsx.backup" >nul
    echo   [OK] SearchResults.tsx
) else (
    echo   [WARN] SearchResults.tsx non trouve
)

if exist "client\src\app\listing\[id]\page.tsx" (
    copy /Y "client\src\app\listing\[id]\page.tsx" "%BACKUP_DIR%\listing-detail-page.tsx.backup" >nul
    echo   [OK] listing-detail-page.tsx
) else (
    echo   [WARN] listing-detail-page.tsx non trouve
)

if exist "client\src\app\dashboard\bookings\page.tsx" (
    copy /Y "client\src\app\dashboard\bookings\page.tsx" "%BACKUP_DIR%\bookings-page.tsx.backup" >nul
    echo   [OK] bookings-page.tsx
) else (
    echo   [WARN] bookings-page.tsx non trouve
)

REM Backup backend
if exist "server\src\models\Listing.js" (
    copy /Y "server\src\models\Listing.js" "%BACKUP_DIR%\Listing.js.backup" >nul
    echo   [OK] Listing.js
) else (
    echo   [WARN] Listing.js non trouve
)

echo.
echo [INFO] Backups crees dans : %BACKUP_DIR%
echo.

REM ========================================================================
REM  ETAPE 2 : VERIFICATION DES FICHIERS DE CORRECTION
REM ========================================================================
echo ========================================================================
echo  ETAPE 2/5 : Verification des fichiers de correction
echo ========================================================================
echo.

set MISSING_FILES=0

if not exist "outputs\SearchResults-FIXED-BQ40.tsx" (
    echo   [ERREUR] SearchResults-FIXED-BQ40.tsx manquant
    set MISSING_FILES=1
)

if not exist "outputs\listing-detail-page-FIXED-BQ40.tsx" (
    echo   [ERREUR] listing-detail-page-FIXED-BQ40.tsx manquant
    set MISSING_FILES=1
)

if not exist "outputs\bookings-page-FIXED-BQ48.tsx" (
    echo   [ERREUR] bookings-page-FIXED-BQ48.tsx manquant
    set MISSING_FILES=1
)

if not exist "outputs\Listing-FIXED-BQ09-10.js" (
    echo   [ERREUR] Listing-FIXED-BQ09-10.js manquant
    set MISSING_FILES=1
)

if not exist "outputs\fix-geo-index.js" (
    echo   [ERREUR] fix-geo-index.js manquant
    set MISSING_FILES=1
)

if %MISSING_FILES%==1 (
    echo.
    echo [ERREUR] Fichiers de correction manquants dans le dossier outputs/
    echo          Assurez-vous d'avoir tous les fichiers corriges
    echo.
    pause
    exit /b 1
)

echo   [OK] Tous les fichiers de correction sont presents
echo.

REM ========================================================================
REM  ETAPE 3 : INSTALLATION DES CORRECTIFS FRONTEND
REM ========================================================================
echo ========================================================================
echo  ETAPE 3/5 : Installation des correctifs FRONTEND
echo ========================================================================
echo.

echo [INFO] Installation BQ-40 : Listing cards cliquables...
copy /Y "outputs\SearchResults-FIXED-BQ40.tsx" "client\src\components\search\SearchResults.tsx" >nul
if errorlevel 1 (
    echo   [ERREUR] Echec copie SearchResults.tsx
    goto :error
)
echo   [OK] SearchResults.tsx installe

copy /Y "outputs\listing-detail-page-FIXED-BQ40.tsx" "client\src\app\listing\[id]\page.tsx" >nul
if errorlevel 1 (
    echo   [ERREUR] Echec copie listing-detail-page.tsx
    goto :error
)
echo   [OK] listing-detail-page.tsx installe

echo.
echo [INFO] Installation BQ-48 : Admin Dashboard navigation...
copy /Y "outputs\bookings-page-FIXED-BQ48.tsx" "client\src\app\dashboard\bookings\page.tsx" >nul
if errorlevel 1 (
    echo   [ERREUR] Echec copie bookings-page.tsx
    goto :error
)
echo   [OK] bookings-page.tsx installe

echo.

REM ========================================================================
REM  ETAPE 4 : INSTALLATION DES CORRECTIFS BACKEND
REM ========================================================================
echo ========================================================================
echo  ETAPE 4/5 : Installation des correctifs BACKEND
echo ========================================================================
echo.

echo [INFO] Installation BQ-9/10 : Erreurs Geo Index...
copy /Y "outputs\Listing-FIXED-BQ09-10.js" "server\src\models\Listing.js" >nul
if errorlevel 1 (
    echo   [ERREUR] Echec copie Listing.js
    goto :error
)
echo   [OK] Listing.js installe

REM Creer dossier scripts si inexistant
if not exist "server\scripts" (
    mkdir "server\scripts"
    echo   [INFO] Dossier server\scripts cree
)

copy /Y "outputs\fix-geo-index.js" "server\scripts\fix-geo-index.js" >nul
if errorlevel 1 (
    echo   [ERREUR] Echec copie fix-geo-index.js
    goto :error
)
echo   [OK] fix-geo-index.js installe

echo.

REM ========================================================================
REM  ETAPE 5 : MIGRATION BASE DE DONNEES
REM ========================================================================
echo ========================================================================
echo  ETAPE 5/5 : Migration de la base de donnees (BQ-9/10)
echo ========================================================================
echo.

echo [INFO] Execution du script de migration MongoDB...
echo        Ceci va corriger l'index geospatial
echo.

cd server

REM Verifier si Node.js est disponible
where node >nul 2>&1
if errorlevel 1 (
    echo   [ERREUR] Node.js n'est pas installe ou pas dans le PATH
    echo            Veuillez executer manuellement : node scripts\fix-geo-index.js
    cd ..
    goto :skip_migration
)

REM Executer la migration
node scripts\fix-geo-index.js
if errorlevel 1 (
    echo.
    echo   [ERREUR] La migration a echoue
    echo            Verifiez que MongoDB est demarre
    echo            Vous pouvez reessayer avec : node server\scripts\fix-geo-index.js
    cd ..
    goto :skip_migration
)

echo.
echo   [OK] Migration completee avec succes

cd ..

:skip_migration

echo.

REM ========================================================================
REM  SUCCES !
REM ========================================================================
echo ========================================================================
echo   INSTALLATION COMPLETEE AVEC SUCCES !
echo ========================================================================
echo.
echo [OK] Les 3 correctifs critiques ont ete installes :
echo      - BQ-40 : Listing cards cliquables
echo      - BQ-48 : Admin Dashboard navigation
echo      - BQ-9/10 : Erreurs Geo Index resolues
echo.
echo [INFO] Backups sauvegardes dans : %BACKUP_DIR%
echo.
echo ========================================================================
echo   PROCHAINES ETAPES :
echo ========================================================================
echo.
echo 1. Redemarrer le serveur FRONTEND :
echo    ^> cd client
echo    ^> npm run dev
echo.
echo 2. Redemarrer le serveur BACKEND :
echo    ^> cd server
echo    ^> npm start
echo.
echo 3. Tester les corrections :
echo    - Cliquer sur une carte de listing (BQ-40)
echo    - Acceder a /dashboard/bookings en tant qu'admin (BQ-48)
echo    - Creer un brouillon sans localisation (BQ-9/10)
echo.
echo ========================================================================
echo.
pause
exit /b 0

:error
echo.
echo ========================================================================
echo   ERREUR DURANT L'INSTALLATION
echo ========================================================================
echo.
echo [ERREUR] L'installation a echoue
echo.
echo Vous pouvez restaurer les fichiers originaux depuis :
echo %BACKUP_DIR%
echo.
echo Ou consulter les guides d'installation manuels :
echo - outputs\INSTALL_BQ40.md
echo - outputs\INSTALL_BQ48.md
echo - outputs\INSTALL_BQ09-10.md
echo.
pause
exit /b 1
