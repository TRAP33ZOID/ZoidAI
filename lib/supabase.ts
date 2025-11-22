import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Initialize the Supabase client for server-side operations (using the Service Role Key)
// Trim whitespace and newlines from environment variables (fixes Vercel env var issues)
let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
let supabaseKeyRaw = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
// More aggressive trimming: remove all whitespace, newlines, and common encoding issues
const supabaseKey = supabaseKeyRaw
  .trim()
  .replace(/\r\n/g, "")
  .replace(/\n/g, "")
  .replace(/\r/g, "")
  .replace(/\s+/g, "");

// Validate Supabase key format (JWT tokens start with "eyJ")
function isValidSupabaseKey(key: string): boolean {
  if (!key || key.length < 50) return false;
  // Supabase JWT keys should start with "eyJ" (base64 encoded JSON header)
  return key.startsWith("eyJ");
}

// Use direct connection instead of connection pooling
// Connection pooling (port 6543) may not be available on all Supabase instances
// Once verified in Supabase dashboard, can be re-enabled
const isProduction = process.env.VERCEL_ENV === "production" ||
  (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV);

if (supabaseUrl) {
  const envType = process.env.VERCEL_ENV || "local";
  console.log(`✅ [SUPABASE] Using direct connection for ${envType}`);
}

// Helper to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseKey && isValidSupabaseKey(supabaseKey));
}

// Create client only if both URL and key are provided
// This prevents runtime errors during module evaluation
let supabaseInstance: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  try {
    console.log("🔵 [SUPABASE] Creating Supabase client...");
    console.log("🔵 [SUPABASE] Environment:", {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV || "not-set",
      isProduction,
      urlFormat: supabaseUrl.includes(":6543") ? "pooling" : "direct"
    });
    
    // Validate key format before creating client
    if (!isValidSupabaseKey(supabaseKey)) {
      throw new Error(
        `Invalid Supabase key format. Key should start with "eyJ" (JWT format). ` +
        `Key length: ${supabaseKey.length}, starts with: ${supabaseKey.substring(0, 10)}`
      );
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-client-info': 'zoid-ai@1.0.0',
        },
      },
    });
    console.log("✅ [SUPABASE] Supabase client created successfully");
    console.log("🔵 [SUPABASE] Connection details:", {
      url: supabaseUrl.replace(/\/\/.*@/, "//***@"), // Hide credentials in URL
      hasKey: !!supabaseKey,
      keyLength: supabaseKey.length,
      keyFormat: isValidSupabaseKey(supabaseKey) ? "valid" : "invalid",
      keyPrefix: supabaseKey.substring(0, 10),
      connectionType: supabaseUrl.includes(":6543") ? "pooling" : "direct"
    });
  } catch (error: any) {
    console.error("❌ [SUPABASE] Failed to create client:", {
      error: error?.message || error,
      stack: error?.stack,
      url: supabaseUrl.replace(/\/\/.*@/, "//***@"),
      keyLength: supabaseKey.length,
      keyPrefix: supabaseKey.substring(0, 20),
      rawKeyLength: supabaseKeyRaw.length,
      keyFormatValid: isValidSupabaseKey(supabaseKey)
    });
    supabaseInstance = null;
  }
} else {
  const keyValidation = {
    hasKey: !!supabaseKey,
    keyLength: supabaseKey.length,
    keyFormatValid: isValidSupabaseKey(supabaseKey),
    keyPrefix: supabaseKey.substring(0, 20),
    rawKeyLength: supabaseKeyRaw.length,
    hasWhitespace: /\s/.test(supabaseKeyRaw),
    hasNewlines: /\n|\r/.test(supabaseKeyRaw)
  };
  
  console.warn("⚠️ [SUPABASE] Supabase not configured. Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.warn("⚠️ [SUPABASE] Configuration check:", {
    hasUrl: !!supabaseUrl,
    urlLength: supabaseUrl.length,
    keyValidation
  });
  
  if (supabaseKeyRaw && !isValidSupabaseKey(supabaseKey)) {
    console.error("❌ [SUPABASE] Key format is invalid! Key should be a JWT token starting with 'eyJ'");
    console.error("❌ [SUPABASE] This usually means the key was incorrectly set in Vercel environment variables.");
    console.error("❌ [SUPABASE] Please verify SUPABASE_SERVICE_ROLE_KEY in Vercel dashboard.");
  }
}

// Export a getter that ensures we have a configured client
export const supabase: SupabaseClient = supabaseInstance || (() => {
  // Return a proxy that throws helpful errors when methods are called
  const errorMessage = "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.";
  
  return new Proxy({} as SupabaseClient, {
    get() {
      throw new Error(errorMessage);
    },
  });
})();

// Table name for storing document chunks and vectors
export const DOCUMENTS_TABLE = "documents";