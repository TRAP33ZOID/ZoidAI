"use client";

import { useEffect, useState } from "react";
import { costMonitor, UsageMetrics } from "@/lib/cost-monitor";
import { DollarSign, Bot, Mic, Volume2, AlertTriangle } from "lucide-react";

export function CostDashboard() {
  const [costs, setCosts] = useState({
    gemini: 0,
    stt: 0,
    tts: 0,
    total: 0,
  });
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const metric = costMonitor.getTodayMetrics();
    const calculatedCosts = costMonitor.calculateCosts(metric);
    setCosts(calculatedCosts);
    setUsage(metric);

    // Refresh every 5 seconds to show real-time updates
    const interval = setInterval(() => {
      const updated = costMonitor.getTodayMetrics();
      const updatedCosts = costMonitor.calculateCosts(updated);
      setCosts(updatedCosts);
      setUsage(updated);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="space-y-4">
        <div className="text-xs text-muted-foreground font-medium">
          {usage && new Date(usage.timestamp).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-foreground flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Gemini <span className="text-xs text-muted-foreground">({usage?.geminiTokens.toLocaleString() || 0} tokens)</span>
            </span>
            <span className="font-mono font-semibold text-foreground">${costs.gemini.toFixed(4)}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-foreground flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Speech-to-Text <span className="text-xs text-muted-foreground">({usage?.sttMinutes.toFixed(1) || 0} min)</span>
            </span>
            <span className="font-mono font-semibold text-foreground">${costs.stt.toFixed(4)}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-foreground flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Text-to-Speech <span className="text-xs text-muted-foreground">({usage?.ttsCharacters.toLocaleString() || 0} chars)</span>
            </span>
            <span className="font-mono font-semibold text-foreground">${costs.tts.toFixed(4)}</span>
          </div>
        </div>

        <div className="border-t pt-4 flex justify-between items-center font-semibold">
          <span className="text-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Total Today
          </span>
          <span className={`font-mono text-lg ${
            costs.total > 1 ? 'text-destructive' : 
            costs.total > 0.50 ? 'text-orange-600 dark:text-orange-400' : 
            'text-green-600 dark:text-green-400'
          }`}>
            ${costs.total.toFixed(4)}
          </span>
        </div>

        {costs.total > 1 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 text-xs text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            High cost detected. Current rate: ~${(costs.total * 30).toFixed(0)}/month
          </div>
        )}
      </div>
    </div>
  );
}