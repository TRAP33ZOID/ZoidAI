/**
 * Call Quality Monitoring Library
 * Tracks call quality metrics and calculates health scores
 */

import { getCallStatistics, getRecentCallLogs, CallLog } from "./call-handler";

export interface CallQualityMetrics {
  successRate: number;
  averageDuration: number;
  totalCalls: number;
  completedCalls: number;
  failedCalls: number;
  healthScore: number;
  languageDistribution: Record<string, number>;
  peakCallHour: number;
  failureRateByStatus: Record<string, number>;
}

export interface CallDurationTrend {
  date: string;
  averageDuration: number;
  callCount: number;
}

/**
 * Calculate health score based on success rate and duration
 * Health score = weighted average of success rate (70%) and duration factor (30%)
 * Duration factor: normalized based on average duration (shorter is better, capped at 5 minutes)
 */
export function calculateHealthScore(
  successRate: number,
  averageDuration: number
): number {
  // Duration factor: shorter calls are better
  // Normalize: 0-5 minutes = 0-1 scale (inverse)
  const maxDuration = 5 * 60 * 1000; // 5 minutes in ms
  const durationFactor = Math.max(0, 1 - averageDuration / maxDuration);
  
  // Weighted average: 70% success rate, 30% duration factor
  const healthScore = successRate * 0.7 + durationFactor * 0.3;
  
  // Return as percentage (0-100)
  return Math.round(healthScore * 100);
}

/**
 * Get call quality metrics for a time period
 */
export async function getCallQualityMetrics(
  startDate?: Date,
  endDate?: Date
): Promise<CallQualityMetrics> {
  try {
    const stats = await getCallStatistics(startDate, endDate);
    const calls = await getRecentCallLogs(1000, 0); // Get up to 1000 calls for analysis
    
    // Filter calls by date range if provided
    let filteredCalls = calls;
    if (startDate || endDate) {
      filteredCalls = calls.filter((call) => {
        if (!call.started_at) return false;
        const callDate = new Date(call.started_at);
        if (startDate && callDate < startDate) return false;
        if (endDate && callDate > endDate) return false;
        return true;
      });
    }

    const totalCalls = stats.total || filteredCalls.length;
    const completedCalls = stats.completed || 0;
    const failedCalls = stats.failed || 0;
    const successRate = totalCalls > 0 ? completedCalls / totalCalls : 0;
    const averageDuration = stats.averageDuration || 0;

    // Calculate language distribution
    const languageDistribution: Record<string, number> = {};
    filteredCalls.forEach((call) => {
      const lang = call.language || "unknown";
      languageDistribution[lang] = (languageDistribution[lang] || 0) + 1;
    });

    // Calculate peak call hour
    const hourCounts: Record<number, number> = {};
    filteredCalls.forEach((call) => {
      if (call.started_at) {
        const hour = new Date(call.started_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });
    const peakCallHour = Object.keys(hourCounts).length > 0
      ? parseInt(Object.keys(hourCounts).reduce((a, b) => hourCounts[parseInt(a)] > hourCounts[parseInt(b)] ? a : b))
      : 0;

    // Calculate failure rate by status
    const failureRateByStatus: Record<string, number> = {};
    filteredCalls.forEach((call) => {
      const status = call.status || "unknown";
      if (status === "failed" || status === "cancelled") {
        failureRateByStatus[status] = (failureRateByStatus[status] || 0) + 1;
      }
    });

    const healthScore = calculateHealthScore(successRate, averageDuration);

    return {
      successRate,
      averageDuration,
      totalCalls,
      completedCalls,
      failedCalls,
      healthScore,
      languageDistribution,
      peakCallHour,
      failureRateByStatus,
    };
  } catch (error: any) {
    console.error("❌ [CALL MONITOR] Error calculating quality metrics:", error);
    return {
      successRate: 0,
      averageDuration: 0,
      totalCalls: 0,
      completedCalls: 0,
      failedCalls: 0,
      healthScore: 0,
      languageDistribution: {},
      peakCallHour: 0,
      failureRateByStatus: {},
    };
  }
}

/**
 * Get call duration trends over time
 */
export async function getCallDurationTrends(
  days: number = 7
): Promise<CallDurationTrend[]> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const calls = await getRecentCallLogs(1000, 0);
    
    // Filter calls by date range
    const filteredCalls = calls.filter((call) => {
      if (!call.started_at) return false;
      const callDate = new Date(call.started_at);
      return callDate >= startDate && callDate <= endDate;
    });

    // Group calls by date
    const callsByDate: Record<string, CallLog[]> = {};
    filteredCalls.forEach((call) => {
      if (call.started_at) {
        const date = new Date(call.started_at).toISOString().split("T")[0];
        if (!callsByDate[date]) {
          callsByDate[date] = [];
        }
        callsByDate[date].push(call);
      }
    });

    // Calculate average duration per date
    const trends: CallDurationTrend[] = [];
    Object.keys(callsByDate).sort().forEach((date) => {
      const dateCalls = callsByDate[date];
      const durations = dateCalls
        .filter((c) => c.duration_ms !== null && c.duration_ms !== undefined)
        .map((c) => c.duration_ms!);
      
      const averageDuration = durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;

      trends.push({
        date,
        averageDuration: Math.round(averageDuration),
        callCount: dateCalls.length,
      });
    });

    return trends;
  } catch (error: any) {
    console.error("❌ [CALL MONITOR] Error calculating duration trends:", error);
    return [];
  }
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Get health score color (for UI)
 */
export function getHealthScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

/**
 * Get health score label
 */
export function getHealthScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Poor";
}

