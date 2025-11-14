/**
 * Vapi Cost Calculator Library
 * Calculates cost breakdowns and aggregations from Vapi metrics
 */

import { VapiMetrics, calculateTotalCost } from "./vapi-metrics";

export interface CostBreakdown {
  total: number;
  telephony: number;
  stt: number;
  tts: number;
  ai: number;
}

export interface CostStatistics {
  totalCost: number;
  averageCostPerCall: number;
  costBreakdown: CostBreakdown;
  costByCategory: {
    telephony: { total: number; percentage: number };
    stt: { total: number; percentage: number };
    tts: { total: number; percentage: number };
    ai: { total: number; percentage: number };
  };
}

/**
 * Calculate cost breakdown from a single metrics object
 */
export function calculateCostBreakdown(metrics: VapiMetrics): CostBreakdown {
  const total = calculateTotalCost(metrics);
  
  return {
    total,
    telephony: metrics.telephonyCostUsd || 0,
    stt: metrics.sttCostUsd || 0,
    tts: metrics.ttsCostUsd || 0,
    ai: metrics.aiCostUsd || 0,
  };
}

/**
 * Calculate aggregated cost statistics from multiple metrics
 */
export function calculateCostStatistics(metricsArray: VapiMetrics[]): CostStatistics {
  if (metricsArray.length === 0) {
    return {
      totalCost: 0,
      averageCostPerCall: 0,
      costBreakdown: {
        total: 0,
        telephony: 0,
        stt: 0,
        tts: 0,
        ai: 0,
      },
      costByCategory: {
        telephony: { total: 0, percentage: 0 },
        stt: { total: 0, percentage: 0 },
        tts: { total: 0, percentage: 0 },
        ai: { total: 0, percentage: 0 },
      },
    };
  }

  let totalCost = 0;
  let totalTelephony = 0;
  let totalStt = 0;
  let totalTts = 0;
  let totalAi = 0;

  for (const metrics of metricsArray) {
    const breakdown = calculateCostBreakdown(metrics);
    totalCost += breakdown.total;
    totalTelephony += breakdown.telephony;
    totalStt += breakdown.stt;
    totalTts += breakdown.tts;
    totalAi += breakdown.ai;
  }

  const averageCostPerCall = totalCost / metricsArray.length;
  const costBreakdown = {
    total: totalCost,
    telephony: totalTelephony,
    stt: totalStt,
    tts: totalTts,
    ai: totalAi,
  };

  // Calculate percentages
  const costByCategory = {
    telephony: {
      total: totalTelephony,
      percentage: totalCost > 0 ? (totalTelephony / totalCost) * 100 : 0,
    },
    stt: {
      total: totalStt,
      percentage: totalCost > 0 ? (totalStt / totalCost) * 100 : 0,
    },
    tts: {
      total: totalTts,
      percentage: totalCost > 0 ? (totalTts / totalCost) * 100 : 0,
    },
    ai: {
      total: totalAi,
      percentage: totalCost > 0 ? (totalAi / totalCost) * 100 : 0,
    },
  };

  return {
    totalCost,
    averageCostPerCall,
    costBreakdown,
    costByCategory,
  };
}

/**
 * Calculate cost statistics for a date range
 */
export function calculateCostStatisticsForDateRange(
  metricsArray: VapiMetrics[],
  startDate?: Date,
  endDate?: Date
): CostStatistics {
  let filtered = metricsArray;

  // Filter by date range if provided
  // Note: This assumes metrics have a timestamp field - adjust based on your data structure
  if (startDate || endDate) {
    // This is a placeholder - adjust based on how dates are stored in your metrics
    // You may need to pass dates along with metrics or filter elsewhere
    filtered = metricsArray;
  }

  return calculateCostStatistics(filtered);
}

/**
 * Format cost as currency string
 */
export function formatCost(cost: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(cost);
}

/**
 * Format cost as short currency string (for display)
 */
export function formatCostShort(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 1000).toFixed(2)}¢`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cost);
}

/**
 * Get cost category color for visualization
 */
export function getCostCategoryColor(category: keyof CostBreakdown): string {
  const colors: Record<keyof CostBreakdown, string> = {
    total: "#3b82f6",
    telephony: "#8b5cf6",
    stt: "#10b981",
    tts: "#f59e0b",
    ai: "#ef4444",
  };
  return colors[category] || "#6b7280";
}

/**
 * Get cost category label
 */
export function getCostCategoryLabel(category: keyof CostBreakdown): string {
  const labels: Record<keyof CostBreakdown, string> = {
    total: "Total",
    telephony: "Telephony",
    stt: "Speech-to-Text",
    tts: "Text-to-Speech",
    ai: "AI/LLM",
  };
  return labels[category] || category;
}

