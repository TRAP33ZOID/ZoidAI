// Quick Supabase connection test
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gwpfcgibcotpymwboaei.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3cGZjZ2liY290cHltd2JvYWVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ3NDk2OCwiZXhwIjoyMDc4MDUwOTY4fQ.oxm42SSlxUJmn0WWQRE432zdHjD3qhlck9afoLnOMiY";

console.log("🔵 Testing Supabase connection...");
console.log("URL:", supabaseUrl);
console.log("Key present:", !!supabaseKey);
console.log("Key length:", supabaseKey.length);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

async function testConnection() {
  try {
    console.log("\n1. Testing basic query...");
    const { data, error } = await supabase
      .from('documents')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error("❌ Query error:", error);
      return;
    }
    
    console.log("✅ Basic query successful");
    console.log("   Documents found:", data?.length || 0);
    
    console.log("\n2. Testing RPC function match_documents...");
    // Create a dummy embedding vector (768 dimensions)
    const dummyEmbedding = new Array(768).fill(0.1);
    
    const { data: rpcData, error: rpcError } = await supabase.rpc('match_documents', {
      query_embedding: dummyEmbedding,
      match_count: 1,
      language: 'en-US',
      filter: {}
    }).select('content');
    
    if (rpcError) {
      console.error("❌ RPC error:", rpcError);
      console.error("   Message:", rpcError.message);
      console.error("   Details:", rpcError.details);
      console.error("   Hint:", rpcError.hint);
      console.error("   Code:", rpcError.code);
      return;
    }
    
    console.log("✅ RPC function call successful");
    console.log("   Results:", rpcData?.length || 0);
    
    console.log("\n3. Checking documents table structure...");
    const { data: tableData, error: tableError } = await supabase
      .from('documents')
      .select('id, language, created_at')
      .limit(5);
    
    if (tableError) {
      console.error("❌ Table query error:", tableError);
    } else {
      console.log("✅ Table structure OK");
      console.log("   Sample records:", tableData?.length || 0);
      if (tableData && tableData.length > 0) {
        console.log("   First record:", JSON.stringify(tableData[0], null, 2));
      }
    }
    
    console.log("\n✅ All tests passed!");
    
  } catch (error) {
    console.error("\n❌ Unexpected error:", error);
    console.error("   Message:", error.message);
    console.error("   Stack:", error.stack);
  }
}

testConnection();

