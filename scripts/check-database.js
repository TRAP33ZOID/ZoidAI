/**
 * Comprehensive database check script
 * Checks call_logs table, documents table, and RPC functions
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local manually
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf8");
    envFile.split("\n").forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables!");
  console.error("Make sure .env.local has:");
  console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

console.log("🔵 Connection Details:");
console.log("   URL:", supabaseUrl.substring(0, 40) + "...");
console.log("   Key present:", !!supabaseKey);
console.log("   Key length:", supabaseKey.length);
console.log("");

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

async function checkDatabase() {
  console.log("🔍 Comprehensive database check...\n");
  let hasErrors = false;

  // Check 1: Test basic connection
  console.log("1. Testing Supabase connection...");
  try {
    const { data, error } = await supabase.from("call_logs").select("count").limit(0);
    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.log("⚠️  Table 'call_logs' does NOT exist (this is OK if you haven't set it up yet)");
      } else {
        console.log("❌ Connection error:", error.message);
        console.log("   Code:", error.code);
        hasErrors = true;
      }
    } else {
      console.log("✅ Connection successful!\n");
    }
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
    if (err.message?.includes("fetch failed") || err.message?.includes("network")) {
      console.error("   This looks like a network connectivity issue!");
      console.error("   Check if Supabase URL is accessible from your network.");
    }
    hasErrors = true;
  }

  // Check 2: Test documents table (CRITICAL for RAG)
  console.log("\n2. Checking 'documents' table (required for RAG)...");
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("id, language, created_at")
      .limit(1);

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.log("❌ Table 'documents' does NOT exist!");
        console.log("📋 SOLUTION:");
        console.log("   1. Go to your Supabase Dashboard");
        console.log("   2. Open SQL Editor");
        console.log("   3. Copy and paste the contents of supabase-setup.sql");
        console.log("   4. Click 'Run' to execute the script");
        console.log("   5. Wait for success message");
        hasErrors = true;
      } else {
        console.log("❌ Error querying documents:", error.message);
        console.log("   Code:", error.code);
        console.log("   Details:", error.details);
        console.log("   Hint:", error.hint);
        hasErrors = true;
      }
    } else {
      console.log("✅ Table 'documents' exists!");
      
      // Count documents
      const { count, error: countError } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true });
      
      if (countError) {
        console.log("⚠️  Could not count documents:", countError.message);
      } else {
        console.log(`   Found ${count || 0} document chunk(s)`);
        if (count === 0) {
          console.log("   ⚠️  Knowledge base is empty - upload documents to enable RAG");
        }
      }
    }
  } catch (err) {
    console.error("❌ Documents table check failed:", err.message);
    if (err.message?.includes("fetch failed")) {
      console.error("   Network error - check Supabase connection");
    }
    hasErrors = true;
  }

  // Check 3: Test match_documents RPC function (CRITICAL for RAG)
  console.log("\n3. Testing 'match_documents' RPC function (required for RAG)...");
  try {
    // Create a dummy embedding vector (768 dimensions matching text-embedding-004)
    const dummyEmbedding = new Array(768).fill(0.1);
    
    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: dummyEmbedding,
      match_count: 1,
      language: "en-US",
      filter: {}
    }).select("content");

    if (error) {
      if (error.code === "42883" || error.message?.includes("does not exist") || error.message?.includes("function")) {
        console.log("❌ RPC function 'match_documents' does NOT exist!");
        console.log("📋 SOLUTION:");
        console.log("   1. Go to your Supabase Dashboard");
        console.log("   2. Open SQL Editor");
        console.log("   3. Copy the match_documents function from supabase-setup.sql");
        console.log("   4. Run it to create the function");
        hasErrors = true;
      } else {
        console.log("❌ RPC function error:", error.message);
        console.log("   Code:", error.code);
        console.log("   Details:", error.details);
        console.log("   Hint:", error.hint);
        hasErrors = true;
      }
    } else {
      console.log("✅ RPC function 'match_documents' works!");
      console.log(`   Returned ${data?.length || 0} result(s)`);
    }
  } catch (err) {
    console.error("❌ RPC function test failed:", err.message);
    if (err.message?.includes("fetch failed")) {
      console.error("   Network error - check Supabase connection");
    }
    hasErrors = true;
  }

  // Check 4: Test call_logs table (optional)
  console.log("\n4. Checking 'call_logs' table (optional)...");
  try {
    const { data, error } = await supabase.from("call_logs").select("count").limit(0);
    if (error) {
      if (error.code === "42P01") {
        console.log("⚠️  Table 'call_logs' does NOT exist (optional - for call logging)");
      } else {
        console.log("⚠️  Error:", error.message);
      }
    } else {
      const { count, error: countError } = await supabase
        .from("call_logs")
        .select("*", { count: "exact", head: true });
      
      if (!countError) {
        console.log(`✅ Found ${count || 0} call log(s)`);
      }
    }
  } catch (err) {
    console.log("⚠️  Call logs check skipped:", err.message);
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  if (hasErrors) {
    console.log("❌ Database check completed with ERRORS");
    console.log("\nPlease fix the errors above before deploying.");
    process.exit(1);
  } else {
    console.log("✅ All critical checks passed!");
    console.log("\nYour database is ready for RAG functionality.");
  }
}

checkDatabase().catch((err) => {
  console.error("❌ Check failed:", err);
  process.exit(1);
});

