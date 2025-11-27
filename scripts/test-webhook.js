// Test the webhook endpoint with a simulated end-of-call-report
require('dotenv').config({ path: '.env.local' });

const testPayload = {
  "message": {
    "timestamp": Date.now(),
    "type": "end-of-call-report",
    "startedAt": new Date(Date.now() - 60000).toISOString(), // 1 minute ago
    "endedAt": new Date().toISOString(),
    "endedReason": "customer-ended-call",
    "cost": 0.0805,
    "costBreakdown": {
      "stt": 0.0099,
      "llm": 0.004,
      "tts": 0.019,
      "vapi": 0.0472,
      "total": 0.0805,
      "llmPromptTokens": 3706,
      "llmCompletionTokens": 97,
      "ttsCharacters": 380
    },
    "costs": [
      {
        "type": "transcriber",
        "transcriber": {
          "provider": "deepgram",
          "model": "nova-2"
        },
        "minutes": 1.0145,
        "cost": 0.00993606
      },
      {
        "type": "model",
        "model": {
          "provider": "groq",
          "model": "moonshotai/kimi-k2-instruct-0905"
        },
        "promptTokens": 3706,
        "completionTokens": 97,
        "cost": 0.003997
      },
      {
        "type": "voice",
        "voice": {
          "provider": "11labs",
          "voiceId": "Kq9pDHHIMmJsG9PEqOtv",
          "model": "eleven_turbo_v2_5"
        },
        "characters": 380,
        "cost": 0.019
      },
      {
        "type": "vapi",
        "subType": "normal",
        "minutes": 0.9438,
        "cost": 0.04719
      }
    ],
    "durationMs": 60000,
    "durationSeconds": 60,
    "durationMinutes": 1,
    "summary": "Test call to verify webhook integration is working correctly.",
    "transcript": "AI: Hello! Welcome to Zoid AI Support. How can I help you today?\\nUser: This is a test call.\\nAI: Thank you for testing! Everything is working correctly.\\nUser: Great, goodbye!\\nAI: Goodbye, have a great day!",
    "call": {
      "id": `test-webhook-${Date.now()}`,
      "orgId": "test-org-id",
      "type": "inboundPhoneCall",
      "status": "completed"
    },
    "customer": {
      "name": "+1234567890",
      "number": "+1234567890"
    },
    "assistant": {
      "id": "test-assistant-id",
      "name": "Zoid AI Support Agent"
    }
  }
};

async function testWebhook() {
  console.log('\n🧪 Testing webhook with simulated end-of-call-report...\n');
  console.log('Call ID:', testPayload.message.call.id);
  console.log('Total Cost: $' + testPayload.message.cost);
  console.log('');

  try {
    const response = await fetch('http://localhost:3000/api/vapi-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();

    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(result, null, 2));

    if (response.status === 200) {
      console.log('\n✅ Webhook responded successfully!');
      console.log('\n⏳ Waiting 2 seconds for database operations...\n');

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if data was saved
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      console.log('🔍 Checking database for the test call...\n');

      const { data: callLog, error: callError } = await supabase
        .from('call_logs')
        .select('*')
        .eq('call_id', testPayload.message.call.id)
        .single();

      if (callError) {
        console.error('❌ Error fetching call log:', callError.message);
      } else if (callLog) {
        console.log('✅ Call log saved successfully!');
        console.log('   Call ID:', callLog.call_id);
        console.log('   Phone:', callLog.phone_number);
        console.log('   Status:', callLog.status);
        console.log('   Duration:', callLog.duration_ms ? `${Math.round(callLog.duration_ms / 1000)}s` : 'N/A');
        console.log('   Vapi Cost:', callLog.vapi_cost_usd ? `$${callLog.vapi_cost_usd}` : 'N/A');
        console.log('   Transcript:', callLog.transcript ? 'YES' : 'NO');
      } else {
        console.log('⚠️  Call log not found in database');
      }

      const { data: metrics, error: metricsError } = await supabase
        .from('vapi_call_metrics')
        .select('*')
        .eq('call_id', testPayload.message.call.id)
        .single();

      if (metricsError && metricsError.code !== 'PGRST116') {
        console.error('\n❌ Error fetching metrics:', metricsError.message);
      } else if (metrics) {
        console.log('\n✅ Vapi metrics saved successfully!');
        console.log('   Total Cost:', metrics.total_cost_usd ? `$${metrics.total_cost_usd}` : 'N/A');
        console.log('   Telephony Cost:', metrics.telephony_cost_usd ? `$${metrics.telephony_cost_usd}` : 'N/A');
        console.log('   STT Cost:', metrics.stt_cost_usd ? `$${metrics.stt_cost_usd}` : 'N/A');
        console.log('   TTS Cost:', metrics.tts_cost_usd ? `$${metrics.tts_cost_usd}` : 'N/A');
        console.log('   AI Cost:', metrics.ai_cost_usd ? `$${metrics.ai_cost_usd}` : 'N/A');
        console.log('   AI Tokens:', metrics.ai_tokens_input && metrics.ai_tokens_output
          ? `${metrics.ai_tokens_input + metrics.ai_tokens_output}` : 'N/A');
      } else {
        console.log('\n⚠️  Vapi metrics not found in database');
        console.log('   This means the metrics insert failed or was skipped');
      }

      console.log('\n✅ Test complete!\n');
    } else {
      console.log('\n❌ Webhook failed with status:', response.status);
    }
  } catch (error) {
    console.error('\n❌ Error testing webhook:', error.message);
    console.error('   Make sure your dev server is running (npm run dev)');
  }
}

testWebhook().catch(console.error);
