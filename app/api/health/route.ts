import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { ai } from "@/lib/gemini";

export async function GET() {
  const health: {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    environment: string;
    checks: {
      environment: {
        status: "ok" | "error";
        details: Record<string, any>;
      };
      supabase: {
        status: "ok" | "error";
        message: string;
        details?: any;
      };
      gemini: {
        status: "ok" | "error";
        message: string;
        details?: any;
      };
    };
  } = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
    checks: {
      environment: {
        status: "ok",
        details: {},
      },
      supabase: {
        status: "ok",
        message: "Not tested",
      },
      gemini: {
        status: "ok",
        message: "Not tested",
      },
    },
  };

  // Check environment variables
  const envVars = {
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV || "local",
  };

  const missingVars = Object.entries(envVars)
    .filter(([key, value]) => key !== "NODE_ENV" && key !== "VERCEL_ENV" && !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    health.checks.environment.status = "error";
    health.checks.environment.details = {
      missing: missingVars,
      present: Object.entries(envVars)
        .filter(([key, value]) => key !== "NODE_ENV" && key !== "VERCEL_ENV" && value)
        .map(([key]) => key),
    };
    health.status = "unhealthy";
  } else {
    health.checks.environment.details = {
      allPresent: true,
      nodeEnv: envVars.NODE_ENV,
      vercelEnv: envVars.VERCEL_ENV,
    };
  }

  // Test Supabase connection
  if (isSupabaseConfigured()) {
    try {
      console.log("🔵 [HEALTH] Testing Supabase connection...");
      const { data, error } = await supabase
        .from("documents")
        .select("id")
        .limit(1);

      if (error) {
        health.checks.supabase.status = "error";
        health.checks.supabase.message = `Connection failed: ${error.message}`;
        health.checks.supabase.details = {
          code: error.code,
          hint: error.hint,
          details: error.details,
        };
        health.status = health.status === "healthy" ? "degraded" : "unhealthy";
      } else {
        health.checks.supabase.status = "ok";
        health.checks.supabase.message = "Connection successful";
        health.checks.supabase.details = {
          canQuery: true,
          documentsTableExists: true,
        };
      }
    } catch (error: any) {
      health.checks.supabase.status = "error";
      health.checks.supabase.message = `Connection error: ${error?.message || error}`;
      health.checks.supabase.details = {
        error: error?.message || String(error),
        stack: error?.stack,
      };
      health.status = health.status === "healthy" ? "degraded" : "unhealthy";
    }
  } else {
    health.checks.supabase.status = "error";
    health.checks.supabase.message = "Supabase not configured";
    health.status = "unhealthy";
  }

  // Test Gemini API key (without making actual API call)
  try {
    console.log("🔵 [HEALTH] Testing Gemini API key...");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      health.checks.gemini.status = "error";
      health.checks.gemini.message = "API key not set";
      health.status = health.status === "healthy" ? "degraded" : "unhealthy";
    } else {
      // Try to initialize the client (this will validate the key format)
      try {
        // Just check if we can access the ai proxy without error
        // The actual initialization happens lazily
        const testAccess = typeof ai.models === "object";
        health.checks.gemini.status = "ok";
        health.checks.gemini.message = "API key present and client accessible";
        health.checks.gemini.details = {
          keyLength: apiKey.length,
          clientAccessible: testAccess,
        };
      } catch (error: any) {
        health.checks.gemini.status = "error";
        health.checks.gemini.message = `Client initialization error: ${error?.message || error}`;
        health.checks.gemini.details = {
          error: error?.message || String(error),
        };
        health.status = health.status === "healthy" ? "degraded" : "unhealthy";
      }
    }
  } catch (error: any) {
    health.checks.gemini.status = "error";
    health.checks.gemini.message = `Error checking Gemini: ${error?.message || error}`;
    health.status = health.status === "healthy" ? "degraded" : "unhealthy";
  }

  const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}

