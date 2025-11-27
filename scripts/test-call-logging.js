/**
 * Simple Node.js Test Script for Call Logging
 * No dependencies required - uses built-in fetch (Node 18+)
 * 
 * Usage:
 *   node scripts/test-call-logging.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Simulate a Vapi webhook event
async function simulateWebhookEvent(eventType, callData) {
  const webhookUrl = `${BASE_URL}/api/vapi-webhook`;
  
  // Include webhook token if available (for production testing)
  const headers = {
    "Content-Type": "application/json",
  };
  
  // Add webhook token header if VAPI_WEBHOOK_TOKEN is set (optional for dev)
  const webhookToken = process.env.VAPI_WEBHOOK_TOKEN;
  if (webhookToken) {
    headers["x-vapi-webhook-token"] = webhookToken;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        type: eventType,
        call: callData,
        ...callData,
      }),
    });

    const result = await response.json();
    console.log(`✅ ${eventType}:`, response.status, JSON.stringify(result));
    return result;
  } catch (error) {
    console.error(`❌ ${eventType} failed:`, error.message);
    return null;
  }
}

// Test API endpoint
async function testAPIEndpoint(url, description) {
  try {
    const response = await fetch(url);
    const result = await response.json();
    console.log(`✅ ${description}:`, JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return null;
  }
}

// Sleep helper
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Main test function
async function runTests() {
  console.log("\n🧪 Testing Call Logging System\n");
  console.log("=".repeat(50));
  console.log(`Base URL: ${BASE_URL}\n`);

  const testCallId = `test-call-${Date.now()}`;
  const testPhoneNumber = "+1234567890";

  // Test 1: Simulate call initiation
  console.log("📞 Test 1: Simulating call started...");
  await simulateWebhookEvent("call-started", {
    id: testCallId,
    from: testPhoneNumber,
    status: "queued",
    startedAt: new Date().toISOString(),
    language: "en-US",
  });
  await sleep(500);

  // Test 2: Simulate status update
  console.log("\n📞 Test 2: Simulating status update (in-progress)...");
  await simulateWebhookEvent("status-update", {
    id: testCallId,
    call_id: testCallId,
    from: testPhoneNumber,
    status: "in-progress",
    startedAt: new Date(Date.now() - 5000).toISOString(),
  });
  await sleep(500);

  // Test 3: Simulate transcript update
  console.log("\n📞 Test 3: Simulating transcript update...");
  await simulateWebhookEvent("transcript", {
    id: testCallId,
    call_id: testCallId,
    transcript: "Hello, I need help with my order.",
  });
  await sleep(500);

  // Test 4: Simulate another transcript
  await simulateWebhookEvent("transcript", {
    id: testCallId,
    call_id: testCallId,
    transcript: "Sure, I can help you with that. What's your order number?",
  });
  await sleep(500);

  // Test 5: Simulate call completion
  console.log("\n📞 Test 5: Simulating call ended...");
  const startedAt = new Date(Date.now() - 30000);
  const endedAt = new Date();

  await simulateWebhookEvent("end-of-call-report", {
    id: testCallId,
    call_id: testCallId,
    from: testPhoneNumber,
    status: "ended",
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    transcript:
      "Hello, I need help with my order.\nSure, I can help you with that. What's your order number?\nIt's 12345.\nThank you, I've found your order. It will be delivered tomorrow.",
    summary: {
      transcript: "Full conversation transcript here",
    },
    cost: 0.05,
  });
  await sleep(1000);

  // Test 6: Verify call log via API
  console.log("\n📋 Test 6: Fetching call log via API...");
  await testAPIEndpoint(
    `${BASE_URL}/api/calls?callId=${testCallId}`,
    "Get specific call log"
  );

  // Test 7: Get recent calls
  console.log("\n📋 Test 7: Fetching recent calls...");
  await testAPIEndpoint(
    `${BASE_URL}/api/calls?limit=5`,
    "Get recent calls"
  );

  // Test 8: Get statistics
  console.log("\n📊 Test 8: Fetching statistics...");
  await testAPIEndpoint(
    `${BASE_URL}/api/calls?stats=true`,
    "Get call statistics"
  );

  console.log("\n" + "=".repeat(50));
  console.log("✅ All tests completed!");
  console.log(`\nTest Call ID: ${testCallId}`);
  console.log("\nVerify results:");
  console.log(`  - API: GET ${BASE_URL}/api/calls?callId=${testCallId}`);
  console.log(`  - API: GET ${BASE_URL}/api/calls?stats=true`);
  console.log("  - Supabase: Check call_logs table in Table Editor");
  console.log("=".repeat(50) + "\n");
}

// Run tests
runTests().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});

