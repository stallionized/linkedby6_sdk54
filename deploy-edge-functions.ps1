# PowerShell script to deploy Edge Functions to Supabase
# Run this as Administrator if you get permission errors

Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "Deploying Edge Functions to Supabase"  -ForegroundColor Cyan
Write-Host "========================================`n"  -ForegroundColor Cyan

# Change to project directory
Set-Location "c:\linkby6mobile_prod"

# Load environment variables from .env file
$envFile = ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$key" -Value $value
        }
    }
} else {
    Write-Host "`nERROR: .env file not found" -ForegroundColor Red
    Write-Host "Please create a .env file with OPENAI_API_KEY=your_key_here" -ForegroundColor Yellow
    pause
    exit 1
}

if (-not $env:OPENAI_API_KEY) {
    Write-Host "`nERROR: OPENAI_API_KEY not found in .env file" -ForegroundColor Red
    Write-Host "Please add OPENAI_API_KEY=your_key_here to your .env file" -ForegroundColor Yellow
    pause
    exit 1
}

# Step 1: Set OpenAI API Key
Write-Host "Step 1: Setting OpenAI API Key from .env file..." -ForegroundColor Yellow
npx supabase secrets set OPENAI_API_KEY=$env:OPENAI_API_KEY

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nERROR: Failed to set OpenAI API key" -ForegroundColor Red
    Write-Host "Make sure you're logged in: npx supabase login" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "✓ API key set successfully`n" -ForegroundColor Green

# Step 2: Deploy chat_search function
Write-Host "Step 2: Deploying chat_search function..." -ForegroundColor Yellow
npx supabase functions deploy chat_search

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nERROR: Failed to deploy chat_search" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "✓ chat_search deployed successfully`n" -ForegroundColor Green

# Step 3: Deploy generate_embeddings function
Write-Host "Step 3: Deploying generate_embeddings function..." -ForegroundColor Yellow
npx supabase functions deploy generate_embeddings

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nERROR: Failed to deploy generate_embeddings" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "✓ generate_embeddings deployed successfully`n" -ForegroundColor Green

# Step 4: Verify deployment
Write-Host "Step 4: Verifying deployment..." -ForegroundColor Yellow
npx supabase functions list

Write-Host "`n========================================"  -ForegroundColor Green
Write-Host "SUCCESS! Edge Functions Deployed"  -ForegroundColor Green
Write-Host "========================================`n"  -ForegroundColor Green

Write-Host "Next step: Generate embeddings for your businesses" -ForegroundColor Cyan
Write-Host "Run: cd scripts; npm install; node generate-all-embeddings.js`n" -ForegroundColor Yellow

pause
