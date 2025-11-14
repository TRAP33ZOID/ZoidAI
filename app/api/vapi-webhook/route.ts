import { NextResponse } from "next/server";
import {
  upsertCallLog,
  updateCallStatus,
  appendTranscript,
  CallStatus,
} from "@/lib/call-handler";

/**
 * Retry utility with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 100
): Promise<T | null> {
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`⚠️ [RETRY] Attempt ${attempt} failed, retrying in ${delay}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`❌ [RETRY] All ${maxAttempts} attempts failed`);
  return null;
}

/**
 * Safe database operation wrapper with retry and graceful degradation
 */
async function safeDbOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  callId?: string,
  fallbackValue: T | null = null
): Promise<T | null> {
  try {
    const result = await retryWithBackoff(operation, 3, 100);
    if (result === null && fallbackValue !== null) {
      console.warn(`⚠️ [SAFE DB] ${operationName} failed, using fallback for call ${callId || 'unknown'}`);
      return fallbackValue;
    }
    return result;
  } catch (error: any) {
    console.error(`❌ [SAFE DB] ${operationName} failed after retries:`, {
      callId,
      error: error.message,
      stack: error.stack,
    });
    return fallbackValue;
  }
}

/**
 * Vapi Webhook Endpoint
 * Handles call events from Vapi (status updates, end-of-call, etc.)
 * 
 * Vapi sends webhooks for:
 * - status-update: Call status changes
 * - end-of-call-report: Call completion summary
 * - function-call: Function execution requests (handled separately)
 */
export async function POST(req: Request) {
  const callContext: { callId?: string; eventType?: string } = {};
  
  try {
    const body = await req.json();
    
    console.log("\n========================================");
    console.log("📞 [VAPI WEBHOOK] Received webhook");
    console.log("========================================");
    console.log("Event Type:", body.type || body.message?.type || "unknown");
    console.log("Call ID:", body.call?.id || body.callId || "N/A");
    console.log("Full Body:", JSON.stringify(body, null, 2));
    console.log("========================================\n");

    // Verify webhook token if configured (skip in development for testing)
    const webhookToken = process.env.VAPI_WEBHOOK_TOKEN;
    const isDevelopment = process.env.NODE_ENV === "development";
    
    if (webhookToken && !isDevelopment) {
      const providedToken = req.headers.get("x-vapi-webhook-token");
      if (providedToken !== webhookToken) {
        console.warn("⚠️ Webhook token mismatch");
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    } else if (webhookToken && isDevelopment) {
      // In development, log but don't block (for testing)
      const providedToken = req.headers.get("x-vapi-webhook-token");
      if (providedToken && providedToken !== webhookToken) {
        console.warn("⚠️ Webhook token mismatch (development mode - allowing anyway)");
      }
    }

    const eventType = body.type || body.message?.type || "unknown";
    const callId = body.call?.id || body.callId || body.id;
    const call = body.call || body;
    
    // Store context for error logging
    callContext.callId = callId;
    callContext.eventType = eventType;

    // Map Vapi status to our CallStatus type
    const mapVapiStatusToCallStatus = (vapiStatus: string): CallStatus => {
      const statusMap: Record<string, CallStatus> = {
        queued: "initiated",
        ringing: "ringing",
        "in-progress": "in-progress",
        "call-ended": "completed",
        ended: "completed",
        failed: "failed",
        cancelled: "cancelled",
      };
      return statusMap[vapiStatus?.toLowerCase()] || "initiated";
    };

    switch (eventType) {
      case "status-update":
      case "call-status-update":
        // Handle call status updates with error recovery
        try {
          const status = mapVapiStatusToCallStatus(call.status || body.status || "initiated");
          console.log("📊 Status Update:", status);

          if (callId) {
            // Create or update call log with retry
            await safeDbOperation(
              () => upsertCallLog({
                call_id: callId,
                phone_number: call.from || call.phoneNumber || call.customer?.number,
                status: status,
                language: call.language || call.metadata?.language,
                started_at: call.startedAt || call.startTime || new Date().toISOString(),
                metadata: {
                  vapi_status: call.status || body.status,
                  ...call.metadata,
                },
              }),
              "upsertCallLog",
              callId
            );

            // Update status if call already exists (non-blocking)
            await safeDbOperation(
              () => updateCallStatus(callId, status),
              "updateCallStatus",
              callId
            );
          }
        } catch (error: any) {
          console.error("❌ [WEBHOOK] Error in status-update handler:", {
            callId,
            error: error.message,
            stack: error.stack,
          });
          // Continue processing - don't break the webhook
        }
        break;

      case "end-of-call-report":
      case "call-ended":
        // Handle end of call with error recovery
        try {
          console.log("📋 Call Ended");
          
          if (callId) {
            const startedAt = call.startedAt || call.startTime;
            const endedAt = call.endedAt || call.endTime || new Date().toISOString();
            const duration = startedAt && endedAt
              ? new Date(endedAt).getTime() - new Date(startedAt).getTime()
              : undefined;

            console.log("Duration:", duration ? `${duration}ms` : "N/A");

            // Update call log with end information (with retry)
            await safeDbOperation(
              () => upsertCallLog({
                call_id: callId,
                phone_number: call.from || call.phoneNumber || call.customer?.number,
                status: "completed",
                language: call.language || call.metadata?.language,
                started_at: startedAt,
                ended_at: endedAt,
                duration_ms: duration,
                transcript: call.transcript || call.summary?.transcript,
                metadata: {
                  vapi_status: call.status,
                  summary: call.summary,
                  cost: call.cost,
                  ...call.metadata,
                },
              }),
              "upsertCallLog (end-of-call)",
              callId
            );

            // Append transcript if available (non-blocking)
            if (call.transcript || call.summary?.transcript) {
              await safeDbOperation(
                () => appendTranscript(callId, call.transcript || call.summary.transcript),
                "appendTranscript",
                callId
              );
            }
          }
        } catch (error: any) {
          console.error("❌ [WEBHOOK] Error in end-of-call handler:", {
            callId,
            error: error.message,
            stack: error.stack,
          });
          // Continue processing - don't break the webhook
        }
        break;

      case "transcript":
      case "message":
        // Handle transcript updates during call with error recovery
        try {
          if (callId && (body.transcript || body.text || body.content)) {
            const transcriptText = body.transcript || body.text || body.content;
            console.log("📝 Transcript update received");
            await safeDbOperation(
              () => appendTranscript(callId, transcriptText),
              "appendTranscript",
              callId
            );
          }
        } catch (error: any) {
          console.error("❌ [WEBHOOK] Error in transcript handler:", {
            callId,
            error: error.message,
            stack: error.stack,
          });
          // Continue processing - don't break the webhook
        }
        break;

      case "function-call":
        // Function calls can be handled here or forwarded to server function endpoint
        console.log("🔧 Function call received");
        console.log("Function Name:", body.functionCall?.name || "unknown");
        // Note: If Vapi sends function calls to webhook, you may need to forward them
        // to /api/vapi-function or handle them here
        break;

      case "call-started":
      case "call-initiated":
        // Handle call initiation with error recovery
        try {
          console.log("📞 Call Started");
          if (callId) {
            await safeDbOperation(
              () => upsertCallLog({
                call_id: callId,
                phone_number: call.from || call.phoneNumber || call.customer?.number,
                status: "initiated",
                language: call.language || call.metadata?.language,
                started_at: call.startedAt || call.startTime || new Date().toISOString(),
                metadata: {
                  vapi_status: call.status,
                  ...call.metadata,
                },
              }),
              "upsertCallLog (call-started)",
              callId
            );
          }
        } catch (error: any) {
          console.error("❌ [WEBHOOK] Error in call-started handler:", {
            callId,
            error: error.message,
            stack: error.stack,
          });
          // Continue processing - don't break the webhook
        }
        break;

      default:
        // Handle unknown event types with error recovery
        try {
          console.log("ℹ️ Unknown event type:", eventType);
          // Try to create/update call log for unknown events if we have a call ID
          if (callId) {
            await safeDbOperation(
              () => upsertCallLog({
                call_id: callId,
                phone_number: call.from || call.phoneNumber,
                status: "in-progress",
                metadata: {
                  event_type: eventType,
                  raw_body: body,
                },
              }),
              "upsertCallLog (unknown event)",
              callId
            );
          }
        } catch (error: any) {
          console.error("❌ [WEBHOOK] Error in default handler:", {
            callId,
            eventType,
            error: error.message,
            stack: error.stack,
          });
          // Continue processing - don't break the webhook
        }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ 
      success: true,
      received: true 
    });

  } catch (error: any) {
    // Structured error logging with call context
    console.error("❌ [VAPI WEBHOOK] Critical error processing webhook:", {
      callId: callContext.callId || "unknown",
      eventType: callContext.eventType || "unknown",
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    
    // Always return 200 to prevent Vapi from retrying and breaking call flow
    // Logging failures should not break the actual call
    return NextResponse.json({ 
      success: true,
      received: true,
      error: "Logging failed but webhook processed",
      message: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
}

// Handle GET requests (for webhook verification)
export async function GET(req: Request) {
  return NextResponse.json({ 
    message: "Vapi webhook endpoint is active",
    timestamp: new Date().toISOString()
  });
}

