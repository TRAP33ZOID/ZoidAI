import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Diagnostic endpoint to test database connection and table existence
 * GET /api/calls/test
 */
export async function GET() {
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      checks: {},
    };

    // Check 1: Environment variables
    results.checks.env = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...",
    };

    // Check 2: Test database connection
    try {
      const { data, error } = await supabase.from("call_logs").select("count").limit(1);
      results.checks.databaseConnection = {
        success: !error,
        error: error?.message || null,
        tableExists: !error || error.code !== "PGRST116",
      };
    } catch (dbError: any) {
      results.checks.databaseConnection = {
        success: false,
        error: dbError.message,
        tableExists: false,
      };
    }

    // Check 3: Try to query table structure
    try {
      const { data, error } = await supabase
        .from("call_logs")
        .select("id")
        .limit(0);
      
      results.checks.tableStructure = {
        success: !error,
        error: error?.message || null,
        code: error?.code || null,
      };
    } catch (structError: any) {
      results.checks.tableStructure = {
        success: false,
        error: structError.message,
      };
    }

    // Check 4: Count existing records
    try {
      const { count, error } = await supabase
        .from("call_logs")
        .select("*", { count: "exact", head: true });
      
      results.checks.recordCount = {
        success: !error,
        count: count || 0,
        error: error?.message || null,
      };
    } catch (countError: any) {
      results.checks.recordCount = {
        success: false,
        error: countError.message,
      };
    }

    const allChecksPassed = Object.values(results.checks).every(
      (check: any) => check.success !== false
    );

    return NextResponse.json({
      ...results,
      status: allChecksPassed ? "healthy" : "issues_detected",
      recommendation: !results.checks.databaseConnection.tableExists
        ? "Run supabase-setup.sql in Supabase SQL Editor to create call_logs table"
        : allChecksPassed
        ? "All checks passed"
        : "Review error messages above",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Diagnostic failed",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

