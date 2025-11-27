// Check what calls are in the database
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCalls() {
  console.log('\n🔍 Checking calls in database...\n');

  // Get all calls
  const { data: calls, error: callsError } = await supabase
    .from('call_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (callsError) {
    console.error('❌ Error fetching calls:', callsError.message);
    return;
  }

  console.log(`Found ${calls?.length || 0} call(s) in database:\n`);

  if (calls && calls.length > 0) {
    calls.forEach((call, index) => {
      console.log(`Call ${index + 1}:`);
      console.log('  Call ID:', call.call_id);
      console.log('  Phone:', call.phone_number || 'N/A');
      console.log('  Status:', call.status);
      console.log('  Started:', call.started_at || 'N/A');
      console.log('  Ended:', call.ended_at || 'N/A');
      console.log('  Duration:', call.duration_ms ? `${Math.round(call.duration_ms / 1000)}s` : 'N/A');
      console.log('  Transcript:', call.transcript ? `${call.transcript.substring(0, 50)}...` : 'N/A');
      console.log('  Vapi Cost:', call.vapi_cost_usd ? `$${call.vapi_cost_usd}` : 'N/A');
      console.log('  Created:', call.created_at);
      console.log('');
    });
  }

  // Check metrics table
  const { data: metrics, error: metricsError } = await supabase
    .from('vapi_call_metrics')
    .select('*');

  if (metricsError) {
    console.error('❌ Error fetching metrics:', metricsError.message);
  } else {
    console.log(`\nFound ${metrics?.length || 0} metric record(s)`);
    if (metrics && metrics.length > 0) {
      metrics.forEach((metric, index) => {
        console.log(`\nMetric ${index + 1}:`);
        console.log('  Call ID:', metric.call_id);
        console.log('  Total Cost:', metric.total_cost_usd ? `$${metric.total_cost_usd}` : 'N/A');
        console.log('  Telephony:', metric.telephony_cost_usd ? `$${metric.telephony_cost_usd}` : 'N/A');
        console.log('  STT:', metric.stt_cost_usd ? `$${metric.stt_cost_usd}` : 'N/A');
        console.log('  TTS:', metric.tts_cost_usd ? `$${metric.tts_cost_usd}` : 'N/A');
        console.log('  AI:', metric.ai_cost_usd ? `$${metric.ai_cost_usd}` : 'N/A');
      });
    }
  }
}

checkCalls().catch(console.error);
