"use client";

import { ChatInterface } from "@/components/chat-interface";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export function TestingSection() {
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
          <h1 className="text-3xl font-bold">AI Agent Testing</h1>
          <p className="text-muted-foreground mt-1">
            Test the voice-enabled AI support agent with your knowledge base
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div style={{ height: 'calc(100vh - 250px)', minHeight: '600px' }}>
            <ChatInterface />
          </div>
        </div>
      </div>
    </div>
  );
}

