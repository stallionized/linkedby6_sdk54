@echo off
echo ========================================
echo Deploying Edge Functions to Supabase
echo ========================================
echo.

cd /d "c:\linkby6mobile_prod"

REM Load environment variables from .env file
if exist .env (
    for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
        if not "%%a"=="" if not "%%a:~0,1%"=="#" set "%%a=%%b"
    )
)

if "%OPENAI_API_KEY%"=="" (
    echo ERROR: OPENAI_API_KEY not found in .env file
    echo Please create a .env file with OPENAI_API_KEY=your_key_here
    pause
    exit /b 1
)

echo Step 1: Setting OpenAI API Key from .env file...
supabase secrets set OPENAI_API_KEY=%OPENAI_API_KEY%

if %errorlevel% neq 0 (
    echo ERROR: Failed to set OpenAI API key
    pause
    exit /b 1
)

echo.
echo Step 2: Deploying chat_search function...
supabase functions deploy chat_search

if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy chat_search
    pause
    exit /b 1
)

echo.
echo Step 3: Deploying generate_embeddings function...
supabase functions deploy generate_embeddings

if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy generate_embeddings
    pause
    exit /b 1
)

echo.
echo Step 4: Deploying business_profile_interview function...
supabase functions deploy business_profile_interview

if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy business_profile_interview
    pause
    exit /b 1
)

echo.
echo Step 5: Deploying generate_business_description function...
supabase functions deploy generate_business_description

if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy generate_business_description
    pause
    exit /b 1
)

echo.
echo Step 6: Deploying enrich_business_profile function...
supabase functions deploy enrich_business_profile

if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy enrich_business_profile
    pause
    exit /b 1
)

echo.
echo Step 7: Verifying deployment...
supabase functions list

echo.
echo ========================================
echo SUCCESS! Edge Functions Deployed
echo ========================================
echo.
echo Next step: Generate embeddings for your businesses
echo Run: cd scripts ^&^& node generate-all-embeddings.js
echo.
pause
