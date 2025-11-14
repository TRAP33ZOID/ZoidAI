# PowerShell Test Script for Call Logging API
# Usage: .\scripts\test-api.ps1

$BASE_URL = if ($env:NEXT_PUBLIC_APP_URL) { $env:NEXT_PUBLIC_APP_URL } else { "http://localhost:3000" }
$CALL_ID = "test-call-$(Get-Date -Format 'yyyyMMddHHmmss')"
$PHONE_NUMBER = "+1234567890"

Write-Host "🧪 Testing Call Logging API" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Base URL: $BASE_URL"
Write-Host "Test Call ID: $CALL_ID"
Write-Host ""

# Test 1: Simulate call started
Write-Host "📞 Test 1: Simulating call started..." -ForegroundColor Yellow
$body1 = @{
    type = "call-started"
    call = @{
        id = $CALL_ID
        from = $PHONE_NUMBER
        status = "queued"
        startedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        language = "en-US"
    }
} | ConvertTo-Json -Depth 10

try {
    $response1 = Invoke-RestMethod -Uri "$BASE_URL/api/vapi-webhook" -Method Post -Body $body1 -ContentType "application/json"
    Write-Host "✅ Success: $($response1 | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
Start-Sleep -Seconds 1

# Test 2: Simulate status update
Write-Host "`n📞 Test 2: Simulating status update (in-progress)..." -ForegroundColor Yellow
$body2 = @{
    type = "status-update"
    call = @{
        id = $CALL_ID
        call_id = $CALL_ID
        from = $PHONE_NUMBER
        status = "in-progress"
        startedAt = (Get-Date).AddSeconds(-5).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
} | ConvertTo-Json -Depth 10

try {
    $response2 = Invoke-RestMethod -Uri "$BASE_URL/api/vapi-webhook" -Method Post -Body $body2 -ContentType "application/json"
    Write-Host "✅ Success: $($response2 | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
Start-Sleep -Seconds 1

# Test 3: Simulate transcript update
Write-Host "`n📞 Test 3: Simulating transcript update..." -ForegroundColor Yellow
$body3 = @{
    type = "transcript"
    call_id = $CALL_ID
    transcript = "Hello, I need help with my order."
} | ConvertTo-Json -Depth 10

try {
    $response3 = Invoke-RestMethod -Uri "$BASE_URL/api/vapi-webhook" -Method Post -Body $body3 -ContentType "application/json"
    Write-Host "✅ Success: $($response3 | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
Start-Sleep -Seconds 1

# Test 4: Simulate call ended
Write-Host "`n📞 Test 4: Simulating call ended..." -ForegroundColor Yellow
$startedAt = (Get-Date).AddSeconds(-30).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$endedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

$body4 = @{
    type = "end-of-call-report"
    call = @{
        id = $CALL_ID
        call_id = $CALL_ID
        from = $PHONE_NUMBER
        status = "ended"
        startedAt = $startedAt
        endedAt = $endedAt
        transcript = "Hello, I need help with my order.`nSure, I can help you with that. What's your order number?`nIt's 12345.`nThank you, I've found your order."
        summary = @{
            transcript = "Full conversation transcript"
        }
        cost = 0.05
    }
} | ConvertTo-Json -Depth 10

try {
    $response4 = Invoke-RestMethod -Uri "$BASE_URL/api/vapi-webhook" -Method Post -Body $body4 -ContentType "application/json"
    Write-Host "✅ Success: $($response4 | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
Start-Sleep -Seconds 2

# Test 5: Get specific call log
Write-Host "`n📋 Test 5: Fetching call log for $CALL_ID..." -ForegroundColor Yellow
try {
    $callLog = Invoke-RestMethod -Uri "$BASE_URL/api/calls?callId=$CALL_ID" -Method Get
    Write-Host "✅ Call Log Found:" -ForegroundColor Green
    Write-Host ($callLog | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# Test 6: Get recent calls
Write-Host "`n📋 Test 6: Fetching recent calls..." -ForegroundColor Yellow
try {
    $recentCalls = Invoke-RestMethod -Uri "$BASE_URL/api/calls?limit=5" -Method Get
    Write-Host "✅ Recent Calls:" -ForegroundColor Green
    Write-Host ($recentCalls | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# Test 7: Get statistics
Write-Host "`n📊 Test 7: Fetching call statistics..." -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "$BASE_URL/api/calls?stats=true" -Method Get
    Write-Host "✅ Statistics:" -ForegroundColor Green
    Write-Host ($stats | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "✅ Tests completed!" -ForegroundColor Green
Write-Host "Test Call ID: $CALL_ID"
Write-Host ""

