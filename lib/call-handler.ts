/**
 * Call Handler Library
 * Manages call state and logging for Vapi phone calls
 */

import { supabase } from "./supabase";

/**
 * Retry utility with exponential backoff
 */
async function retryOperation<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`⚠️ [CALL HANDLER] Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error("Operation failed after retries");
}

/**
 * Circuit breaker state
 */
let circuitBreakerState = {
  failures: 0,
  lastFailureTime: 0,
  isOpen: false,
};

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_TIME = 60000; // 1 minute

/**
 * Check circuit breaker and reset if needed
 */
function checkCircuitBreaker(): boolean {
  const now = Date.now();
  
  // Reset if enough time has passed
  if (circuitBreakerState.isOpen && (now - circuitBreakerState.lastFailureTime) > CIRCUIT_BREAKER_RESET_TIME) {
    console.log("✅ [CALL HANDLER] Circuit breaker reset");
    circuitBreakerState.isOpen = false;
    circuitBreakerState.failures = 0;
  }
  
  return !circuitBreakerState.isOpen;
}

/**
 * Record failure for circuit breaker
 */
function recordFailure() {
  circuitBreakerState.failures++;
  circuitBreakerState.lastFailureTime = Date.now();
  
  if (circuitBreakerState.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreakerState.isOpen = true;
    console.error(`❌ [CALL HANDLER] Circuit breaker opened after ${circuitBreakerState.failures} failures`);
  }
}

/**
 * Record success for circuit breaker
 */
function recordSuccess() {
  if (circuitBreakerState.failures > 0) {
    circuitBreakerState.failures = Math.max(0, circuitBreakerState.failures - 1);
  }
}

/**
 * Check Supabase connection health
 */
async function checkConnectionHealth(): Promise<boolean> {
  try {
    // Simple health check - try to query a minimal table
    const { error } = await supabase
      .from(CALL_LOGS_TABLE)
      .select("id")
      .limit(1);
    
    if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) {
      console.error("❌ [CALL HANDLER] Table 'call_logs' does not exist!");
      console.error("❌ [CALL HANDLER] Please run supabase-setup.sql in Supabase SQL Editor");
      return false;
    }
    
    return true;
  } catch (error: any) {
    console.error("❌ [CALL HANDLER] Connection health check failed:", error.message);
    return false;
  }
}

/**
 * Get actionable error hint
 */
function getErrorHint(error: any): string | undefined {
  if (error?.code === "42P01" || error?.message?.includes("does not exist") || error?.message?.includes("relation")) {
    return "The call_logs table may not exist. Run supabase-setup.sql in Supabase SQL Editor.";
  }
  if (error?.code === "PGRST116") {
    return "No matching record found.";
  }
  if (error?.message?.includes("timeout") || error?.message?.includes("network")) {
    return "Network connection issue. Check your internet connection and Supabase service status.";
  }
  if (error?.message?.includes("authentication") || error?.code === "PGRST301") {
    return "Authentication failed. Check your Supabase credentials in environment variables.";
  }
  return undefined;
}

export interface CallLog {
  id?: string;
  call_id: string;
  phone_number?: string;
  status: CallStatus;
  language?: string;
  started_at?: string;
  ended_at?: string;
  duration_ms?: number;
  transcript?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  // Vapi metrics fields
  vapi_cost_usd?: number;
  vapi_telephony_cost?: number;
  vapi_stt_cost?: number;
  vapi_tts_cost?: number;
  vapi_ai_cost?: number;
  vapi_tokens_used?: number;
  vapi_model_used?: string;
  vapi_recording_url?: string;
  vapi_function_calls_count?: number;
  vapi_hangup_reason?: string;
  vapi_direction?: string;
  vapi_transferred?: boolean;
}

export type CallStatus = 
  | "initiated"
  | "ringing"
  | "in-progress"
  | "completed"
  | "failed"
  | "cancelled";

export const CALL_LOGS_TABLE = "call_logs";
export const VAPI_METRICS_TABLE = "vapi_call_metrics";

/**
 * Create or update a call log entry
 */
export async function upsertCallLog(callLog: Partial<CallLog>): Promise<CallLog | null> {
  // Check circuit breaker
  if (!checkCircuitBreaker()) {
    console.error("❌ [CALL HANDLER] Circuit breaker is open, skipping operation");
    return null;
  }

  try {
    // Check connection health before operation
    const isHealthy = await checkConnectionHealth();
    if (!isHealthy) {
      recordFailure();
      return null;
    }

    // Calculate duration if both timestamps are provided
    if (callLog.started_at && callLog.ended_at) {
      const start = new Date(callLog.started_at).getTime();
      const end = new Date(callLog.ended_at).getTime();
      callLog.duration_ms = end - start;
    }

    const result = await retryOperation(async () => {
      const { data, error } = await supabase
        .from(CALL_LOGS_TABLE)
        .upsert(
          {
            ...callLog,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "call_id",
            ignoreDuplicates: false,
          }
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as CallLog;
    });

    recordSuccess();
    console.log(`✅ [CALL HANDLER] Call log ${callLog.call_id} upserted successfully`);
    return result;
  } catch (error: any) {
    recordFailure();
    const hint = getErrorHint(error);
    
    console.error("❌ [CALL HANDLER] Error upserting call log:", {
      callId: callLog.call_id,
      error: error.message,
      code: error.code,
      details: error.details,
      hint,
    });
    
    return null;
  }
}

/**
 * Get a call log by call ID
 */
export async function getCallLog(callId: string): Promise<CallLog | null> {
  // Check circuit breaker
  if (!checkCircuitBreaker()) {
    console.error("❌ [CALL HANDLER] Circuit breaker is open, skipping operation");
    return null;
  }

  try {
    const result = await retryOperation(async () => {
      const { data, error } = await supabase
        .from(CALL_LOGS_TABLE)
        .select("*")
        .eq("call_id", callId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned - this is not an error
          return null;
        }
        throw error;
      }

      return data as CallLog;
    });

    recordSuccess();
    return result;
  } catch (error: any) {
    recordFailure();
    const hint = getErrorHint(error);
    
    console.error("❌ [CALL HANDLER] Error fetching call log:", {
      callId,
      error: error.message,
      code: error.code,
      hint,
    });
    
    return null;
  }
}

/**
 * Update call status
 */
export async function updateCallStatus(
  callId: string,
  status: CallStatus,
  metadata?: Record<string, any>
): Promise<boolean> {
  // Check circuit breaker
  if (!checkCircuitBreaker()) {
    console.error("❌ [CALL HANDLER] Circuit breaker is open, skipping operation");
    return false;
  }

  try {
    const result = await retryOperation(async () => {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (metadata) {
        // Merge with existing metadata
        const existing = await getCallLog(callId);
        const existingMetadata = existing?.metadata || {};
        updateData.metadata = { ...existingMetadata, ...metadata };
      }

      // If status is completed or failed, set ended_at if not already set
      if ((status === "completed" || status === "failed" || status === "cancelled") && !updateData.ended_at) {
        updateData.ended_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from(CALL_LOGS_TABLE)
        .update(updateData)
        .eq("call_id", callId);

      if (error) {
        throw error;
      }

      return true;
    });

    recordSuccess();
    console.log(`✅ [CALL HANDLER] Call ${callId} status updated to ${status}`);
    return result;
  } catch (error: any) {
    recordFailure();
    const hint = getErrorHint(error);
    
    console.error("❌ [CALL HANDLER] Error updating call status:", {
      callId,
      status,
      error: error.message,
      code: error.code,
      hint,
    });
    
    return false;
  }
}

/**
 * Append transcript to call log
 */
export async function appendTranscript(
  callId: string,
  transcriptText: string
): Promise<boolean> {
  // Check circuit breaker
  if (!checkCircuitBreaker()) {
    console.error("❌ [CALL HANDLER] Circuit breaker is open, skipping operation");
    return false;
  }

  try {
    const result = await retryOperation(async () => {
      const existing = await getCallLog(callId);
      const existingTranscript = existing?.transcript || "";
      
      const newTranscript = existingTranscript
        ? `${existingTranscript}\n${transcriptText}`
        : transcriptText;

      const { error } = await supabase
        .from(CALL_LOGS_TABLE)
        .update({
          transcript: newTranscript,
          updated_at: new Date().toISOString(),
        })
        .eq("call_id", callId);

      if (error) {
        throw error;
      }

      return true;
    });

    recordSuccess();
    return result;
  } catch (error: any) {
    recordFailure();
    const hint = getErrorHint(error);
    
    console.error("❌ [CALL HANDLER] Error appending transcript:", {
      callId,
      error: error.message,
      code: error.code,
      hint,
    });
    
    return false;
  }
}

/**
 * Get recent call logs with pagination
 */
export async function getRecentCallLogs(
  limit: number = 50,
  offset: number = 0,
  status?: CallStatus
): Promise<CallLog[]> {
  // Check circuit breaker
  if (!checkCircuitBreaker()) {
    console.error("❌ [CALL HANDLER] Circuit breaker is open, skipping operation");
    return [];
  }

  try {
    const result = await retryOperation(async () => {
      let query = supabase
        .from(CALL_LOGS_TABLE)
        .select("*")
        .order("started_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []) as CallLog[];
    });

    recordSuccess();
    return result;
  } catch (error: any) {
    recordFailure();
    const hint = getErrorHint(error);
    
    console.error("❌ [CALL HANDLER] Error fetching call logs:", {
      limit,
      offset,
      status,
      error: error.message,
      code: error.code,
      hint,
    });
    
    return [];
  }
}

/**
 * Get call statistics
 */
export async function getCallStatistics(
  startDate?: Date,
  endDate?: Date
): Promise<{
  total: number;
  completed: number;
  failed: number;
  averageDuration: number;
  totalDuration: number;
}> {
  // Check circuit breaker
  if (!checkCircuitBreaker()) {
    console.error("❌ [CALL HANDLER] Circuit breaker is open, skipping operation");
    return {
      total: 0,
      completed: 0,
      failed: 0,
      averageDuration: 0,
      totalDuration: 0,
    };
  }

  try {
    const result = await retryOperation(async () => {
      let query = supabase.from(CALL_LOGS_TABLE).select("status,duration_ms");

      if (startDate) {
        query = query.gte("started_at", startDate.toISOString());
      }
      if (endDate) {
        query = query.lte("started_at", endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const calls = (data || []) as CallLog[];
      const total = calls.length;
      const completed = calls.filter((c) => c.status === "completed").length;
      const failed = calls.filter((c) => c.status === "failed" || c.status === "cancelled").length;
      
      const durations = calls
        .filter((c) => c.duration_ms !== null && c.duration_ms !== undefined)
        .map((c) => c.duration_ms!);
      
      const totalDuration = durations.reduce((sum, d) => sum + d, 0);
      const averageDuration = durations.length > 0 ? totalDuration / durations.length : 0;

      return {
        total,
        completed,
        failed,
        averageDuration: Math.round(averageDuration),
        totalDuration,
      };
    });

    recordSuccess();
    return result;
  } catch (error: any) {
    recordFailure();
    const hint = getErrorHint(error);
    
    console.error("❌ [CALL HANDLER] Error fetching call statistics:", {
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      error: error.message,
      code: error.code,
      hint,
    });
    
    return {
      total: 0,
      completed: 0,
      failed: 0,
      averageDuration: 0,
      totalDuration: 0,
    };
  }
}

/**
 * Vapi Metrics Types
 */
export interface VapiCallMetrics {
  id?: string;
  call_id: string;
  total_cost_usd?: number;
  telephony_cost_usd?: number;
  stt_cost_usd?: number;
  stt_minutes?: number;
  tts_cost_usd?: number;
  tts_characters?: number;
  ai_cost_usd?: number;
  ai_tokens_input?: number;
  ai_tokens_output?: number;
  ai_model?: string;
  average_latency_ms?: number;
  jitter_ms?: number;
  packet_loss_percent?: number;
  connection_quality?: string;
  recording_url?: string;
  recording_duration_ms?: number;
  function_calls_count?: number;
  function_calls_success?: number;
  function_calls_failed?: number;
  transfers_count?: number;
  sentiment_score?: number;
  vapi_assistant_id?: string;
  vapi_phone_number_id?: string;
  raw_vapi_data?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Store Vapi metrics for a call
 * Updates both call_logs table (summary columns) and vapi_call_metrics table (detailed metrics)
 */
export async function storeVapiMetrics(
  callId: string,
  metrics: {
    // Cost breakdown
    totalCostUsd?: number;
    telephonyCostUsd?: number;
    sttCostUsd?: number;
    sttMinutes?: number;
    ttsCostUsd?: number;
    ttsCharacters?: number;
    aiCostUsd?: number;
    aiTokensInput?: number;
    aiTokensOutput?: number;
    aiModel?: string;
    // Quality metrics
    averageLatencyMs?: number;
    jitterMs?: number;
    packetLossPercent?: number;
    connectionQuality?: string;
    // Call metrics
    recordingUrl?: string;
    recordingDurationMs?: number;
    functionCallsCount?: number;
    functionCallsSuccess?: number;
    functionCallsFailed?: number;
    transfersCount?: number;
    sentimentScore?: number;
    // Call details
    hangupReason?: string;
    direction?: "inbound" | "outbound";
    transferred?: boolean;
    assistantId?: string;
    phoneNumberId?: string;
    // Raw data
    rawVapiData?: Record<string, any>;
  }
): Promise<boolean> {
  // Check circuit breaker
  if (!checkCircuitBreaker()) {
    console.error("❌ [CALL HANDLER] Circuit breaker is open, skipping operation");
    return false;
  }

  try {
    // Check connection health before operation
    const isHealthy = await checkConnectionHealth();
    if (!isHealthy) {
      recordFailure();
      return false;
    }

    const result = await retryOperation(async () => {
      // Update call_logs table with summary metrics
      const callLogUpdate: any = {
        vapi_cost_usd: metrics.totalCostUsd,
        vapi_telephony_cost: metrics.telephonyCostUsd,
        vapi_stt_cost: metrics.sttCostUsd,
        vapi_tts_cost: metrics.ttsCostUsd,
        vapi_ai_cost: metrics.aiCostUsd,
        vapi_tokens_used: metrics.aiTokensInput && metrics.aiTokensOutput
          ? (metrics.aiTokensInput + metrics.aiTokensOutput)
          : undefined,
        vapi_model_used: metrics.aiModel,
        vapi_recording_url: metrics.recordingUrl,
        vapi_function_calls_count: metrics.functionCallsCount,
        vapi_hangup_reason: metrics.hangupReason,
        vapi_direction: metrics.direction,
        vapi_transferred: metrics.transferred,
        updated_at: new Date().toISOString(),
      };

      // Remove undefined values
      Object.keys(callLogUpdate).forEach(
        (key) => callLogUpdate[key] === undefined && delete callLogUpdate[key]
      );

      if (Object.keys(callLogUpdate).length > 1) { // More than just updated_at
        const { error: callLogError } = await supabase
          .from(CALL_LOGS_TABLE)
          .update(callLogUpdate)
          .eq("call_id", callId);

        if (callLogError) {
          console.warn("⚠️ [CALL HANDLER] Error updating call_logs metrics:", callLogError.message);
          // Don't throw - continue to store detailed metrics
        }
      }

      // Store detailed metrics in vapi_call_metrics table
      const detailedMetrics: any = {
        call_id: callId,
        total_cost_usd: metrics.totalCostUsd,
        telephony_cost_usd: metrics.telephonyCostUsd,
        stt_cost_usd: metrics.sttCostUsd,
        stt_minutes: metrics.sttMinutes,
        tts_cost_usd: metrics.ttsCostUsd,
        tts_characters: metrics.ttsCharacters,
        ai_cost_usd: metrics.aiCostUsd,
        ai_tokens_input: metrics.aiTokensInput,
        ai_tokens_output: metrics.aiTokensOutput,
        ai_model: metrics.aiModel,
        average_latency_ms: metrics.averageLatencyMs,
        jitter_ms: metrics.jitterMs,
        packet_loss_percent: metrics.packetLossPercent,
        connection_quality: metrics.connectionQuality,
        recording_url: metrics.recordingUrl,
        recording_duration_ms: metrics.recordingDurationMs,
        function_calls_count: metrics.functionCallsCount,
        function_calls_success: metrics.functionCallsSuccess,
        function_calls_failed: metrics.functionCallsFailed,
        transfers_count: metrics.transfersCount,
        sentiment_score: metrics.sentimentScore,
        vapi_assistant_id: metrics.assistantId,
        vapi_phone_number_id: metrics.phoneNumberId,
        raw_vapi_data: metrics.rawVapiData,
        updated_at: new Date().toISOString(),
      };

      // Remove undefined values
      Object.keys(detailedMetrics).forEach(
        (key) => detailedMetrics[key] === undefined && delete detailedMetrics[key]
      );

      // Upsert detailed metrics (update if exists, insert if not)
      // Note: call_id must exist in call_logs first due to foreign key constraint
      const { error: metricsError } = await supabase
        .from(VAPI_METRICS_TABLE)
        .upsert(detailedMetrics, {
          onConflict: "call_id",
          ignoreDuplicates: false,
        });

      if (metricsError) {
        // Log detailed error for debugging
        console.error("❌ [CALL HANDLER] Error upserting Vapi metrics:", {
          callId,
          error: metricsError.message,
          code: metricsError.code,
          details: metricsError.details,
          hint: metricsError.hint,
        });
        throw metricsError;
      }

      return true;
    });

    recordSuccess();
    console.log(`✅ [CALL HANDLER] Vapi metrics stored for call ${callId}`);
    return result;
  } catch (error: any) {
    recordFailure();
    const hint = getErrorHint(error);
    
    console.error("❌ [CALL HANDLER] Error storing Vapi metrics:", {
      callId,
      error: error.message,
      code: error.code,
      hint,
    });
    
    return false;
  }
}

/**
 * Get Vapi metrics for a call
 */
export async function getVapiMetrics(callId: string): Promise<VapiCallMetrics | null> {
  // Check circuit breaker
  if (!checkCircuitBreaker()) {
    console.error("❌ [CALL HANDLER] Circuit breaker is open, skipping operation");
    return null;
  }

  try {
    const result = await retryOperation(async () => {
      const { data, error } = await supabase
        .from(VAPI_METRICS_TABLE)
        .select("*")
        .eq("call_id", callId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned - this is not an error
          return null;
        }
        throw error;
      }

      return data as VapiCallMetrics;
    });

    recordSuccess();
    return result;
  } catch (error: any) {
    recordFailure();
    const hint = getErrorHint(error);
    
    console.error("❌ [CALL HANDLER] Error fetching Vapi metrics:", {
      callId,
      error: error.message,
      code: error.code,
      hint,
    });
    
    return null;
  }
}

/**
 * Get Vapi metrics for multiple calls
 */
export async function getVapiMetricsBatch(
  callIds: string[]
): Promise<VapiCallMetrics[]> {
  // Check circuit breaker
  if (!checkCircuitBreaker()) {
    console.error("❌ [CALL HANDLER] Circuit breaker is open, skipping operation");
    return [];
  }

  if (callIds.length === 0) {
    return [];
  }

  try {
    const result = await retryOperation(async () => {
      const { data, error } = await supabase
        .from(VAPI_METRICS_TABLE)
        .select("*")
        .in("call_id", callIds);

      if (error) {
        throw error;
      }

      return (data || []) as VapiCallMetrics[];
    });

    recordSuccess();
    return result;
  } catch (error: any) {
    recordFailure();
    const hint = getErrorHint(error);
    
    console.error("❌ [CALL HANDLER] Error fetching Vapi metrics batch:", {
      callIds: callIds.length,
      error: error.message,
      code: error.code,
      hint,
    });
    
    return [];
  }
}

