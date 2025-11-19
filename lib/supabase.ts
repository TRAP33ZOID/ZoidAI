import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Initialize the Supabase client for server-side operations (using the Service Role Key)
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Use connection pooling in production (recommended for serverless environments)
// Connection pooling uses port 6543 and provides better performance
// Note: Vercel preview deployments have NODE_ENV=production but VERCEL_ENV=preview
// Only use pooling for actual production, not preview
const isProduction = process.env.VERCEL_ENV === "production" || 
  (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV);

if (isProduction && supabaseUrl) {
  // Replace .supabase.co with .supabase.co:6543 for connection pooling
  if (supabaseUrl.includes(".supabase.co") && !supabaseUrl.includes(":6543")) {
    supabaseUrl = supabaseUrl.replace(".supabase.co", ".supabase.co:6543");
    console.log("✅ [SUPABASE] Using connection pooling (port 6543) for production");
  }
} else if (supabaseUrl) {
  const envType = process.env.VERCEL_ENV || "local";
  console.log(`✅ [SUPABASE] Using direct connection for ${envType}`);
}

// Helper to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseKey);
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
      connectionType: supabaseUrl.includes(":6543") ? "pooling" : "direct"
    });
  } catch (error: any) {
    console.error("❌ [SUPABASE] Failed to create client:", {
      error: error?.message || error,
      stack: error?.stack,
      url: supabaseUrl.replace(/\/\/.*@/, "//***@")
    });
    supabaseInstance = null;
  }
} else {
  console.warn("⚠️ [SUPABASE] Supabase not configured. Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.warn("⚠️ [SUPABASE] Configuration check:", {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    urlLength: supabaseUrl.length,
    keyLength: supabaseKey.length
  });
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