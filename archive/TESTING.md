# 🧪 Testing Call Logging API

This guide shows you how to test the call logging system without making real phone calls.

## Prerequisites

1. **Database Setup**: Make sure you've run `supabase-setup.sql` in your Supabase SQL Editor
2. **Dev Server Running**: Start your Next.js dev server:
   ```bash
   npm run dev
   ```
3. **Environment Variables**: Ensure `.env.local` has your Supabase credentials

---

## Method 1: Using the Test Script (Recommended)

### Option A: TypeScript Script (if you have tsx installed)

```bash
# Install tsx if you don't have it
npm install --save-dev tsx

# Run the test script
npm run test:calls
```

### Option B: Bash Script (works on Linux/Mac/Git Bash)

```bash
# Make script executable
chmod +x scripts/test-api.sh

# Run the script
./scripts/test-api.sh
```

Or on Windows PowerShell:
```powershell
bash scripts/test-api.sh
```

---

## Method 2: Manual Testing with curl

### Step 1: Simulate Call Started

```bash
curl -X POST http://localhost:3000/api/vapi-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "call-started",
    "call": {
      "id": "test-call-123",
      "from": "+1234567890",
      "status": "queued",
      "startedAt": "2025-12-19T10:00:00Z",
      "language": "en-US"
    }
  }'
```

### Step 2: Simulate Status Update

```bash
curl -X POST http://localhost:3000/api/vapi-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "status-update",
    "call": {
      "id": "test-call-123",
      "call_id": "test-call-123",
      "from": "+1234567890",
      "status": "in-progress"
    }
  }'
```

### Step 3: Simulate Transcript Update

```bash
curl -X POST http://localhost:3000/api/vapi-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "transcript",
    "call_id": "test-call-123",
    "transcript": "Hello, I need help with my order."
  }'
```

### Step 4: Simulate Call Ended

```bash
curl -X POST http://localhost:3000/api/vapi-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "end-of-call-report",
    "call": {
      "id": "test-call-123",
      "call_id": "test-call-123",
      "from": "+1234567890",
      "status": "ended",
      "startedAt": "2025-12-19T10:00:00Z",
      "endedAt": "2025-12-19T10:00:30Z",
      "transcript": "Full conversation transcript here",
      "cost": 0.05
    }
  }'
```

### Step 5: Verify Call Log Was Stored

```bash
# Get specific call
curl http://localhost:3000/api/calls?callId=test-call-123

# Get recent calls
curl http://localhost:3000/api/calls?limit=10

# Get statistics
curl http://localhost:3000/api/calls?stats=true
```

---

## Method 3: Using PowerShell (Windows)

### Test Call Started

```powershell
$body = @{
    type = "call-started"
    call = @{
        id = "test-call-123"
        from = "+1234567890"
        status = "queued"
        startedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        language = "en-US"
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3000/api/vapi-webhook" -Method Post -Body $body -ContentType "application/json"
```

### Get Call Log

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/calls?callId=test-call-123" -Method Get
```

### Get Statistics

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/calls?stats=true" -Method Get
```

---

## Method 4: Direct Database Check

You can also verify logs directly in Supabase:

1. Go to your Supabase Dashboard
2. Navigate to **Table Editor**
3. Open the `call_logs` table
4. You should see your test calls there

Or run SQL query:

```sql
SELECT * FROM call_logs ORDER BY created_at DESC LIMIT 10;
```

---

## Expected Results

After running the tests, you should see:

1. **Webhook responses**: `{"success": true, "received": true}`
2. **Call log retrieval**: JSON object with call details
3. **Statistics**: Object with `total`, `completed`, `failed`, `averageDuration`, `totalDuration`

### Sample Call Log Response

```json
{
  "id": "uuid-here",
  "call_id": "test-call-123",
  "phone_number": "+1234567890",
  "status": "completed",
  "language": "en-US",
  "started_at": "2025-12-19T10:00:00Z",
  "ended_at": "2025-12-19T10:00:30Z",
  "duration_ms": 30000,
  "transcript": "Full conversation transcript here",
  "metadata": {
    "vapi_status": "ended",
    "cost": 0.05
  },
  "created_at": "2025-12-19T10:00:00Z",
  "updated_at": "2025-12-19T10:00:30Z"
}
```

### Sample Statistics Response

```json
{
  "total": 1,
  "completed": 1,
  "failed": 0,
  "averageDuration": 30000,
  "totalDuration": 30000
}
```

---

## Troubleshooting

### Issue: "Call log not found"
- **Solution**: Make sure the webhook endpoint received the event (check server logs)
- Verify the `call_id` matches exactly

### Issue: "Database connection error"
- **Solution**: Check your `.env.local` has correct Supabase credentials
- Verify Supabase is accessible

### Issue: "Table doesn't exist"
- **Solution**: Run `supabase-setup.sql` in Supabase SQL Editor
- Check that the `call_logs` table was created

### Issue: Script fails with "tsx not found"
- **Solution**: Install tsx: `npm install --save-dev tsx`
- Or use the bash script instead: `./scripts/test-api.sh`

---

## Next Steps

Once testing is successful:
1. ✅ Call logs are being stored
2. ✅ API endpoints are working
3. ✅ Statistics are being calculated

You're ready to:
- Test with real Vapi calls
- Build the call dashboard (Phase 7)
- Monitor production calls

