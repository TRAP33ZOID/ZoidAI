"use client";

import { CostDashboard } from "@/components/cost-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PanelLeft, DollarSign } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export function AnalyticsSection() {
  const { toggleSidebar } = useSidebar();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 p-6 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8"
        >
          <PanelLeft className="h-4 w-4" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Monitor API costs and usage metrics
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                API Costs
              </CardTitle>
              <CardDescription>Today's usage and spending</CardDescription>
            </CardHeader>
            <CardContent>
              <CostDashboard />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

