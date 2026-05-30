"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Topbar } from "@/components/layout/Topbar";
import { LogsTable } from "@/components/logs/LogsTable";
import { LogFilters } from "@/components/logs/LogFilters";
import { useAppStore } from "@/store/app.store";
import type { MessageLog } from "@/types";

function LogsContent() {
  const { setSidebarOpen } = useAppStore();
  const searchParams = useSearchParams();

  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", String(p));
        params.set("limit", "50");

        const res = await fetch(`/api/logs?${params}`);
        const data = await res.json();
        setLogs(data.logs ?? []);
        setTotal(data.total ?? 0);
        setPages(data.pages ?? 1);
        setPage(p);
      } finally {
        setLoading(false);
      }
    },
    [searchParams]
  );

  // Reload whenever URL search params change (filters updated)
  useEffect(() => {
    load(1);
  }, [load]);

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Message Logs"
        description={`${total.toLocaleString()} total messages`}
        onMenuClick={() => setSidebarOpen(true)}
      />

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4 lg:p-6">
          <LogFilters />

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : (
            <LogsTable
              logs={logs}
              total={total}
              page={page}
              pages={pages}
              onPageChange={(p) => load(p)}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Wrap in Suspense because LogFilters uses useSearchParams
export default function LogsPage() {
  return (
    <Suspense>
      <LogsContent />
    </Suspense>
  );
}
