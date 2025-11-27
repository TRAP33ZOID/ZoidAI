import { NextResponse } from "next/server";
import {
  getCallLog,
  getRecentCallLogs,
  getCallStatistics,
  CallStatus,
} from "@/lib/call-handler";
import { isSupabaseConfigured } from "@/lib/supabase";

/**
 * Calls API Route
 * Handles GET requests for call logs and statistics
 * 
 * GET /api/calls - Get recent call logs
 * GET /api/calls?callId=<id> - Get specific call log
 * GET /api/calls?stats=true - Get call statistics
 * GET /api/calls?status=<status>&limit=<n>&offset=<n> - Filter calls
 */
export async function GET(req: Request) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error: "Supabase not configured",
          message: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);

    // Get specific call by ID
    const callId = searchParams.get("callId");
    if (callId) {
      const callLog = await getCallLog(callId);
      if (!callLog) {
        return NextResponse.json(
          { error: "Call not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(callLog);
    }

    // Get statistics
    const stats = searchParams.get("stats");
    if (stats === "true") {
      const startDateParam = searchParams.get("startDate");
      const endDateParam = searchParams.get("endDate");
      
      const startDate = startDateParam ? new Date(startDateParam) : undefined;
      const endDate = endDateParam ? new Date(endDateParam) : undefined;

      const statistics = await getCallStatistics(startDate, endDate);
      return NextResponse.json(statistics);
    }

    // Get recent call logs with pagination
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const statusParam = searchParams.get("status");

    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;
    const status = statusParam as CallStatus | null;

    const callLogs = await getRecentCallLogs(limit, offset, status || undefined);

    return NextResponse.json({
      calls: callLogs,
      pagination: {
        limit,
        offset,
        count: callLogs.length,
      },
    });
  } catch (error: any) {
    console.error("❌ [CALLS API] Error:", error);
    console.error("❌ [CALLS API] Error Stack:", error.stack);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error.message,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
        hint: error.message?.includes("relation") || error.message?.includes("does not exist")
          ? "The call_logs table may not exist. Run supabase-setup.sql in Supabase SQL Editor."
          : undefined,
      },
      { status: 500 }
    );
  }
}

// Handle POST requests (for creating call logs - typically done via webhook)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // This endpoint is mainly for manual call log creation if needed
    // Most call logs are created via the webhook handler
    return NextResponse.json(
      {
        message: "Call logs should be created via webhook endpoint",
        hint: "Use /api/vapi-webhook for call events",
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("❌ [CALLS API] Error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

