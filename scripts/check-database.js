/**
 * Quick database check script
 * Checks if call_logs table exists
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log("🔍 Checking database setup...\n");

  // Check 1: Test connection
  console.log("1. Testing Supabase connection...");
  try {
    const { data, error } = await supabase.from("call_logs").select("count").limit(0);
    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.log("❌ Table 'call_logs' does NOT exist!\n");
        console.log("📋 SOLUTION:");
        console.log("   1. Go to your Supabase Dashboard");
        console.log("   2. Open SQL Editor");
        console.log("   3. Copy and paste the contents of supabase-setup.sql");
        console.log("   4. Click 'Run' to execute the script");
        console.log("   5. Wait for success message\n");
        process.exit(1);
      } else {
        console.log("❌ Error:", error.message);
        console.log("   Code:", error.code);
        process.exit(1);
      }
    } else {
      console.log("✅ Table 'call_logs' exists!\n");
    }
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
    process.exit(1);
  }

  // Check 2: Count records
  console.log("2. Counting records in call_logs...");
  try {
    const { count, error } = await supabase
      .from("call_logs")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.log("❌ Error counting:", error.message);
    } else {
      console.log(`✅ Found ${count || 0} call log(s)\n`);
    }
  } catch (err) {
    console.error("❌ Count failed:", err.message);
  }

  // Check 3: Try to insert a test record
  console.log("3. Testing insert capability...");
  const testCallId = `test-check-${Date.now()}`;
  try {
    const { data, error } = await supabase
      .from("call_logs")
      .insert({
        call_id: testCallId,
        phone_number: "+1234567890",
        status: "completed",
        language: "en-US",
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        duration_ms: 1000,
      })
      .select()
      .single();

    if (error) {
      console.log("❌ Insert failed:", error.message);
      console.log("   Code:", error.code);
    } else {
      console.log("✅ Insert successful!");
      
      // Clean up test record
      await supabase.from("call_logs").delete().eq("call_id", testCallId);
      console.log("✅ Test record cleaned up\n");
    }
  } catch (err) {
    console.error("❌ Insert test failed:", err.message);
  }

  console.log("✅ Database check complete!");
  console.log("\nYou can now test the API:");
  console.log("  npm run test:calls");
}

checkDatabase().catch((err) => {
  console.error("❌ Check failed:", err);
  process.exit(1);
});

