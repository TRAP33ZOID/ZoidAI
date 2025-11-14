#!/bin/bash
# Simple API Test Script for Call Logging
# Tests the call logging API endpoints using curl

BASE_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
CALL_ID="test-call-$(date +%s)"
PHONE_NUMBER="+1234567890"

echo "🧪 Testing Call Logging API"
echo "================================"
echo "Base URL: $BASE_URL"
echo "Test Call ID: $CALL_ID"
echo ""

# Test 1: Simulate call started
echo "📞 Test 1: Simulating call started..."
curl -X POST "$BASE_URL/api/vapi-webhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"call-started\",
    \"call\": {
      \"id\": \"$CALL_ID\",
      \"from\": \"$PHONE_NUMBER\",
      \"status\": \"queued\",
      \"startedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
      \"language\": \"en-US\"
    }
  }" | jq '.'
echo ""

sleep 1

# Test 2: Simulate status update
echo "📞 Test 2: Simulating status update (in-progress)..."
curl -X POST "$BASE_URL/api/vapi-webhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"status-update\",
    \"call\": {
      \"id\": \"$CALL_ID\",
      \"call_id\": \"$CALL_ID\",
      \"from\": \"$PHONE_NUMBER\",
      \"status\": \"in-progress\",
      \"startedAt\": \"$(date -u -d '5 seconds ago' +%Y-%m-%dT%H:%M:%SZ)\"
    }
  }" | jq '.'
echo ""

sleep 1

# Test 3: Simulate transcript update
echo "📞 Test 3: Simulating transcript update..."
curl -X POST "$BASE_URL/api/vapi-webhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"transcript\",
    \"call_id\": \"$CALL_ID\",
    \"transcript\": \"Hello, I need help with my order.\"
  }" | jq '.'
echo ""

sleep 1

# Test 4: Simulate call ended
echo "📞 Test 4: Simulating call ended..."
STARTED_AT=$(date -u -d '30 seconds ago' +%Y-%m-%dT%H:%M:%SZ)
ENDED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)

curl -X POST "$BASE_URL/api/vapi-webhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"end-of-call-report\",
    \"call\": {
      \"id\": \"$CALL_ID\",
      \"call_id\": \"$CALL_ID\",
      \"from\": \"$PHONE_NUMBER\",
      \"status\": \"ended\",
      \"startedAt\": \"$STARTED_AT\",
      \"endedAt\": \"$ENDED_AT\",
      \"transcript\": \"Hello, I need help with my order.\\nSure, I can help you with that. What's your order number?\\nIt's 12345.\\nThank you, I've found your order.\",
      \"summary\": {
        \"transcript\": \"Full conversation transcript\"
      },
      \"cost\": 0.05
    }
  }" | jq '.'
echo ""

sleep 2

# Test 5: Get specific call log
echo "📋 Test 5: Fetching call log for $CALL_ID..."
curl -X GET "$BASE_URL/api/calls?callId=$CALL_ID" | jq '.'
echo ""

# Test 6: Get recent calls
echo "📋 Test 6: Fetching recent calls..."
curl -X GET "$BASE_URL/api/calls?limit=5" | jq '.'
echo ""

# Test 7: Get statistics
echo "📊 Test 7: Fetching call statistics..."
curl -X GET "$BASE_URL/api/calls?stats=true" | jq '.'
echo ""

echo "================================"
echo "✅ Tests completed!"
echo "Test Call ID: $CALL_ID"
echo ""

