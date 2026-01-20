@echo off
REM ========================================================================
REM  BAYTUP - CORRECTIF RAPIDE : Erreur MongoDB Geo Index
REM  
REM  Ce script corrige l'erreur :
REM  "Expression not supported in partial index: $not"
REM
REM  Usage : Double-cliquer sur ce fichier
REM ========================================================================

echo.
echo ========================================================================
echo   BAYTUP - Correctif Rapide MongoDB Geo Index
echo ========================================================================
echo.

REM Vérifier qu'on est dans le bon répertoire
if not exist "server\src\models" (
    echo [ERREUR] Ce script doit etre execute depuis le dossier racine baytup
    echo          Repertoire actuel : %CD%
    pause
    exit /b 1
)

echo [INFO] Correction de l'erreur MongoDB partialFilterExpression...
echo.

REM ========================================================================
REM  ETAPE 1 : Backup
REM ========================================================================
echo [INFO] Backup des fichiers...

if exist "server\src\models\Listing.js" (
    copy /Y "server\src\models\Listing.js" "server\src\models\Listing.js.before-fix" >nul
    echo   [OK] Listing.js sauvegarde
)

if exist "server\scripts\fix-geo-index.js" (
    copy /Y "server\scripts\fix-geo-index.js" "server\scripts\fix-geo-index.js.before-fix" >nul
    echo   [OK] fix-geo-index.js sauvegarde
)

echo.

REM ========================================================================
REM  ETAPE 2 : Installation des fichiers corriges
REM ========================================================================
echo [INFO] Installation des fichiers corriges...

if exist "outputs\Listing-FIXED-BQ09-10-V2.js" (
    copy /Y "outputs\Listing-FIXED-BQ09-10-V2.js" "server\src\models\Listing.js" >nul
    echo   [OK] Listing.js (version corrigee)
) else (
    echo   [ERREUR] Listing-FIXED-BQ09-10-V2.js introuvable dans outputs\
    pause
    exit /b 1
)

if exist "outputs\fix-geo-index.js" (
    copy /Y "outputs\fix-geo-index.js" "server\scripts\fix-geo-index.js" >nul
    echo   [OK] fix-geo-index.js (version corrigee)
) else (
    echo   [ERREUR] fix-geo-index.js introuvable dans outputs\
    pause
    exit /b 1
)

echo.

REM ========================================================================
REM  ETAPE 3 : Relancer la migration MongoDB
REM ========================================================================
echo [INFO] Relancement de la migration MongoDB...
echo.

cd server

where node >nul 2>&1
if errorlevel 1 (
    echo   [ERREUR] Node.js non trouve dans le PATH
    cd ..
    pause
    exit /b 1
)

node scripts\fix-geo-index.js
if errorlevel 1 (
    echo.
    echo   [ERREUR] La migration a encore echoue
    echo            Consultez les logs ci-dessus
    cd ..
    pause
    exit /b 1
)

cd ..

echo.
echo ========================================================================
echo   CORRECTIF APPLIQUE AVEC SUCCES !
echo ========================================================================
echo.
echo [OK] L'erreur MongoDB a ete corrigee
echo [OK] La migration s'est completee avec succes
echo.
echo [INFO] Prochaines etapes :
echo        1. Redemarrer le serveur backend : cd server ^&^& npm start
echo        2. Tester la creation de brouillons sans localisation
echo.
pause
exit /b 0
