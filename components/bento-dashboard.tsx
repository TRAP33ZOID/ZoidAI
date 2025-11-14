"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CostDashboard } from "@/components/cost-dashboard";
import { DocumentList } from "@/components/document-list";
import { IngestionForm } from "@/components/ingestion-form";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, TestTube, Upload, Database, DollarSign, Phone, TrendingUp } from "lucide-react";
import { getLanguageConfig } from "@/lib/language";

interface Document {
  id: number;
  filename: string;
  language: string;
  preview: string;
  created_at: string;
}

interface BentoDashboardProps {
  onNavigate?: (section: string) => void;
}

export function BentoDashboard({ onNavigate }: BentoDashboardProps) {
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [vapiMetrics, setVapiMetrics] = useState<{
    totalCost: number;
    callsWithMetrics: number;
  } | null>(null);

  useEffect(() => {
    fetchRecentDocuments();
    fetchVapiMetrics();
  }, []);

  const fetchVapiMetrics = async () => {
    try {
      const res = await fetch("/api/vapi-metrics?stats=true");
      const data = await res.json();
      if (res.ok && data.statistics) {
        setVapiMetrics({
          totalCost: data.statistics.cost.totalCost,
          callsWithMetrics: data.statistics.callsWithMetrics,
        });
      }
    } catch (error) {
      console.error("Error fetching Vapi metrics:", error);
    }
  };

  const fetchRecentDocuments = async () => {
    setIsLoadingDocuments(true);
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      
      if (res.ok) {
        // Get the 3 most recent documents
        setRecentDocuments(data.documents.slice(0, 3));
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const handleNavigate = (section: string) => {
    if (onNavigate) {
      onNavigate(section);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your AI support agent system
        </p>
      </div>

      {/* Bento Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
          {/* API Costs - Large Card */}
          <Card className="lg:col-span-2 lg:row-span-2">
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

          {/* Documents Overview */}
          <Card className="lg:col-span-1 lg:row-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
              <CardDescription>Knowledge base overview</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col h-full">
              <div className="flex-1 space-y-3">
                {isLoadingDocuments ? (
                  <p className="text-sm text-muted-foreground">Loading documents...</p>
                ) : recentDocuments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {recentDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-2 rounded-md border hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{doc.filename}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {getLanguageConfig(doc.language).name}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="default"
                className="w-full mt-4"
                onClick={() => handleNavigate("documents")}
              >
                Manage Documents
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Upload Document - Medium Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Document
              </CardTitle>
              <CardDescription>Add new content to your knowledge base</CardDescription>
            </CardHeader>
            <CardContent>
              <IngestionForm />
            </CardContent>
          </Card>

          {/* Call Stats Preview */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Call Statistics
              </CardTitle>
              <CardDescription>Recent call activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  View call logs, statistics, and quality metrics
                </p>
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => handleNavigate("calls")}
                >
                  View Calls
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Vapi Metrics Preview */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Vapi Metrics
              </CardTitle>
              <CardDescription>Cost and usage analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vapiMetrics ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Cost</span>
                        <span className="text-lg font-bold">
                          ${vapiMetrics.totalCost.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Calls Tracked</span>
                        <span className="text-sm font-medium">{vapiMetrics.callsWithMetrics}</span>
                      </div>
                    </div>
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => handleNavigate("vapi-metrics")}
                    >
                      View Metrics
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      View comprehensive Vapi metrics including costs, quality, and AI usage
                    </p>
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => handleNavigate("vapi-metrics")}
                    >
                      View Metrics
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Testing Preview */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                AI Testing
              </CardTitle>
              <CardDescription>Test your agent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Test the voice-enabled AI support agent with your knowledge base
                </p>
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => handleNavigate("testing")}
                >
                  Open Testing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

