# Phase 8 Deployment Preparation Script
# Converts Google Cloud credentials JSON to base64 for Vercel environment variable

Write-Host "Phase 8 Deployment Preparation" -ForegroundColor Cyan
Write-Host ""

# Check if credentials file exists
$credentialsPath = Join-Path $PSScriptRoot "..\lib\google-cloud-key.json"
$credentialsPath = Resolve-Path $credentialsPath -ErrorAction SilentlyContinue

if (-not $credentialsPath) {
    Write-Host "Error: Google Cloud credentials file not found!" -ForegroundColor Red
    Write-Host "   Expected location: lib\google-cloud-key.json" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please ensure the credentials file exists before running this script." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found credentials file: $credentialsPath" -ForegroundColor Green
Write-Host ""

try {
    # Read the JSON file
    Write-Host "Reading credentials file..." -ForegroundColor Cyan
    $content = Get-Content -Path $credentialsPath -Raw -Encoding UTF8
    
    if ([string]::IsNullOrWhiteSpace($content)) {
        throw "Credentials file is empty"
    }
    
    # Validate it's valid JSON
    Write-Host "Validating JSON format..." -ForegroundColor Cyan
    $json = $content | ConvertFrom-Json
    Write-Host "JSON is valid" -ForegroundColor Green
    Write-Host ""
    
    # Convert to base64
    Write-Host "Converting to base64..." -ForegroundColor Cyan
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
    $base64 = [Convert]::ToBase64String($bytes)
    
    # Save to file
    $outputPath = Join-Path $PSScriptRoot "..\google-cloud-credentials-base64.txt"
    $base64 | Out-File -FilePath $outputPath -Encoding UTF8 -NoNewline
    
    Write-Host "Base64 conversion complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Copy the base64 string from: google-cloud-credentials-base64.txt" -ForegroundColor Yellow
    Write-Host "   2. Go to Vercel Dashboard > Your Project > Settings > Environment Variables" -ForegroundColor Yellow
    Write-Host "   3. Add variable: GOOGLE_APPLICATION_CREDENTIALS_BASE64" -ForegroundColor Yellow
    Write-Host "   4. Paste the base64 string as the value" -ForegroundColor Yellow
    Write-Host "   5. Select all environments (Production, Preview, Development)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Security Note: Keep the base64 string secure. Do not commit it to Git." -ForegroundColor Yellow
    Write-Host ""
    
    # Display first 50 characters for verification
    Write-Host "Base64 preview (first 50 chars):" -ForegroundColor Cyan
    Write-Host "   $($base64.Substring(0, [Math]::Min(50, $base64.Length)))..." -ForegroundColor Gray
    Write-Host ""
    Write-Host "Full base64 string saved to: $outputPath" -ForegroundColor Green
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "   - The credentials file is valid JSON" -ForegroundColor Yellow
    Write-Host "   - The file is not corrupted" -ForegroundColor Yellow
    Write-Host "   - You have read permissions for the file" -ForegroundColor Yellow
    exit 1
}

