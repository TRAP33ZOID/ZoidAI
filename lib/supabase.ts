import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Initialize the Supabase client for server-side operations (using the Service Role Key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Helper to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseKey);
}

// Create client only if both URL and key are provided
// This prevents runtime errors during module evaluation
let supabaseInstance: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    });
  } catch (error) {
    console.error("❌ [SUPABASE] Failed to create client:", error);
    supabaseInstance = null;
  }
} else {
  console.warn("⚠️ [SUPABASE] Supabase not configured. Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
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