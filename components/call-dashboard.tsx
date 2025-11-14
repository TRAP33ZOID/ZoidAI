"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { Phone, PhoneCall, PhoneOff, Clock, TrendingUp, Activity, CheckCircle2, XCircle, AlertCircle, DollarSign } from "lucide-react";
import { formatDuration, getHealthScoreColor, getHealthScoreLabel } from "@/lib/call-monitor";
import { CallLog } from "@/lib/call-handler";
import { formatCostShort } from "@/lib/vapi-cost-calculator";

interface CallStatistics {
  total: number;
  completed: number;
  failed: number;
  averageDuration: number;
  totalDuration: number;
}

interface CallDashboardData {
  stats: CallStatistics;
  recentCalls: CallLog[];
  todayStats: CallStatistics;
  weekStats: CallStatistics;
  monthStats: CallStatistics;
  vapiCostStats?: {
    totalCost: number;
    averageCostPerCall: number;
    costBreakdown: {
      total: number;
      telephony: number;
      stt: number;
      tts: number;
      ai: number;
    };
  };
}

const COLORS = {
  completed: "#22c55e",
  failed: "#ef4444",
  cancelled: "#f59e0b",
  "in-progress": "#3b82f6",
  initiated: "#94a3b8",
  ringing: "#8b5cf6",
};

const chartConfig = {
  completed: {
    label: "Completed",
    color: "hsl(var(--chart-1))",
  },
  failed: {
    label: "Failed",
    color: "hsl(var(--chart-2))",
  },
  calls: {
    label: "Calls",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export function CallDashboard() {
  const [data, setData] = useState<CallDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchCallData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchCallData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCallData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch overall stats
      const statsRes = await fetch("/api/calls?stats=true");
      const stats: CallStatistics = await statsRes.json();
      
      // Fetch recent calls
      const callsRes = await fetch("/api/calls?limit=10");
      const callsData = await callsRes.json();
      const recentCalls = callsData.calls || [];
      
      // Calculate time-based stats
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(now);
      monthStart.setMonth(monthStart.getMonth() - 1);
      
      const todayStatsRes = await fetch(`/api/calls?stats=true&startDate=${todayStart.toISOString()}`);
      const todayStats: CallStatistics = await todayStatsRes.json();
      
      const weekStatsRes = await fetch(`/api/calls?stats=true&startDate=${weekStart.toISOString()}`);
      const weekStats: CallStatistics = await weekStatsRes.json();
      
      const monthStatsRes = await fetch(`/api/calls?stats=true&startDate=${monthStart.toISOString()}`);
      const monthStats: CallStatistics = await monthStatsRes.json();
      
      // Fetch Vapi cost statistics
      let vapiCostStats = undefined;
      try {
        const vapiMetricsRes = await fetch("/api/vapi-metrics?stats=true");
        const vapiMetricsData = await vapiMetricsRes.json();
        if (vapiMetricsRes.ok && vapiMetricsData.statistics?.cost) {
          vapiCostStats = vapiMetricsData.statistics.cost;
        }
      } catch (error) {
        console.warn("Failed to fetch Vapi cost stats:", error);
      }
      
      setData({
        stats,
        recentCalls,
        todayStats,
        weekStats,
        monthStats,
        vapiCostStats,
      });
    } catch (error) {
      console.error("Error fetching call data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading call statistics...</div>
      </div>
    );
  }

  const stats = data?.stats || { total: 0, completed: 0, failed: 0, averageDuration: 0, totalDuration: 0 };
  const recentCalls = data?.recentCalls || [];
  const todayStats = data?.todayStats || stats;
  const weekStats = data?.weekStats || stats;
  const monthStats = data?.monthStats || stats;

  // Calculate success rate
  const successRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
  const healthScore = Math.round(successRate * 0.7 + (stats.averageDuration < 300000 ? 30 : 0)); // Simple health score

  // Prepare status breakdown data
  const statusBreakdown = [
    { name: "Completed", value: stats.completed, color: COLORS.completed },
    { name: "Failed", value: stats.failed, color: COLORS.failed },
    { name: "In Progress", value: stats.total - stats.completed - stats.failed, color: COLORS["in-progress"] },
  ].filter(item => item.value > 0);

  // Prepare call volume data (last 7 days)
  const callVolumeData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    
    // This is a simplified version - in production, you'd fetch actual data
    callVolumeData.push({
      date: dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      calls: Math.floor(Math.random() * 10), // Placeholder - replace with actual data
    });
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "failed":
        return "destructive";
      case "cancelled":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span>Today: {todayStats.total}</span>
              <span>Week: {weekStats.total}</span>
              <span>Month: {monthStats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-2">
              {stats.completed} completed / {stats.total} total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.averageDuration)}</div>
            <div className="text-xs text-muted-foreground mt-2">
              Total: {formatDuration(stats.totalDuration)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthScoreColor(healthScore)}`}>
              {healthScore}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {getHealthScoreLabel(healthScore)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
            <CardDescription>Distribution of call statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {statusBreakdown.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[200px]">
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No call data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call Volume Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Call Volume</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <BarChart data={callVolumeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip />
                <Bar dataKey="calls" fill="var(--color-calls)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Vapi Cost Breakdown */}
      {data?.vapiCostStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Vapi Cost Breakdown
            </CardTitle>
            <CardDescription>Cost analysis for phone calls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium">Total Cost</span>
                <span className="text-lg font-bold">
                  {formatCostShort(data.vapiCostStats.totalCost)}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 border rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Telephony</div>
                  <div className="font-semibold">
                    {formatCostShort(data.vapiCostStats.costBreakdown.telephony)}
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">STT</div>
                  <div className="font-semibold">
                    {formatCostShort(data.vapiCostStats.costBreakdown.stt)}
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">TTS</div>
                  <div className="font-semibold">
                    {formatCostShort(data.vapiCostStats.costBreakdown.tts)}
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">AI</div>
                  <div className="font-semibold">
                    {formatCostShort(data.vapiCostStats.costBreakdown.ai)}
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground pt-2 border-t">
                Average cost per call: {formatCostShort(data.vapiCostStats.averageCostPerCall)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Calls */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
          <CardDescription>Last 10 calls</CardDescription>
        </CardHeader>
        <CardContent>
          {recentCalls.length > 0 ? (
            <div className="space-y-4">
              {recentCalls.map((call) => (
                <div
                  key={call.call_id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getStatusBadgeVariant(call.status)}>
                        {call.status}
                      </Badge>
                      {call.phone_number && (
                        <span className="text-sm font-medium">{call.phone_number}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {call.started_at && (
                        <span>
                          {new Date(call.started_at).toLocaleString()}
                        </span>
                      )}
                      {call.duration_ms && (
                        <span>{formatDuration(call.duration_ms)}</span>
                      )}
                      {call.language && (
                        <span>{call.language}</span>
                      )}
                      {call.vapi_cost_usd !== undefined && call.vapi_cost_usd !== null && (
                        <span className="font-medium text-foreground">
                          {formatCostShort(call.vapi_cost_usd)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No recent calls
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

