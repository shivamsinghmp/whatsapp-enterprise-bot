"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { useAppStore } from "@/store/app.store";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <Sidebar className="hidden lg:flex flex-col shrink-0" />

        {/* Mobile drawer */}
        <MobileNav
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main area */}
        <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </TooltipProvider>
  );
}
