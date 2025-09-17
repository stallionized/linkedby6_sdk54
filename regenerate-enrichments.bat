@echo off
echo ========================================
echo Regenerate Enriched Embeddings
echo ========================================
echo.
echo This script will:
echo 1. Fetch all active business profiles
echo 2. Trigger AI enrichment for each profile
echo 3. Generate fresh semantic variations
echo 4. Update vector embeddings
echo.
echo Note: This may take several minutes depending on
echo the number of profiles. Each profile takes ~5-8s.
echo.
pause

cd /d "c:\linkby6mobile_sdk54\scripts"

echo.
echo Checking dependencies...
call npm install

if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ========================================
echo Starting Enrichment Process...
echo ========================================
echo.

call npm run regenerate-enrichments

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo ERROR: Enrichment process failed
    echo ========================================
    echo.
    echo Common issues:
    echo - Missing SUPABASE_URL in .env file
    echo - Missing SUPABASE_SERVICE_ROLE_KEY in .env
    echo - Edge Functions not deployed
    echo - OpenAI API key not set in Supabase
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! All profiles enriched
echo ========================================
echo.
pause
