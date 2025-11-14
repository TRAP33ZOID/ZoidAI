"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { DollarSign, TrendingUp, Activity, Zap, Brain, FunctionSquare, CheckCircle2, XCircle } from "lucide-react";
import { formatCostShort, getCostCategoryColor, getCostCategoryLabel } from "@/lib/vapi-cost-calculator";

interface VapiMetricsStatistics {
  totalCalls: number;
  callsWithMetrics: number;
  cost: {
    totalCost: number;
    averageCostPerCall: number;
    costBreakdown: {
      total: number;
      telephony: number;
      stt: number;
      tts: number;
      ai: number;
    };
    costByCategory: {
      telephony: { total: number; percentage: number };
      stt: { total: number; percentage: number };
      tts: { total: number; percentage: number };
      ai: { total: number; percentage: number };
    };
  };
  quality: {
    averageLatencyMs: number;
    callsWithLatency: number;
  };
  aiUsage: {
    totalTokens: number;
    totalTokensInput: number;
    totalTokensOutput: number;
    modelDistribution: Record<string, number>;
  };
  functionCalls: {
    total: number;
    success: number;
    failed: number;
    successRate: number;
  };
}

const chartConfig = {
  cost: {
    label: "Cost",
    color: "hsl(var(--chart-1))",
  },
  telephony: {
    label: "Telephony",
    color: "#8b5cf6",
  },
  stt: {
    label: "STT",
    color: "#10b981",
  },
  tts: {
    label: "TTS",
    color: "#f59e0b",
  },
  ai: {
    label: "AI",
    color: "#ef4444",
  },
} satisfies ChartConfig;

export function VapiMetricsDashboard() {
  const [stats, setStats] = useState<VapiMetricsStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchMetricsData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMetricsData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetricsData = async () => {
    try {
      setIsLoading(true);
      
      const res = await fetch("/api/vapi-metrics?stats=true");
      const data = await res.json();
      
      if (res.ok && data.statistics) {
        setStats(data.statistics);
      }
    } catch (error) {
      console.error("Error fetching Vapi metrics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading Vapi metrics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">No metrics data available</div>
      </div>
    );
  }

  // Prepare cost breakdown data for pie chart
  const costBreakdownData = [
    { name: "Telephony", value: stats.cost.costBreakdown.telephony, color: getCostCategoryColor("telephony") },
    { name: "STT", value: stats.cost.costBreakdown.stt, color: getCostCategoryColor("stt") },
    { name: "TTS", value: stats.cost.costBreakdown.tts, color: getCostCategoryColor("tts") },
    { name: "AI", value: stats.cost.costBreakdown.ai, color: getCostCategoryColor("ai") },
  ].filter((item) => item.value > 0);

  // Prepare model distribution data
  const modelData = Object.entries(stats.aiUsage.modelDistribution).map(([model, count]) => ({
    name: model,
    value: count,
  }));

  // Prepare function call data
  const functionCallData = [
    { name: "Success", value: stats.functionCalls.success, color: "#22c55e" },
    { name: "Failed", value: stats.functionCalls.failed, color: "#ef4444" },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCostShort(stats.cost.totalCost)}</div>
            <div className="text-xs text-muted-foreground mt-2">
              Avg: {formatCostShort(stats.cost.averageCostPerCall)} per call
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls Tracked</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.callsWithMetrics}</div>
            <div className="text-xs text-muted-foreground mt-2">
              of {stats.totalCalls} total calls
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.quality.averageLatencyMs > 0
                ? `${stats.quality.averageLatencyMs}ms`
                : "N/A"}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {stats.quality.callsWithLatency} calls measured
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Function Calls</CardTitle>
            <FunctionSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.functionCalls.total}</div>
            <div className="text-xs text-muted-foreground mt-2">
              {stats.functionCalls.successRate.toFixed(1)}% success rate
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown</CardTitle>
            <CardDescription>Distribution of costs by category</CardDescription>
          </CardHeader>
          <CardContent>
            {costBreakdownData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <PieChart>
                  <Pie
                    data={costBreakdownData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {costBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{data.name}</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {formatCostShort(data.value as number)}
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No cost data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost by Category Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Cost by Category</CardTitle>
            <CardDescription>Detailed cost breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {costBreakdownData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <BarChart data={costBreakdownData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="text-sm font-medium">{data.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatCostShort(data.value as number)}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" fill="var(--color-cost)" />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No cost data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Usage and Function Calls */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* AI Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Usage
            </CardTitle>
            <CardDescription>Token usage and model distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Tokens</div>
                  <div className="text-2xl font-bold">
                    {stats.aiUsage.totalTokens.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Input / Output</div>
                  <div className="text-sm font-medium">
                    {stats.aiUsage.totalTokensInput.toLocaleString()} / {stats.aiUsage.totalTokensOutput.toLocaleString()}
                  </div>
                </div>
              </div>
              
              {modelData.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Model Distribution</div>
                  <ChartContainer config={chartConfig} className="h-[150px]">
                    <BarChart data={modelData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip />
                      <Bar dataKey="value" fill="var(--color-cost)" />
                    </BarChart>
                  </ChartContainer>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Function Calls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FunctionSquare className="h-5 w-5" />
              Function Calls
            </CardTitle>
            <CardDescription>Success and failure rates</CardDescription>
          </CardHeader>
          <CardContent>
            {functionCallData.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Success</span>
                  </div>
                  <span className="text-lg font-bold">{stats.functionCalls.success}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm">Failed</span>
                  </div>
                  <span className="text-lg font-bold">{stats.functionCalls.failed}</span>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Success Rate</span>
                    <span className="text-2xl font-bold">
                      {stats.functionCalls.successRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <ChartContainer config={chartConfig} className="h-[150px]">
                  <PieChart>
                    <Pie
                      data={functionCallData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {functionCallData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No function call data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Details</CardTitle>
          <CardDescription>Breakdown by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stats.cost.costByCategory).map(([category, data]) => (
              <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: getCostCategoryColor(category as any) }}
                  />
                  <span className="font-medium">{getCostCategoryLabel(category as any)}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatCostShort(data.total)}</div>
                  <div className="text-xs text-muted-foreground">
                    {data.percentage.toFixed(1)}% of total
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

