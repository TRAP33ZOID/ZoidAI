import { NextResponse } from "next/server";

/**
 * Debug endpoint to check environment variables
 * GET /api/debug
 */
export async function GET() {
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...";
  
  return NextResponse.json({
    env: {
      hasSupabaseUrl,
      hasServiceKey,
      supabaseUrl,
      nodeEnv: process.env.NODE_ENV,
    },
    message: hasSupabaseUrl && hasServiceKey 
      ? "Environment variables are set" 
      : "Missing environment variables",
  });
}

