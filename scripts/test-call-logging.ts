/**
 * Test Script for Call Logging
 * Simulates Vapi webhook events to test call logging functionality
 * 
 * Usage:
 *   npx tsx scripts/test-call-logging.ts
 *   or
 *   npm run test:calls
 */

import { upsertCallLog, getCallLog, getRecentCallLogs, getCallStatistics } from "../lib/call-handler";

// Simulate a Vapi webhook event
async function simulateWebhookEvent(eventType: string, callData: any) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const webhookUrl = `${baseUrl}/api/vapi-webhook`;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: eventType,
        call: callData,
        ...callData,
      }),
    });

    const result = await response.json();
    console.log(`✅ ${eventType}:`, response.status, result);
    return result;
  } catch (error: any) {
    console.error(`❌ ${eventType} failed:`, error.message);
    return null;
  }
}

// Test scenarios
async function testCallLogging() {
  console.log("\n🧪 Testing Call Logging System\n");
  console.log("=" .repeat(50));

  const testCallId = `test-call-${Date.now()}`;
  const testPhoneNumber = "+1234567890";

  // Test 1: Simulate call initiation
  console.log("\n📞 Test 1: Simulating call initiation...");
  await simulateWebhookEvent("call-started", {
    id: testCallId,
    from: testPhoneNumber,
    status: "queued",
    startedAt: new Date().toISOString(),
    language: "en-US",
  });

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Test 2: Simulate status update (ringing)
  console.log("\n📞 Test 2: Simulating status update (ringing)...");
  await simulateWebhookEvent("status-update", {
    id: testCallId,
    call_id: testCallId,
    from: testPhoneNumber,
    status: "ringing",
    startedAt: new Date(Date.now() - 2000).toISOString(),
  });

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Test 3: Simulate call in progress
  console.log("\n📞 Test 3: Simulating call in progress...");
  await simulateWebhookEvent("status-update", {
    id: testCallId,
    call_id: testCallId,
    from: testPhoneNumber,
    status: "in-progress",
    startedAt: new Date(Date.now() - 5000).toISOString(),
    language: "en-US",
  });

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Test 4: Simulate transcript update
  console.log("\n📞 Test 4: Simulating transcript update...");
  await simulateWebhookEvent("transcript", {
    id: testCallId,
    call_id: testCallId,
    transcript: "Hello, I need help with my order.",
  });

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Test 5: Simulate another transcript update
  await simulateWebhookEvent("transcript", {
    id: testCallId,
    call_id: testCallId,
    transcript: "Sure, I can help you with that. What's your order number?",
  });

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Test 6: Simulate call completion
  console.log("\n📞 Test 6: Simulating call completion...");
  const startedAt = new Date(Date.now() - 30000); // 30 seconds ago
  const endedAt = new Date();
  
  await simulateWebhookEvent("end-of-call-report", {
    id: testCallId,
    call_id: testCallId,
    from: testPhoneNumber,
    status: "ended",
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    transcript: "Hello, I need help with my order.\nSure, I can help you with that. What's your order number?\nIt's 12345.\nThank you, I've found your order. It will be delivered tomorrow.",
    summary: {
      transcript: "Full conversation transcript here",
    },
    cost: 0.05,
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Test 7: Verify call log was created
  console.log("\n📋 Test 7: Verifying call log in database...");
  const callLog = await getCallLog(testCallId);
  if (callLog) {
    console.log("✅ Call log found:");
    console.log(JSON.stringify(callLog, null, 2));
  } else {
    console.log("❌ Call log not found!");
  }

  // Test 8: Get recent calls
  console.log("\n📋 Test 8: Fetching recent call logs...");
  const recentCalls = await getRecentCallLogs(10);
  console.log(`✅ Found ${recentCalls.length} recent calls`);
  if (recentCalls.length > 0) {
    console.log("Latest call:", {
      call_id: recentCalls[0].call_id,
      status: recentCalls[0].status,
      phone_number: recentCalls[0].phone_number,
      duration_ms: recentCalls[0].duration_ms,
    });
  }

  // Test 9: Get statistics
  console.log("\n📊 Test 9: Fetching call statistics...");
  const stats = await getCallStatistics();
  console.log("✅ Statistics:", stats);

  console.log("\n" + "=".repeat(50));
  console.log("✅ All tests completed!");
  console.log(`\nTest call ID: ${testCallId}`);
  console.log("You can verify in Supabase or via API:");
  console.log(`  GET http://localhost:3000/api/calls?callId=${testCallId}`);
  console.log(`  GET http://localhost:3000/api/calls?stats=true`);
  console.log("=" .repeat(50) + "\n");
}

// Run tests
testCallLogging().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});

