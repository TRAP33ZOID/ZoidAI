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
}

export type CallStatus = 
  | "initiated"
  | "ringing"
  | "in-progress"
  | "completed"
  | "failed"
  | "cancelled";

export const CALL_LOGS_TABLE = "call_logs";

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

