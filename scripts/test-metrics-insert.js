// Test inserting metrics to see if there's a foreign key issue
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMetricsInsert() {
  console.log('\n🧪 Testing metrics insert...\n');

  // Get an existing call_id from the database
  const { data: calls } = await supabase
    .from('call_logs')
    .select('call_id')
    .limit(1)
    .order('created_at', { ascending: false });

  if (!calls || calls.length === 0) {
    console.log('❌ No calls found in database to test with');
    return;
  }

  const testCallId = calls[0].call_id;
  console.log('📞 Using call ID:', testCallId);

  // Try to insert test metrics
  const testMetrics = {
    call_id: testCallId,
    total_cost_usd: 0.15,
    telephony_cost_usd: 0.05,
    stt_cost_usd: 0.02,
    stt_minutes: 0.5,
    tts_cost_usd: 0.03,
    tts_characters: 150,
    ai_cost_usd: 0.05,
    ai_tokens_input: 100,
    ai_tokens_output: 50,
    ai_model: 'gpt-4',
    updated_at: new Date().toISOString(),
  };

  console.log('💾 Attempting to insert metrics...');

  const { data, error } = await supabase
    .from('vapi_call_metrics')
    .upsert(testMetrics, {
      onConflict: 'call_id',
      ignoreDuplicates: false,
    })
    .select();

  if (error) {
    console.error('❌ Error inserting metrics:', error);
    console.error('   Code:', error.code);
    console.error('   Details:', error.details);
    console.error('   Hint:', error.hint);
    console.error('   Message:', error.message);

    if (error.code === '23503') {
      console.error('\n💡 Foreign key constraint error!');
      console.error('   This means the call_id doesn\'t exist in call_logs table.');
      console.error('   The foreign key is preventing the insert.');
    }
  } else {
    console.log('✅ Metrics inserted successfully!');
    console.log('   Data:', data);

    // Verify it's in the database
    const { data: verify } = await supabase
      .from('vapi_call_metrics')
      .select('*')
      .eq('call_id', testCallId)
      .single();

    if (verify) {
      console.log('✅ Verified metrics in database');
    }
  }
}

testMetricsInsert().catch(console.error);
