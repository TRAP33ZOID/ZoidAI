# Script to add environment variables to Vercel Preview environment
# Reads from .env.local and adds to Vercel

param(
    [string]$Environment = "preview"
)

Write-Host "Adding environment variables to Vercel ($Environment environment)..." -ForegroundColor Cyan
Write-Host ""

# Read .env.local
$envFile = ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "Error: .env.local not found!" -ForegroundColor Red
    exit 1
}

# Read base64 credentials
$base64File = "google-cloud-credentials-base64.txt"
if (-not (Test-Path $base64File)) {
    Write-Host "Warning: google-cloud-credentials-base64.txt not found!" -ForegroundColor Yellow
}

$base64Credentials = if (Test-Path $base64File) {
    Get-Content $base64File -Raw
} else {
    ""
}

# Parse .env.local
$envVars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([A-Z_]+)\s*=\s*"?([^"]+)"?$') {
        $key = $matches[1]
        $value = $matches[2]
        $envVars[$key] = $value
    }
}

# Variables to add (in order)
$varsToAdd = @(
    @{Name = "GEMINI_API_KEY"; Value = $envVars["GEMINI_API_KEY"]},
    @{Name = "NEXT_PUBLIC_SUPABASE_URL"; Value = $envVars["NEXT_PUBLIC_SUPABASE_URL"]},
    @{Name = "NEXT_PUBLIC_SUPABASE_ANON_KEY"; Value = $envVars["NEXT_PUBLIC_SUPABASE_ANON_KEY"]},
    @{Name = "SUPABASE_SERVICE_ROLE_KEY"; Value = $envVars["SUPABASE_SERVICE_ROLE_KEY"]},
    @{Name = "VAPI_API_KEY"; Value = $envVars["VAPI_API_KEY"]},
    @{Name = "VAPI_WEBHOOK_TOKEN"; Value = $envVars["VAPI_WEBHOOK_TOKEN"]},
    @{Name = "GOOGLE_APPLICATION_CREDENTIALS_BASE64"; Value = $base64Credentials.Trim()},
    @{Name = "NEXT_PUBLIC_APP_URL"; Value = "https://zoiddd-8nqvic8bj-waahmed-4677s-projects.vercel.app"},
    @{Name = "NODE_ENV"; Value = "production"}
)

# Add VAPI_PHONE_NUMBER_ID if it exists
if ($envVars.ContainsKey("VAPI_PHONE_NUMBER_ID")) {
    $varsToAdd += @{Name = "VAPI_PHONE_NUMBER_ID"; Value = $envVars["VAPI_PHONE_NUMBER_ID"]}
}

Write-Host "Found the following variables to add:" -ForegroundColor Green
foreach ($var in $varsToAdd) {
    $displayValue = if ($var.Value.Length -gt 50) {
        $var.Value.Substring(0, 50) + "..."
    } else {
        $var.Value
    }
    Write-Host "  - $($var.Name) = $displayValue" -ForegroundColor Gray
}
Write-Host ""

# Add each variable
foreach ($var in $varsToAdd) {
    if ([string]::IsNullOrWhiteSpace($var.Value)) {
        Write-Host "Skipping $($var.Name) - value is empty" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "Adding $($var.Name)..." -ForegroundColor Cyan
    
    # Use vercel env add with value piped
    $value = $var.Value
    $envType = if ($Environment -eq "preview") { "preview" } elseif ($Environment -eq "production") { "production" } else { "development" }
    
    # Vercel CLI command - this will be interactive
    # We'll use echo to pipe the value
    $value | vercel env add $var.Name $envType
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Added $($var.Name)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Failed to add $($var.Name)" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "Done! All environment variables added." -ForegroundColor Green

