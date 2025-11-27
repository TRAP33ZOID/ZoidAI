import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Simple test endpoint to verify database connection
 * GET /api/calls/simple
 */
export async function GET() {
  try {
    // Simple query to test connection
    const { data, error, count } = await supabase
      .from("call_logs")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Database connection working",
      tableExists: true,
      recordCount: count || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

