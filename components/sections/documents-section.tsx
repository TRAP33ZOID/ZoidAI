"use client";

import { IngestionForm } from "@/components/ingestion-form";
import { DocumentList } from "@/components/document-list";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export function DocumentsSection() {
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
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground mt-1">
            Manage your knowledge base documents
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 max-w-7xl mx-auto">
          {/* Upload Document Card - 30% */}
          <div className="lg:col-span-3">
            <IngestionForm />
          </div>
          
          {/* Document List Card - 70% */}
          <div className="lg:col-span-7">
            <DocumentList />
          </div>
        </div>
      </div>
    </div>
  );
}

