import { NextRequest, NextResponse } from "next/server";
import {
  getVapiMetrics,
  getVapiMetricsBatch,
  getRecentCallLogs,
  VapiCallMetrics,
} from "@/lib/call-handler";
import { calculateCostStatistics } from "@/lib/vapi-cost-calculator";
import { VapiMetrics } from "@/lib/vapi-metrics";

/**
 * Vapi Metrics API Endpoint
 * GET /api/vapi-metrics
 * 
 * Query parameters:
 * - callId: Get metrics for a specific call
 * - stats: Get aggregated statistics (true/false)
 * - startDate: Filter by start date (ISO string)
 * - endDate: Filter by end date (ISO string)
 * - limit: Limit number of results (default: 50)
 * - offset: Offset for pagination (default: 0)
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const callId = searchParams.get("callId");
    const stats = searchParams.get("stats") === "true";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Parse date filters
    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    // Validate dates
    if (startDate && isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid startDate format. Use ISO 8601 format." },
        { status: 400 }
      );
    }
    if (endDate && isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid endDate format. Use ISO 8601 format." },
        { status: 400 }
      );
    }

    // Get metrics for a specific call
    if (callId) {
      const metrics = await getVapiMetrics(callId);
      if (!metrics) {
        return NextResponse.json(
          { error: "Metrics not found for this call" },
          { status: 404 }
        );
      }
      return NextResponse.json({ metrics });
    }

    // Get aggregated statistics
    if (stats) {
      // Get recent call logs to get call IDs
      const callLogs = await getRecentCallLogs(1000, 0); // Get up to 1000 calls for stats
      
      // Filter by date range if provided
      let filteredCallLogs = callLogs;
      if (startDate || endDate) {
        filteredCallLogs = callLogs.filter((log) => {
          if (!log.started_at) return false;
          const logDate = new Date(log.started_at);
          if (startDate && logDate < startDate) return false;
          if (endDate && logDate > endDate) return false;
          return true;
        });
      }

      // Get metrics for all filtered calls
      const callIds = filteredCallLogs.map((log) => log.call_id);
      const allMetrics = await getVapiMetricsBatch(callIds);

      // Convert to VapiMetrics format for cost calculator
      const metricsArray: VapiMetrics[] = allMetrics.map((m) => ({
        totalCostUsd: m.total_cost_usd,
        telephonyCostUsd: m.telephony_cost_usd,
        sttCostUsd: m.stt_cost_usd,
        sttMinutes: m.stt_minutes,
        ttsCostUsd: m.tts_cost_usd,
        ttsCharacters: m.tts_characters,
        aiCostUsd: m.ai_cost_usd,
        aiTokensInput: m.ai_tokens_input,
        aiTokensOutput: m.ai_tokens_output,
        aiModel: m.ai_model,
        averageLatencyMs: m.average_latency_ms,
        jitterMs: m.jitter_ms,
        packetLossPercent: m.packet_loss_percent,
        connectionQuality: m.connection_quality,
        recordingUrl: m.recording_url,
        recordingDurationMs: m.recording_duration_ms,
        functionCallsCount: m.function_calls_count,
        functionCallsSuccess: m.function_calls_success,
        functionCallsFailed: m.function_calls_failed,
        transfersCount: m.transfers_count,
        sentimentScore: m.sentiment_score,
        hangupReason: undefined,
        direction: undefined,
        transferred: undefined,
        assistantId: m.vapi_assistant_id,
        phoneNumberId: m.vapi_phone_number_id,
      }));

      // Calculate statistics
      const costStats = calculateCostStatistics(metricsArray);

      // Calculate additional statistics
      const totalCalls = allMetrics.length;
      const callsWithMetrics = allMetrics.filter((m) => m.total_cost_usd !== null && m.total_cost_usd !== undefined).length;
      
      // Quality metrics
      const latencyValues = allMetrics
        .filter((m) => m.average_latency_ms !== null && m.average_latency_ms !== undefined)
        .map((m) => m.average_latency_ms!);
      const averageLatency = latencyValues.length > 0
        ? latencyValues.reduce((sum, val) => sum + val, 0) / latencyValues.length
        : 0;

      // AI usage statistics
      const totalTokensInput = allMetrics
        .filter((m) => m.ai_tokens_input !== null && m.ai_tokens_input !== undefined)
        .reduce((sum, m) => sum + (m.ai_tokens_input || 0), 0);
      const totalTokensOutput = allMetrics
        .filter((m) => m.ai_tokens_output !== null && m.ai_tokens_output !== undefined)
        .reduce((sum, m) => sum + (m.ai_tokens_output || 0), 0);
      const totalTokens = totalTokensInput + totalTokensOutput;

      // Model distribution
      const modelCounts: Record<string, number> = {};
      allMetrics.forEach((m) => {
        if (m.ai_model) {
          modelCounts[m.ai_model] = (modelCounts[m.ai_model] || 0) + 1;
        }
      });

      // Function call statistics
      const totalFunctionCalls = allMetrics
        .filter((m) => m.function_calls_count !== null && m.function_calls_count !== undefined)
        .reduce((sum, m) => sum + (m.function_calls_count || 0), 0);
      const totalFunctionCallsSuccess = allMetrics
        .filter((m) => m.function_calls_success !== null && m.function_calls_success !== undefined)
        .reduce((sum, m) => sum + (m.function_calls_success || 0), 0);
      const totalFunctionCallsFailed = allMetrics
        .filter((m) => m.function_calls_failed !== null && m.function_calls_failed !== undefined)
        .reduce((sum, m) => sum + (m.function_calls_failed || 0), 0);
      const functionCallSuccessRate = totalFunctionCalls > 0
        ? (totalFunctionCallsSuccess / totalFunctionCalls) * 100
        : 0;

      return NextResponse.json({
        statistics: {
          totalCalls,
          callsWithMetrics,
          cost: costStats,
          quality: {
            averageLatencyMs: Math.round(averageLatency),
            callsWithLatency: latencyValues.length,
          },
          aiUsage: {
            totalTokens,
            totalTokensInput,
            totalTokensOutput,
            modelDistribution: modelCounts,
          },
          functionCalls: {
            total: totalFunctionCalls,
            success: totalFunctionCallsSuccess,
            failed: totalFunctionCallsFailed,
            successRate: Math.round(functionCallSuccessRate * 100) / 100,
          },
        },
      });
    }

    // Get paginated list of metrics
    // First get call logs, then get metrics for those calls
    const callLogs = await getRecentCallLogs(limit, offset);
    
    // Filter by date range if provided
    let filteredCallLogs = callLogs;
    if (startDate || endDate) {
      filteredCallLogs = callLogs.filter((log) => {
        if (!log.started_at) return false;
        const logDate = new Date(log.started_at);
        if (startDate && logDate < startDate) return false;
        if (endDate && logDate > endDate) return false;
        return true;
      });
    }

    const callIds = filteredCallLogs.map((log) => log.call_id);
    const metrics = await getVapiMetricsBatch(callIds);

    // Combine call logs with metrics
    const metricsWithCalls = filteredCallLogs.map((callLog) => {
      const metric = metrics.find((m) => m.call_id === callLog.call_id);
      return {
        call: callLog,
        metrics: metric || null,
      };
    });

    return NextResponse.json({
      metrics: metricsWithCalls,
      pagination: {
        limit,
        offset,
        total: filteredCallLogs.length,
      },
    });
  } catch (error: any) {
    console.error("❌ [VAPI METRICS API] Error:", {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        error: "Failed to fetch Vapi metrics",
        message: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

