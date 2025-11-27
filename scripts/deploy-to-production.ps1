# Production Deployment Script
# This script adds all environment variables to Vercel production

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Deploying to Production" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Read environment variables from .env.local
Write-Host "Reading environment variables..." -ForegroundColor Yellow
$envContent = Get-Content ".env.local" -Raw

# Extract values
$GEMINI_API_KEY = "AIzaSyAM8d5AEDVAl2m53h2xe105TiWbBxQYVd8"
$NEXT_PUBLIC_SUPABASE_URL = "https://gwpfcgibcotpymwboaei.supabase.co"
$NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cGZjZ2liY290cHltd2JvYWVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NzQ5NjgsImV4cCI6MjA3ODA1MDk2OH0.-oAQRc9mQrAefNxzEtzAqegjMcExAenrdtm8d5VYPiQ"
$SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cGZjZ2liY290cHltd2JvYWVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ3NDk2OCwiZXhwIjoyMDc4MDUwOTY4fQ.oxm42SSlxUJmn0WWQRE432zdHjD3qhlck9afoLnOMiY"
$VAPI_API_KEY = "3a940cdb-7695-46a0-b393-111064d1e5f3"
$VAPI_PHONE_NUMBER_ID = "dddb9798-0efe-4773-bd26-89f48b5c8c2a"
$VAPI_WEBHOOK_TOKEN = "vapi-test-token-zoid"
$NEXT_PUBLIC_APP_URL = "https://zoiddd.vercel.app"

# Read base64 credentials
$GOOGLE_APPLICATION_CREDENTIALS_BASE64 = Get-Content "google-cloud-credentials-base64.txt" -Raw

Write-Host "✓ Environment variables loaded" -ForegroundColor Green
Write-Host ""

# Array of variables to add
$variables = @(
    @{ name = "GEMINI_API_KEY"; value = $GEMINI_API_KEY },
    @{ name = "NEXT_PUBLIC_SUPABASE_URL"; value = $NEXT_PUBLIC_SUPABASE_URL },
    @{ name = "NEXT_PUBLIC_SUPABASE_ANON_KEY"; value = $NEXT_PUBLIC_SUPABASE_ANON_KEY },
    @{ name = "SUPABASE_SERVICE_ROLE_KEY"; value = $SUPABASE_SERVICE_ROLE_KEY },
    @{ name = "VAPI_API_KEY"; value = $VAPI_API_KEY },
    @{ name = "VAPI_PHONE_NUMBER_ID"; value = $VAPI_PHONE_NUMBER_ID },
    @{ name = "VAPI_WEBHOOK_TOKEN"; value = $VAPI_WEBHOOK_TOKEN },
    @{ name = "GOOGLE_APPLICATION_CREDENTIALS_BASE64"; value = $GOOGLE_APPLICATION_CREDENTIALS_BASE64 },
    @{ name = "NEXT_PUBLIC_APP_URL"; value = $NEXT_PUBLIC_APP_URL }
)

Write-Host "Adding environment variables to production..." -ForegroundColor Yellow
Write-Host ""

# Add each variable to production
$count = 0
foreach ($var in $variables) {
    $count++
    Write-Host "[$count/9] Adding $($var.name)..." -ForegroundColor Cyan
    
    # Use echo to pipe the value (non-interactive)
    Write-Host $var.value | vercel env add $($var.name) production --yes 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $($var.name) added successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to add $($var.name)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Environment variables set!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
