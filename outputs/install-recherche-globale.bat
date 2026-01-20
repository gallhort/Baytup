@echo off
:: ========================================
:: Installation Recherche Globale
:: Backend + Frontend
:: ========================================

echo.
echo ========================================
echo  Installation Recherche Globale
echo ========================================
echo.

:: Get script directory and move to project root
set SCRIPT_DIR=%~dp0

if exist "%SCRIPT_DIR%client\" (
    cd /d "%SCRIPT_DIR%"
) else if exist "%SCRIPT_DIR%..\client\" (
    cd /d "%SCRIPT_DIR%.."
) else (
    echo [ERREUR] Impossible de trouver la racine du projet
    pause
    exit /b 1
)

echo [INFO] Installation de la recherche globale...
echo.

:: ========================================
:: PARTIE 1 - BACKEND
:: ========================================
echo ========================================
echo Partie 1/2 : Mise a jour Backend
echo ========================================
echo.

:: Backup backend controller
if exist "server\src\controllers\listingController.js" (
    copy "server\src\controllers\listingController.js" "server\src\controllers\listingController.js.backup-no-search" >nul
    echo [OK] Backup backend cree
) else (
    echo [ERREUR] listingController.js introuvable
    pause
    exit /b 1
)

:: Copy new backend with search
if exist "outputs\listingController-WITH-SEARCH.js" (
    copy "outputs\listingController-WITH-SEARCH.js" "server\src\controllers\listingController.js" >nul
    echo [OK] Backend mis a jour (recherche globale ajoutee)
) else (
    echo [ERREUR] listingController-WITH-SEARCH.js introuvable dans outputs
    pause
    exit /b 1
)

echo.

:: ========================================
:: PARTIE 2 - FRONTEND
:: ========================================
echo ========================================
echo Partie 2/2 : Mise a jour Frontend
echo ========================================
echo.

:: Backup frontend page (may already exist)
if exist "client\src\app\dashboard\my-listings\page.tsx" (
    if not exist "client\src\app\dashboard\my-listings\page.tsx.backup-no-search" (
        copy "client\src\app\dashboard\my-listings\page.tsx" "client\src\app\dashboard\my-listings\page.tsx.backup-no-search" >nul
        echo [OK] Backup frontend cree
    ) else (
        echo [INFO] Backup frontend existe deja
    )
)

:: Copy new frontend with server search
if exist "outputs\my-listings-page-FINAL-WITH-SERVER-SEARCH.tsx" (
    copy "outputs\my-listings-page-FINAL-WITH-SERVER-SEARCH.tsx" "client\src\app\dashboard\my-listings\page.tsx" >nul
    echo [OK] Frontend mis a jour (recherche serveur)
) else (
    echo [ERREUR] my-listings-page-FINAL-WITH-SERVER-SEARCH.tsx introuvable
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Installation Terminee !
echo ========================================
echo.
echo Changements:
echo   [BACKEND]
echo   - Ajout parametre 'search' dans getMyListings
echo   - Recherche dans : titre, description, ville, rue
echo   - Insensible a la casse (regex)
echo.
echo   [FRONTEND]
echo   - Envoi du searchTerm au serveur
echo   - Reset automatique a la page 1
echo   - Recherche dans TOUS les listings
echo.
echo Fonctionnalites:
echo   [OK] Recherche globale (tous les listings)
echo   [OK] Trouve les listings en page 2, 3, etc.
echo   [OK] Reset page 1 lors de recherche
echo   [OK] Pagination des resultats de recherche
echo.
echo Prochaines Etapes:
echo.
echo   1. Redemarrer le BACKEND :
echo      cd server
echo      npm start
echo.
echo   2. Redemarrer le FRONTEND :
echo      cd client
echo      npm run dev
echo.
echo   3. Tester la recherche :
echo      - Aller sur /dashboard/my-listings
echo      - Taper "F3" dans la recherche
echo      - Verifier que ca trouve partout
echo.
echo   4. Restaurer (si probleme) :
echo      Backend:
echo        copy server\src\controllers\listingController.js.backup-no-search server\src\controllers\listingController.js
echo.
echo      Frontend:
echo        copy client\src\app\dashboard\my-listings\page.tsx.backup-no-search client\src\app\dashboard\my-listings\page.tsx
echo.
echo IMPORTANT: Il faut redemarrer LES DEUX serveurs !
echo.
pause
