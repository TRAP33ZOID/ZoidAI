# Fix Supabase Service Role Key in Vercel Production
# This script properly sets the SUPABASE_SERVICE_ROLE_KEY without encoding issues

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Fixing Supabase Service Role Key" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Get the correct key from the deployment script
$SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cGZjZ2liY290cHltd2JvYWVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ3NDk2OCwiZXhwIjoyMDc4MDUwOTY4fQ.oxm42SSlxUJmn0WWQRE432zdHjD3qhlck9afoLnOMiY"

Write-Host "Step 1: Removing old SUPABASE_SERVICE_ROLE_KEY..." -ForegroundColor Yellow
vercel env rm SUPABASE_SERVICE_ROLE_KEY production --yes

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Old key removed" -ForegroundColor Green
} else {
    Write-Host "⚠ Key may not have existed (this is OK)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 2: Adding correct SUPABASE_SERVICE_ROLE_KEY..." -ForegroundColor Yellow

# Use echo (Write-Output) to properly pipe the value
# This ensures no extra characters are added
$SUPABASE_SERVICE_ROLE_KEY | vercel env add SUPABASE_SERVICE_ROLE_KEY production

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host "✓ Key added successfully!" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Redeploy to production: vercel --prod" -ForegroundColor White
    Write-Host "2. Check health endpoint: https://zoiddd.vercel.app/api/health" -ForegroundColor White
    Write-Host "3. Verify Supabase connection is working" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Failed to add key. Please try manually:" -ForegroundColor Red
    Write-Host "1. Go to Vercel Dashboard → Settings → Environment Variables" -ForegroundColor White
    Write-Host "2. Remove SUPABASE_SERVICE_ROLE_KEY if it exists" -ForegroundColor White
    Write-Host "3. Add new SUPABASE_SERVICE_ROLE_KEY with the value:" -ForegroundColor White
    Write-Host $SUPABASE_SERVICE_ROLE_KEY -ForegroundColor Gray
}

