"use client";

import { useEffect, useRef, useState } from "react";
import {
  Pause,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Clock,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProgressState {
  type: "state" | "progress" | "complete" | "error";
  sent: number;
  ok: number;
  failed: number;
  total: number;
  status: "running" | "paused" | "stopped" | "completed";
  recentLogs?: Array<{ phone: string; status: string; time: string }>;
  error?: string;
}

interface BulkProgressProps {
  campaignId: string;
  campaignName?: string;
  onComplete?: () => void;
}

export function BulkProgress({ campaignId, campaignName, onComplete }: BulkProgressProps) {
  const [state, setState] = useState<ProgressState | null>(null);
  const [connected, setConnected] = useState(false);
  const [controlling, setControlling] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    const es = new EventSource(`/api/campaigns/${campaignId}/progress`);
    esRef.current = es;
    setConnected(true);

    es.onmessage = (event) => {
      try {
        const data: ProgressState = JSON.parse(event.data);
        setState(data);
        if (data.type === "complete" || data.status === "completed") {
          onComplete?.();
          es.close();
          setConnected(false);
        }
        if (data.type === "error") {
          toast.error("Campaign error", { description: data.error });
          es.close();
          setConnected(false);
        }
      } catch {}
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [campaignId, onComplete]);

  async function control(action: "stop" | "pause" | "resume") {
    setControlling(true);
    try {
      if (action === "stop") {
        await fetch(`/api/campaigns/${campaignId}/stop`, { method: "POST" });
        toast.info("Campaign stopped");
      } else {
        toast.info(`Campaign ${action === "pause" ? "paused" : "resumed"}`);
        // Pause/resume updates come through SSE since bulkQueue is in-memory
        // Signal via a dedicated endpoint if you extend the API
      }
    } catch {
      toast.error("Control action failed");
    } finally {
      setControlling(false);
    }
  }

  const pct = state && state.total > 0
    ? Math.round((state.sent / state.total) * 100)
    : 0;

  const elapsed = (Date.now() - startTimeRef.current) / 1000;
  const speed = elapsed > 0 && state ? (state.sent / elapsed).toFixed(1) : "0";

  const remaining = state ? state.total - state.sent : 0;

  const isComplete =
    state?.status === "completed" || state?.type === "complete";
  const isRunning = state?.status === "running";
  const isPaused = state?.status === "paused";

  return (
    <Card className="relative overflow-hidden">
      {/* Connection indicator */}
      <div className="absolute right-4 top-4">
        {connected ? (
          <div className="flex items-center gap-1 text-xs text-[#25D366]">
            <Wifi className="h-3 w-3" />
            <span>Live</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <WifiOff className="h-3 w-3" />
            <span>Offline</span>
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">
            {campaignName ?? "Campaign"}
          </CardTitle>
          {state && (
            <StatusBadge status={
              state.status === "running" ? "RUNNING"
              : state.status === "paused" ? "PAUSED"
              : state.status === "completed" ? "COMPLETED"
              : "FAILED"
            } />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Progress bar */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium">{pct}% complete</span>
            <span className="text-muted-foreground">
              {state?.sent ?? 0} / {state?.total ?? 0}
            </span>
          </div>
          <Progress
            value={pct}
            className="h-3 bg-muted"
          />
          {isRunning && (
            <p className="mt-1 text-xs text-muted-foreground">
              {speed} msg/sec · {remaining.toLocaleString()} remaining
            </p>
          )}
        </div>

        {/* Counters */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Sent", value: state?.sent ?? 0, color: "text-blue-600 dark:text-blue-400" },
            { label: "Success", value: state?.ok ?? 0, color: "text-green-600 dark:text-green-400" },
            { label: "Failed", value: state?.failed ?? 0, color: "text-red-600 dark:text-red-400" },
            { label: "Remaining", value: remaining, color: "text-muted-foreground" },
          ].map((c) => (
            <div key={c.label} className="text-center">
              <p className={cn("text-xl font-bold tabular-nums", c.color)}>
                {c.value.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Recent log */}
        {state?.recentLogs && state.recentLogs.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Recent
            </p>
            <ScrollArea className="h-40 rounded-lg border bg-muted/30 p-2">
              <div className="space-y-1">
                {state.recentLogs.map((log, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs font-mono"
                  >
                    {log.status === "sent" ? (
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 shrink-0 text-red-500" />
                    )}
                    <span className="flex-1 truncate text-foreground/80">
                      {log.phone}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {new Date(log.time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Controls */}
        {!isComplete && (
          <div className="flex gap-2">
            {isRunning && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={controlling}
                onClick={() => control("pause")}
              >
                {controlling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pause className="h-3 w-3" />}
                Pause
              </Button>
            )}
            {isPaused && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={controlling}
                onClick={() => control("resume")}
              >
                <Play className="h-3 w-3" />
                Resume
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-red-500 hover:text-red-600 hover:border-red-300"
              disabled={controlling}
              onClick={() => control("stop")}
            >
              <Square className="h-3 w-3" />
              Stop
            </Button>
          </div>
        )}

        {/* Complete card */}
        {isComplete && (
          <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
            <CheckCircle2 className="h-8 w-8 shrink-0 text-green-500" />
            <div>
              <p className="font-semibold text-green-700 dark:text-green-400">
                Campaign Complete
              </p>
              <p className="text-sm text-muted-foreground">
                {state?.ok} delivered · {state?.failed} failed ·{" "}
                {state && state.ok + state.failed > 0
                  ? `${((state.ok / (state.ok + state.failed)) * 100).toFixed(1)}% delivery rate`
                  : ""}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
