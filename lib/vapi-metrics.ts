/**
 * Vapi Metrics Extraction Library
 * Extracts and parses comprehensive metrics from Vapi webhook payloads
 */

export interface VapiMetrics {
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
}

/**
 * Extract metrics from Vapi webhook payload
 * Handles various webhook event types and payload structures
 */
export function extractVapiMetrics(webhookPayload: any): VapiMetrics {
  const metrics: VapiMetrics = {};

  // Get the call/message object (can be nested in different ways)
  // For end-of-call-report, data is in webhookPayload.message
  const message = webhookPayload.message || webhookPayload;
  const call = message.call || webhookPayload.call || message;
  const cost = message.cost || message.costBreakdown || call.cost || webhookPayload.cost;
  const summary = message.summary || call.summary || webhookPayload.summary;
  const metricsData = message.metrics || call.metrics || webhookPayload.metrics;
  const analysis = message.analysis || call.analysis || webhookPayload.analysis;
  const costs = message.costs || call.costs || webhookPayload.costs;

  // Extract cost breakdown from costs array (Vapi's detailed format)
  if (costs && Array.isArray(costs)) {
    for (const costItem of costs) {
      switch (costItem.type) {
        case "transcriber":
          metrics.sttCostUsd = costItem.cost;
          metrics.sttMinutes = costItem.minutes;
          break;
        case "model":
          metrics.aiCostUsd = costItem.cost;
          metrics.aiTokensInput = costItem.promptTokens;
          metrics.aiTokensOutput = costItem.completionTokens;
          if (costItem.model?.model) {
            metrics.aiModel = costItem.model.model;
          }
          break;
        case "voice":
          metrics.ttsCostUsd = costItem.cost;
          metrics.ttsCharacters = costItem.characters;
          break;
        case "vapi":
          metrics.telephonyCostUsd = costItem.cost;
          break;
      }
    }
  }

  // Extract cost breakdown from cost/costBreakdown object (alternative format)
  if (cost) {
    // Cost can be a number (total) or an object with breakdown
    if (typeof cost === "number") {
      metrics.totalCostUsd = cost;
    } else if (typeof cost === "object") {
      if (cost.total !== undefined) metrics.totalCostUsd = cost.total;
      if (cost.totalCost !== undefined) metrics.totalCostUsd = cost.totalCost;
      if (cost.stt !== undefined) metrics.sttCostUsd = cost.stt;
      if (cost.llm !== undefined) metrics.aiCostUsd = cost.llm;
      if (cost.tts !== undefined) metrics.ttsCostUsd = cost.tts;
      if (cost.vapi !== undefined) metrics.telephonyCostUsd = cost.vapi;

      // Extract token counts from costBreakdown
      if (cost.llmPromptTokens !== undefined) metrics.aiTokensInput = cost.llmPromptTokens;
      if (cost.llmCompletionTokens !== undefined) metrics.aiTokensOutput = cost.llmCompletionTokens;
      if (cost.ttsCharacters !== undefined) metrics.ttsCharacters = cost.ttsCharacters;
    }
  }

  // Extract STT metrics
  if (metricsData?.stt || call.stt) {
    const sttData = metricsData?.stt || call.stt;
    metrics.sttMinutes = sttData.minutes || sttData.duration;
    if (!metrics.sttCostUsd && sttData.cost) {
      metrics.sttCostUsd = sttData.cost;
    }
  }

  // Extract TTS metrics
  if (metricsData?.tts || call.tts) {
    const ttsData = metricsData?.tts || call.tts;
    metrics.ttsCharacters = ttsData.characters || ttsData.chars;
    if (!metrics.ttsCostUsd && ttsData.cost) {
      metrics.ttsCostUsd = ttsData.cost;
    }
  }

  // Extract AI/LLM metrics
  if (metricsData?.llm || metricsData?.ai || call.llm || call.ai) {
    const aiData = metricsData?.llm || metricsData?.ai || call.llm || call.ai;
    metrics.aiModel = aiData.model || aiData.modelName;
    metrics.aiTokensInput = aiData.inputTokens || aiData.tokensInput || aiData.promptTokens;
    metrics.aiTokensOutput = aiData.outputTokens || aiData.tokensOutput || aiData.completionTokens;
    if (!metrics.aiCostUsd && aiData.cost) {
      metrics.aiCostUsd = aiData.cost;
    }
  }

  // Extract total tokens (if not broken down)
  if (call.tokens || webhookPayload.tokens) {
    const tokens = call.tokens || webhookPayload.tokens;
    if (typeof tokens === "number") {
      // If only total tokens provided, estimate input/output split (70/30)
      metrics.aiTokensInput = Math.round(tokens * 0.7);
      metrics.aiTokensOutput = Math.round(tokens * 0.3);
    }
  }

  // Extract model name from various locations
  if (!metrics.aiModel) {
    metrics.aiModel = call.model || call.modelName || webhookPayload.model;
  }

  // Extract quality metrics
  if (metricsData?.quality || call.quality) {
    const qualityData = metricsData?.quality || call.quality;
    metrics.averageLatencyMs = qualityData.latency || qualityData.averageLatency || qualityData.avgLatency;
    metrics.jitterMs = qualityData.jitter;
    metrics.packetLossPercent = qualityData.packetLoss || qualityData.packetLossPercent;
    metrics.connectionQuality = qualityData.quality || qualityData.connectionQuality;
  }

  // Extract from analysis object
  if (analysis) {
    if (analysis.sentiment !== undefined) {
      metrics.sentimentScore = analysis.sentiment;
    }
    if (analysis.latency !== undefined) {
      metrics.averageLatencyMs = analysis.latency;
    }
  }

  // Extract recording information
  metrics.recordingUrl = message.recordingUrl || call.recordingUrl || call.recording || webhookPayload.recordingUrl;
  if (message.recordingDurationMs || message.durationMs || call.recordingDuration || call.recordingDurationMs) {
    metrics.recordingDurationMs = message.recordingDurationMs || message.durationMs || call.recordingDurationMs || call.recordingDuration;
  }

  // Extract function call metrics
  if (call.functionCalls || webhookPayload.functionCalls) {
    const functionCalls = call.functionCalls || webhookPayload.functionCalls;
    if (Array.isArray(functionCalls)) {
      metrics.functionCallsCount = functionCalls.length;
      metrics.functionCallsSuccess = functionCalls.filter((fc: any) => 
        fc.status === "success" || fc.success === true || !fc.error
      ).length;
      metrics.functionCallsFailed = functionCalls.length - (metrics.functionCallsSuccess || 0);
    } else if (typeof functionCalls === "object") {
      metrics.functionCallsCount = functionCalls.count || functionCalls.total;
      metrics.functionCallsSuccess = functionCalls.success || functionCalls.successCount;
      metrics.functionCallsFailed = functionCalls.failed || functionCalls.failedCount;
    }
  }

  // Extract transfer information
  if (call.transfers || webhookPayload.transfers) {
    const transfers = call.transfers || webhookPayload.transfers;
    if (Array.isArray(transfers)) {
      metrics.transfersCount = transfers.length;
      metrics.transferred = transfers.length > 0;
    } else if (typeof transfers === "object") {
      metrics.transfersCount = transfers.count || transfers.total;
      metrics.transferred = (metrics.transfersCount || 0) > 0;
    } else if (typeof transfers === "boolean") {
      metrics.transferred = transfers;
    }
  }

  // Extract hangup reason
  metrics.hangupReason = message.endedReason || call.hangupReason || call.hangup_reason || call.reason || webhookPayload.hangupReason;

  // Extract direction
  const directionStr = message.direction || call.direction || webhookPayload.direction || call.type;
  if (directionStr) {
    const direction = directionStr.toLowerCase();
    if (direction === "inbound" || direction === "in" || direction === "incoming" || direction.includes("inbound")) {
      metrics.direction = "inbound";
    } else if (direction === "outbound" || direction === "out" || direction === "outgoing" || direction.includes("outbound")) {
      metrics.direction = "outbound";
    }
  }

  // Extract assistant and phone number IDs
  metrics.assistantId = message.assistant?.id || call.assistantId || call.assistant_id || call.assistant?.id || webhookPayload.assistantId;
  metrics.phoneNumberId = message.phoneNumber?.id || call.phoneNumberId || call.phone_number_id || call.phoneNumber?.id || webhookPayload.phoneNumberId;

  return metrics;
}

/**
 * Calculate total cost from metrics if not provided
 */
export function calculateTotalCost(metrics: VapiMetrics): number {
  if (metrics.totalCostUsd !== undefined) {
    return metrics.totalCostUsd;
  }

  let total = 0;
  if (metrics.telephonyCostUsd) total += metrics.telephonyCostUsd;
  if (metrics.sttCostUsd) total += metrics.sttCostUsd;
  if (metrics.ttsCostUsd) total += metrics.ttsCostUsd;
  if (metrics.aiCostUsd) total += metrics.aiCostUsd;

  return total;
}

/**
 * Validate and normalize metrics
 */
export function normalizeMetrics(metrics: VapiMetrics): VapiMetrics {
  const normalized = { ...metrics };

  // Ensure total cost is calculated if missing
  if (normalized.totalCostUsd === undefined) {
    normalized.totalCostUsd = calculateTotalCost(normalized);
  }

  // Ensure function calls count is set if success/failed are provided
  if (normalized.functionCallsSuccess !== undefined || normalized.functionCallsFailed !== undefined) {
    const success = normalized.functionCallsSuccess || 0;
    const failed = normalized.functionCallsFailed || 0;
    if (normalized.functionCallsCount === undefined) {
      normalized.functionCallsCount = success + failed;
    }
  }

  // Ensure transferred is set if transfers count is provided
  if (normalized.transfersCount !== undefined && normalized.transferred === undefined) {
    normalized.transferred = normalized.transfersCount > 0;
  }

  return normalized;
}

