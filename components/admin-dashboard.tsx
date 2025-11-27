"use client";

import { BentoDashboard } from "@/components/bento-dashboard";
import { CallDashboard } from "@/components/call-dashboard";
import { VapiMetricsDashboard } from "@/components/vapi-metrics-dashboard";
import { DocumentsSection } from "@/components/sections/documents-section";
import { AnalyticsSection } from "@/components/sections/analytics-section";
import { TestingSection } from "@/components/sections/testing-section";

interface AdminDashboardProps {
  activeSection?: string;
  onNavigate?: (section: string) => void;
}

export function AdminDashboard({ activeSection = "dashboard", onNavigate }: AdminDashboardProps) {
  const renderSection = () => {
    switch (activeSection) {
      case "calls":
        return (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b">
              <h1 className="text-3xl font-bold">Call Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Monitor call quality and statistics
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <CallDashboard />
            </div>
          </div>
        );
      case "vapi-metrics":
        return (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b">
              <h1 className="text-3xl font-bold">Vapi Metrics</h1>
              <p className="text-muted-foreground mt-1">
                Comprehensive cost, quality, and usage analytics
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <VapiMetricsDashboard />
            </div>
          </div>
        );
      case "documents":
        return <DocumentsSection />;
      case "analytics":
        return <AnalyticsSection />;
      case "testing":
        return <TestingSection />;
      case "dashboard":
      default:
        return <BentoDashboard onNavigate={onNavigate} />;
    }
  };

  return <div className="flex flex-col h-full">{renderSection()}</div>;
}

