// Verify database tables exist
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDatabase() {
  console.log('\n🔍 Verifying database setup...\n');

  // Check call_logs table
  console.log('1. Checking call_logs table...');
  const { data: callLogs, error: callLogsError } = await supabase
    .from('call_logs')
    .select('*')
    .limit(1);
  
  if (callLogsError) {
    console.error('   ❌ Error:', callLogsError.message);
  } else {
    console.log('   ✅ call_logs table exists');
    console.log('   Total calls:', callLogs?.length || 0);
  }

  // Check vapi_call_metrics table
  console.log('\n2. Checking vapi_call_metrics table...');
  const { data: metrics, error: metricsError } = await supabase
    .from('vapi_call_metrics')
    .select('*')
    .limit(1);
  
  if (metricsError) {
    console.error('   ❌ Error:', metricsError.message);
    console.error('   💡 You need to run supabase-phase6-only.sql');
  } else {
    console.log('   ✅ vapi_call_metrics table exists');
    console.log('   Total metrics:', metrics?.length || 0);
  }

  // Check if vapi columns exist in call_logs
  console.log('\n3. Checking vapi columns in call_logs...');
  const { data: sample, error: sampleError } = await supabase
    .from('call_logs')
    .select('vapi_cost_usd, vapi_telephony_cost, vapi_stt_cost')
    .limit(1);
  
  if (sampleError) {
    console.error('   ❌ Error:', sampleError.message);
    console.error('   💡 Vapi columns might not exist');
  } else {
    console.log('   ✅ Vapi columns exist in call_logs');
  }

  console.log('\n✅ Database verification complete!\n');
}

verifyDatabase().catch(console.error);
