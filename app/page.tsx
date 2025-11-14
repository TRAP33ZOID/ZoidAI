"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar"
import { AdminDashboard } from "@/components/admin-dashboard"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function Page() {
  const [activeSection, setActiveSection] = useState<string>("dashboard");

  const handleNavigate = (section: string) => {
    setActiveSection(section);
  };

  return (
    <div className="h-full">
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar
          variant="inset"
          activeSection={activeSection}
          onNavigate={handleNavigate}
        />
        <SidebarInset>
          <AdminDashboard
            activeSection={activeSection}
            onNavigate={handleNavigate}
          />
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
