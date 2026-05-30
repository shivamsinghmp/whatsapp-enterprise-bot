"use client";

import Link from "next/link";
import { AlertTriangle, MessageSquare, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Topbar } from "@/components/layout/Topbar";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { MessageVolumeChart } from "@/components/dashboard/MessageVolumeChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { useStats } from "@/hooks/useStats";
import { useWAConfig } from "@/hooks/useWAConfig";
import { useAppStore } from "@/store/app.store";

export default function DashboardPage() {
  const { setSidebarOpen } = useAppStore();
  const { stats, loading } = useStats();
  const { config, loading: configLoading } = useWAConfig();

  const configMissing = !configLoading && !config;

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Dashboard"
        description="Overview of your WhatsApp messaging"
        sentToday={stats?.today.sent}
        onMenuClick={() => setSidebarOpen(true)}
        action={
          <div className="hidden sm:flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href="/single">
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                Send
              </Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="bg-[#25D366] hover:bg-[#128C7E] text-white"
            >
              <Link href="/bulk">
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                Campaign
              </Link>
            </Button>
          </div>
        }
      />

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4 lg:p-6">
          {/* WAConfig warning banner */}
          {configMissing && (
            <div className="flex flex-col gap-3 rounded-xl border border-yellow-400/30 bg-yellow-500/10 p-4 sm:flex-row sm:items-center">
              <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500" />
              <div className="flex-1 space-y-0.5">
                <p className="font-semibold text-yellow-700 dark:text-yellow-400">
                  WhatsApp API credentials not configured
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-500">
                  Add your Meta phone number ID and access token to start
                  sending messages.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                asChild
                className="shrink-0 border-yellow-400/50 text-yellow-700 hover:bg-yellow-500/10 dark:text-yellow-400"
              >
                <Link href="/settings">Setup credentials →</Link>
              </Button>
            </div>
          )}

          {/* Stat cards */}
          <StatsGrid stats={stats ?? undefined} isLoading={loading} />

          {/* Charts row */}
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <MessageVolumeChart hourlyData={stats?.hourlyData ?? []} />
            </div>
            <div className="lg:col-span-2">
              <RecentActivity recentLogs={stats?.recentLogs ?? []} />
            </div>
          </div>

          {/* Top fail reasons */}
          {(stats?.topFailReasons?.length ?? 0) > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <p className="mb-3 text-sm font-semibold">
                Top Failure Reasons (this month)
              </p>
              <div className="space-y-2">
                {stats!.topFailReasons.map((item) => (
                  <div
                    key={item.reason}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate text-muted-foreground">
                      {item.reason}
                    </span>
                    <span className="ml-3 shrink-0 font-mono font-medium text-red-500">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
